# Índice de Tipo de Cambio Real Metalúrgico

Tipo de cambio real específico del sector metalúrgico argentino, con
ponderadores propios para importaciones y exportaciones. Serie diaria desde
2003, base 17-dic-2015 = 100.

Se actualiza solo todos los días hábiles. Ver `PUESTA_EN_MARCHA.md`.

## Tablero Atlas v14

La interfaz Atlas v14 conserva las series oficiales con ponderadores móviles
y la canasta propia con pesos fijos. Incluye comparación opcional con BCRA,
Estados Unidos y canastas sectoriales, lectura de puntos y dólar equivalente.
El selector de importaciones/exportaciones explica el uso de orígenes y destinos.

Los módulos editables están en `plantilla/atlas/`. `build.cjs` los integra sobre
una base de interfaz congelada **sin datos** y genera `plantilla/cabecera.html`
y `plantilla/cuerpo.html`. No editar esas plantillas generadas ni `publico/index.html`.

```sh
npm ci
npm run build
python generar_dashboard.py
```

La actualización diaria sigue ejecutando `python actualizar.py`: inserta las
series calculadas en las plantillas y genera el HTML autocontenido. Las plantillas
compiladas se versionan; el proceso diario no necesita Node. La cotización nominal
del USD (`tipoCotizacion` del BCRA) se guarda aparte y se actualiza incrementalmente
para la equivalencia; no interviene en el cálculo de los índices.

Para comprobar compilación, integración y navegación:

```sh
npm run check:build
python -m unittest discover -s tests -p 'test_*.py'
npx playwright install chromium
npm test
```

`Validar Atlas` ejecuta estos controles en los pull requests y guarda capturas.
Ese workflow no publica. `Actualizar TCRM` conserva su horario y su mecanismo de
publicación. Ver `plantilla/atlas/VALIDACION.md` para el alcance de las pruebas.

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
