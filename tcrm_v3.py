"""
TCRM Metalurgico - version 3
============================

Suma doce socios a los dieciseis que ya habia, combinando dos fuentes:

  - Tipo de cambio: API de Estadisticas Cambiarias del BCRA para once socios,
    y base WS_XRU del BIS para Tailandia, cuyo baht el BCRA no cotiza.
  - IPC: base WS_LONG_CPI del BIS, que publica series mensuales largas para
    63 paises y las construye justamente para calcular tipos de cambio reales
    efectivos.

El IPC del BIS se valido contra las fuentes nacionales que ya teniamos,
comparando variaciones mensuales desde 2005: Estados Unidos contra el BLS y
Peru contra el BCRP coinciden exactamente, y Colombia contra el DANE difiere
0,0032 puntos porcentuales en promedio, que es redondeo.

Sobre el tipo de cambio hay un matiz: el BIS publica promedio del periodo y
el BCRA la cotizacion de referencia, asi que difieren entre 0,42% y 0,94%
segun la moneda. Por eso para los once socios que estan en las dos fuentes
se usa el BCRA, que es consistente con el resto del indice, y el BIS se
reserva para Tailandia, que no tiene alternativa. Esa diferencia de
convencion queda documentada.

Paraguay no esta entre los 63 paises del BIS; su IPC sigue viniendo del BCP.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

import fuentes_nacionales as fn
from bilaterales_extendidos import bilateral_extendido
from tcrm_metalurgico import UMBRAL_COBERTURA, grupo_bcra, leer_bilaterales, leer_comercio

BASE = Path(__file__).resolve().parent
BASE_INDICE = pd.Timestamp("2015-12-17")

# --------------------------------------------------------------------------
# Socios que se construyen, y de donde sale cada insumo
# --------------------------------------------------------------------------

# (nombre, iso2 del BIS para el IPC, codigo de moneda en la API del BCRA)
CON_API_BCRA = [
    ("Sudafrica",       "ZA", "ZAR"),
    ("Suecia",          "SE", "SEK"),
    ("Republica Checa", "CZ", "CZK"),
    ("Turquia",         "TR", "TRY"),
    ("Dinamarca",       "DK", "DKK"),
    ("Israel",          "IL", "ILS"),
    ("Singapur",        "SG", "SGD"),
    ("Australia",       "AU", "AUD"),
    ("Noruega",         "NO", "NOK"),
    ("Nueva Zelandia",  "NZ", "NZD"),
    ("Rusia",           "RU", "RUB"),
]

# el baht no esta en la API del BCRA: tipo de cambio y IPC salen los dos del BIS
CON_XRU_BIS = [("Tailandia", "TH")]

# socios andinos y del Cono Sur, con IPC de fuente nacional
# Paraguay es el unico que necesita fuente nacional: no esta entre los 63
# paises del BIS. Colombia y Peru salieron del DANE y del BCRP hasta que se
# comprobo que el BIS reproduce esas series (Peru exacto, Colombia 0,0032
# puntos porcentuales de diferencia media), asi que ahora vienen del BIS y
# queda un solo parser de archivo en todo el sistema.
CON_IPC_NACIONAL = {
    "Paraguay": ("PYG", fn.ipc_paraguay),
}

CON_API_BCRA_EXTRA = [
    ("Colombia", "CO", "COP"),
    ("Peru",     "PE", "PEN"),
]

FAMILIAS = {
    "IMPO": {
        "Origen Brasil": ["Autopartes", "Maquinaria agrícola", "Carrocerias y remolques"],
        "Origen asiático": ["Equipos y aparatos eléctricos", "Otros productos de metal"],
        "Origen diversificado": ["Bienes de capital", "Equipamiento médico",
                                 "Buques y embarcaciones"],
    },
    "EXPO": {
        "Destino Brasil": ["Autopartes"],
        "Destino extrarregional": ["Otros productos de metal", "Bienes de capital",
                                   "Equipos y aparatos eléctricos"],
        "Destino regional": ["Maquinaria agrícola", "Buques y embarcaciones",
                             "Carrocerias y remolques"],
    },
}

# nombres tal como aparecen en las bases de comercio
ALIAS = {
    "Paraguay": ["paraguay"], "Colombia": ["colombia"], "Peru": ["peru"],
    "Sudafrica": ["sudafrica", "south africa"], "Suecia": ["suecia", "sweden"],
    "Republica Checa": ["republica checa", "czechia", "czech republic"],
    "Turquia": ["turquia", "turkey"], "Dinamarca": ["dinamarca", "denmark"],
    "Israel": ["israel"], "Singapur": ["singapur", "singapore"],
    "Australia": ["australia"], "Noruega": ["noruega", "norway"],
    "Nueva Zelandia": ["nueva zelandia", "nueva zelanda", "new zealand"],
    "Rusia": ["rusia", "russia", "rusia federacion de", "russian federation"],
    "Tailandia": ["tailandia", "thailand"],
}


# --------------------------------------------------------------------------
# Lectura de insumos
# --------------------------------------------------------------------------

def ipc_eeuu() -> pd.Series:
    """
    Denominador comun de todos los bilaterales.

    Se toma del BIS y no del BLS: la comparacion de variaciones mensuales
    desde 2005 dio coincidencia exacta entre las dos fuentes, y usar el BIS
    elimina un archivo mas que mantener.
    """
    return ipc_bis("US")


def ipc_bis(iso2: str) -> pd.Series:
    s = pd.read_csv(BASE / "datos" / "bis" / f"cpi_{iso2}.csv", index_col=0).iloc[:, 0]
    s.index = pd.PeriodIndex(s.index.astype(str), freq="M")
    return s.sort_index()


def fx_api_bcra(cod: str) -> pd.Series:
    """Moneda local por dolar (la API entrega dolares por unidad)."""
    s = pd.read_csv(BASE / "datos" / "api_bcra" / f"{cod}.csv", index_col=0).iloc[:, 0]
    s.index = pd.to_datetime(s.index, format="%Y-%m-%d")
    return (1.0 / s.sort_index())


def fx_xru_bis(iso2: str) -> pd.Series:
    """Moneda local por dolar, serie diaria del BIS."""
    d = pd.read_csv(BASE / "datos" / "bis" / f"xru_{iso2}.csv")
    s = pd.Series(pd.to_numeric(d["OBS_VALUE"], errors="coerce").values,
                  index=pd.to_datetime(d["TIME_PERIOD"], errors="coerce"))
    return s.dropna().sort_index()


def matriz_bilaterales() -> pd.DataFrame:
    bcra = leer_bilaterales(BASE / "datos" / "ITCRMSerie.xlsx")
    us, ipc_us = bcra["Estados Unidos"], ipc_eeuu()

    extra, origen = {}, {}

    for pais, (cod, leer_ipc) in CON_IPC_NACIONAL.items():
        fx = fx_api_bcra(cod)
        extra[pais] = bilateral_extendido(us, leer_ipc(), ipc_us, fx,
                                          base=BASE_INDICE, hasta=fx.index.max())
        origen[pais] = ("BCRA API", "nacional")

    for pais, iso2, cod in CON_API_BCRA + CON_API_BCRA_EXTRA:
        fx = fx_api_bcra(cod)
        extra[pais] = bilateral_extendido(us, ipc_bis(iso2), ipc_us, fx,
                                          base=BASE_INDICE, hasta=fx.index.max())
        origen[pais] = ("BCRA API", "BIS")

    for pais, iso2 in CON_XRU_BIS:
        fx = fx_xru_bis(iso2)
        extra[pais] = bilateral_extendido(us, ipc_bis(iso2), ipc_us, fx,
                                          base=BASE_INDICE, hasta=fx.index.max())
        origen[pais] = ("BIS XRU", "BIS")

    m = pd.concat([bcra, pd.DataFrame(extra)], axis=1)
    m.attrs["itcrm_bcra"] = bcra.attrs["itcrm_bcra"]
    m.attrs["origen"] = origen
    return m


def grupo(pais: str) -> str | None:
    g = grupo_bcra(pais)
    if g:
        return g
    p = str(pais).strip().lower()
    for nombre, alias in ALIAS.items():
        if p in alias:
            return nombre
    return None


# --------------------------------------------------------------------------
# Indice
# --------------------------------------------------------------------------

def indice(bil: pd.DataFrame, pesos_diarios: pd.DataFrame,
           base: pd.Timestamp = BASE_INDICE) -> pd.Series:
    """
    Laspeyres geometrico encadenado con ponderadores moviles, renormalizando
    cada dia sobre los socios con dato. Asi un socio que aparece tarde entra
    sin cortar la serie.
    """
    cols = [c for c in pesos_diarios.columns if c in bil.columns]
    W = pesos_diarios[cols]
    sub = bil[cols].reindex(W.index)

    dlog = np.log(sub.where(sub > 0)).diff()
    peso = dlog.notna() * W
    suma = peso.sum(axis=1)
    aporte = (dlog.fillna(0.0) * peso).sum(axis=1) / suma.where(suma > 0)

    s = np.exp(aporte.fillna(0.0).cumsum())
    s = s[suma.reindex(s.index).fillna(0) > 0]
    ancla = s.reindex([base]).dropna()
    return s / (ancla.iloc[0] if len(ancla) else s.iloc[0]) * 100.0


# --------------------------------------------------------------------------
# Ponderadores y construccion final
# --------------------------------------------------------------------------

ARCHIVOS = {"IMPO": "imopo_y_origenes.xlsx", "EXPO": "expo_y_origenes_por_mes.xlsx"}
VENTANA_DEFECTO = 12
VENTANAS = {"Buques y embarcaciones": 36}


def leer_base(lado: str) -> pd.DataFrame:
    """
    Base mensual de comercio.

    Fila sin rubro: no es metalurgica, se descarta.
    Fila con rubro y sin pais: es metalurgica pero el origen o destino esta
    reservado por secreto estadistico. Se excluye del denominador, o sea que
    la participacion se reestima sobre lo declarado.
    """
    d = pd.read_excel(BASE / "datos" / "comercio" / ARCHIVOS[lado])
    d.columns = ["periodo", "pais", "rubro", "valor"]
    d["periodo"] = pd.PeriodIndex(d["periodo"].astype(str), freq="M")
    d.loc[d["pais"].astype(str).str.contains("Manaos", na=False), "pais"] = "Brasil"
    m = d.dropna(subset=["rubro"]).dropna(subset=["pais"]).copy()
    m["grupo"] = m["pais"].map(grupo)
    return m


def pesos_moviles(df: pd.DataFrame, ventana: int) -> tuple[pd.DataFrame, pd.Series]:
    base_ = df.groupby("periodo")["valor"].sum()
    piv = (df[df["grupo"].notna()]
           .pivot_table(index="periodo", columns="grupo", values="valor", aggfunc="sum"))
    idx = pd.period_range(df["periodo"].min(), df["periodo"].max(), freq="M")
    piv = piv.reindex(idx).fillna(0.0)
    base_ = base_.reindex(idx).fillna(0.0)

    roll = piv.rolling(ventana, min_periods=ventana).sum()
    cobertura = (roll.sum(axis=1) / base_.rolling(ventana, min_periods=ventana).sum())
    w = roll.div(roll.sum(axis=1), axis=0).dropna(how="all")
    return w, cobertura.dropna()


# El empalme extiende la serie hacia atras congelando el primer vector de
# ponderadores disponible. Es necesario porque la base de comercio arranca en
# 2002-01 y, con media movil de 12 meses mas el rezago del criterio BCRA, el
# indice no podria empezar antes de 2003-02, mientras que los bilaterales
# llegan a 1997.
#
# El costo esta medido, no supuesto: repitiendo el ejercicio sobre el ITCRM
# del BCRA, congelar el vector de dic-2002 hacia atras da 1,43% de error medio
# y 3,27% maximo, decreciente hacia el punto de empalme (2,7% en 1997-98,
# menos de 0,6% en 2001-02). Es chico porque justamente ese tramo es el mas
# estable de toda la serie: la distancia entre el vector del BCRA de 1997-01 y
# el de 2002-12 es 7,5%, contra 22,5% entre 2002-12 y hoy. El gran corrimiento
# fue el ascenso de China, posterior a 2003.
#
# El tramo empalmado responde a que competitividad habria enfrentado el sector
# si hubiera comerciado como en 2002, y debe marcarse como tal al publicar.
EMPALMAR = True


def a_diario(w: pd.DataFrame, dias: pd.DatetimeIndex,
             empalmar: bool = EMPALMAR) -> pd.DataFrame:
    """La ventana que cierra en el mes M rige desde el primer dia de M+2."""
    d = w.copy()
    d.index = (w.index + 2).to_timestamp()
    d = d.reindex(d.index.union(dias)).ffill()
    if empalmar:
        d = d.bfill()          # congela el primer vector hacia atras
    return d.reindex(dias).dropna(how="all")


def inicio_empalme(w: pd.DataFrame) -> pd.Timestamp:
    """Fecha desde la cual los ponderadores son propios y no empalmados."""
    return (w.index.min() + 2).to_timestamp()


def construir():
    bil = matriz_bilaterales()
    series, meta = {}, []

    for lado in ARCHIVOS:
        df = leer_base(lado)
        total = df["valor"].sum()

        def agregar(nombre, sub, tipo, ventana=VENTANA_DEFECTO):
            w, cob = pesos_moviles(sub, ventana)
            series[nombre] = indice(bil, a_diario(w, bil.index))
            meta.append({"serie": nombre, "lado": lado, "tipo": tipo,
                         "ventana": ventana,
                         "peso_rubro": sub["valor"].sum() / total,
                         "cobertura": float(cob.iloc[-1]),
                         "publicable": float(cob.iloc[-1]) >= UMBRAL_COBERTURA,
                         "ponderadores_propios_desde": str(inicio_empalme(w).date()),
                         "tramo_empalmado": "1997-01 a "
                                            + str((inicio_empalme(w) - pd.Timedelta(days=1)).date())
                                            if EMPALMAR else ""})

        agregar(f"{lado} total", df, "total")
        for fam, rubros in FAMILIAS[lado].items():
            agregar(f"{lado} - {fam}", df[df["rubro"].isin(rubros)], "familia")
        for rubro in df.groupby("rubro")["valor"].sum().sort_values(ascending=False).index:
            agregar(f"{lado} - {rubro}", df[df["rubro"] == rubro], "rubro",
                    VENTANAS.get(rubro, VENTANA_DEFECTO))

    diario = pd.DataFrame(series)
    diario.insert(0, "ITCRM BCRA", bil.attrs["itcrm_bcra"].reindex(diario.index))
    return bil, diario, pd.DataFrame(meta)


def exportar():
    """Genera el Excel con todas las hojas."""
    bil, diario, meta = construir()
    salida = BASE / "salida"
    salida.mkdir(exist_ok=True)

    pond = {}
    for lado in ARCHIVOS:
        w, _ = pesos_moviles(leer_base(lado), VENTANA_DEFECTO)
        pond[lado] = w.iloc[-1] * 100
    pond = pd.DataFrame(pond).sort_values("IMPO", ascending=False)

    fuentes = pd.DataFrame(
        [{"socio": c,
          "tipo_de_cambio": bil.attrs["origen"].get(c, ("BCRA ITCRMSerie",) * 2)[0],
          "ipc": bil.attrs["origen"].get(c, ("BCRA ITCRMSerie",) * 2)[1],
          "desde": str(bil[c].dropna().index.min().date()),
          "hasta": str(bil[c].dropna().index.max().date())}
         for c in bil.columns])

    destino = salida / "TCRM_metalurgico.xlsx"
    with pd.ExcelWriter(destino, engine="openpyxl", datetime_format="yyyy-mm-dd") as xl:
        diario.round(4).to_excel(xl, sheet_name="Diario")
        diario.resample("ME").mean().round(4).to_excel(xl, sheet_name="Promedio mensual")
        bil.round(4).to_excel(xl, sheet_name="Bilaterales")
        pond.round(4).to_excel(xl, sheet_name="Ponderadores")
        meta.round(4).to_excel(xl, sheet_name="Cobertura", index=False)
        fuentes.to_excel(xl, sheet_name="Fuentes", index=False)
    return bil, diario, meta, destino


if __name__ == "__main__":
    bil, diario, meta, destino = exportar()
    print(destino, "|", bil.shape[1], "socios,", diario.shape[1] - 1, "series")
