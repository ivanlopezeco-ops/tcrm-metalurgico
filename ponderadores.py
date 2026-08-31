"""
Ponderadores moviles del comercio metalurgico
=============================================

Construye el vector de ponderadores por lado y por rubro con media movil de
12 meses, replicando el criterio del BCRA: se usa la ventana que termina el
mes anterior, aplicada desde el mes siguiente, y se arrastra el ultimo vector
disponible mientras no entre el dato nuevo.

Reglas de tratamiento de las bases:

  - Fila SIN rubro: no pertenece al universo metalurgico. Se descarta.
  - Fila CON rubro y SIN pais: es metalurgica, pero el origen o destino esta
    reservado por secreto estadistico. Se excluye del denominador, o sea que
    se reestima la participacion sobre lo declarado. Esto supone que lo
    oculto se reparte como lo visible.

Sobre ese ultimo supuesto: en exportaciones el secreto estadistico es cero en
todos los meses entre 2002 y 2019, y salta a 21,7% en enero de 2020,
quedando entre 17% y 26% desde entonces. No es supresion de casos chicos,
es un cambio de criterio de difusion. Los ponderadores anteriores a 2020
salen del 100% del flujo y los posteriores de alrededor del 80%, asi que la
serie de ponderadores tiene un quiebre de cobertura en esa fecha que hay que
documentar al publicar. En importaciones el problema es despreciable.

Ventanas: 12 meses para todo, salvo buques y embarcaciones, cuyo vector se
mueve 7,5% mensual con ventana de 12 contra 1,3% del resto de los rubros,
por tener pocas operaciones. Ese rubro va con 36 meses y queda marcado como
indicativo.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from tcrm_v2 import grupo

BASE = Path(__file__).resolve().parent
DIR = BASE / "datos" / "comercio"

ARCHIVOS = {
    "IMPO": "imopo_y_origenes.xlsx",
    "EXPO": "expo_y_origenes_por_mes.xlsx",
}

VENTANA_DEFECTO = 12
VENTANAS = {"Buques y embarcaciones": 36}


def leer(lado: str) -> pd.DataFrame:
    """Base mensual limpia: periodo, pais, rubro, grupo, valor."""
    d = pd.read_excel(DIR / ARCHIVOS[lado])
    d.columns = ["periodo", "pais", "rubro", "valor"]
    d["periodo"] = pd.PeriodIndex(d["periodo"].astype(str), freq="M")

    metal = d.dropna(subset=["rubro"]).copy()
    metal["declarado"] = metal["pais"].notna()
    metal["grupo"] = metal["pais"].map(lambda p: grupo(p) if pd.notna(p) else None)
    metal.attrs["descartado_sin_rubro"] = d["valor"].sum() - metal["valor"].sum()
    return metal


def secreto(df: pd.DataFrame) -> pd.Series:
    """Participación mensual del flujo con país reservado."""
    tot = df.groupby("periodo")["valor"].sum()
    ocu = df[~df["declarado"]].groupby("periodo")["valor"].sum()
    return (ocu.reindex(tot.index).fillna(0) / tot * 100)


def vector(df: pd.DataFrame, ventana: int) -> tuple[pd.DataFrame, pd.Series]:
    """
    Ponderadores moviles y cobertura, sobre el flujo con país declarado.

    Devuelve (w, cobertura) indexados por el mes en que TERMINA la ventana.
    """
    dec = df[df["declarado"]]
    base = dec.groupby("periodo")["valor"].sum()                 # denominador
    cub = dec[dec["grupo"].notna()]
    piv = cub.pivot_table(index="periodo", columns="grupo",
                          values="valor", aggfunc="sum")

    idx = pd.period_range(df["periodo"].min(), df["periodo"].max(), freq="M")
    piv = piv.reindex(idx).fillna(0.0)
    base = base.reindex(idx).fillna(0.0)

    roll = piv.rolling(ventana, min_periods=ventana).sum()
    rbase = base.rolling(ventana, min_periods=ventana).sum()

    cobertura = (roll.sum(axis=1) / rbase).dropna()
    w = roll.div(roll.sum(axis=1), axis=0).dropna(how="all")
    return w, cobertura


def a_diario(w: pd.DataFrame, dias: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Lleva los ponderadores mensuales a frecuencia diaria con el criterio del
    BCRA: la ventana que cierra en el mes M rige desde el primer dia de M+2,
    y el ultimo vector se arrastra mientras no haya dato nuevo.
    """
    d = w.copy()
    d.index = (w.index + 2).to_timestamp()
    return d.reindex(d.index.union(dias)).ffill().reindex(dias)


def todos(lado: str) -> dict:
    """Ponderadores para el total y para cada rubro."""
    df = leer(lado)
    salida = {"__base": df, "__secreto": secreto(df)}

    w, cob = vector(df, VENTANA_DEFECTO)
    salida["TOTAL"] = {"w": w, "cobertura": cob, "ventana": VENTANA_DEFECTO,
                       "peso": 1.0}

    total = df["valor"].sum()
    for rubro in df["rubro"].unique():
        sub = df[df["rubro"] == rubro]
        v = VENTANAS.get(rubro, VENTANA_DEFECTO)
        w, cob = vector(sub, v)
        salida[rubro] = {"w": w, "cobertura": cob, "ventana": v,
                         "peso": sub["valor"].sum() / total}
    return salida


if __name__ == "__main__":
    for lado in ARCHIVOS:
        p = todos(lado)
        df, sec = p["__base"], p["__secreto"]
        print(f"===== {lado}")
        print(f"  universo metalurgico  {df['valor'].sum()/1e9:8.1f} mM USD")
        print(f"  descartado sin rubro  {df.attrs['descartado_sin_rubro']/1e9:8.1f} mM")
        print(f"  periodo               {df['periodo'].min()} -> {df['periodo'].max()}")
        print(f"  secreto estadistico   {sec.tail(12).mean():.1f}% (ultimos 12 meses)")
        print("  rubro                            peso   ventana  cobertura")
        for k, v in p.items():
            if k.startswith("__"):
                continue
            print(f"    {k:<30s} {v['peso']*100:5.1f}%   {v['ventana']:>2d}m   "
                  f"{v['cobertura'].iloc[-1]*100:5.1f}%")
        print()
