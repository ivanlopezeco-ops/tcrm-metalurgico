"""
Cliente de la API de Estadisticas Cambiarias del BCRA
=====================================================

    GET https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones/{codMoneda}
        ?fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD&limit=&offset=

Semantica de los campos, verificada contra una respuesta real (2024-06-12):

    tipoPase        DOLARES POR UNIDAD de la moneda.
                    PYG 0.000133 -> 7.519 guaranies por dolar.
                    Es directamente el insumo que espera bilateral().

    tipoCotizacion  PESOS POR UNIDAD de la moneda.
                    USD 901.50 ese dia.

    Chequeo de consistencia: tipoCotizacion / tipoPase == cotizacion del USD,
    para toda moneda. Se verifica en cada descarga.

Particularidades que rompen el calculo si se ignoran:

  - VND se cotiza CADA 1.000 UNIDADES (lo dice la descripcion del campo).
  - USD y REF traen tipoPase = 0 por ser el numerario.
  - ARS, XAU y XAG traen tipoCotizacion = 0.
  - El peso mexicano es MXP, no MXN.

Notas operativas:

  - El BCRA no publica los fines de semana ni feriados cambiarios; la serie
    diaria viene con huecos que hay que arrastrar, no interpolar.
  - No pude verificar desde que fecha arranca cada moneda. `sondear_inicio`
    lo averigua por busqueda binaria en la primera corrida.
  - Sin autenticacion ni clave. Conviene igual espaciar los pedidos.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import pandas as pd
import requests

BASE = "https://api.bcra.gob.ar/estadisticascambiarias/v1.0"

# __file__ no existe en notebooks ni en la consola interactiva
try:
    _RAIZ = Path(__file__).resolve().parent
except NameError:
    _RAIZ = Path.cwd()
CACHE = _RAIZ / "datos" / "api_bcra"

# monedas que se cotizan por multiplos de unidad
ESCALA = {"VND": 1000.0}

# socios a incorporar via API, con su codigo ISO
SOCIOS_API = {
    "Paraguay": "PYG",
    "Colombia": "COP",
    "Peru": "PEN",
    "Sudafrica": "ZAR",
    "Suecia": "SEK",
    "Republica Checa": "CZK",
    "Turquia": "TRY",
    "Dinamarca": "DKK",
    "Israel": "ILS",
    "Singapur": "SGD",
    "Australia": "AUD",
    "Noruega": "NOK",
    "Nueva Zelandia": "NZD",
    "Rusia": "RUB",
    # Bolivia (BOB) esta disponible pero se deja afuera a proposito:
    # la cotizacion oficial con brecha desde 2023 no describe la
    # competitividad real de exportar a Bolivia.
}


class ErrorAPI(RuntimeError):
    pass


def _pedir(url: str, params: dict | None = None, reintentos: int = 3) -> dict:
    for intento in range(reintentos):
        try:
            r = requests.get(url, params=params, timeout=60,
                             headers={"Accept": "application/json"})
            if r.status_code == 200:
                return r.json()
            if r.status_code in (400, 404):
                return {"status": r.status_code, "results": []}
            raise ErrorAPI(f"HTTP {r.status_code} en {r.url}")
        except requests.RequestException as e:
            if intento == reintentos - 1:
                raise ErrorAPI(f"fallo de red: {e}") from e
            time.sleep(2 ** intento)
    raise ErrorAPI("sin respuesta")


def divisas() -> pd.DataFrame:
    """Listado de monedas disponibles."""
    d = _pedir(f"{BASE}/Maestros/Divisas")
    return pd.DataFrame(d.get("results", []))


def cotizaciones_del_dia(fecha: str) -> pd.DataFrame:
    """Todas las monedas para una fecha. Sirve para el control de consistencia."""
    d = _pedir(f"{BASE}/Cotizaciones", {"fecha": fecha})
    res = d.get("results") or {}
    return pd.DataFrame(res.get("detalle", []))


def verificar_consistencia(fecha: str = "2024-06-12", tol: float = 1e-3) -> dict:
    """
    tipoCotizacion / tipoPase debe dar la cotizacion del dolar para toda moneda.
    Si esto falla, cambio la semantica de los campos y hay que revisar todo.
    """
    d = cotizaciones_del_dia(fecha)
    if d.empty:
        raise ErrorAPI(f"sin datos para {fecha}")
    usd = float(d.loc[d.codigoMoneda == "USD", "tipoCotizacion"].iloc[0])
    val = d[(d.tipoPase > 0) & (d.tipoCotizacion > 0)].copy()
    val["implicito"] = val.tipoCotizacion / val.tipoPase
    val["desvio"] = (val.implicito / usd - 1).abs()
    peor = val.nlargest(1, "desvio").iloc[0]
    return {
        "fecha": fecha,
        "USD": usd,
        "monedas verificadas": len(val),
        "peor desvio %": round(peor.desvio * 100, 6),
        "peor moneda": peor.codigoMoneda,
        "ok": bool(peor.desvio < tol),
    }


def sondear_inicio(cod: str, desde: str = "1990-01-01") -> pd.Timestamp | None:
    """Primera fecha con dato, por busqueda binaria sobre el rango."""
    lo, hi = pd.Timestamp(desde), pd.Timestamp.today().normalize()
    if serie(cod, lo.date().isoformat(), (lo + pd.DateOffset(years=1)).date().isoformat()).size:
        return lo
    while (hi - lo).days > 20:
        mid = lo + (hi - lo) / 2
        s = serie(cod, mid.date().isoformat(),
                  (mid + pd.DateOffset(months=6)).date().isoformat())
        if s.size:
            hi = mid
        else:
            lo = mid
    s = serie(cod, lo.date().isoformat(), hi.date().isoformat())
    return s.index.min() if s.size else None


def serie(cod: str, desde: str, hasta: str, campo: str = "tipoCotizacion") -> pd.Series:
    """
    Serie cruda de una moneda para el campo pedido, sin escalar.
    Devuelve una Serie vacia si no hay datos en el rango.
    """
    d = _pedir(f"{BASE}/Cotizaciones/{cod}",
               {"fechaDesde": desde, "fechaHasta": hasta, "limit": 1000})
    filas = {}
    for dia in d.get("results") or []:
        f = dia.get("fecha")
        if not f:
            continue
        for det in dia.get("detalle", []):
            if det.get("codigoMoneda") != cod:
                continue
            v = det.get(campo)
            if v:                       # descarta ceros del numerario
                filas[pd.Timestamp(f)] = float(v)
    return pd.Series(filas, dtype=float).sort_index()


def cruce_usd(cod: str, desde: str, hasta: str) -> pd.Series:
    """
    Dolares por unidad de `cod`, derivado como tipoCotizacion_j / tipoCotizacion_USD.

    Se evita tipoPase a proposito. Ese campo trae 6 decimales fijos, lo que
    para monedas de valor bajo deja muy pocas cifras significativas: el peso
    colombiano cotiza 0.000248 y la ultima cifra vale 0,2%. El cociente de
    cotizaciones en pesos no tiene ese problema, porque ambos numeros son de
    magnitud comoda y el peso argentino se cancela exactamente.
    """
    j = serie(cod, desde, hasta)
    if not j.size:
        return j
    usd = serie("USD", desde, hasta)
    return (j / usd.reindex(j.index)).dropna()


def bajar(cod: str, desde: str = "1997-01-01", hasta: str | None = None,
          usar_cache: bool = True) -> pd.Series:
    """
    Serie completa de una moneda, en DOLARES POR UNIDAD, ya corregida por
    escala. Trocea por anio porque la API pagina, y cachea en disco.
    """
    hasta = hasta or pd.Timestamp.today().date().isoformat()
    CACHE.mkdir(parents=True, exist_ok=True)
    destino = CACHE / f"{cod}.csv"

    previo = pd.Series(dtype=float)
    if usar_cache and destino.exists():
        previo = pd.read_csv(destino, index_col=0, parse_dates=True).iloc[:, 0]
        if previo.size and previo.index.max() >= pd.Timestamp(hasta) - pd.Timedelta(days=5):
            return previo
        if previo.size:
            desde = (previo.index.max() + pd.Timedelta(days=1)).date().isoformat()

    trozos = []
    for a in range(pd.Timestamp(desde).year, pd.Timestamp(hasta).year + 1):
        d0 = max(pd.Timestamp(desde), pd.Timestamp(f"{a}-01-01")).date().isoformat()
        d1 = min(pd.Timestamp(hasta), pd.Timestamp(f"{a}-12-31")).date().isoformat()
        s = cruce_usd(cod, d0, d1)
        if s.size:
            trozos.append(s)
        time.sleep(0.3)

    nueva = pd.concat([previo] + trozos) if trozos else previo
    nueva = nueva[~nueva.index.duplicated(keep="last")].sort_index()
    nueva = nueva / ESCALA.get(cod, 1.0)
    nueva.to_csv(destino, header=[cod])
    return nueva


def bajar_socios(socios: dict | None = None, **kw) -> pd.DataFrame:
    socios = socios or SOCIOS_API
    out = {}
    for pais, cod in socios.items():
        try:
            s = bajar(cod, **kw)
            if s.size:
                out[pais] = s
                print(f"  {pais:18s} {cod}  n={s.size:5d}  "
                      f"{s.index.min().date()} -> {s.index.max().date()}")
            else:
                print(f"  {pais:18s} {cod}  SIN DATOS")
        except ErrorAPI as e:
            print(f"  {pais:18s} {cod}  ERROR: {e}")
    return pd.DataFrame(out)


if __name__ == "__main__":
    print("Control de consistencia de los campos")
    print(" ", verificar_consistencia())
    print()
    print("Descarga de socios")
    df = bajar_socios()
    print()
    print("Inicio de serie por moneda")
    for pais, cod in SOCIOS_API.items():
        if pais in df:
            print(f"  {pais:18s} {df[pais].dropna().index.min().date()}")
