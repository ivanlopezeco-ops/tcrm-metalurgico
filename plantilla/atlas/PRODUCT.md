# Atlas v14 integrado al proceso diario

Interfaz aprobada en la variante local `tcrm-atlas-v14`, con logos compactos en
cabecera, selector de flujo visible y ayuda accesible por cursor, foco y toque.
Incluye las comparaciones opcionales, lectura fijada, equivalencia y animaciones
de esa versión. La canasta propia empieza vacía; Borrar limpia pesos y comparaciones.

Se preservan los motores Python del repositorio: fuentes, fórmulas, ventanas,
ponderadores y series oficiales. Los nombres con tilde se aplican sólo al JSON
del tablero; las claves de los CSV y Excel se conservan.

Los datos se insertan desde `generar_dashboard.py` en cada ejecución. La base de
interfaz no contiene la foto de datos del 11/09/2026. La cotización nominal del
BCRA alimenta exclusivamente el dólar equivalente y muestra su propia fecha.

La compilación se ejecuta con `npm run build`; `npm run check:build` detecta
plantillas desactualizadas. Las versiones locales anteriores se conservan.
