"""
Actualizacion diaria del TCRM Metalurgico
========================================

Un solo comando que baja todo, valida y publica:

    python actualizar.py

Principio de diseno: SI UNA VALIDACION FALLA, NO SE PUBLICA. Es preferible
una serie con un dia de atraso que una con un error silencioso en un informe.
El script termina con codigo de salida distinto de cero, asi que un cron o
una accion de GitHub lo detecta y avisa.

Cadencia de cada insumo:

    diaria      bilaterales del BCRA, cotizaciones de la API del BCRA,
                tipo de cambio del baht (BIS WS_XRU)
    mensual     IPC de 18 paises (BIS WS_LONG_CPI), IPC de Paraguay (BCP)
    mensual     ponderadores del comercio exterior

Los insumos mensuales se arrastran entre publicaciones, igual que hace el
BCRA con los meses de IPC todavia no difundidos.

El unico paso que no se automatiza es la exportacion del comercio exterior
desde Power BI. El script avisa cuando ese archivo se esta quedando viejo,
pero no lo bloquea: con media movil de 12 meses, un mes de atraso mueve el
indice muy poco.

Salidas, todas en publico/ para que GitHub Pages las sirva:

    index.html          tablero interactivo autocontenido
    tcrm_diario.csv     24 series diarias
    tcrm_mensual.csv    promedios mensuales
    bilaterales.csv     los 28 bilaterales crudos
    ponderadores.csv    vector vigente por lado
    cobertura.csv       cobertura y ventana de cada serie
    TCRM_metalurgico.xlsx

Los CSV quedan en URLs estables, asi que Power BI, Excel o cualquier otra
herramienta pueden conectarse por web sin autenticacion.
"""

from __future__ import annotations

import os
import shutil
import sys
import time
import traceback
import zipfile
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import requests

BASE = Path(__file__).resolve().parent
DATOS = BASE / "datos"
SALIDA = BASE / "salida"
PUBLICO = BASE / "publico"
REGISTRO = SALIDA / "registro.txt"

URL_BCRA_XLSX = "https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/ITCRMSerie.xlsx"
URL_BIS = {
    "cpi": "https://data.bis.org/static/bulk/WS_LONG_CPI_csv_flat.zip",
    "xru": "https://data.bis.org/static/bulk/WS_XRU_csv_flat.zip",
}

# tolerancias de las validaciones
TOL_ITCRM = 1.0          # % de desvio al reproducir el ITCRM oficial
TOL_BILATERAL = 1e-6     # % al reproducir un bilateral con canasta de un socio
DIAS_MAX_ATRASO = 5      # antiguedad aceptable del ultimo dato del BCRA
MESES_MAX_COMERCIO = 6   # antiguedad aceptable de la base de comercio

bitacora: list[str] = []
alertas: list[str] = []


def log(msg: str = "", nivel: str = "") -> None:
    linea = f"{datetime.now():%H:%M:%S}  {nivel:<7}{msg}" if nivel else f"          {msg}"
    print(linea)
    bitacora.append(linea)


def alerta(msg: str) -> None:
    alertas.append(msg)
    log(msg, "AVISO")


class Fallo(RuntimeError):
    pass


# --------------------------------------------------------------------------
# Descargas
# --------------------------------------------------------------------------

