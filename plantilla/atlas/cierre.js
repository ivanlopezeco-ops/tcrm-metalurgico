// Cierre de interfaz: controles comunes, lectura compacta y carga explícita.
function nombreLineaCierre(l){
 if(l===lineas.at(-1))return modo==='empresa'?'Tu canasta':etiquetaCanasta(lado)+(apagados.size?' · ajustada':'');
 const c=comparacionActiva();return l.et===c?.serie?c.indice:l.et;
}
function cerrarPanelesCierre(foco=false){
 document.querySelectorAll('.panel-comparaciones[open]').forEach(p=>{p.open=false;if(foco)p.querySelector('summary').focus({preventScroll:true});});
 const preview=$('.rubros-preview');if(preview&&!preview.hidden){preview.hidden=true;const s=$('#selRubro');s?.setAttribute('aria-expanded','false');if(foco)s?.focus({preventScroll:true});}
}
function botonesReferenciasCierre(){
 const lista=$('#listaReferenciasCierre');if(!lista)return;
 lista.replaceChildren();
 const nombres=Object.entries(D.presets[lado]).filter(([n,p])=>p.tipo!=='familia'&&(modo==='empresa'||n!==preset));
 nombres.forEach(([n])=>{
  const on=modo==='empresa'?compararPropiaV9&&comparar===n:comparaciones.has(n);
  const b=document.createElement('button');b.type='button';b.className='rubro-preview';b.dataset.rubro=n;b.setAttribute('aria-pressed',String(on));
  b.disabled=modo==='sector'&&!on&&comparaciones.size>=MAX_COMP;
  const t=document.createElement('strong'),d=document.createElement('span');t.textContent=n;d.textContent=descripcionRubroV9(n);b.append(t,d);
  b.onclick=()=>{liberarLecturaV9();if(modo==='empresa'){comparar=n;compararPropiaV9=!on;}else{on?comparaciones.delete(n):comparaciones.add(n);}actualizar();lista.querySelectorAll('button').forEach(x=>{if(x.dataset.rubro===n)x.focus({preventScroll:true});});};
  lista.append(b);
 });
}
const ordenarCierreAnterior=ordenarVista;
ordenarVista=function(){
 ordenarCierreAnterior();
 const sector=modo==='sector',panel=sector?document.createElement('details'):$('#comparacionPropia');
 if(sector){panel.id='panelComparaciones';panel.innerHTML='<summary>Agregar comparación</summary>';$('.claves').append(panel);}
 panel.classList.add('panel-comparaciones');
 const controles=$('.comparacion-controles'),ambas=$('#bAmbasCanastas');
 const contenido=document.createElement('div');contenido.className='contenido-comparaciones';contenido.setAttribute('role','group');contenido.setAttribute('aria-label','Referencias para comparar');
 const cabecera=document.createElement('div');cabecera.className='referencias-fijas';
 cabecera.append(controles);controles.querySelector('#etiquetaComparador').textContent='Índices de referencia';
 controles.querySelector('[data-comparador="ninguno"]').textContent='Ninguno';
 if(sector)cabecera.append(ambas);
 contenido.append(cabecera);
 const titulo=document.createElement('p');titulo.className='titulo-referencias';titulo.textContent=sector?'Otras canastas del mismo flujo · hasta 3':'Canasta sectorial · opcional';contenido.append(titulo);
 const lista=document.createElement('div');lista.id='listaReferenciasCierre';lista.className='lista-referencias';contenido.append(lista);
 // Conservar nodos heredados fuera de la interacción: sus manejadores sostienen el motor original.
 if(!sector){const select=$('#selComp');contenido.append(select);panel.querySelector('.opciones-propias').remove();}
 panel.append(contenido);panel.querySelector('summary').setAttribute('aria-label','Elegir referencias para comparar el TCRM');
 panel.addEventListener('toggle',()=>{if(panel.open)liberarLecturaV9();});
 if(sector){$('#bComparar').hidden=true;$('#comparaMenu').hidden=true;}
 else{
  $('#quitarComparacionPropia').hidden=true;
  $('.stage').classList.add('propia-cierre');
  const basket=$('.basket'),body=$('.basket-body');
  const ayuda=document.createElement('p');ayuda.className='ayuda-pesos';ayuda.id='ayudaPesos';ayuda.textContent='Los pesos se normalizan a 100%. Si cargás sólo Brasil con 20, representa el 100% de tu canasta.';
  const encabezado=document.createElement('div');encabezado.className='cab-pesos';encabezado.innerHTML='<span>País</span><span>Peso cargado</span><span>Participación</span>';
  $('#canastaLista').before(ayuda,encabezado);$('#canastaLista').querySelectorAll('input').forEach(i=>{i.setAttribute('aria-describedby','ayudaPesos');i.setAttribute('aria-label','Peso cargado de '+i.dataset.g);});
  const vieja=body.querySelector('.basket-help');if(vieja)vieja.hidden=true;
  body.querySelectorAll('p').forEach(p=>{if(p.textContent.includes('La lista queda estable'))p.hidden=true;});
  const borrar=$('#bBorrar'),borrarAnterior=borrar.onclick;
  borrar.onclick=()=>{compararPropiaV9=false;comparadorActual='ninguno';verBCRA=false;borrarAnterior();};
  if(pantallaAngosta.matches){basket.open=true;drawerAbierto=true;}
 }
 const select=$('#selRubro');if(select){
  select.onpointerenter=null;select.removeAttribute('title');select.setAttribute('aria-expanded','false');select.setAttribute('aria-controls','previewRubrosCierre');
  const menu=$('.rubros-preview');menu.id='previewRubrosCierre';
  select.onmousedown=e=>{e.preventDefault();menu.hidden=!menu.hidden;select.setAttribute('aria-expanded',String(!menu.hidden));select.focus();};
  // No cerrar al cruzar el borde: el usuario puede recorrer las opciones sin saltos.
  select.parentElement.onmouseleave=null;
 }
};
function quitarReferenciaCierre(l){
 const c=comparacionActiva();
 if(l.et===c?.serie){comparadorActual='ninguno';verBCRA=false;}
 else if(l.canastaFlujo)ambasCanastas=false;
 else if(modo==='empresa')compararPropiaV9=false;
 else comparaciones.delete(l.et);
 liberarLecturaV9();actualizar();$('.panel-comparaciones summary')?.focus({preventScroll:true});
}
const finalizarCierreAnterior=finalizarActualizacion;
finalizarActualizacion=function(){
 finalizarCierreAnterior();
 const panel=$('.panel-comparaciones'),cargada=modo==='sector'||!!norm(canastas[lado]);panel.hidden=!cargada;
 panel.querySelector('summary').textContent=lineas.length>1?'Agregar / cambiar comparación':'Agregar comparación';
 if(modo==='sector'){$('#bComparar').hidden=true;$('#comparaMenu').hidden=true;}else $('#quitarComparacionPropia').hidden=true;
 botonesReferenciasCierre();
 const leyenda=$('#claves');leyenda.replaceChildren();
 lineas.slice().reverse().forEach(l=>{
  const item=document.createElement('span');item.className='l';
  const muestra=document.createElement('i');muestra.style.background=l.d?'transparent':l.c;if(l.d)muestra.style.borderTop='2px dashed '+l.c;
  const nombre=document.createElement('span');nombre.textContent=nombreLineaCierre(l);item.append(muestra,nombre);
  if(l!==lineas.at(-1)){const quitar=document.createElement('button');quitar.type='button';quitar.className='quitar-referencia';quitar.textContent='Quitar';quitar.setAttribute('aria-label','Quitar '+nombreLineaCierre(l));quitar.onclick=()=>quitarReferenciaCierre(l);item.append(quitar);}
  leyenda.append(item);
 });
 if(modo==='empresa'){
  const stage=$('.stage');stage.classList.toggle('sin-pesos',!cargada);
  $('.basket-body').querySelectorAll('p').forEach(p=>{if(p.textContent.includes('La lista queda estable'))p.hidden=true;});
  $('#canastaLista').querySelectorAll('input').forEach(i=>{i.setAttribute('aria-describedby','ayudaPesos');i.setAttribute('aria-label','Peso cargado de '+i.dataset.g);});
  // La carga mantiene su posición en móvil incluso después del primer valor.
  if(!cargada&&pantallaAngosta.matches){$('.basket').open=true;drawerAbierto=true;}
  $('#suma').previousElementSibling.textContent='Total cargado';
 }
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')cerrarPanelesCierre(true);});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.panel-comparaciones')&&!e.target.closest('.rubro-explorador'))cerrarPanelesCierre(false);});
pantallaAngosta.addEventListener('change',()=>{if(modo==='empresa'&&pantallaAngosta.matches&&!norm(canastas[lado])){$('.basket').open=true;drawerAbierto=true;}});

