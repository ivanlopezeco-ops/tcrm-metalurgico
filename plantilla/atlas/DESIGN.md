# Diseño conservado de Atlas v14

Poppins y Manrope, azul institucional, superficies con profundidad y movimiento
con soporte para reducción de animaciones. Los logos conservan 22 px de alto en
escritorio y 20 px en móvil. El selector de flujo aparece antes del selector de
rubro. En móvil, la carga de países de la canasta propia aparece primero.

Los módulos JS y CSS proceden de la versión local aprobada. El único ajuste de
contenido para integración es el pie «Atlas v14 · ADIMRA», que elimina la fecha
congelada y los enlaces a carpetas locales que no existen en GitHub Pages.

`base.html` conserva el esqueleto congelado de v8, con un marcador para los datos;
su hash se verifica al compilar. Los módulos posteriores se integran desde
`build.cjs`. Logos y Poppins se embeben en las plantillas, con la licencia OFL.
