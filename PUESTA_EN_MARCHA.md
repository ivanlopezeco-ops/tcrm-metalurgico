# TCRM Metalúrgico — puesta en marcha

Cómo dejar el índice actualizándose solo, todos los días, sin intervención.

---

## Qué hace el sistema

Todas las mañanas, a las 8 hora argentina, GitHub ejecuta el proceso: baja las fuentes, recalcula las 24 series, corre cinco validaciones y publica. Si alguna validación falla, **no publica** y el workflow queda en rojo. Es preferible un día de atraso a un número equivocado en un informe.

No hace falta ninguna máquina prendida. Corre en la infraestructura de GitHub, que para repositorios públicos es gratis.

---

## Puesta en marcha, una sola vez

**1. Crear el repositorio.** Público, para que GitHub Pages sea gratuito.

**2. Subir los archivos** respetando esta estructura:

```
actualizar.py              orquestador
tcrm_v3.py                 cálculo del índice
generar_dashboard.py       arma el HTML
api_bcra.py                cliente de la API de cotizaciones
socios_extra.py            diarización del IPC y bilaterales
bilaterales_extendidos.py
fuentes_nacionales.py      parser del BCP (Paraguay)
validar_socios.py          banco de pruebas
plantilla/
    cabecera.html
    cuerpo.html
datos/
    comercio/
        imopo_y_origenes.xlsx
        expo_y_origenes_por_mes.xlsx
.github/workflows/actualizar.yml
```

**3. Configurar GitHub.** En *Settings > Pages*, poner Source en **GitHub Actions**. En *Settings > Actions > General*, poner Workflow permissions en **Read and write**.

**4. Probar.** En la pestaña *Actions*, elegir "Actualizar TCRM" y darle a *Run workflow*. Tarda unos minutos. Si sale verde, ya está funcionando.

---

## Direcciones que quedan publicadas

Reemplazá `USUARIO` y `REPO` por los tuyos.

| Qué | URL |
|---|---|
| Tablero | `https://USUARIO.github.io/REPO/` |
| Series diarias | `https://USUARIO.github.io/REPO/tcrm_diario.csv` |
| Promedios mensuales | `https://USUARIO.github.io/REPO/tcrm_mensual.csv` |
| Bilaterales (28 socios) | `https://USUARIO.github.io/REPO/bilaterales.csv` |
| Ponderadores vigentes | `https://USUARIO.github.io/REPO/ponderadores.csv` |
| Cobertura por serie | `https://USUARIO.github.io/REPO/cobertura.csv` |
| Excel completo | `https://USUARIO.github.io/REPO/TCRM_metalurgico.xlsx` |
| Estado de la última corrida | `https://USUARIO.github.io/REPO/estado.json` |

Son estables: la dirección no cambia, el contenido se actualiza solo.

---

## Conectar Power BI

*Obtener datos > Web*, y pegar la URL de `tcrm_diario.csv`. Sin autenticación, sin gateway, y funciona con licencia Free.

Con Free podés refrescar a mano desde Desktop y republicar. La actualización programada en el servicio puede requerir Pro; se verifica publicando y mirando si la opción aparece habilitada o gris.

**El dato siempre está fresco en el origen**, que era el objetivo. Cuándo lo trae Power BI depende de la licencia, pero eso ya no bloquea nada: el tablero HTML se actualiza solo y es la vía de distribución.

---

## Lo único que sigue siendo manual

Las dos exportaciones de comercio exterior desde Power BI, una vez por mes.

```dax
DEFINE
    COLUMN 'BASE UNIFICADA4'[__periodo] =
        FORMAT( 'BASE UNIFICADA4'[FechaCompleta], "YYYY-MM" )

EVALUATE
SUMMARIZECOLUMNS(
    'BASE UNIFICADA4'[__periodo],
    'PÁISES'[INDEC],
    'NCM Y RUBROS'[Rubro V2],
    "valor", SUM( 'BASE UNIFICADA4'[CIF(u$s)] )
)
ORDER BY 'BASE UNIFICADA4'[__periodo]
```

Se corre en DAX Studio con Output en **File**, y el resultado se sube a `datos/comercio/` reemplazando el archivo anterior. Para exportaciones, la misma consulta contra `Anexar1`, `PAISES` y `NCM y RUBROS`, con el FOB.

**No es urgente hacerlo puntualmente.** Con media móvil de 12 meses, un mes de atraso mueve el índice muy poco. El proceso avisa cuando el archivo pasa los 6 meses, pero no se detiene por eso.

---

## Las validaciones

| Control | Qué verifica |
|---|---|
| Frescura | que el último bilateral del BCRA no tenga más de 5 días |
| Canasta unitaria | que un solo socio devuelva su propio bilateral, error cero |
| ITCRM oficial | que el método reproduzca el índice del BCRA (hoy: 0,03%) |
| Saltos | que ninguna serie salte más de 15% en un día |
| Antigüedad | que la base de comercio no esté demasiado vieja |

Las primeras tres detienen la publicación. Las dos últimas solo avisan.

---

## Si el workflow sale en rojo

Entrar a *Actions*, abrir la corrida fallida y bajar el artefacto `registro-N`. Ahí está la bitácora completa con el paso exacto que falló.

Las causas más probables, en orden: el BCRA no publicó el archivo ese día, el BIS cambió el formato del CSV masivo, o el BCP cambió el formato del Excel del IPC de Paraguay. Las tres se detectan y ninguna llega a publicarse.

---

## Costo

Cero. GitHub Actions y Pages son gratuitos para repositorios públicos, todas las fuentes de datos son abiertas y sin clave, y no hace falta ninguna licencia de Power BI más allá de la Free.

---

## Advertencia

El repositorio es público, así que la base de comercio exterior de ADIMRA queda expuesta: montos por país, rubro y mes. Es una decisión tomada a conciencia, pero conviene tenerla presente y revisarla si en algún momento se agrega información más sensible.
