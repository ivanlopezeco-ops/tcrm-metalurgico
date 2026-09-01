"""
Genera el tablero HTML autocontenido a partir de las series calculadas.

Embebe los datos adentro del archivo, asi no necesita servidor ni API: se
abre en cualquier navegador y funciona. Es lo que se publica en GitHub Pages.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from tcrm_v3 import (ARCHIVOS, FAMILIAS, VENTANA_DEFECTO, VENTANAS, construir,
                     leer_base, matriz_bilaterales, pesos_moviles)

BASE = Path(__file__).resolve().parent
PLANTILLA = BASE / "plantilla"

# Rubros que no se muestran en el tablero. Siguen calculandose y siguen en los
# CSV y en el Excel; solo se ocultan de la interfaz. Buques y embarcaciones
# tiene pocas operaciones y su vector de ponderadores se mueve 7,5% mensual,
# seis veces mas que cualquier otro rubro.
OCULTAR_RUBROS = {"Buques y embarcaciones"}


def datos() -> dict:
    bil = matriz_bilaterales()
    grupos = list(bil.columns)

    def empaquetar(m: pd.DataFrame, ref: pd.Series) -> dict:
        return {
            "fechas": [d.strftime("%Y-%m-%d") for d in m.index],
            "itcrm": [None if pd.isna(v) else round(v, 2)
                      for v in ref.reindex(m.index)],
            "bil": {g: [None if pd.isna(v) else round(v, 3) for v in m[g]]
                    for g in grupos},
        }

    ofi = bil.attrs["itcrm_bcra"]
    presets = {}
    for lado in ARCHIVOS:
        df = leer_base(lado)
        total = df["valor"].sum()
        entradas = {}

        def agregar(nombre, sub, tipo, ventana=VENTANA_DEFECTO):
            w, cob = pesos_moviles(sub, ventana)
            ultimo = w.iloc[-1]
            entradas[nombre] = {
                "w": [round(float(ultimo.get(g, 0.0)), 6) for g in grupos],
                "cobertura": round(float(cob.iloc[-1]), 4),
                "peso": round(sub["valor"].sum() / total, 4),
                "tipo": tipo,
            }

        agregar("Total del intercambio", df, "total")
        for fam, rubros in FAMILIAS[lado].items():
            agregar(fam, df[df["rubro"].isin(rubros)], "familia")
        for rubro in df.groupby("rubro")["valor"].sum().sort_values(ascending=False).index:
            if rubro in OCULTAR_RUBROS:
                continue
            agregar(rubro, df[df["rubro"] == rubro], "rubro",
                    VENTANAS.get(rubro, VENTANA_DEFECTO))
        presets[lado] = entradas

    # Series oficiales precalculadas, con ponderadores moviles. El navegador
    # solo puede recalcular con un vector fijo, asi que para los presets se
    # muestran estas y el calculo en vivo queda para las canastas a medida.
    _, diario, _ = construir()
    # Se reindexan sobre el MISMO eje temporal que los bilaterales: el indice
    # arranca en 2003 (limitado por la base de comercio) y los bilaterales en
    # 1997, asi que sin esto el navegador dibujaria las series corridas.
    eje_m = bil.resample("ME").mean().index
    eje_d = bil.loc["2015-11-01":].index
    men = diario.resample("ME").mean().reindex(eje_m)
    dia = diario.reindex(eje_d)
    oficiales = {
        "mensual": {c: [None if pd.isna(v) else round(v, 3) for v in men[c]]
                    for c in men.columns if c != "ITCRM BCRA"},
        "diario": {c: [None if pd.isna(v) else round(v, 3) for v in dia[c]]
                   for c in dia.columns if c != "ITCRM BCRA"},
    }

    return {
        "grupos": grupos,
        "oficiales": oficiales,
        "mensual": empaquetar(bil.resample("ME").mean(), ofi.resample("ME").mean()),
        # el bloque diario arranca antes de la base (17-dic-2015) para que el
        # navegador pueda anclar exactamente ahi: ese dia es la salida del
        # cepo, el salto diario mas grande de la serie, y anclar en el
        # promedio de diciembre en vez del dia exacto desvia 17%
        "diario": empaquetar(bil.loc["2015-11-01":], ofi.loc["2015-11-01":]),
        "presets": presets,
        "actualizado": pd.Timestamp.today().strftime("%Y-%m-%d"),
    }


def generar(destino: Path) -> Path:
    d = datos()
    cabecera = (PLANTILLA / "cabecera.html").read_text(encoding="utf-8")
    cuerpo = (PLANTILLA / "cuerpo.html").read_text(encoding="utf-8")
    html = (cabecera
            + json.dumps(d, ensure_ascii=False, separators=(",", ":"))
            + ";</script>\n"
            + cuerpo)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(html, encoding="utf-8")
    return destino


if __name__ == "__main__":
    f = generar(BASE / "publico" / "index.html")
    print(f, f"{f.stat().st_size/1024:.0f} KB")
