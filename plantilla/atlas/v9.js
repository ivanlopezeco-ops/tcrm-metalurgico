// Composición v9 y lectura contextual. Las funciones de cálculo se conservan.
let puntoFijadoV9=null;
const ocultarAnteriorV9=ocultarTip;
function ocultarLecturaV9(){
 ocultarAnteriorV9();const tip=$('#tip');if(tip){tip.setAttribute('aria-hidden','true');tip.querySelector('.cerrar-lectura')?.setAttribute('tabindex','-1');}
}
function liberarLecturaV9(){puntoFijadoV9=null;$('#tip')?.classList.remove('fijado');ocultarLecturaV9();}
ocultarTip=function(){if(puntoFijadoV9===null)ocultarLecturaV9();};
function actualizarGuiaV9(){
 const texto=$('#guiaGrafico>span');if(texto)texto.textContent=pantallaAngosta.matches?'Tocá la curva para consultar y fijar el dólar equivalente':'Recorré la curva para consultar el dólar equivalente · clic o Enter para fijar · Esc para cerrar';
}
const ordenarAnteriorV9=ordenarVista;
ordenarVista=function(){
 ordenarAnteriorV9();
 const stage=$('.stage'),resumen=$('#resumenPrincipal'),main=$('.chart-column'),basket=$('.basket'),equivalencia=$('.columna-equivalencia');
 const consulta=document.createElement('details');consulta.className='consulta-equivalencia';consulta.id='consultaEquivalencia';
 consulta.innerHTML='<summary>Dólar equivalente al promedio / una fecha</summary>';
 consulta.append(equivalencia);
 const ayuda=$('.ayuda-lectura'),periodo=$('.periodo');
 $('.claves').after(periodo);
 const soporte=document.createElement('div');soporte.className='soporte-grafico';soporte.append(consulta,ayuda);main.append(soporte);
 stage.replaceChildren(resumen,main,basket);
 actualizarGuiaV9();
 const tip=$('#tip');tip.setAttribute('role','region');tip.setAttribute('aria-label','Lectura de la fecha explorada');
 // Fuentes y explicaciones extensas se mantienen accesibles bajo metodología.
 const pie=$('.pie');if(pie)ayuda.append(pie);
 puntoFijadoV9=null;
};
const resumenAnteriorV9=actualizarResumen;
actualizarResumen=function(){
 resumenAnteriorV9();
 const e=$('#resumenPrincipal');if(!e)return;
 const guia=document.createElement('div');guia.className='resumen-guia';
 guia.innerHTML='<strong>El dólar equivalente, en el gráfico</strong><span>Consultá una fecha o el promedio del período.</span><button type="button" id="abrirPromedio">Consultar promedio visible</button>';
 e.append(guia);
 $('#abrirPromedio').onclick=()=>{liberarLecturaV9();$('#consultaEquivalencia').open=true;$('#refPromedio').click();$('#refPromedio').focus({preventScroll:true});};
};
tipEn=function(i){
 const cv=$('#lienzo'),tip=$('#tip');if(!cv||!tip||!mapaX)return null;
 if(puntoFijadoV9!==null&&i!==puntoFijadoV9)return tip.textContent;
 const v=lineas.at(-1)?.y?.[i];if(v==null){ocultarTip();return null;}
 resaltado=i;dibujar();
 const c=comparacionActiva(),r=c?lineas.find(l=>l.et===c.serie)?.y?.[i]:null;
 const eq=modeloActual?.actual&&modeloActual.dolar!=null?modeloActual.dolar*v/modeloActual.actual:null;
 tip.classList.toggle('con-bcra',!!c);tip.classList.toggle('fijado',puntoFijadoV9!==null);
 tip.innerHTML=`<div class="f">${fechaReferencia(fechas[i],vista.gran)}${puntoFijadoV9!==null?' · Fijado':''}</div><div class="l"><span>${modo==='empresa'?'Tu canasta':'TCRM metalúrgico'}</span><b>${fmt(v)}</b></div>`+
 (c?`<div class="l"><span>${c.indice}</span><b>${r==null?'Sin dato':fmt(r)}</b></div><div class="l diferencia-bcra"><span>Diferencia respecto de ${c.nombre}</span><b>${formatoComparacion(diferenciaComparada(v,r))}</b></div>`:'')+
 `<div class="l equivalente-tip"><span>Dólar equivalente</span><b>${eq==null?'—':pesos(eq)}</b></div><p class="tip-supuestos">Cotización observada: ${modeloActual?.dolar==null?'Sin dato':pesos(modeloActual.dolar)}${modeloActual?.fechaDolar?' · '+fechaCorta(modeloActual.fechaDolar):''}. Precios, monedas y ponderaciones constantes. No es predicción ni equilibrio.</p>`+
 (puntoFijadoV9!==null?'<button type="button" class="cerrar-lectura">Cerrar lectura</button>':'');
 tip.classList.add('ver');tip.setAttribute('aria-hidden','false');
 const ancho=cv.parentElement.getBoundingClientRect().width;
 let left=mapaX.X(i)+16;if(left+tip.offsetWidth>ancho-8)left=mapaX.X(i)-tip.offsetWidth-16;
 tip.style.left=Math.max(4,left)+'px';tip.style.top=Math.max(4,Math.min(mapaX.H-tip.offsetHeight-4,mapaX.Y(v)-tip.offsetHeight/2))+'px';
 const cerrar=tip.querySelector('.cerrar-lectura');if(cerrar)cerrar.onclick=()=>{liberarLecturaV9();cv.focus({preventScroll:true});};
 return tip.textContent;
};
const finalizarAnteriorV9=finalizarActualizacion;
finalizarActualizacion=function(){
 puntoFijadoV9=null;finalizarAnteriorV9();
 const cv=$('#lienzo');
 cv.onpointerdown=e=>{liberarLecturaV9();mostrarTip(e);};
 cv.onclick=()=>{const i=resaltado;if(i==null)return;elegirFecha(fechas[i],vista.gran);puntoFijadoV9=i;tipEn(i);};
 const anterior=cv.v9KeyboardOriginal||(cv.v9KeyboardOriginal=cv.onkeydown);
 cv.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();liberarLecturaV9();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();cv.onclick();}else{puntoFijadoV9=null;anterior?.(e);}};
};
document.addEventListener('keydown',e=>{if(e.key==='Escape')liberarLecturaV9();});
pantallaAngosta.addEventListener('change',actualizarGuiaV9);
$('.cab').append($('.modos'));
