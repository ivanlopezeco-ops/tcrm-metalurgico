# Índice de Tipo de Cambio Real Metalúrgico

Tipo de cambio real específico del sector metalúrgico argentino, con
ponderadores propios para importaciones y exportaciones. Serie diaria desde
2003, base 17-dic-2015 = 100.

Se actualiza solo todos los días hábiles. Ver `PUESTA_EN_MARCHA.md`.

## Método

Reponderación de los tipos de cambio reales bilaterales que publica el BCRA,
usando la composición del comercio metalúrgico en lugar del comercio de
manufacturas total. Laspeyres geométrico encadenado, con ponderadores de
media móvil de 12 meses.

28 socios: los 13 del BCRA más 15 construidos con cotizaciones de la API de
Estadísticas Cambiarias del BCRA y precios del BIS.

## Salidas

Publicadas en GitHub Pages, en URLs estables.

| Archivo | Contenido |
|---|---|
| `index.html` | tablero interactivo |
| `tcrm_diario.csv` | 24 series diarias |
| `tcrm_mensual.csv` | promedios mensuales |
| `bilaterales.csv` | los 28 bilaterales |
| `ponderadores.csv` | vector vigente |
| `cobertura.csv` | cobertura de cada serie |

## Fuentes

BCRA (ITCRMSerie, API de Estadísticas Cambiarias), BIS (WS_LONG_CPI, WS_XRU),
BCP de Paraguay, y la base de comercio exterior de ADIMRA.
