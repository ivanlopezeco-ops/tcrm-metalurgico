// Comparar las dos series sectoriales publicadas del mismo rubro, sin recalcularlas.
let ambasCanastas=false;
const etiquetaCanasta=l=>l==='IMPO'?'Canasta de importaciones':'Canasta de exportaciones';
function contraparteCanasta(){
 const flujo=lado==='IMPO'?'EXPO':'IMPO',nombre=nombreSerie(flujo,preset);
 return {flujo,nombre,serie:D.oficiales?.[vista.gran]?.[nombre]||null};
}
function agregarCanastaContraparte(){
 if(!ambasCanastas||modo!=='sector')return;
 const otra=contraparteCanasta();if(!otra.serie)return;
 lineas.push({y:recorte(otra.serie),c:tono('--canasta-otra'),w:2,d:[8,3],et:etiquetaCanasta(otra.flujo),canastaFlujo:otra.flujo});
}
const ordenarCanastasAnterior=ordenarVista;
ordenarVista=function(){
 ordenarCanastasAnterior();
 $('.gcab h2').textContent='TCRM por canastas';
 const b=document.createElement('button');b.id='bAmbasCanastas';b.className='comparabtn ambas-canastas';b.type='button';b.setAttribute('aria-pressed',String(ambasCanastas));
 b.textContent='Comparar importaciones y exportaciones';
 b.onclick=()=>{liberarLecturaV9();ambasCanastas=!ambasCanastas;actualizar();};
 $('.claves').append(b);
 const nota=document.createElement('p');nota.id='alcanceCanastas';nota.className='alcance-canastas';nota.hidden=true;
 $('.claves').after(nota);
};
const finalizarCanastasAnterior=finalizarActualizacion;
finalizarActualizacion=function(){
 finalizarCanastasAnterior();
 const propio=modo==='empresa',otra=contraparteCanasta(),b=$('#bAmbasCanastas');
 b.hidden=propio;b.disabled=!otra.serie;b.setAttribute('aria-pressed',String(ambasCanastas));
 b.title=otra.serie?'Series del mismo rubro, misma fecha y base común':'No hay serie publicada de la otra canasta para este rubro';
 const label=propio?'Tu canasta de '+(lado==='IMPO'?'importaciones':'exportaciones'):etiquetaCanasta(lado)+(apagados.size?' · ajustada':'');
 const leyenda=$('#claves');
 leyenda.innerHTML=lineas.slice().reverse().map(l=>{
  const principal=l===lineas.at(-1),texto=principal?label:l.et;
  return `<span class="l"><i style="background:${l.d?'transparent':l.c};${l.d?'border-top:2px dashed '+l.c:''}"></i>${texto}</span>`;
 }).join('');
 const sum=$('.basket>summary');sum.firstChild.textContent=propio?'Tu canasta · porcentajes':etiquetaCanasta(lado);
 const alcance=$('#alcanceCanastas');alcance.hidden=propio||!ambasCanastas||!otra.serie;
 alcance.textContent='Rubro: '+preset+'. KPI, dólar equivalente y países: '+label.toLowerCase()+'. La otra línea conserva su canasta sectorial publicada.';
 const lectura=$('#comparacionActual .comparacion-resultado>span');if(lectura&&!propio)lectura.textContent=etiquetaCanasta(lado)+' respecto de '+comparacionActiva()?.nombre;
 $('#resumenPrincipal').setAttribute('aria-label','Variaciones de '+label.toLowerCase());
};
const tipCanastasAnterior=tipEn;
tipEn=function(i){
 const resultado=tipCanastasAnterior(i),tip=$('#tip');if(!resultado||!tip.classList.contains('ver'))return resultado;
 const punto=puntoFijadoV9??i;
 tip.querySelector('.l>span').textContent=modo==='empresa'?'TCRM · tu canasta':'TCRM · '+etiquetaCanasta(lado).toLowerCase();
 const principal=lineas.at(-1),benchmark=comparacionActiva();
 tip.querySelectorAll('.otra-canasta-tip').forEach(e=>e.remove());
 let anterior=tip.querySelector('.l');
 lineas.slice(0,-1).filter(l=>l.et!==benchmark?.serie).reverse().forEach(otra=>{
  const fila=document.createElement('div');fila.className='otra-canasta-tip';
  const v=otra.y[punto],delta=diferenciaComparada(principal.y[punto],v);
  fila.innerHTML='<div class="l"><span>'+otra.et+'</span><b>'+(v==null?'Sin dato':fmt(v))+'</b></div><div class="l diferencia-canasta"><span>Principal respecto de esta canasta</span><b>'+formatoComparacion(delta)+'</b></div>';
  anterior.after(fila);anterior=fila;
 });
 // Recalcular posición tras sumar la segunda canasta para no cortar el contenido.
 tip.style.top=Math.max(4,Math.min(mapaX.H-tip.offsetHeight-4,parseFloat(tip.style.top)||4))+'px';
 return tip.textContent;
};
$('#mSector').textContent='Canastas sectoriales';

