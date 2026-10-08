// Movimiento de controles y copia de la lectura ya calculada. Sin nuevas fórmulas.
const animacionesInterfazV12 = new Set();
function animarInterfazV12(elemento, frames, duracion = 220) {
 if (movimientoReducido.matches || !elemento?.animate) return;
 const animacion = elemento.animate(frames, {duration:duracion, easing:'cubic-bezier(.2,.8,.2,1)'});
 animacionesInterfazV12.add(animacion);
 const limpiar = () => animacionesInterfazV12.delete(animacion);
 animacion.addEventListener('finish', limpiar, {once:true});
 animacion.addEventListener('cancel', limpiar, {once:true});
}
movimientoReducido.addEventListener('change', () => {
 if (movimientoReducido.matches) {
  animacionesInterfazV12.forEach(a => a.cancel());
  animacionesInterfazV12.clear();
 }
});
document.addEventListener('toggle', e => {
 const panel = e.target;
 if (!panel.matches?.('.panel-comparaciones, #consultaEquivalencia, .ayuda-lectura')) return;
 if (!panel.open) {
  panel.querySelectorAll('*').forEach(n => n.getAnimations?.().forEach(a => a.cancel()));
  return;
 }
 const contenido = panel.matches('.panel-comparaciones') ? [panel.querySelector('.contenido-comparaciones')] :
  [...panel.children].filter(n => n.tagName !== 'SUMMARY');
 contenido.forEach(n => animarInterfazV12(n, [{opacity:.35, transform:'translateY(7px)'}, {opacity:1, transform:'translateY(0)'}]));
}, true);

const finalizarAntesV12 = finalizarActualizacion;
finalizarActualizacion = function() {
 const anteriores = new Set([...document.querySelectorAll('#claves .l')].map(n => n.querySelector('span')?.textContent));
 finalizarAntesV12();
 const cv = $('#lienzo'), tecladoAnterior = cv.onkeydown;
 cv.onkeydown = e => {
  // Tab conserva el punto fijado al pasar a los botones de la lectura.
  if (e.key !== 'Tab') tecladoAnterior?.(e);
 };
 document.querySelectorAll('#claves .l').forEach(n => {
  if (n.querySelector('.quitar-referencia') && !anteriores.has(n.querySelector('span')?.textContent))
   animarInterfazV12(n, [{backgroundColor:tono('--seleccion')}, {backgroundColor:'transparent'}], 280);
 });
};

function textoLecturaV12(tip) {
 const partes = ['TCRM metalúrgico · ADIMRA', tip.querySelector('.f').textContent.replace(' · Fijado',''),
  modo === 'sector' ? 'Rubro: ' + preset + (apagados.size ? ' · canasta ajustada' : '') : 'Canasta propia',
  'Flujo: ' + (lado === 'IMPO' ? 'Importaciones' : 'Exportaciones'),
  'Base del índice: 17/12/2015 = 100.'];
 tip.querySelectorAll('tbody tr').forEach(fila => {
  const nombre = fila.querySelector('th').textContent;
  const celdas = fila.querySelectorAll('td');
  partes.push(nombre + ': ' + celdas[0].textContent + (celdas[1].textContent !== '—' ? ' · diferencia: ' + celdas[1].textContent : ''));
 });
 const diferencia = tip.querySelector('.nota-diferencia');
 if (diferencia) partes.push(diferencia.textContent);
 partes.push('Dólar equivalente: ' + tip.querySelector('.equivalente-tip b').textContent,
  tip.querySelector('.tip-supuestos').textContent, $('#sello').textContent);
 return partes.join('\n');
}
function ajustarLecturaV12(tip) {
 const rect = $('#lienzo').parentElement.getBoundingClientRect();
 const minimo = 8 - rect.top, maximo = innerHeight - rect.top - tip.offsetHeight - 8;
 tip.style.top = Math.max(minimo, Math.min(maximo, parseFloat(tip.style.top) || minimo)) + 'px';
}
function copiaManualV12(tip, texto, estado) {
 let ayuda = tip.querySelector('.copia-manual');
 if (!ayuda) {
  ayuda = document.createElement('div'); ayuda.className = 'copia-manual';
  const etiqueta = document.createElement('label'); etiqueta.textContent = 'Texto de la lectura'; etiqueta.htmlFor = 'textoLecturaV12';
  const campo = document.createElement('textarea'); campo.id = 'textoLecturaV12'; campo.readOnly = true; campo.rows = 6;
  ayuda.append(etiqueta, campo); tip.append(ayuda);
 }
 const campo = ayuda.querySelector('textarea'); campo.value = texto;
 estado.textContent = 'Seleccioná el texto y copialo. La copia automática no está disponible en este navegador.';
 ajustarLecturaV12(tip); campo.focus({preventScroll:true}); campo.select();
 tip.scrollTop = tip.scrollHeight - tip.clientHeight;
}
const tipAntesV12 = tipEn;
tipEn = function(i) {
 const resultado = tipAntesV12(i), tip = $('#tip');
 if (!resultado || !tip.classList.contains('ver') || puntoFijadoV9 === null || tip.querySelector('.copiar-lectura')) return resultado;
 const cerrar = tip.querySelector('.cerrar-lectura');
 const acciones = document.createElement('div'); acciones.className = 'acciones-lectura';
 cerrar.before(acciones); acciones.append(cerrar);
 const copiar = document.createElement('button'); copiar.type = 'button'; copiar.className = 'copiar-lectura'; copiar.textContent = 'Copiar lectura';
 acciones.prepend(copiar);
 const estado = document.createElement('p'); estado.className = 'estado-copia'; estado.setAttribute('role','status'); estado.setAttribute('aria-live','polite');
 acciones.after(estado);
 copiar.onclick = async () => {
  const texto = textoLecturaV12(tip);
  copiar.disabled = true;
  try {
   if (!navigator.clipboard?.writeText) throw new Error('Portapapeles no disponible');
   await navigator.clipboard.writeText(texto);
   if (!copiar.isConnected) return;
   copiar.textContent = 'Copiado'; estado.textContent = 'Lectura copiada con fecha, base y supuestos.';
   tip.querySelector('.copia-manual')?.remove();
  } catch {
   if (copiar.isConnected) copiaManualV12(tip, texto, estado);
  } finally {
   copiar.disabled = false;
   if (copiar.isConnected) ajustarLecturaV12(tip);
  }
 };
 ajustarLecturaV12(tip);
 return resultado;
};
const ocultarAntesV12 = ocultarLecturaV9;
ocultarLecturaV9 = function() {
 ocultarAntesV12();
 $('#tip .copiar-lectura')?.setAttribute('tabindex','-1');
 $('#tip .copia-manual textarea')?.setAttribute('tabindex','-1');
};
