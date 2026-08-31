"""
Banco de pruebas del pipeline de socios extra
=============================================

La pregunta que resuelve: si armo el bilateral de Paraguay con mis propias
fuentes, ¿como se que el resultado es correcto, si el BCRA no publica
Paraguay contra que comparar?

Respuesta: se corre el mismo pipeline sobre un socio que el BCRA SI publica
y se compara contra la serie oficial. Si reproduzco Chile con error de
decimas, el metodo esta validado y el resultado para Paraguay es confiable.

Este script hace dos pruebas:

  1. Identidad algebraica. Verifica que
       ITCRB_j = ITCRB_EEUU * (E_j/E_usd) * (P_j/P_us)
     usando los archivos real y nominal del BCRA. Prueba el algebra.

  2. Pipeline completo. Toma el IPC mensual implicito de un socio, lo pasa
     por la diarizacion, lo combina con el tipo de cambio diario y compara
     contra el ITCRB oficial. Prueba la diarizacion y el rebaseo, que es
     donde puede aparecer error real.
"""

from pathlib import Path

import numpy as np
import pandas as pd

from socios_extra import BASE_INDICE, bilateral
from tcrm_metalurgico import COL_BCRA, leer_bilaterales

BASE = Path(__file__).resolve().parent


def leer_nominales(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, sheet_name="ITCNM y bilaterales", skiprows=1)
    df.columns = [str(c).strip() for c in df.columns]
    df = df.rename(columns={"Período": "fecha"})
    df["fecha"] = pd.to_datetime(df["fecha"], errors="coerce")
    df = df.dropna(subset=["fecha"]).set_index("fecha").sort_index()
    cols = {g: c.replace("ITCRB", "ITCNB") for g, c in COL_BCRA.items()}
    nom = df[list(cols.values())].apply(pd.to_numeric, errors="coerce")
    nom.columns = list(cols.keys())
    return nom


def prueba_identidad(real: pd.DataFrame, nom: pd.DataFrame) -> pd.Series:
    """ITCRB_j reconstruido a partir de ITCRB_EEUU, el nominal y los precios."""
    precios = real / nom                      # P_j / P_arg
    rel = precios.div(precios["Estados Unidos"], axis=0)   # P_j / P_us
    fx = nom.div(nom["Estados Unidos"], axis=0)            # E_j / E_usd
    recon = real[["Estados Unidos"]].values * fx.values * rel.values
    recon = pd.DataFrame(recon, index=real.index, columns=real.columns)
    return ((recon / real - 1) * 100).abs().max()


def prueba_pipeline(real: pd.DataFrame, nom: pd.DataFrame,
                    socio: str) -> dict:
    """
    Corre el pipeline de socios_extra sobre un socio publicado por el BCRA,
    partiendo solo de informacion mensual de precios, como pasaria con un
    socio nuevo.
    """
    precios = real / nom
    rel_us = precios["Estados Unidos"]

    # IPC mensual del socio y de EEUU, tomados a fin de mes: es toda la
    # informacion de precios que tendriamos para un pais nuevo
    ipc_socio = (precios[socio]).resample("ME").last()
    ipc_us = rel_us.resample("ME").last()

    # tipo de cambio diario en dolares por unidad de la moneda del socio
    fx = nom[socio] / nom["Estados Unidos"]

    calc = bilateral(
        itcrb_eeuu=real["Estados Unidos"],
        ipc_socio_mensual=ipc_socio,
        ipc_eeuu_mensual=ipc_us,
        usd_por_unidad=fx,
        base=BASE_INDICE,
    )

    comp = pd.DataFrame({"oficial": real[socio], "calculado": calc}).dropna()
    comp = comp[comp.index >= "1997-02-01"]
    err = (comp["calculado"] / comp["oficial"] - 1) * 100
    return {
        "socio": socio,
        "dias": len(comp),
        "error medio abs %": err.abs().mean(),
        "error max %": err.abs().max(),
        "error ultimo dia %": err.iloc[-1],
    }


def main():
    real = leer_bilaterales(BASE / "datos" / "ITCRMSerie.xlsx")
    nom = leer_nominales(BASE / "datos" / "ITCNMSerie.xlsx")
    idx = real.index.intersection(nom.index)
    real, nom = real.loc[idx], nom.loc[idx]

    print("PRUEBA 1 - identidad algebraica")
    print("error maximo por socio, en % (deberia ser ~0):")
    print(prueba_identidad(real, nom).round(9).to_string())

    print()
    print("PRUEBA 2 - pipeline completo partiendo de IPC mensual")
    filas = [prueba_pipeline(real, nom, s)
             for s in ["Chile", "Mexico", "Uruguay", "Brasil", "China", "Japon"]]
    res = pd.DataFrame(filas).set_index("socio")
    print(res.round(4).to_string())
    return res


if __name__ == "__main__":
    main()
