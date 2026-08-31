"""
Indice de Tipo de Cambio Real Metalurgico (TCRM-Met)
====================================================
Fase 1: reconstruccion con los 13 socios del BCRA.

Metodo: Laspeyres geometrico encadenado, identico al ITCRM del BCRA
(Metodologia BCRA, enero 2019), pero con ponderadores del comercio
metalurgico en lugar del comercio de manufacturas total.

    I_t = I_{t-1} * PROD_j ( e_jt / e_jt-1 ) ^ w_j

Como ITCRB_jt es proporcional a e_jt (el TCR bilateral), el cociente
diario es identico. Con ponderadores fijos la expresion colapsa a:

    I_t = PROD_j ( ITCRB_jt ) ^ w_j

que preserva automaticamente la base 17-dic-2015 = 100, porque todos
los ITCRB valen 100 en esa fecha.

Ventaja frente a construir el indice desde cero: el BCRA ya resuelve
los IPC extranjeros, la diarizacion geometrica, el empalme del IPC
argentino y el uso del REM para meses sin dato publicado, y recalcula
dos veces por mes.
"""

from __future__ import annotations

import io
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd

# --------------------------------------------------------------------------
# Configuracion
# --------------------------------------------------------------------------

URL_BCRA = "https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/ITCRMSerie.xlsx"
HOJA_DIARIA = "ITCRM y bilaterales"

BASE_DIR = Path(__file__).resolve().parent
DIR_DATOS = BASE_DIR / "datos"
DIR_SALIDA = BASE_DIR / "salida"

CSV_IMPO = "impo_origenes_y_rubros_2020_a_2026.csv"
CSV_EXPO = "destinos_y_rubro_expo_2020_a_2026.csv"

# Umbral de cobertura por debajo del cual una serie se marca como no publicable
UMBRAL_COBERTURA = 0.70
# Peso minimo del rubro en el flujo total. Al 10% quedan solo los rubros
# grandes: los chicos tienen ponderadores demasiado ruidosos, porque un
# embarque grande reordena la composicion geografica del periodo entero.
UMBRAL_PESO_RUBRO = 0.10


# --------------------------------------------------------------------------
# Mapeo de paises a los 13 grupos del BCRA
# --------------------------------------------------------------------------

def _nrm(s: str) -> str:
    """Minusculas, sin acentos, sin espacios extremos."""
    s = unicodedata.normalize("NFKD", str(s))
    return s.encode("ascii", "ignore").decode().lower().strip()


# Zona euro. Bulgaria adopto el euro el 1-ene-2026; con ponderadores fijos
# calculados sobre 2020-2026 se la deja fuera (peso < 0,1%). Si se pasa a
# ponderadores moviles hay que incorporarla desde 2026.
_EUROZONA = [
    "alemania", "republica federal de alemania", "germany",
    "austria", "belgica", "belgium", "croacia", "croatia", "chipre", "cyprus",
    "eslovaquia", "slovakia", "eslovenia", "slovenia", "espana", "spain",
    "estonia", "finlandia", "finland", "francia", "france", "grecia", "greece",
    "irlanda", "ireland", "italia", "italy", "letonia", "latvia",
    "lituania", "lithuania", "luxemburgo", "luxembourg", "malta",
    "paises bajos", "netherlands", "portugal",
]

_ALIAS = {
    "Brasil": ["brasil", "brazil", "zona franca manaos (brasil)"],
    "Estados Unidos": ["estados unidos", "united states of america", "united states"],
    "China": ["china", "china, republica popular", "china, people's republic of"],
    "Chile": ["chile"],
    "Uruguay": ["uruguay"],
    "Mexico": ["mexico"],
    "Canada": ["canada"],
    "Japon": ["japon", "japan"],
    "India": ["india"],
    "Vietnam": ["viet nam", "vietnam"],
    "Reino Unido": [
        "reino unido", "united kingdom",
        "united kingdom of great britain and northern ireland",
    ],
    "Suiza": ["suiza", "switzerland"],
}

