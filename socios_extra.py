"""
Socios fuera del set del BCRA
=============================

El BCRA publica bilaterales para 13 socios. Para incorporar cualquier otro
pais alcanza con su tipo de cambio contra el dolar y su IPC, sin tocar nada
del lado argentino:

    ITCRB_j,t = ITCRB_EEUU,t * ( E_j,t / E_j,base ) * ( P_j,t / P_j,base )
                                                    / ( P_us,t / P_us,base )

donde E_j esta expresado en DOLARES POR UNIDAD de la moneda j (una suba
indica apreciacion de j contra el dolar). El peso, el IPC argentino, el
empalme de series y el uso del REM quedan todos absorbidos dentro de
ITCRB_EEUU, que el BCRA recalcula dos veces por mes.

La diarizacion del IPC replica la regla del BCRA:

    IPC_t = IPC_{t-1} * (1 + dIPC/100) ** (1/d)

con d = dias corridos del mes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

BASE_INDICE = pd.Timestamp("2015-12-17")


# --------------------------------------------------------------------------
# Catalogo de socios a incorporar
# --------------------------------------------------------------------------

@dataclass
class Socio:
    nombre: str
    moneda: str
    fuente_fx: str          # de donde sale el tipo de cambio diario
    fuente_ipc: str         # de donde sale el IPC mensual
    peg: bool = False       # tipo de cambio fijo contra el dolar
    nota: str = ""
    # peso en el flujo metalurgico, para priorizar
    peso_expo: float = 0.0
    peso_impo: float = 0.0


CATALOGO: dict[str, Socio] = {
    # --- Tanda 1: los que desbloquean el nivel empresa -------------------
    "Paraguay": Socio(
        "Paraguay", "PYG",
        fuente_fx="BCP - Banco Central del Paraguay, cotizacion referencial diaria",
        fuente_ipc="BCP - IPC mensual",
        peso_expo=3.31, peso_impo=0.46,
        nota="El BCP publica ambas series; el IPC lo elabora el propio banco central.",
    ),
    "Colombia": Socio(
        "Colombia", "COP",
        fuente_fx="Banco de la Republica - TRM diaria",
        fuente_ipc="DANE - IPC mensual",
        peso_expo=2.23, peso_impo=0.07,
        nota="La TRM es la tasa representativa del mercado, referencia oficial.",
    ),
    "Peru": Socio(
        "Peru", "PEN",
        fuente_fx="BCRP - tipo de cambio bancario venta, serie diaria",
        fuente_ipc="INEI / BCRP - IPC Lima Metropolitana",
        peso_expo=1.48, peso_impo=0.19,
        nota="El BCRP expone ambas series por API REST documentada.",
    ),

    # --- Tanda 2: peg al dolar, solo requieren IPC -----------------------
    "Emiratos Arabes Unidos": Socio(
        "Emiratos Arabes Unidos", "AED",
        fuente_fx="peg fijo 3,6725 AED/USD desde 1997",
        fuente_ipc="FCSC / FMI - IPC mensual",
        peg=True, peso_expo=4.25, peso_impo=0.06,
        nota="Principal destino no cubierto. El IPC nacional publica con rezago; "
             "conviene usar el FMI como fuente primaria.",
    ),
    "Qatar": Socio(
        "Qatar", "QAR",
        fuente_fx="peg fijo 3,64 QAR/USD",
        fuente_ipc="PSA Qatar / FMI - IPC mensual",
        peg=True, peso_expo=0.56,
    ),
    "Ecuador": Socio(
        "Ecuador", "USD",
        fuente_fx="dolarizado, sin tipo de cambio propio",
        fuente_ipc="INEC - IPC mensual",
        peg=True, peso_expo=0.54,
        nota="Al ser dolarizado el termino cambiario es exactamente 1: "
             "el bilateral es ITCRB EEUU corregido por el diferencial de IPC.",
    ),

    # --- Tanda 3 ---------------------------------------------------------
    "Tailandia": Socio(
        "Tailandia", "THB",
        fuente_fx="BCE - tipos de referencia diarios EUR/THB",
        fuente_ipc="MOC Tailandia / FMI - IPC mensual",
        peso_impo=5.39, peso_expo=0.21,
        nota="Es el faltante mas grande de importaciones y explica 16% del "
             "rubro autopartes. Via BCE hay que cruzar por el euro.",
    ),

    # --- Pendiente: requiere cuidado extra --------------------------------
    "Iraq": Socio(
        "Iraq", "IQD",
        fuente_fx="CBI / FMI - tipo de cambio oficial",
        fuente_ipc="CSO Iraq / FMI - IPC mensual",
        peso_expo=1.37,
        nota="NO es un peg constante: devaluacion en dic-2020 y revaluacion "
             "en feb-2023. Necesita serie cambiaria real, no una constante.",
    ),
    "Bolivia": Socio(
        "Bolivia", "BOB",
        fuente_fx="BCB - tipo de cambio oficial 6,96 BOB/USD",
        fuente_ipc="INE Bolivia - IPC mensual",
        peg=True, peso_expo=1.80,
        nota="EXCLUIR por ahora. El oficial esta vigente pero desde 2023 hay "
             "brecha cambiaria significativa, asi que el bilateral calculado "
             "al oficial no describe la competitividad real.",
    ),
}


# --------------------------------------------------------------------------
# Diarizacion del IPC (regla BCRA)
# --------------------------------------------------------------------------

def diarizar_ipc(ipc_mensual: pd.Series, hasta: pd.Timestamp,
                 arrastrar: bool = True) -> pd.Series:
    """
    Convierte un IPC mensual en una serie diaria repartiendo geometricamente
    la variacion de cada mes entre sus dias corridos.

    ipc_mensual: indexado por mes (cualquier dia del mes sirve).
    arrastrar:   si el ultimo mes disponible es anterior a `hasta`, replica
                 la variacion interanual mas reciente, como hace el BCRA para
                 los meses aun no publicados.
    """
    s = ipc_mensual.dropna().copy()
    if isinstance(s.index, pd.PeriodIndex):
        s.index = s.index.to_timestamp()
    else:
        s.index = pd.to_datetime(s.index).to_period("M").to_timestamp()
    s = s[~s.index.duplicated(keep="last")].sort_index()
    if s.empty:
        raise ValueError("IPC mensual vacio")

    var = s.pct_change()

    if arrastrar:
        fin = pd.Timestamp(hasta).to_period("M").to_timestamp()
        if s.index[-1] < fin:
            # variacion mensual implicita en la ultima interanual conocida
            if len(s) > 13:
                ia = (s.iloc[-1] / s.iloc[-13]) ** (1 / 12) - 1
            else:
                ia = var.dropna().tail(3).mean()
            faltantes = pd.date_range(
                s.index[-1] + pd.offsets.MonthBegin(1), fin, freq="MS")
            for m in faltantes:
                s.loc[m] = s.iloc[-1] * (1 + ia)
                var.loc[m] = ia
            s = s.sort_index()
            var = var.sort_index()

    dias = pd.date_range(s.index[0], hasta, freq="D")
    out = pd.Series(index=dias, dtype=float)
    out.iloc[0] = s.iloc[0]

    for m, v in var.dropna().items():
        d = m.days_in_month
        factor = (1 + v) ** (1 / d)
        tramo = pd.date_range(m, periods=d, freq="D")
        tramo = tramo[tramo <= hasta]
        if len(tramo) == 0:
            continue
        prev = out.loc[:tramo[0]].dropna()
        arranque = prev.iloc[-1] if len(prev) else s.loc[m] / (1 + v)
        out.loc[tramo] = arranque * factor ** np.arange(1, len(tramo) + 1)

    return out.ffill()


# --------------------------------------------------------------------------
# Construccion del bilateral
# --------------------------------------------------------------------------

def bilateral(itcrb_eeuu: pd.Series, ipc_socio_mensual: pd.Series,
              ipc_eeuu_mensual: pd.Series,
              usd_por_unidad: pd.Series | None = None,
              base: pd.Timestamp = BASE_INDICE) -> pd.Series:
    """
    Arma el ITCRB de un socio que el BCRA no publica.

    itcrb_eeuu:        serie diaria oficial del BCRA
    ipc_socio_mensual: IPC del socio, mensual
    ipc_eeuu_mensual:  CPI de Estados Unidos, mensual
    usd_por_unidad:    tipo de cambio diario en DOLARES POR UNIDAD de la moneda
                       del socio. None para paises dolarizados o con peg fijo.
    """
    dias = itcrb_eeuu.dropna().index
    hasta = dias[-1]

    p_j = diarizar_ipc(ipc_socio_mensual, hasta).reindex(dias).ffill()
    p_us = diarizar_ipc(ipc_eeuu_mensual, hasta).reindex(dias).ffill()

    if usd_por_unidad is None:
        fx = pd.Series(1.0, index=dias)
    else:
        fx = usd_por_unidad.reindex(dias).ffill()

    real = itcrb_eeuu.reindex(dias) * fx * (p_j / p_us)

    ancla = real.reindex([base]).dropna()
    if ancla.empty:
        ancla = real.dropna().iloc[[0]]
    return real / ancla.iloc[0] * 100.0


def resumen_catalogo() -> pd.DataFrame:
    filas = [{
        "socio": s.nombre, "moneda": s.moneda, "peg": s.peg,
        "% expo": s.peso_expo, "% impo": s.peso_impo,
        "fuente FX": s.fuente_fx, "fuente IPC": s.fuente_ipc, "nota": s.nota,
    } for s in CATALOGO.values()]
    return pd.DataFrame(filas)


if __name__ == "__main__":
    pd.set_option("display.width", 200)
    print(resumen_catalogo()[["socio", "moneda", "peg", "% expo", "% impo"]].to_string(index=False))
