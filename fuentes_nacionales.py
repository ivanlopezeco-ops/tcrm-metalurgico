"""
Lectores de las fuentes nacionales
==================================

Cada banco central publica en un formato distinto. Estas funciones los
normalizan a dos objetos:

    fx  : pd.Series indexada por fecha, MONEDA LOCAL POR DOLAR
    ipc : pd.Series indexada por mes, nivel del indice (base irrelevante)

La conversion a dolares por unidad (que es lo que consume socios_extra) se
hace despues, invirtiendo.
"""

from pathlib import Path

import numpy as np
import pandas as pd

FUENTES = Path(__file__).resolve().parent / "fuentes"   # solo el IPC de Paraguay (BCP)

MESES_ES = {"ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
            "JUL": 7, "AGO": 8, "SET": 9, "SEP": 9, "OCT": 10, "NOV": 11, "DIC": 12}
MESES_BCRP = {"Ene": 1, "Feb": 2, "Mar": 3, "Abr": 4, "May": 5, "Jun": 6,
              "Jul": 7, "Ago": 8, "Set": 9, "Sep": 9, "Oct": 10, "Nov": 11, "Dic": 12}
MESES_EN = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
            "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12}


def _num(x):
    if isinstance(x, (int, float)) and not isinstance(x, bool):
        return float(x) if np.isfinite(x) else np.nan
    s = str(x).strip()
    if s in ("", ".", "n.d.", "nan", "None", "-"):
        return np.nan
    try:
        return float(s.replace(",", ""))
    except ValueError:
        return np.nan


# --------------------------------------------------------------------------
# Estados Unidos - BLS, CPI-U all items, NSA
# --------------------------------------------------------------------------

def cpi_eeuu(path: Path = None) -> pd.Series:
    path = path or FUENTES / "SeriesReport-20260828095753_c42e7a.xlsx"
    d = pd.read_excel(path, header=None)
    enc = d.index[d[0].astype(str).str.strip() == "Year"][0]
    cab = [str(x).strip() for x in d.iloc[enc]]
    cols = {c: i for i, c in enumerate(cab) if c in MESES_EN}
    fuera = {}
    for _, fila in d.iloc[enc + 1:].iterrows():
        try:
            anio = int(float(fila[0]))
        except (TypeError, ValueError):
            continue
        for mes, i in cols.items():
            v = _num(fila[i])
            if not np.isnan(v):
                fuera[pd.Timestamp(anio, MESES_EN[mes], 1)] = v
    return pd.Series(fuera).sort_index().rename("CPI EEUU")


# --------------------------------------------------------------------------
# Peru - BCRP
# --------------------------------------------------------------------------

def _bcrp(path: Path, hoja: str) -> pd.DataFrame:
    d = pd.read_excel(path, sheet_name=hoja, header=None)
    return d.dropna(how="all")


def fx_peru(path: Path = None) -> pd.Series:
    """TC interbancario, soles por dolar, diario."""
    path = path or FUENTES / "Diarias-20260828-085046.xlsx"
    d = _bcrp(path, "Diarias")
    fuera = {}
    for _, f in d.iterrows():
        t = str(f[0]).strip()          # formato 01Jul91, mes en espanol
        if len(t) < 7:
            continue
        dia, mes, anio = t[:2], t[2:5].capitalize(), t[5:]
        if mes not in MESES_BCRP or not (dia.isdigit() and anio.isdigit()):
            continue
        a = int(anio)
        a += 1900 if a >= 50 else 2000
        v = _num(f[1])
        if not np.isnan(v):
            fuera[pd.Timestamp(a, MESES_BCRP[mes], int(dia))] = v
    return pd.Series(fuera).sort_index().rename("PEN/USD")


def ipc_peru(path: Path = None) -> pd.Series:
    """IPC Lima Metropolitana, mensual."""
    path = path or FUENTES / "Mensuales-20260828-084856.xlsx"
    d = _bcrp(path, "Mensuales")
    fuera = {}
    for _, f in d.iterrows():
        t = str(f[0]).strip()
        if len(t) < 5:
            continue
        mes, anio = t[:3], t[3:]
        if mes not in MESES_BCRP or not anio.isdigit():
            continue
        a = int(anio)
        a += 1900 if a >= 50 else 2000
        v = _num(f[1])
        if not np.isnan(v):
            fuera[pd.Timestamp(a, MESES_BCRP[mes], 1)] = v
    return pd.Series(fuera).sort_index().rename("IPC Peru")


# --------------------------------------------------------------------------
# Paraguay - BCP
# --------------------------------------------------------------------------