_LOOKUP = {_nrm(a): g for g, alias in _ALIAS.items() for a in alias}
_LOOKUP.update({_nrm(p): "Zona Euro" for p in _EUROZONA})

# Nombre de la columna ITCRB en el archivo del BCRA para cada grupo
COL_BCRA = {
    "Brasil": "ITCRB Brasil",
    "Canada": "ITCRB Canadá",
    "Chile": "ITCRB Chile",
    "Estados Unidos": "ITCRB Estados Unidos",
    "Mexico": "ITCRB México",
    "Uruguay": "ITCRB Uruguay",
    "China": "ITCRB China",
    "India": "ITCRB India",
    "Japon": "ITCRB Japón",
    "Reino Unido": "ITCRB Reino Unido",
    "Suiza": "ITCRB Suiza",
    "Zona Euro": "ITCRB Zona Euro",
    "Vietnam": "ITCRB Vietnam",
}


def grupo_bcra(pais: str) -> str | None:
    """Devuelve el grupo BCRA del pais, o None si no esta cubierto."""
    return _LOOKUP.get(_nrm(pais))


# --------------------------------------------------------------------------
# Carga de datos
# --------------------------------------------------------------------------

def descargar_bilaterales(url: str = URL_BCRA, cache: Path | None = None) -> pd.DataFrame:
    """Baja el ITCRMSerie.xlsx del BCRA y devuelve los ITCRB diarios."""
    import requests

    if cache is not None and cache.exists():
        contenido = cache.read_bytes()
    else:
        resp = requests.get(url, timeout=90)
        resp.raise_for_status()
        contenido = resp.content
        if cache is not None:
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_bytes(contenido)

    return leer_bilaterales(io.BytesIO(contenido))


def leer_bilaterales(fuente) -> pd.DataFrame:
    """Lee la hoja diaria del archivo del BCRA."""
    df = pd.read_excel(fuente, sheet_name=HOJA_DIARIA, skiprows=1)
    df.columns = [str(c).strip() for c in df.columns]
    df = df.rename(columns={"Período": "fecha"})
    # El archivo cierra con filas de notas al pie que no son fechas
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df = df.dropna(subset=["fecha"]).set_index("fecha").sort_index()

    faltan = [c for c in COL_BCRA.values() if c not in df.columns]
    if faltan:
        raise ValueError(f"El archivo del BCRA no trae estas columnas: {faltan}")

    bil = df[list(COL_BCRA.values())].copy()
    bil.columns = list(COL_BCRA.keys())
    bil = bil.apply(pd.to_numeric, errors="coerce")
    # El indice del BCRA es la referencia oficial, se guarda para control
    bil.attrs["itcrm_bcra"] = pd.to_numeric(df["ITCRM"], errors="coerce")
    return bil.dropna(how="all")


def leer_comercio(path: Path) -> pd.DataFrame:
    """Lee el CSV de participaciones por pais y rubro."""
    df = pd.read_csv(path, encoding="utf-8-sig")
    df.columns = ["pais", "rubro", "pct"]
    df["pct"] = (
        df["pct"].astype(str)
        .str.replace("%", "", regex=False)
        .str.replace(".", "", regex=False)   # separador de miles
        .str.replace(",", ".", regex=False)  # separador decimal
        .astype(float)
    )
    df["grupo"] = df["pais"].map(grupo_bcra)
    return df


# --------------------------------------------------------------------------
# Ponderadores
# --------------------------------------------------------------------------

def ponderadores(df: pd.DataFrame, rubro: str | None = None) -> tuple[pd.Series, float, float]:
    """
    Vector de ponderadores renormalizado sobre los grupos del BCRA.

    Devuelve (pesos que suman 1, cobertura, peso del rubro en el flujo total).
    """
    total_flujo = df["pct"].sum()
    sub = df if rubro is None else df[df["rubro"] == rubro]
    bruto = sub["pct"].sum()
    if bruto == 0:
        raise ValueError(f"Rubro sin datos: {rubro}")

    cubierto = sub[sub["grupo"].notna()]
    w = cubierto.groupby("grupo")["pct"].sum()
    w = w.reindex(COL_BCRA.keys()).fillna(0.0)

    cobertura = w.sum() / bruto
    return w / w.sum(), cobertura, bruto / total_flujo


