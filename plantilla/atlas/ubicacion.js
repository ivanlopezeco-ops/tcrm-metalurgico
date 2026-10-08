// Jerarquía de identidad y selección de flujo. No interviene en los cálculos.
const pieIdentidadV13 = document.createElement('footer');
pieIdentidadV13.className = 'pie-identidad';
pieIdentidadV13.setAttribute('aria-label', 'Identidad institucional y versión');
$('.view-note').before(pieIdentidadV13);
pieIdentidadV13.append($('.view-note'));

const ayudaFlujoV13 = document.createElement('div');
ayudaFlujoV13.id = 'ayudaFlujoV13';
ayudaFlujoV13.className = 'explicacion-flujo';
ayudaFlujoV13.setAttribute('role', 'tooltip');
ayudaFlujoV13.hidden = true;
document.body.append(ayudaFlujoV13);
let anclaAyudaV13 = null, ayudaFijadaV13 = false, cierreAyudaV13;

function cerrarAyudaFlujoV13() {
 clearTimeout(cierreAyudaV13);
 ayudaFlujoV13.hidden = true;
 ayudaFijadaV13 = false;
 if (anclaAyudaV13?.matches('.ayuda-flujo')) anclaAyudaV13.setAttribute('aria-expanded', 'false');
 anclaAyudaV13 = null;
}
function contenidoAyudaFlujoV13(flujo) {
 const propia = modo === 'empresa';
 const titulo = propia ? 'Compras y ventas tienen canastas separadas' : 'Cada flujo tiene su propia canasta';
 const seleccion = flujo === 'IMPO'
  ? (propia ? 'Mis compras: cargá los pesos de los países de origen.' : 'Importaciones: los países se ponderan según el origen de las compras metalúrgicas al exterior.')
  : flujo === 'EXPO'
   ? (propia ? 'Mis ventas: cargá los pesos de los países de destino.' : 'Exportaciones: los países se ponderan según el destino de las ventas metalúrgicas al exterior.')
   : (propia ? 'Compras usa países de origen; ventas, países de destino.' : 'Importaciones usa países de origen; exportaciones, países de destino.');
 const motivo = propia
  ? 'Cada opción conserva los pesos que cargaste para ese flujo. Si las composiciones difieren, también pueden cambiar el TCRM, sus variaciones y el dólar equivalente.'
  : 'Las compras y las ventas pueden tener distintos pesos por país. Al cambiar la composición de la canasta, también pueden cambiar el TCRM, sus variaciones y el dólar equivalente.';
 return {titulo, seleccion, motivo};
}
function mostrarAyudaFlujoV13(ancla, flujo, fijar = false) {
 if (ayudaFijadaV13 && !fijar) return;
 clearTimeout(cierreAyudaV13);
 const contenido = contenidoAyudaFlujoV13(flujo);
 ayudaFlujoV13.replaceChildren();
 const titulo = document.createElement('strong'); titulo.textContent = contenido.titulo;
 const seleccion = document.createElement('p'); seleccion.textContent = contenido.seleccion;
 const motivo = document.createElement('p'); motivo.textContent = contenido.motivo;
 ayudaFlujoV13.append(titulo, seleccion, motivo);
 if (anclaAyudaV13?.matches('.ayuda-flujo')) anclaAyudaV13.setAttribute('aria-expanded', 'false');
 anclaAyudaV13 = ancla; ayudaFijadaV13 = fijar; ayudaFlujoV13.hidden = false;
 if (ancla.matches('.ayuda-flujo')) ancla.setAttribute('aria-expanded', 'true');
 const r = ancla.getBoundingClientRect(), a = ayudaFlujoV13.getBoundingClientRect();
 const x = Math.max(12, Math.min(innerWidth - a.width - 12, r.left));
 const y = r.bottom + a.height + 8 <= innerHeight - 12 ? r.bottom + 8 : Math.max(12, r.top - a.height - 8);
 ayudaFlujoV13.style.left = x + 'px'; ayudaFlujoV13.style.top = y + 'px';
}
function demorarCierreAyudaV13() {
 if (!ayudaFijadaV13) cierreAyudaV13 = setTimeout(cerrarAyudaFlujoV13, 120);
}
ayudaFlujoV13.addEventListener('pointerenter', () => clearTimeout(cierreAyudaV13));
ayudaFlujoV13.addEventListener('pointerleave', demorarCierreAyudaV13);

const ordenarAntesV13 = ordenarVista;
ordenarVista = function() {
 cerrarAyudaFlujoV13();
 ordenarAntesV13();
 const scope = $('.barra-controles .scope'), ladoControl = scope.querySelector('.lado');
 const grupo = document.createElement('div'); grupo.className = 'selector-flujo';
 const cabecera = document.createElement('div'); cabecera.className = 'titulo-flujo';
 const etiqueta = document.createElement('span'); etiqueta.id = 'etiquetaFlujoV13'; etiqueta.textContent = 'Canasta del índice';
 const ayuda = document.createElement('button'); ayuda.type = 'button'; ayuda.className = 'ayuda-flujo';
 ayuda.textContent = '¿Por qué cambia?'; ayuda.setAttribute('aria-expanded', 'false');
 ayuda.setAttribute('aria-controls', 'ayudaFlujoV13'); ayuda.setAttribute('aria-describedby', 'ayudaFlujoV13');
 cabecera.append(etiqueta, ayuda);
 grupo.append(cabecera, ladoControl); scope.prepend(grupo);
 ladoControl.setAttribute('aria-labelledby', etiqueta.id);
 for (const [id, flujo, subtitulo] of [['bImpo','IMPO','Países de origen'],['bExpo','EXPO','Países de destino']]) {
  const boton = $('#' + id); boton.querySelector('.baj')?.remove();
  const detalle = document.createElement('span'); detalle.className = 'detalle-flujo'; detalle.textContent = subtitulo;
  boton.append(detalle); boton.setAttribute('aria-describedby', 'ayudaFlujoV13');
  boton.addEventListener('pointerenter', e => {if (e.pointerType === 'mouse') mostrarAyudaFlujoV13(boton, flujo);});
  boton.addEventListener('pointerleave', demorarCierreAyudaV13);
  boton.addEventListener('focus', () => mostrarAyudaFlujoV13(boton, flujo));
  boton.addEventListener('blur', () => {if (!ayudaFijadaV13) cerrarAyudaFlujoV13();});
 }
 ayuda.addEventListener('pointerenter', e => {if (e.pointerType === 'mouse') mostrarAyudaFlujoV13(ayuda, null);});
 ayuda.addEventListener('pointerleave', demorarCierreAyudaV13);
 ayuda.addEventListener('focus', () => mostrarAyudaFlujoV13(ayuda, null));
 ayuda.addEventListener('blur', () => {if (!ayudaFijadaV13) cerrarAyudaFlujoV13();});
 ayuda.onclick = () => {if (ayudaFijadaV13) cerrarAyudaFlujoV13(); else mostrarAyudaFlujoV13(ayuda, null, true);};
};
document.addEventListener('keydown', e => {if (e.key === 'Escape') cerrarAyudaFlujoV13();});
document.addEventListener('pointerdown', e => {
 if (!e.target.closest('.selector-flujo, .explicacion-flujo')) cerrarAyudaFlujoV13();
});
addEventListener('resize', cerrarAyudaFlujoV13);
addEventListener('scroll', cerrarAyudaFlujoV13, {passive:true});