// Una fila por serie; conserva exactamente la fórmula principal / referencia.
tipEn=function(i){
 const cv=$('#lienzo'),tip=$('#tip');if(!cv||!tip||!mapaX)return null;
 if(puntoFijadoV9!==null&&i!==puntoFijadoV9)return tip.textContent;
 const v=lineas.at(-1)?.y?.[i];if(v==null){ocultarTip();return null;}
 resaltado=i;dibujar();
 const c=comparacionActiva(),eq=modeloActual?.actual&&modeloActual.dolar!=null?modeloActual.dolar*v/modeloActual.actual:null;
 const otras=lineas.slice(0,-1).reverse(),principal=modo==='empresa'?'Tu canasta':etiquetaCanasta(lado);
 tip.classList.toggle('con-bcra',!!c);tip.classList.toggle('fijado',puntoFijadoV9!==null);
 const row=(nombre,n,d,clase='')=>`<tr class="l"><th scope="row">${nombre}</th><td><b>${n==null?'—':fmt(n)}</b></td><td class="${clase}"><b>${d}</b></td></tr>`;
 tip.innerHTML=`<div class="f">${fechaReferencia(fechas[i],vista.gran)}${puntoFijadoV9!==null?' · Fijado':''}</div>`+
 `<table class="tabla-tooltip"><thead><tr><th scope="col">Canasta / índice</th><th scope="col">Nivel</th><th scope="col">Diferencia</th></tr></thead><tbody>`+
 row(principal,v,'—')+otras.map(l=>row(nombreLineaCierre(l),l.y[i],formatoComparacion(diferenciaComparada(v,l.y[i])),l.et===c?.serie?'diferencia-bcra':'')).join('')+'</tbody></table>'+
 (otras.length?`<p class="nota-diferencia">Diferencia de ${principal.toLowerCase()} respecto de cada referencia. Misma fecha y base.</p>`:'')+
 `<div class="l equivalente-tip"><span>Dólar equivalente</span><b>${eq==null?'—':pesos(eq)}</b></div><p class="tip-supuestos">Cotización observada: ${modeloActual?.dolar==null?'Sin dato':pesos(modeloActual.dolar)}${modeloActual?.fechaDolar?' · '+fechaCorta(modeloActual.fechaDolar):''}. Precios, monedas y ponderaciones constantes. No es predicción ni equilibrio.</p>`+
 (puntoFijadoV9!==null?'<button type="button" class="cerrar-lectura">Cerrar lectura</button>':'');
 tip.classList.add('ver');tip.setAttribute('aria-hidden','false');
 const ancho=cv.parentElement.getBoundingClientRect().width;
 let left=mapaX.X(i)+12;if(left+tip.offsetWidth>ancho-4)left=mapaX.X(i)-tip.offsetWidth-12;
 tip.style.left=Math.max(4,left)+'px';
 const rect=cv.parentElement.getBoundingClientRect(),minTop=8-rect.top,maxTop=innerHeight-rect.top-tip.offsetHeight-8;
 tip.style.top=Math.max(minTop,Math.min(maxTop,mapaX.Y(v)-tip.offsetHeight/2))+'px';
 const cerrar=tip.querySelector('.cerrar-lectura');if(cerrar)cerrar.onclick=()=>{liberarLecturaV9();cv.focus({preventScroll:true});};
 return tip.textContent;
};
