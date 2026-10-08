# Validación de integración — 8 de octubre de 2026

## Ejecutado

- Compilación y `--check`: hash de la base de interfaz, sintaxis JavaScript y
  coincidencia de las plantillas generadas con sus fuentes.
- Tres pruebas Python: alineación diaria/mensual del dólar, días sin cotización,
  cache incremental y reemplazo del bloque de datos en cada generación.
- `datos-browser.cjs`: 39 controles en Chromium. Las 32 combinaciones de rubro
  y frecuencia usan exactamente las series oficiales del JSON. Las canastas de
  un socio reproducen los bilaterales de Brasil, China y Estados Unidos. La
  cotización coincide con su fecha. Sin fecha congelada ni enlaces a versiones locales.
- `browser-check.cjs`: 30 controles de escritorio/móvil, ambos temas, tooltip,
  fijación de lectura, teclado, equivalencia, carga, scroll, toque emulado y
  movimiento reducido.
- `ubicacion-browser.cjs`: 63 controles entre 320 y 1440 px, identidad en cabecera,
  selector y ayuda por hover/foco/clic, alineación y cargas independientes por flujo.
- Inspección visual de las capturas de escritorio y móvil.
- Revisión de Git: sin cambios en los motores de cálculo, bases de comercio,
  CSV, Excel, `estado.json` ni el workflow de actualización/publicación.
- Ejecución del generador original y del integrado con los mismos insumos
  (BCRA hasta 07/10/2026): igualdad exacta de todos los ejes, índices oficiales,
  bilaterales, pesos, coberturas y participaciones después de normalizar sólo
  los nombres de presentación. El único campo de datos añadido es `dolar`.

El HTML incluido utiliza el mismo corte ya publicado: **06/10/2026**. Se generó
mediante `generar_dashboard.generar()` a partir de ese JSON, con las correcciones
de nombres de presentación y la cotización nominal. No se editaron cifras ni el
HTML a mano. Los datos del corte local de septiembre no se incluyen en la base.

## Límites

Pruebas en Chromium headless; ancho, toque y movimiento reducido emulados. Sin
auditoría exhaustiva de accesibilidad/rendimiento ni pruebas en Firefox, Safari,
lectores de pantalla o dispositivos táctiles físicos.

No se ejecutó el workflow de publicación de GitHub durante la integración.
La descarga BCRA consultada para probar el generador llega al 07/10/2026; el
HTML versionado conserva el corte del 06/10 para coincidir con las otras salidas.
La base de exportaciones sigue en marzo de 2026, con el aviso del proceso vigente.

`Validar Atlas` repite las pruebas de compilación, integración y navegador en el
pull request y conserva las capturas como artefacto. No calcula ni publica datos.
