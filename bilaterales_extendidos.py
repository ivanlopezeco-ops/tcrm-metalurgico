"""
Bilaterales extendidos: Paraguay, Colombia y Peru
=================================================

Arma el ITCRB de los tres socios andinos y del Cono Sur que el BCRA no
publica, a partir de fuentes nacionales, y mide el error introducido por
las limitaciones de cada fuente.

Limitacion conocida: el BCP y el Banco de la Republica publican tipo de
cambio MENSUAL en los archivos disponibles, mientras que el BCRP publica
diario. Para Paraguay y Colombia hay que interpolar. La prueba
`costo_fx_mensual` mide cuanto error introduce eso, degradando la serie
diaria de Peru a mensual y comparando contra su propia version diaria.
"""

from pathlib import Path

import numpy as np
import pandas as pd

import fuentes_nacionales as fn
from socios_extra import BASE_INDICE, diarizar_ipc
from tcrm_metalurgico import leer_bilaterales

BASE = Path(__file__).resolve().parent


def diarizar_fx(fx: pd.Series, dias: pd.DatetimeIndex) -> pd.Series:
    """
    Lleva una serie cambiaria a frecuencia diaria.

    Si ya es diaria, solo arrastra fines de semana y feriados. Si es mensual,
    reparte geometricamente la variacion entre los dias del mes, con el mismo
    criterio que se usa para el IPC.
    """
    s = fx.dropna().sort_index()
    dias_por_obs = np.median(np.diff(s.index.values).astype("timedelta64[D]").astype(int))
    if dias_por_obs <= 3:                       # ya es diaria
        return s.reindex(s.index.union(dias)).ffill().reindex(dias)

    ln = np.log(s)
    ln_d = ln.reindex(ln.index.union(dias)).interpolate(method="time").reindex(dias)
    return np.exp(ln_d).ffill()


def bilateral_extendido(itcrb_eeuu: pd.Series, ipc_local: pd.Series,
                        ipc_eeuu: pd.Series, fx_local_por_usd: pd.Series | None,
                        base: pd.Timestamp = BASE_INDICE,
                        hasta: pd.Timestamp | None = None) -> pd.Series:
    """
    ITCRB_j = ITCRB_EEUU * (USD por unidad de j) * (P_j / P_us), rebasado a 100.

    fx_local_por_usd viene en MONEDA LOCAL POR DOLAR y se invierte adentro.
    None para economias dolarizadas.
    """
    dias = itcrb_eeuu.dropna().index
    if hasta is not None:
        dias = dias[dias <= hasta]

    p_j = diarizar_ipc(ipc_local, dias[-1]).reindex(dias).ffill()
    p_us = diarizar_ipc(ipc_eeuu, dias[-1]).reindex(dias).ffill()

    if fx_local_por_usd is None:
        usd_por_unidad = pd.Series(1.0, index=dias)
    else:
        usd_por_unidad = 1.0 / diarizar_fx(fx_local_por_usd, dias)

    real = itcrb_eeuu.reindex(dias) * usd_por_unidad * (p_j / p_us)
    real = real.dropna()

    ancla = real.reindex([base]).dropna()
    if ancla.empty:
        ancla = real.iloc[[0]]
    return real / ancla.iloc[0] * 100.0


# --------------------------------------------------------------------------
# Pruebas
# --------------------------------------------------------------------------

def costo_fx_mensual(itcrb_eeuu, ipc_pe, ipc_us) -> dict:
    """
    Cuanto error introduce tener el tipo de cambio solo mensual.

    Peru tiene serie diaria. Se arma su bilateral dos veces, una con la serie
    diaria y otra degradandola a fin de mes e interpolando, y se comparan.
    Es el error que cabe esperar en Paraguay y Colombia.
    """
    fx_d = fn.fx_peru()
    fx_m = fx_d.resample("ME").last()

    a = bilateral_extendido(itcrb_eeuu, ipc_pe, ipc_us, fx_d)
    b = bilateral_extendido(itcrb_eeuu, ipc_pe, ipc_us, fx_m)
    comp = pd.DataFrame({"diario": a, "mensual": b}).dropna()
    err = (comp["mensual"] / comp["diario"] - 1) * 100
    return {
        "error medio abs %": err.abs().mean(),
        "error p95 %": err.abs().quantile(0.95),
        "error max %": err.abs().max(),
        "prom. mensual, error medio abs %":
            (comp.resample("ME").mean().pipe(lambda x: (x["mensual"] / x["diario"] - 1) * 100)
             .abs().mean()),
    }


def construir() -> tuple[pd.DataFrame, pd.DataFrame]:
    real = leer_bilaterales(BASE / "datos" / "ITCRMSerie.xlsx")
    us = real["Estados Unidos"]
    ipc_us = fn.cpi_eeuu()

    especificacion = {
        "Peru": (fn.ipc_peru(), fn.fx_peru()),
        "Paraguay": (fn.ipc_paraguay(), fn.fx_paraguay()),
        "Colombia": (fn.ipc_colombia(), fn.fx_colombia()),
    }

    series, meta = {}, []
    for pais, (ipc, fx) in especificacion.items():
        # el bilateral no puede ir mas alla del ultimo dato cambiario real
        tope = fx.index.max()
        if tope.day == 1:                      # dato mensual fechado al inicio
            tope = tope + pd.offsets.MonthEnd(0)
        s = bilateral_extendido(us, ipc, ipc_us, fx, hasta=tope)
        series[pais] = s
        meta.append({
            "socio": pais,
            "frecuencia FX": "diaria" if len(fx) > 2000 else "mensual",
            "FX hasta": fx.index.max().date(),
            "IPC hasta": ipc.index.max().date(),
            "serie desde": s.index.min().date(),
            "serie hasta": s.index.max().date(),
            "nivel actual": round(s.iloc[-1], 1),
        })

    return pd.DataFrame(series), pd.DataFrame(meta)


def main():
    real = leer_bilaterales(BASE / "datos" / "ITCRMSerie.xlsx")
    ipc_us = fn.cpi_eeuu()

    print("COSTO DE TENER EL TIPO DE CAMBIO SOLO MENSUAL")
    print("(se degrada la serie diaria de Peru y se compara contra si misma)")
    for k, v in costo_fx_mensual(real["Estados Unidos"], fn.ipc_peru(), ipc_us).items():
        print(f"  {k:38s} {v:.4f}")

    print()
    print("BILATERALES CONSTRUIDOS")
    ext, meta = construir()
    print(meta.to_string(index=False))

    print()
    print("Niveles al ultimo dato comun, base 17-dic-2015 = 100")
    comp = pd.concat([ext, real[["Brasil", "Chile", "Uruguay", "Estados Unidos"]]], axis=1)
    print(comp.dropna().iloc[-1].round(1).to_string())

    ext.to_csv(BASE / "salida" / "bilaterales_extendidos.csv")
    return ext, meta


if __name__ == "__main__":
    main()