def descargar(url: str, destino: Path, intentos: int = 4) -> Path:
    """Streaming con reanudacion por rango de bytes."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    parcial = destino.with_suffix(destino.suffix + ".parcial")
    for i in range(intentos):
        ya = parcial.stat().st_size if parcial.exists() else 0
        cab = {"User-Agent": "Mozilla/5.0"}
        if ya:
            cab["Range"] = f"bytes={ya}-"
        try:
            with requests.get(url, headers=cab, stream=True, timeout=600) as r:
                if r.status_code in (200, 206):
                    modo = "ab" if (r.status_code == 206 and ya) else "wb"
                    with open(parcial, modo) as f:
                        for t in r.iter_content(chunk_size=1 << 20):
                            if t:
                                f.write(t)
                elif not (r.status_code == 416 and ya):
                    r.raise_for_status()
            if destino.suffix in (".zip", ".xlsx"):
                zipfile.ZipFile(parcial).namelist()   # valida que no este truncado
            parcial.replace(destino)
            log(f"{destino.name}: {destino.stat().st_size/1e6:.1f} MB")
            return destino
        except Exception as e:
            log(f"{destino.name}: intento {i+1} fallo ({type(e).__name__})", "AVISO")
            time.sleep(3 * (i + 1))
    raise Fallo(f"no se pudo descargar {url}")


def paso_descargas() -> None:
    """Baja todas las fuentes. Con SIN_DESCARGA=1 usa lo que haya en disco,
    util para probar el resto del pipeline sin salir a internet."""
    if os.environ.get("SIN_DESCARGA"):
        log("Descargas salteadas (SIN_DESCARGA=1)", "PASO")
        return
    log("Descargando fuentes", "PASO")
    descargar(URL_BCRA_XLSX, DATOS / "ITCRMSerie.xlsx")

    for nombre, url in URL_BIS.items():
        descargar(url, DATOS / "bis" / f"{nombre}.zip")
    procesar_bis()

    log("Cotizaciones de la API del BCRA (incremental)")
    import api_bcra
    api_bcra.bajar_socios()


def procesar_bis() -> None:
    """Extrae del volcado del BIS solo lo que consume el pipeline."""
    def leer(z: Path) -> pd.DataFrame:
        zf = zipfile.ZipFile(z)
        csv = [n for n in zf.namelist() if n.lower().endswith(".csv")][0]
        df = pd.read_csv(zf.open(csv), low_memory=False)
        df.columns = [str(c).split(":")[0].strip() for c in df.columns]
        for c in ("FREQ", "REF_AREA", "UNIT_MEASURE", "COLLECTION"):
            if c in df.columns:
                df[c] = df[c].astype(str).str.split(":").str[0].str.strip()
        return df

    destino = DATOS / "bis"
    cpi = leer(destino / "cpi.zip")
    d = cpi[(cpi.FREQ == "M") & (cpi.UNIT_MEASURE == "628")].copy()
    d = d[d.TIME_PERIOD.astype(str).str.match(r"^\d{4}-\d{2}$")]
    d["OBS_VALUE"] = pd.to_numeric(d.OBS_VALUE, errors="coerce")
    for iso2 in ("TH", "ZA", "SE", "CZ", "TR", "DK", "IL", "SG",
                 "AU", "NO", "NZ", "RU", "US", "CL", "BR", "CO", "PE"):
        g = d[d.REF_AREA == iso2].dropna(subset=["OBS_VALUE"])
        if len(g):
            s = pd.Series(g.OBS_VALUE.values,
                          index=pd.PeriodIndex(g.TIME_PERIOD.astype(str), freq="M"))
            s[~s.index.duplicated(keep="last")].sort_index() \
                .to_frame("ipc").to_csv(destino / f"cpi_{iso2}.csv")

    xru = leer(destino / "xru.zip")
    th = xru[(xru.REF_AREA == "TH") & (xru.FREQ == "D")]
    if "COLLECTION" in th.columns and "A" in set(th.COLLECTION):
        th = th[th.COLLECTION == "A"]
    th = th.copy()
    th["OBS_VALUE"] = pd.to_numeric(th.OBS_VALUE, errors="coerce")
    th.dropna(subset=["OBS_VALUE"]).sort_values("TIME_PERIOD") \
      [["TIME_PERIOD", "OBS_VALUE"]].to_csv(destino / "xru_TH.csv", index=False)
    log("BIS procesado")


# --------------------------------------------------------------------------
# Validaciones
# --------------------------------------------------------------------------

def paso_validar(bil: pd.DataFrame, diario: pd.DataFrame) -> None:
    log("Validando", "PASO")
    from tcrm_v3 import indice

    # 1. frescura del dato del BCRA
    atraso = (pd.Timestamp.today().normalize() - bil["Brasil"].dropna().index.max()).days
    if atraso > DIAS_MAX_ATRASO:
        raise Fallo(f"el ultimo bilateral del BCRA tiene {atraso} dias de atraso")
    log(f"frescura del BCRA: {atraso} dias")

    # 2. una canasta de un solo socio debe devolver su propio bilateral
    for socio in ("Brasil", "Tailandia", "Peru"):
        if socio not in bil.columns:
            continue
        W = pd.DataFrame({socio: 1.0}, index=bil.index)
        c = pd.DataFrame({"i": indice(bil, W), "b": bil[socio]}).dropna()
        err = ((c.i / c.b - 1) * 100).abs().max()
        if err > TOL_BILATERAL:
            raise Fallo(f"canasta de un socio no reproduce {socio}: {err:.6f}%")
    log("canasta de un socio reproduce su bilateral")

    # 3. reproducir el ITCRM oficial con los ponderadores del propio BCRA
    p = pd.read_excel(DATOS / "ITCRMSerie.xlsx", sheet_name="Ponderadores", skiprows=1)
    p = p.rename(columns={"Período": "fecha"})
    p["fecha"] = pd.to_datetime(p["fecha"], errors="coerce")
    p = p.dropna(subset=["fecha"]).set_index("fecha")
    p.columns = [str(c).strip() for c in p.columns]
    ren = {"Brasil": "Brasil", "Canadá": "Canada", "Chile": "Chile",
           "Estados Unidos": "Estados Unidos", "México": "Mexico",
           "Uruguay": "Uruguay", "China": "China", "India": "India",
           "Japón": "Japon", "Reino Unido": "Reino Unido", "Suiza": "Suiza",
           "Zona Euro": "Zona Euro", "Vietnam": "Vietnam"}
    W = (p[list(ren)].rename(columns=ren) / 100).reindex(bil.index, method="ffill")
    rec = indice(bil, W.dropna(how="all"))
    ofi = bil.attrs["itcrm_bcra"]
    c = pd.DataFrame({"o": ofi, "r": rec}).dropna()
    c = c[c.index >= "2015-12-17"]
    err = ((c.r / c.o - 1) * 100).abs().mean()
    if err > TOL_ITCRM:
        raise Fallo(f"no reproduzco el ITCRM oficial: error medio {err:.3f}%")
    log(f"ITCRM oficial reproducido: error medio {err:.4f}%")

    # 4. las series no deben tener saltos absurdos
    for col in diario.columns:
        s = diario[col].dropna()
        if len(s) < 30:
            continue
        salto = s.pct_change().abs().tail(250).max() * 100
        if salto > 15:
            alerta(f"{col}: salto diario de {salto:.1f}% en el ultimo ano")
    log("saltos diarios revisados")

    # 5. antiguedad de la base de comercio
    from tcrm_v3 import leer_base
    for lado in ("IMPO", "EXPO"):
        ult = leer_base(lado)["periodo"].max()
        meses = (pd.Period(pd.Timestamp.today(), freq="M") - ult).n
        if meses > MESES_MAX_COMERCIO:
            alerta(f"la base de comercio de {lado} tiene {meses} meses de atraso "
                   f"(ultimo: {ult}); hay que reexportar desde Power BI")
        else:
            log(f"comercio {lado}: ultimo mes {ult} ({meses} de atraso)")


# --------------------------------------------------------------------------
# Publicacion
# --------------------------------------------------------------------------

def paso_publicar(bil: pd.DataFrame, diario: pd.DataFrame,
                  meta: pd.DataFrame, xlsx: Path) -> None:
    log("Publicando", "PASO")
    import generar_dashboard
    from tcrm_v3 import ARCHIVOS, VENTANA_DEFECTO, leer_base, pesos_moviles

    PUBLICO.mkdir(parents=True, exist_ok=True)

    diario.round(4).to_csv(PUBLICO / "tcrm_diario.csv")
    diario.resample("ME").mean().round(4).to_csv(PUBLICO / "tcrm_mensual.csv")
    bil.round(4).to_csv(PUBLICO / "bilaterales.csv")
    meta.round(4).to_csv(PUBLICO / "cobertura.csv", index=False)

    pond = {}
    for lado in ARCHIVOS:
        w, _ = pesos_moviles(leer_base(lado), VENTANA_DEFECTO)
        pond[lado] = w.iloc[-1] * 100
    pd.DataFrame(pond).sort_values("IMPO", ascending=False).round(4) \
        .to_csv(PUBLICO / "ponderadores.csv")

    if xlsx.exists():
        shutil.copy(xlsx, PUBLICO / xlsx.name)

    generar_dashboard.generar(PUBLICO / "index.html")

    ultimo = diario.dropna(how="all").index.max().date()
    (PUBLICO / "estado.json").write_text(pd.Series({
        "actualizado": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "ultimo_dato": str(ultimo),
        "series": int(diario.shape[1] - 1),
        "socios": int(bil.shape[1]),
        "avisos": alertas,
    }).to_json(indent=2), encoding="utf-8")

    log(f"{diario.shape[1]-1} series hasta {ultimo}")
    for f in sorted(PUBLICO.iterdir()):
        log(f"  {f.name}: {f.stat().st_size/1024:.0f} KB")


def main() -> int:
    inicio = time.time()
    log(f"TCRM Metalurgico - actualizacion {datetime.now():%Y-%m-%d %H:%M}", "INICIO")
    try:
        paso_descargas()

        log("Calculando", "PASO")
        import tcrm_v3
        import importlib
        importlib.reload(tcrm_v3)
        bil, diario, meta, destino = tcrm_v3.exportar()
        log(f"{bil.shape[1]} socios, {diario.shape[1]-1} series")

        paso_validar(bil, diario)
        paso_publicar(bil, diario, meta, destino)

        log(f"OK en {time.time()-inicio:.0f}s"
            + (f" con {len(alertas)} aviso(s)" if alertas else ""), "FIN")
        codigo = 0
    except Exception as e:
        log(f"{type(e).__name__}: {e}", "ERROR")
        log("NO SE PUBLICA. Las salidas anteriores quedan intactas.", "ERROR")
        bitacora.append(traceback.format_exc())
        codigo = 1

    SALIDA.mkdir(exist_ok=True)
    REGISTRO.write_text("\n".join(bitacora), encoding="utf-8")
    return codigo


if __name__ == "__main__":
    sys.exit(main())