// Vista previa de las ponderaciones disponibles: no modifica la selección al recorrerla.
function descripcionRubroV9(nombre){
 const p=D.presets[lado][nombre];if(!p)return '';
 return G.map((g,i)=>[g,p.w[i]]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([g,w])=>g+' '+pct(w,0)).join(' · ');
}
const ordenarRubrosAnterior=ordenarVista;
ordenarVista=function(){
 ordenarRubrosAnterior();
 const select=$('#selRubro')||$('#selComp');if(!select)return;
 const host=document.createElement('div');host.className='rubro-explorador';select.before(host);host.append(select);
 const menu=document.createElement('div');menu.className='rubros-preview';menu.hidden=true;
 menu.setAttribute('aria-label','Rubros y composición aproximada');
 Array.from(select.options||select.querySelectorAll('option')).forEach(op=>{
  const b=document.createElement('button');b.type='button';b.className='rubro-preview';
  const titulo=document.createElement('strong'),desc=document.createElement('span');titulo.textContent=op.textContent;desc.textContent=descripcionRubroV9(op.value);
  b.append(titulo,desc);b.onclick=()=>{select.value=op.value;menu.hidden=true;select.onchange({target:select});($('#selRubro')||$('#selComp')).focus({preventScroll:true});};menu.append(b);
 });
 host.append(menu);select.title='Composición aproximada: '+descripcionRubroV9(select.value);
 select.onpointerenter=e=>{if(e.pointerType!=='touch')menu.hidden=false;};
 select.onmousedown=e=>{e.preventDefault();menu.hidden=false;select.focus();};
 host.onmouseleave=()=>{menu.hidden=true;};
 host.onkeydown=e=>{if(e.key==='Escape'){menu.hidden=true;select.focus();}if(e.key==='ArrowDown'&&e.altKey){e.preventDefault();menu.hidden=false;menu.querySelector('button')?.focus();}};
 host.onfocusout=e=>{if(!host.contains(e.relatedTarget))menu.hidden=true;};
 if(modo==='empresa'){
  $('#bComparar')?.remove();$('#comparaMenu')?.remove();
  const controles=$('.comparacion-controles');
  if(controles){host.parentElement.append(controles);host.parentElement.classList.add('comparacion-unificada');$('#etiquetaComparador').textContent='Referencia adicional';controles.querySelector('[data-comparador="ninguno"]').textContent='Ninguna';}
  const titulo=$('#compo')?.closest('.caja')?.querySelector('h2');if(titulo)titulo.textContent='Canasta de referencia';
 }
};

// Canasta propia: primero cargar, luego comparar de forma optativa.
let compararPropiaV9=false,ultimoModoPropiaV9='sector';
const ordenarOpcionalAnterior=ordenarVista;
ordenarVista=function(){
 if(modo==='empresa'&&ultimoModoPropiaV9!=='empresa'){comparadorActual='ninguno';verBCRA=false;}
 ultimoModoPropiaV9=modo;
 ordenarOpcionalAnterior();if(modo!=='empresa')return;
 const field=$('.scope-field'),select=$('#selComp'),externas=$('.comparacion-controles');
 const panel=document.createElement('details');panel.id='comparacionPropia';panel.className='comparacion-propia';
 panel.innerHTML='<summary>Agregar comparación</summary><div class="opciones-propias"><p>Elegí una canasta sectorial de referencia</p></div>';
 const opciones=panel.querySelector('.opciones-propias');
 Object.entries(D.presets[lado]).filter(([,p])=>p.tipo!=='familia').forEach(([nombre])=>{
  const b=document.createElement('button');b.type='button';b.className='rubro-preview';b.dataset.rubro=nombre;
  const t=document.createElement('strong'),d=document.createElement('span');t.textContent=nombre;d.textContent=descripcionRubroV9(nombre);b.append(t,d);
  b.onclick=()=>{comparar=nombre;compararPropiaV9=true;render();$('#comparacionPropia summary').focus({preventScroll:true});};opciones.append(b);
 });
 if(externas){opciones.append(externas);externas.querySelector('#etiquetaComparador').textContent='Referencia externa';}
 select.hidden=true;opciones.append(select);field.remove();
 $('.claves').append(panel);
 const quitar=document.createElement('button');quitar.type='button';quitar.id='quitarComparacionPropia';quitar.className='comparabtn';quitar.textContent='Quitar comparaciones';quitar.onclick=()=>{compararPropiaV9=false;comparadorActual='ninguno';verBCRA=false;render();$('#comparacionPropia summary').focus({preventScroll:true});};$('.claves').append(quitar);
 const contexto=$('#compo')?.closest('.caja');if(contexto)contexto.hidden=true;
 const vacio=document.createElement('div');vacio.id='canastaVacia';vacio.className='canasta-vacia';vacio.innerHTML='<strong>Armá tu canasta para ver el TCRM</strong><p>Cargá un porcentaje mayor que cero en al menos un país. Después podés agregar una comparación.</p>';
 $('#lienzo').before(vacio);
};
const finalizarOpcionalAnterior=finalizarActualizacion;
finalizarActualizacion=function(){
 finalizarOpcionalAnterior();if(modo!=='empresa')return;
 const cargada=!!norm(canastas[lado]);
 $('#canastaVacia').hidden=cargada;
 $('#lienzo').style.visibility=cargada?'visible':'hidden';
 $('#guiaGrafico').hidden=!cargada;
 const panel=$('#comparacionPropia');panel.hidden=!cargada;
 panel.querySelector('summary').textContent=compararPropiaV9||comparacionActiva()?'Cambiar comparación':'Agregar comparación';
 panel.querySelectorAll('[data-rubro]').forEach(b=>b.setAttribute('aria-pressed',String(compararPropiaV9&&b.dataset.rubro===comparar)));
 $('#quitarComparacionPropia').hidden=!cargada||(!compararPropiaV9&&!comparacionActiva());
 if(!cargada){liberarLecturaV9();$('#claves').innerHTML='';}
};