# --------------------------------------------------------------------------
# Calculo del indice
# --------------------------------------------------------------------------

def indice(bilaterales: pd.DataFrame, pesos: pd.Series) -> pd.Series:
    """
    Laspeyres geometrico encadenado con ponderadores fijos.

    Se calcula en logs por estabilidad numerica. Con w fijo el encadenamiento
    equivale al promedio geometrico ponderado de niveles, asi que la base
    17-dic-2015 = 100 se preserva sin renormalizar.
    """
    w = pesos.reindex(bilaterales.columns).fillna(0.0)
    if not np.isclose(w.sum(), 1.0):
        raise ValueError(f"Los ponderadores suman {w.sum():.6f}, deberian sumar 1")

    logs = np.log(bilaterales.where(bilaterales > 0))
    return np.exp(logs.mul(w, axis=1).sum(axis=1, min_count=len(w)))


def serie_completa(bilaterales: pd.DataFrame, comercio: pd.DataFrame,
                   etiqueta: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Calcula el agregado y un indice por cada rubro que supere el umbral de peso."""
    series, meta = {}, []

    w, cob, _ = ponderadores(comercio)
    series[f"{etiqueta} total"] = indice(bilaterales, w)
    meta.append({"serie": f"{etiqueta} total", "rubro": "TOTAL", "peso_rubro": 1.0,
                 "cobertura": cob, "publicable": cob >= UMBRAL_COBERTURA})

    pesos_rubro = (comercio.groupby("rubro")["pct"].sum() / comercio["pct"].sum())
    for rubro in pesos_rubro.sort_values(ascending=False).index:
        if pesos_rubro[rubro] < UMBRAL_PESO_RUBRO:
            continue
        w, cob, peso = ponderadores(comercio, rubro)
        nombre = f"{etiqueta} - {rubro}"
        series[nombre] = indice(bilaterales, w)
        meta.append({
            "serie": nombre, "rubro": rubro, "peso_rubro": peso,
            "cobertura": cob, "publicable": cob >= UMBRAL_COBERTURA,
        })

    return pd.DataFrame(series), pd.DataFrame(meta)


# --------------------------------------------------------------------------
# Ejecucion
# --------------------------------------------------------------------------

def main(fuente_bcra=None, dir_datos: Path = DIR_DATOS,
         dir_salida: Path = DIR_SALIDA) -> Path:
    if fuente_bcra is None:
        bil = descargar_bilaterales(cache=dir_datos / "ITCRMSerie.xlsx")
    else:
        bil = leer_bilaterales(fuente_bcra)

    impo = leer_comercio(dir_datos / CSV_IMPO)
    expo = leer_comercio(dir_datos / CSV_EXPO)

    s_impo, m_impo = serie_completa(bil, impo, "IMPO")
    s_expo, m_expo = serie_completa(bil, expo, "EXPO")

    diario = pd.concat([s_impo, s_expo], axis=1)
    diario.insert(0, "ITCRM BCRA", bil.attrs["itcrm_bcra"].reindex(diario.index))
    mensual = diario.resample("ME").mean()

    pond = pd.DataFrame({
        "IMPO": ponderadores(impo)[0],
        "EXPO": ponderadores(expo)[0],
    }) * 100

    meta = pd.concat([m_impo, m_expo], ignore_index=True)

    dir_salida.mkdir(parents=True, exist_ok=True)
    destino = dir_salida / "TCRM_metalurgico.xlsx"
    with pd.ExcelWriter(destino, engine="openpyxl", datetime_format="yyyy-mm-dd") as xl:
        diario.round(4).to_excel(xl, sheet_name="Diario")
        mensual.round(4).to_excel(xl, sheet_name="Promedio mensual")
        pond.round(4).to_excel(xl, sheet_name="Ponderadores")
        meta.round(4).to_excel(xl, sheet_name="Cobertura", index=False)

    return destino


if __name__ == "__main__":
    print(main())