def fx_paraguay(path: Path = None) -> pd.Series:
    """Guaranies por dolar. La fuente es MENSUAL."""
    path = path or FUENTES / "Tipo_de_cambio_nominal_03-08-2026.xlsx"
    d = pd.read_excel(path, sheet_name="Hoja1", header=None)
    # localizar la columna USD por el encabezado
    enc = d.index[d.apply(lambda r: r.astype(str).str.strip().eq("Peso").any(), axis=1)][0]
    fila = d.iloc[enc].astype(str).str.strip()
    col = fila.index[fila.str.startswith("USD")][0]
    fechas = pd.to_datetime(d[1], errors="coerce")
    s = pd.Series(d[col].map(_num).values, index=fechas).dropna()
    return s[~s.index.isna()].sort_index().rename("PYG/USD")


def ipc_paraguay(path: Path = None) -> pd.Series:
    """IPC area metropolitana de Asuncion, serie empalmada, mensual."""
    path = path or FUENTES / "IPC_desde_1950_Empalmada_a_4_agrupaciones_Web_BCP_PE.xlsx"
    d = pd.read_excel(path, sheet_name="Hoja2", header=None)
    enc = d.index[d[0].astype(str).str.strip() == "AÑO/MES"][0]
    col = 5  # INDICE GENERAL
    anio, fuera = None, {}
    for _, f in d.iloc[enc + 1:].iterrows():
        t = str(f[0]).strip().upper()
        if t.replace(".0", "").isdigit() and len(t.replace(".0", "")) == 4:
            anio = int(float(t))
            continue
        if t in MESES_ES and anio is not None:
            v = _num(f[col])
            if not np.isnan(v):
                fuera[pd.Timestamp(anio, MESES_ES[t], 1)] = v
    return pd.Series(fuera).sort_index().rename("IPC Paraguay")


# --------------------------------------------------------------------------
# Colombia - Banco de la Republica y DANE
# --------------------------------------------------------------------------

def fx_colombia(path: Path = None) -> pd.Series:
    """TRM, pesos por dolar. La fuente es MENSUAL, fin de mes."""
    path = path or FUENTES / "tipo_de_cambio_colombia.xlsx"
    d = pd.read_excel(path, sheet_name="Series de datos", header=None)
    # Banrep separa las palabras con espacios no separables
    txt = d.apply(lambda c: c.astype(str).str.replace("\xa0", " ", regex=False))
    enc = d.index[txt.apply(
        lambda r: r.str.contains("fin de mes", case=False).any(), axis=1)][0]
    fila = txt.iloc[enc]
    col = fila.index[fila.str.contains("fin de mes", case=False)][0]
    fechas = pd.to_datetime(d[0], errors="coerce")
    s = pd.Series(d[col].map(_num).values, index=fechas).dropna()
    return s[~s.index.isna()].sort_index().rename("COP/USD")


def ipc_colombia(path: Path = None) -> pd.Series:
    """IPC total, serie de empalme, mensual. Formato matriz mes x anio."""
    path = path or FUENTES / "anex-IPC-Indices-jul2026.xlsx"
    d = pd.read_excel(path, sheet_name="IndicesIPC", header=None)
    enc = d.index[d[0].astype(str).str.strip().str.lower() == "mes"][0]
    anios = {}
    for c in range(1, d.shape[1]):
        v = _num(d.iloc[enc, c])
        if not np.isnan(v) and 1900 < v < 2100:
            anios[c] = int(v)
    fuera = {}
    for _, f in d.iloc[enc + 1:].iterrows():
        t = str(f[0]).strip().upper()[:3]
        if t not in MESES_ES:
            continue
        for c, a in anios.items():
            v = _num(f[c])
            if not np.isnan(v):
                fuera[pd.Timestamp(a, MESES_ES[t], 1)] = v
    return pd.Series(fuera).sort_index().rename("IPC Colombia")


# --------------------------------------------------------------------------

def cargar_todo() -> dict:
    return {
        "EEUU": {"ipc": cpi_eeuu()},
        "Peru": {"fx": fx_peru(), "ipc": ipc_peru()},
        "Paraguay": {"fx": fx_paraguay(), "ipc": ipc_paraguay()},
        "Colombia": {"fx": fx_colombia(), "ipc": ipc_colombia()},
    }


if __name__ == "__main__":
    for pais, series in cargar_todo().items():
        for tipo, s in series.items():
            print(f"{pais:10s} {tipo:4s} n={len(s):6d}  "
                  f"{s.index.min().date()} -> {s.index.max().date()}  "
                  f"ultimo={s.iloc[-1]:,.4f}")
