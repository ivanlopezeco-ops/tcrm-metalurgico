"""
Genera el tablero HTML autocontenido a partir de las series calculadas.

Embebe los datos adentro del archivo, asi no necesita servidor ni API: se
abre en cualquier navegador y funciona. Es lo que se publica en GitHub Pages.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from tcrm_v3 import (ARCHIVOS, FAMILIAS, VENTANA_DEFECTO, VENTANAS,
                     leer_base, matriz_bilaterales, pesos_moviles)

BASE = Path(__file__).resolve().parent
PLANTILLA = BASE / "plantilla"


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
            agregar(rubro, df[df["rubro"] == rubro], "rubro",
                    VENTANAS.get(rubro, VENTANA_DEFECTO))
        presets[lado] = entradas

    return {
        "grupos": grupos,
        "mensual": empaquetar(bil.resample("ME").mean(), ofi.resample("ME").mean()),
        "diario": empaquetar(bil.loc["2024-01-01":], ofi.loc["2024-01-01":]),
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
