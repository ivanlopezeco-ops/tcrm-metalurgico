// Atlas v15: composición para la sección Tableros de la web y modo embebido.
// No interviene en datos, fórmulas ni ponderaciones: reubica piezas y redibuja ejes.
const parametrosV15 = new URLSearchParams(location.search);
const embebidoV15 = parametrosV15.has('embed') || (() => {try {return window.self !== window.top;} catch {return true;}})();
document.documentElement.classList.toggle('embebido', embebidoV15);

// Pestañas de modo y sello de actualización en la franja superior de la superficie de trabajo.
const superficieV15 = document.createElement('div');
superficieV15.className = 'superficie';
$('#barraControles').before(superficieV15);
superficieV15.append($('#barraControles'), $('#vista'));
const franjaV15 = document.createElement('div');
franjaV15.className = 'franja-modos';
franjaV15.append($('.modos'), $('#sello'));
$('#barraControles').prepend(franjaV15);
$('.modos').setAttribute('aria-label', 'Tipo de canasta');

// La ayuda del flujo nombra lo que explica: por qué cambian los países.
const ordenarAntesV15 = ordenarVista;
ordenarVista = function() {
 ordenarAntesV15();
 const ayuda = $('.ayuda-flujo');
 if (ayuda) ayuda.textContent = '¿Por qué cambian los países?';
 const resumenDolar = $('#consultaEquivalencia>summary');
 if (resumenDolar) resumenDolar.textContent = 'Dólar equivalente: otra fecha, supuestos y escenarios';
 // Cabecera del gráfico en dos líneas: título e índice a la izquierda; frecuencia y guía a la derecha.
 const gcab = $('.chart-column .gcab');
 if (gcab && $('#indiceActual') && $('#guiaGrafico')) {
  gcab.firstElementChild.append($('#indiceActual'));
  const derecha = document.createElement('div'); derecha.className = 'gcab-derecha';
  derecha.append($('#granTxt'), $('#guiaGrafico')); gcab.append(derecha);
 }
 // El período manda sobre cifras, gráfico y dólar: sus atajos suben a la barra de controles.
 const scopeV15 = $('.barra-controles .scope'), atajosV15 = $('.periodo .atajos');
 if (scopeV15 && atajosV15) {
  const campo = document.createElement('div'); campo.className = 'campo-periodo';
  const etiqueta = document.createElement('span'); etiqueta.id = 'etiquetaPeriodoV15'; etiqueta.className = 'etiqueta-periodo'; etiqueta.textContent = 'Período';
  atajosV15.setAttribute('role', 'group'); atajosV15.setAttribute('aria-labelledby', etiqueta.id);
  campo.append(etiqueta, atajosV15); scopeV15.append(campo);
 }
 const ayudaLectura = $('.ayuda-lectura>summary');
 if (ayudaLectura) ayudaLectura.textContent = 'Cómo leerlo y metodología';
};

// Tercera cifra del resumen: el dólar equivalente que ya calcula la consulta, con su cotización y fecha.
function textoV15(sel) {return $(sel)?.textContent.trim() || '';}
function espejoDolarV15() {
 const guia = $('#resumenPrincipal .resumen-guia');
 if (!guia) return;
 let valor = guia.querySelector('.v');
 if (!valor) {
  const boton = $('#abrirPromedio');
  guia.replaceChildren();
  guia.classList.add('principal', 'cifra-dolar');
  const k = document.createElement('span'); k.className = 'k'; k.innerHTML = 'Dólar equivalente <em class="condicional">Referencia condicional</em>';
  valor = document.createElement('strong'); valor.className = 'v'; valor.id = 'dolarResumenV15';
  const n = document.createElement('span'); n.className = 'n';
  const c = document.createElement('span'); c.className = 'n cotizacion-resumen';
  guia.append(k, valor, n, c);
  if (boton) {boton.textContent = 'Ver supuestos'; guia.append(boton);}
 }
 const disponible = !!$('#dolar') && !$('#dolar').hidden && !!$('#dolar .dol-b .v');
 const v = disponible ? textoV15('#dolar .dol-b .v') : '—';
 // la consulta y la cifra usan la misma frase: «Para volver al…»
 const preguntaConsulta = $('.pregunta-equivalencia');
 if (preguntaConsulta && /^Para recuperar el/.test(preguntaConsulta.textContent)) preguntaConsulta.textContent = preguntaConsulta.textContent.replace(/^Para recuperar el/, 'Para volver al');
 const pregunta = disponible ? textoV15('.pregunta-equivalencia') : textoV15('#dolarVacio');
 const detalle = $('#dolar .dol-b .n')?.textContent || '';
 const cotizacion = (detalle.match(/cotización de (\$\s?[\d.]+)/) || [])[1];
 const fecha = textoV15('#dolar .fecha-cotizacion').replace(/^Cotización observada al /, '').replace(/ · .*$/, '');
 // distancia frente al dólar observado, con la frase que ya calcula la consulta («21,2% por encima de»)
 const distancia = textoV15('#dolar .dol-b .n strong').replace(/ de$/, ' del').replace(/^En línea con$/, 'En línea con el');
 const linea1 = disponible && cotizacion ? (distancia ? distancia + ' dólar observado' : 'Dólar observado') : '';
 const linea2 = disponible && cotizacion ? cotizacion.replace(/\.$/, '') + ' · BCRA' + (fecha ? ', ' + fecha : '') : '';
 const linea = linea1 + linea2;
 const n = guia.querySelector('.n:not(.cotizacion-resumen)'), c = guia.querySelector('.cotizacion-resumen');
 if (!valor.dataset.contando && valor.textContent !== v) {
  const previo = valor.textContent; valor.textContent = v;
  if (previo && previo !== '—' && typeof transicionCifraV15 === 'function') transicionCifraV15(valor, previo);
 }
 if (n.textContent !== pregunta) n.textContent = pregunta;
 if (c.textContent !== linea) {
  const s1 = document.createElement('span'), s2 = document.createElement('span');
  s1.textContent = linea1; s2.textContent = linea2; c.replaceChildren(s1, s2);
 }
 c.hidden = !linea;
}
let esperaEspejoV15 = 0;
new MutationObserver(() => {
 cancelAnimationFrame(esperaEspejoV15);
 esperaEspejoV15 = requestAnimationFrame(espejoDolarV15);
}).observe($('#vista'), {childList: true, subtree: true, characterData: true});

// Ejes con valores redondos y años en enero; rótulo del último dato al final de la serie.
function pasoRedondoV15(rango, objetivo) {
 const bruto = rango / objetivo, p = Math.pow(10, Math.floor(Math.log10(bruto))), n = bruto / p;
 return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
dibujarBase = function(progreso = 1) {
 const cv = document.getElementById('lienzo'); if (!cv) return;
 const cx = cv.getContext('2d');
 const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
 cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H);
 const ff = getComputedStyle(document.body).fontFamily;
 const todos = lineas.flatMap(l => l.y || []).filter(v => v != null);
 if (!todos.length || fechas.length < 2) {
  cx.fillStyle = tono('--eje'); cx.font = '13px ' + ff; cx.textAlign = 'center';
  cx.fillText(modo === 'sector' ? 'Marcá al menos un país en la canasta' : 'Cargá porcentajes en tu canasta', W / 2, H / 2);
  mapaX = null; return;
 }
 const princ = lineas[lineas.length - 1].y || [];
 const val = princ.filter(v => v != null);
 const prom = val.length ? val.reduce((a, b) => a + b, 0) / val.length : null;
 let lo = Math.min(...todos), hi = Math.max(...todos);
 if (prom != null) {lo = Math.min(lo, prom); hi = Math.max(hi, prom);}
 const holguraY = (hi - lo) * 0.07 || 3; lo -= holguraY; hi += holguraY;
 let paso = pasoRedondoV15(hi - lo, H < 280 ? 3 : 4);
 // siempre una marca por debajo del mínimo de los datos y al menos tres valores rotulados
 const minDatos = Math.min(...todos);
 const marcaBajo = Math.floor(minDatos / paso) * paso;
 if (minDatos - marcaBajo <= paso * .5) lo = Math.min(lo, marcaBajo);
 if (Math.floor(hi / paso) - Math.ceil(lo / paso) + 1 < 3) paso = pasoRedondoV15(hi - lo, 6);
 const decimales = paso < 1 ? 1 : 0, etY = v => v.toFixed(decimales).replace('.', ',');
 cx.font = '12px ' + ff;
 const anchoY = Math.max(cx.measureText(etY(lo)).width, cx.measureText(etY(hi)).width);
 const ultimo = (() => {for (let i = princ.length - 1; i >= 0; i--) if (princ[i] != null) return i; return -1;})();
 // rótulos finales: valor de cada línea a la derecha de su último dato
 const finales = lineas.map((l, k) => {
  if (!l.y) return null;
  let i = l.y.length - 1; while (i >= 0 && l.y[i] == null) i--;
  return i < 0 ? null : {l, i, v: l.y[i], texto: fmt(l.y[i]), principal: k === lineas.length - 1};
 }).filter(Boolean);
 cx.font = '600 12px ' + ff;
 const conMuestra = finales.length > 1;
 const anchoFinal = finales.length ? Math.max(...finales.map(f => cx.measureText(f.texto).width)) + 16 + (conMuestra ? 14 : 0) : 0;
 const sentidoEje = H >= 200;
 const m = {t: etapasVisiblesV15() ? 30 : 12, r: Math.max(12, anchoFinal), b: 30, l: Math.ceil(anchoY) + 12 + (sentidoEje ? 16 : 0)}, pw = W - m.l - m.r, ph = H - m.t - m.b;
 const X = i => m.l + (i / (fechas.length - 1)) * pw, Y = v => m.t + (1 - (v - lo) / (hi - lo)) * ph;
 mapaX = {X, Y, m, pw, ph, W, H, lo, hi};

 cx.lineWidth = 1; cx.textAlign = 'right';
 for (let v = Math.ceil(lo / paso) * paso; v <= hi + paso / 1000; v += paso) {
  const y = Math.round(Y(v)) + .5, base = Math.abs(v - 100) < paso / 1000;
  // la base 100 (17 dic 2015) se marca un poco más que el resto de la grilla
  cx.strokeStyle = tono(base ? '--regla' : '--grilla'); cx.beginPath(); cx.moveTo(m.l, y); cx.lineTo(W - m.r, y); cx.stroke();
  cx.font = (base ? '600 ' : '') + '12px ' + ff;
  cx.fillStyle = tono(base ? '--cuerpo' : '--eje'); cx.fillText(etY(v), m.l - 8, y + 4);
 }
 cx.font = '12px ' + ff;
 // sentido del eje: arriba el peso más depreciado, abajo más apreciado (la misma regla de la metodología)
 if (sentidoEje) {
  cx.save(); cx.font = '11px ' + ff; cx.fillStyle = tono('--eje');
  const mitad = ph / 2 - 10;
  const elegir = (largo, corto) => cx.measureText(largo).width + 12 <= mitad ? largo : cx.measureText(corto).width + 12 <= mitad ? corto : '';
  const arriba = elegir('Peso más depreciado', 'Más depreciado'), abajo = elegir('Peso más apreciado', 'Más apreciado');
  const xc = 7;
  const flecha = (y, haciaArriba) => {cx.beginPath(); cx.moveTo(xc - 3.5, y + (haciaArriba ? 3 : -3)); cx.lineTo(xc + 3.5, y + (haciaArriba ? 3 : -3)); cx.lineTo(xc, y + (haciaArriba ? -3 : 3)); cx.closePath(); cx.fill();};
  if (arriba) {
   flecha(m.t + 4, true);
   cx.save(); cx.translate(xc + 4, m.t + 12); cx.rotate(-Math.PI / 2); cx.textAlign = 'right'; cx.fillText(arriba, 0, 0); cx.restore();
  }
  if (abajo) {
   flecha(m.t + ph - 4, false);
   cx.save(); cx.translate(xc + 4, m.t + ph - 12); cx.rotate(-Math.PI / 2); cx.textAlign = 'left'; cx.fillText(abajo, 0, 0); cx.restore();
  }
  cx.restore();
 }
 cx.strokeStyle = tono('--regla'); cx.beginPath();
 cx.moveTo(m.l, Math.round(m.t + ph) + .5); cx.lineTo(W - m.r, Math.round(m.t + ph) + .5); cx.stroke();

 if (prom != null) {
  const y = Math.round(Y(prom)) + .5;
  cx.save(); cx.setLineDash([4, 4]); cx.strokeStyle = tono('--azul2'); cx.lineWidth = 1.2;
  cx.beginPath(); cx.moveTo(m.l, y); cx.lineTo(W - m.r, y); cx.stroke(); cx.setLineDash([]);
  const et = 'Promedio del período: ' + prom.toFixed(1).replace('.', ',');
  cx.font = '12px ' + ff; const an = cx.measureText(et).width;
  const holgura = (x0, x1, yc) => {let d = Infinity;
   princ.forEach((u, i) => {if (u == null) return; const x = X(i); if (x < x0 || x > x1) return; d = Math.min(d, Math.abs(Y(u) - yc));}); return d;};
  let mejor = null;
  const lugares = [];
  for (let k = 0; k <= 8; k++) {const x0 = W - m.r - an - 8 - k * (pw - an - 8) / 8; lugares.push([x0, x0 + an + 8]);}
  lugares.forEach(([x0, x1]) => [y - 16, y + 3].forEach(top => {
   const h = holgura(x0, x1, top + 7); if (!mejor || h > mejor.h) mejor = {h, x0, top};
  }));
  if (mejor.h >= 9 || W >= 520) {
   cx.fillStyle = tono('--panel'); cx.fillRect(mejor.x0, mejor.top, an + 8, 14);
   cx.fillStyle = tono('--azul'); cx.textAlign = 'left'; cx.fillText(et, mejor.x0 + 4, mejor.top + 11);
  }
  cx.restore();
 }

 // Fechas: años en su enero cuando el tramo es largo; meses al comienzo de cada mes si es corto.
 const anios = (new Date(fechas[fechas.length - 1]) - new Date(fechas[0])) / 31557600000;
 const porAnio = anios > 4, anclas = [];
 for (let i = 0; i < fechas.length; i++) {
  const clave = porAnio ? fechas[i].slice(0, 4) : fechas[i].slice(0, 7);
  const nuevo = i === 0 ? (porAnio ? fechas[0].slice(5, 7) === '01' : true) : clave !== (porAnio ? fechas[i - 1].slice(0, 4) : fechas[i - 1].slice(0, 7));
  if (nuevo) anclas.push({i, anio: +fechas[i].slice(0, 4), mes: +fechas[i].slice(5, 7)});
 }
 const etX = a => porAnio ? String(a.anio) : MESES[a.mes - 1] + (a.mes === 1 || anclas[0] === a ? ' ' + String(a.anio).slice(2) : '');
 cx.font = '12px ' + ff;
 const anchoX = cx.measureText(porAnio ? '2026' : 'sep 26').width + 16;
 const pasos = porAnio ? [1, 2, 5, 10, 20] : [1, 2, 3, 6, 12];
 const cabe = k => anclas.filter(a => porAnio ? a.anio % k === 0 : (a.mes - 1) % k === 0).length * anchoX <= pw;
 const k = pasos.find(cabe) || pasos[pasos.length - 1];
 cx.fillStyle = tono('--eje'); cx.strokeStyle = tono('--regla');
 anclas.filter(a => porAnio ? a.anio % k === 0 : (a.mes - 1) % k === 0).forEach(a => {
  const x = X(a.i), et = etX(a), an = cx.measureText(et).width;
  if (x - an / 2 < m.l - 6 || x + an / 2 > W - 2) return;
  cx.beginPath(); cx.moveTo(Math.round(x) + .5, m.t + ph); cx.lineTo(Math.round(x) + .5, m.t + ph + 4); cx.stroke();
  cx.textAlign = 'center'; cx.fillText(et, x, H - 9);
 });

 // Relleno suave bajo la serie principal cuando se lee sola: da cuerpo a la curva sin competir con las comparaciones.
 const rgbV15 = c => {const m = /^#([0-9a-f]{6})$/i.exec(c || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16, n >> 8 & 255, n & 255].join(',');};
 const rgbPrincipal = lineas.length === 1 ? rgbV15(lineas[0].c) : null;
 if (rgbPrincipal && ultimo > 0) {
  const tope = Math.ceil((princ.length - 1) * progreso), base = m.t + ph;
  const grad = cx.createLinearGradient(0, m.t, 0, base);
  const oscuro = document.documentElement.dataset.theme === 'dark';
  grad.addColorStop(0, 'rgba(' + rgbPrincipal + ',' + (oscuro ? .20 : .14) + ')'); grad.addColorStop(1, 'rgba(' + rgbPrincipal + ',0)');
  cx.beginPath(); let inicio = null, finX = null;
  princ.forEach((v, i) => {if (i > tope || v == null) return; const x = X(i), y = Y(v); if (inicio == null) {inicio = x; cx.moveTo(x, y);} else cx.lineTo(x, y); finX = x;});
  if (inicio != null) {cx.lineTo(finX, base); cx.lineTo(inicio, base); cx.closePath(); cx.fillStyle = grad; cx.fill();}
 }

 lineas.forEach(l => {
  if (!l.y) return;
  cx.strokeStyle = l.c; cx.lineWidth = l.w || 2.2; cx.lineJoin = 'round'; cx.lineCap = 'round';
  cx.setLineDash(l.d || []);
  cx.beginPath(); let mov = true;
  l.y.forEach((v, i) => {if (i > Math.ceil((l.y.length - 1) * progreso)) return; if (v == null) {mov = true; return;}
   const x = X(i), y = Y(v); if (mov) {cx.moveTo(x, y); mov = false;} else cx.lineTo(x, y);});
  cx.stroke(); cx.setLineDash([]);
 });

 if (progreso >= 1 && finales.length) {
  // punto y valor al final de cada línea; los rótulos se separan para no pisarse
  const orden = finales.map(f => ({...f, x: X(f.i), y: Y(f.v), ty: Y(f.v) + 4})).sort((a, b) => a.ty - b.ty);
  const sep = 14, piso = m.t + 10, techo = m.t + ph + 4;
  for (let k = 0; k < orden.length; k++) orden[k].ty = Math.max(orden[k].ty, k ? orden[k - 1].ty + sep : piso);
  for (let k = orden.length - 1; k >= 0; k--) orden[k].ty = Math.min(orden[k].ty, k < orden.length - 1 ? orden[k + 1].ty - sep : techo);
  orden.forEach(f => {
   cx.fillStyle = tono('--panel'); cx.beginPath(); cx.arc(f.x, f.y, f.principal ? 5 : 4, 0, Math.PI * 2); cx.fill();
   cx.fillStyle = f.l.c; cx.beginPath(); cx.arc(f.x, f.y, f.principal ? 3.2 : 2.6, 0, Math.PI * 2); cx.fill();
   cx.font = (f.principal ? '700 ' : '600 ') + '12px ' + ff; cx.textAlign = 'left';
   let xt = f.x + 8;
   if (conMuestra) {
    // muestra del trazo de cada línea delante de su valor, para saber a qué serie corresponde
    cx.save(); cx.strokeStyle = f.l.c; cx.lineWidth = f.principal ? 2.6 : 2; cx.setLineDash(f.l.d || []); cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(xt, f.ty - 4); cx.lineTo(xt + 10, f.ty - 4); cx.stroke(); cx.restore();
    xt += 14;
   }
   cx.fillStyle = tono(f.principal ? '--titulo' : '--eje');
   cx.fillText(f.texto, xt, f.ty);
  });
 }

 dibujarExploracion();
};

// Modo embebido: tema indicado por la web y altura informada al marco.
function aplicarTemaV15(tema) {
 if (tema !== 'dark' && tema !== 'light') return;
 if (document.documentElement.dataset.theme === tema) return;
 document.documentElement.dataset.theme = tema;
 actualizarTema(); chartAnterior = null; arrastrando = true; actualizar(); arrastrando = false;
}
addEventListener('message', e => {
 if (e.data && e.data.tipo === 'adimra-tema') aplicarTemaV15(e.data.tema);
});
if (embebidoV15 && window.parent !== window) {
 let alturaV15 = 0;
 const avisarAlturaV15 = () => {
  const altura = Math.ceil($('#app').getBoundingClientRect().height);
  if (Math.abs(altura - alturaV15) < 2) return;
  alturaV15 = altura;
  window.parent.postMessage({tipo: 'tcrm-altura', altura}, '*');
 };
 new ResizeObserver(avisarAlturaV15).observe($('#app'));
 addEventListener('load', avisarAlturaV15);
}

const finalizarAntesV15 = finalizarActualizacion;
finalizarActualizacion = function() {
 finalizarAntesV15();
 const campo = $('.campo-periodo');
 if (campo) campo.hidden = modo === 'empresa' && !norm(canastas[lado]);
};

// Palabra de sentido bajo cada variación, con la función aprobada en v14 (sentidoCambio); color neutro.
const resumenAntesV15 = actualizarResumen;
actualizarResumen = function() {
 resumenAntesV15();
 const m = variacionesActuales();
 for (const [id, valor, comparacion] of [['variacionInteranual', m.interanual, 'que hace un año'], ['variacionPromedio', m.frentePromedio, 'que el promedio']]) {
  const v = document.getElementById(id); if (!v) continue;
  const s = document.createElement('span');
  s.className = 'sentido' + (valor == null || Math.abs(valor) < .05 ? '' : valor > 0 ? ' sube' : ' baja');
  s.textContent = sentidoCambio(valor, comparacion);
  v.after(s);
 }
};

// Un solo momento al abrir: la curva se traza y las tres cifras cuentan hasta su valor, una vez.
(function entradaV15() {
 if (movimientoReducido.matches) return;
 const contar = el => {
  if (!el) return;
  const final = el.textContent, m = /[−-]?[\d.]+(,\d+)?/.exec(final); if (!m) return;
  const texto = m[0], negativo = /^[−-]/.test(texto), digitos = texto.replace(/^[−-]/, ''), dec = (digitos.split(',')[1] || '').length;
  const objetivo = parseFloat(digitos.replace(/\./g, '').replace(',', '.')); if (!isFinite(objetivo)) return;
  const formato = x => (negativo ? '−' : '') + x.toLocaleString('es-AR', {minimumFractionDigits: dec, maximumFractionDigits: dec});
  const inicio = performance.now(), dur = 700; let previo = null;
  const paso = t => {
   // si la cifra cambió por otra acción mientras contaba, se deja la nueva
   if (previo !== null && el.textContent !== previo) {delete el.dataset.contando; return;}
   const p = Math.min(1, (t - inicio) / dur), e = 1 - Math.pow(1 - p, 3);
   previo = p < 1 ? final.replace(texto, formato(objetivo * e)) : final;
   el.textContent = previo;
   if (p < 1) requestAnimationFrame(paso); else delete el.dataset.contando;
  };
  el.dataset.contando = '1'; requestAnimationFrame(paso);
 };
 setTimeout(() => ['#variacionInteranual', '#variacionPromedio', '#dolarResumenV15'].forEach(s => contar($(s))), 260);
})();

// ===== Tanda 4 (11/10): revisión integral, sin reordenar bloques =====

// Comparaciones en escala azul (sin naranja ni verde); se distinguen también por el trazo.
const temaAntesV15 = actualizarTema;
actualizarTema = function() {
 temaAntesV15();
 const oscuro = document.documentElement.dataset.theme === 'dark';
 COMP.splice(0, COMP.length, ...(oscuro ? ['#2f7fd0', '#d6ecff', '#7fa6c9'] : ['#5e9bdb', '#0a2a5a', '#9cbfe6']));
 NARANJA = oscuro ? '#2b5d8f' : '#b9d2ee';
};
actualizarTema();
const TRAZOS_V15 = [null, [7, 4], [2, 3]];
function estilosLineasV15() {
 lineas.forEach(l => {
  const k = COMP.indexOf(l.c);
  if (k > 0 && !l.d) l.d = TRAZOS_V15[k];
 });
}

// Transición: si el eje de fechas no cambia (flujo, rubro, países, canasta), la serie se desplaza de su forma
// anterior a la nueva en lugar de redibujarse desde la izquierda. Con otro período se mantiene el fundido.
let previaV15 = null;
dibujar = function() {
 const cv = $('#lienzo'); if (!cv) return;
 estilosLineasV15();
 const firma = [modo, lado, preset, comparar, vista.gran, r0, r1, [...apagados].join(), [...comparaciones].join(), verBCRA, JSON.stringify(canastas[lado])].join('|');
 const inicial = !chartFirma, cambio = firma !== chartFirma; chartFirma = firma;
 cancelAnimationFrame(frameChart);
 const principal = lineas.at(-1), previa = previaV15;
 previaV15 = principal && principal.y ? {f0: fechas[0], f1: fechas.at(-1), n: fechas.length, y: principal.y.slice()} : null;
 if (!cambio || arrastrando || movimientoReducido.matches || resaltado != null) {dibujarBase(); chartAnterior = null; return;}
 if (!inicial && previa && principal && principal.y && previa.n === fechas.length && previa.f0 === fechas[0] && previa.f1 === fechas.at(-1)) {
  const destino = principal.y.slice(), origen = previa.y, inicio = performance.now(); chartAnterior = null;
  const animar = ahora => {
   const p = Math.min(1, (ahora - inicio) / 460), e = 1 - Math.pow(1 - p, 4);
   principal.y = destino.map((v, i) => v == null || origen[i] == null ? v : origen[i] + (v - origen[i]) * e);
   dibujarBase(); principal.y = destino;
   if (p < 1) frameChart = requestAnimationFrame(animar); else dibujarBase();
  };
  frameChart = requestAnimationFrame(animar); return;
 }
 let anterior = chartAnterior; chartAnterior = null;
 // un lienzo oculto (por ejemplo, con la grilla de la canasta propia) mide cero: no hay imagen previa que fundir
 if (anterior && (!anterior.width || !anterior.height)) anterior = null;
 if (!cv.width || !cv.height || !cv.clientWidth) {dibujarBase(); return;}
 if (!inicial && !anterior && cv.width && cv.height) {anterior = document.createElement('canvas'); anterior.width = cv.width; anterior.height = cv.height; anterior.getContext('2d').drawImage(cv, 0, 0);}
 const inicio = performance.now();
 if (!anterior) {
  const animar = ahora => {const p = Math.min(1, (ahora - inicio) / 650); dibujarBase(1 - Math.pow(1 - p, 3)); if (p < 1) frameChart = requestAnimationFrame(animar);};
  frameChart = requestAnimationFrame(animar); return;
 }
 dibujarBase();
 const siguiente = document.createElement('canvas'); siguiente.width = cv.width; siguiente.height = cv.height; siguiente.getContext('2d').drawImage(cv, 0, 0);
 const cx = cv.getContext('2d');
 const animar = ahora => {
  const p = Math.min(1, (ahora - inicio) / 280);
  cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
  cx.globalAlpha = 1 - p; cx.drawImage(anterior, 0, 0, cv.width, cv.height); cx.globalAlpha = p; cx.drawImage(siguiente, 0, 0); cx.restore();
  if (p < 1) frameChart = requestAnimationFrame(animar); else dibujarBase();
 };
 frameChart = requestAnimationFrame(animar);
};

// Lectura fijada más angosta y del lado opuesto al punto, para no tapar la zona leída.
const tipAntesV15 = tipEn;
tipEn = function(i) {
 const r = tipAntesV15(i), tip = $('#tip');
 if (!r || !tip.classList.contains('ver') || !mapaX || pantallaAngosta.matches) return r;
 const punto = puntoFijadoV9 ?? i, x = mapaX.X(punto), w = tip.offsetWidth;
 tip.style.left = Math.max(4, x > mapaX.W / 2 ? x - w - 18 : Math.min(mapaX.W - w - 4, x + 18)) + 'px';
 return r;
};

// Cifras: transición corta cuando cambian por una acción (al abrir cuentan una vez).
function numeroV15(texto) {
 const m = /[−-]?[\d.]+(,\d+)?/.exec(texto || ''); if (!m) return null;
 const t = m[0], neg = /^[−-]/.test(t), d = t.replace(/^[−-]/, ''), dec = (d.split(',')[1] || '').length;
 const v = parseFloat(d.replace(/\./g, '').replace(',', '.'));
 return isFinite(v) ? {t, v: neg ? -v : v, dec} : null;
}
function transicionCifraV15(el, desdeTexto, dur = 320) {
 if (!el || movimientoReducido.matches || arrastrando) return;
 const final = el.textContent, a = numeroV15(desdeTexto), b = numeroV15(final);
 if (!a || !b || a.v === b.v || a.dec !== b.dec) return;
 const formato = x => (x < 0 ? '−' : '') + Math.abs(x).toLocaleString('es-AR', {minimumFractionDigits: b.dec, maximumFractionDigits: b.dec});
 const inicio = performance.now(); let previo = null; el.dataset.contando = '1';
 const paso = t => {
  if (previo !== null && el.textContent !== previo) {delete el.dataset.contando; return;}
  const p = Math.min(1, (t - inicio) / dur), e = 1 - Math.pow(1 - p, 3);
  previo = p < 1 ? final.replace(b.t, formato(a.v + (b.v - a.v) * e)) : final;
  el.textContent = previo;
  if (p < 1) requestAnimationFrame(paso); else delete el.dataset.contando;
 };
 requestAnimationFrame(paso);
}
const cifrasPreviasV15 = {};
const resumenTanda4 = actualizarResumen;
actualizarResumen = function() {
 resumenTanda4();
 const e = $('#resumenPrincipal'); if (!e) return;
 const kPromedio = e.querySelector('#variacionPromedio')?.parentElement.querySelector('.k');
 if (kPromedio) kPromedio.textContent = 'Frente al promedio del período';
 for (const id of ['variacionInteranual', 'variacionPromedio']) {
  const el = document.getElementById(id); if (!el) continue;
  const previo = cifrasPreviasV15[id]; cifrasPreviasV15[id] = el.textContent;
  if (previo && previo !== el.textContent) transicionCifraV15(el, previo);
 }
};

// Títulos y textos que nombran lo que se está viendo.
function tituloGraficoV15() {
 const h = $('.chart-column .gcab h2'); if (!h) return;
 const flujo = lado === 'IMPO' ? 'importaciones' : 'exportaciones';
 h.textContent = modo === 'empresa' ? 'TCRM de tu canasta de ' + (lado === 'IMPO' ? 'compras' : 'ventas')
  : 'TCRM de ' + flujo + ' · ' + preset + (apagados.size ? ' · ajustada' : '');
}
const finalizarTanda4 = finalizarActualizacion;
finalizarActualizacion = function() {
 finalizarTanda4();
 tituloGraficoV15();
 // comparaciones: cantidad elegida en el botón y en el panel
 const n = lineas.length - 1, resumen = $('.panel-comparaciones>summary');
 if (resumen) resumen.textContent = n > 0 ? 'Comparaciones (' + n + ')' : 'Agregar comparación';
 const titulo = $('.titulo-referencias');
 if (titulo && modo === 'sector') titulo.textContent = 'Otras canastas del mismo flujo · ' + comparaciones.size + ' de ' + MAX_COMP;
 const alcance = $('#alcanceCanastas');
 if (alcance) alcance.textContent = alcance.textContent.replace('KPI, dólar equivalente y países:', 'Cifras, dólar equivalente y países:');
 if (modo === 'sector') {
  // la nota de principales orígenes repetía la lista y quedaba vieja al destildar países
  const cc = $('#detalle .cc');
  if (cc && /Principales/.test(cc.textContent)) cc.innerHTML = cc.innerHTML.split(/<br\s*\/?>/i).filter(p => !/Principales/.test(p)).join('<br>');
  // canasta ajustada: cuántos países quedan y cómo volver a la original
  const pesos = D.presets[lado][preset]?.w || [], total = pesos.filter(v => v > 0).length;
  const activos = G.filter((g, i) => pesos[i] > 0 && !apagados.has(g)).length;
  let aviso = $('#ajusteV15');
  if (!aviso) {
   aviso = document.createElement('p'); aviso.id = 'ajusteV15'; aviso.className = 'ajuste-canasta';
   aviso.setAttribute('role', 'status');
   const lista = $('#paises')?.closest('.caja'); if (lista) lista.before(aviso);
  }
  aviso.hidden = !apagados.size;
  if (apagados.size) {
   aviso.replaceChildren();
   const t = document.createElement('span'); t.textContent = 'Canasta ajustada: ' + activos + ' de ' + total + ' países';
   const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Restablecer';
   b.onclick = () => $('#bTodos')?.click();
   aviso.append(t, b);
  }
 } else {
  const cab = $('.cab-pesos');
  if (cab) {const s = cab.querySelectorAll('span'); if (s[1]) s[1].textContent = 'Peso'; if (s[2]) s[2].textContent = '%';}
  $('#canastaLista')?.querySelectorAll('input').forEach(i => {if (i.placeholder !== '—') i.placeholder = '—';});
  const ayuda = $('.ayuda-flujo'); if (ayuda) ayuda.textContent = '¿Compras o ventas?';
  resumenCargaV15();
 }
};

// Canasta propia en celular: total y acceso al resultado siempre a mano mientras se cargan países.
function resumenCargaV15() {
 const body = $('.basket-body'); if (!body || modo !== 'empresa') return;
 let barra = $('#cargaV15');
 if (!barra) {
  barra = document.createElement('div'); barra.id = 'cargaV15'; barra.className = 'resumen-carga';
  const t = document.createElement('span'); t.className = 'resumen-carga-texto';
  const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Ver el TCRM';
  b.onclick = () => {
   const destino = $('#resumenPrincipal') || $('.chart-column');
   destino?.scrollIntoView({behavior: movimientoReducido.matches ? 'auto' : 'smooth', block: 'start'});
  };
  barra.append(t, b); body.append(barra);
 }
 const w = canastas[lado] || {}, cargados = Object.values(w).filter(v => +v > 0).length;
 const total = Object.values(w).reduce((a, v) => a + (+v > 0 ? +v : 0), 0);
 barra.hidden = !cargados;
 barra.querySelector('.resumen-carga-texto').textContent = 'Total ' + total.toLocaleString('es-AR') + ' · ' + cargados + (cargados === 1 ? ' país' : ' países');
}
document.addEventListener('input', e => {if (e.target.closest?.('#canastaLista')) requestAnimationFrame(resumenCargaV15);});

// Encabezados reales para quien navega con lector de pantalla; ayuda del gráfico más corta; pie con el Departamento.
const ordenarTanda4 = ordenarVista;
ordenarVista = function() {
 ordenarTanda4();
 const sum = $('.stage>.basket>summary');
 if (sum && sum.firstChild && sum.firstChild.nodeType === 3) {
  const h = document.createElement('h2'); h.className = 'titulo-canasta'; h.textContent = sum.firstChild.textContent;
  sum.replaceChild(h, sum.firstChild);
 }
 const pie = $('.ayuda-lectura .pie');
 if (pie) pie.textContent = pie.textContent.replace(/^\s*Tocá o pasá el cursor sobre cada rubro y cada cifra para ver qué mide\.\s*/, '');
 guiaCortaV15();
};
function guiaCortaV15() {
 const t = $('#guiaGrafico>span');
 if (t && !pantallaAngosta.matches) t.textContent = 'Pasá el cursor para leer · clic o Enter fija · Esc cierra';
}
pantallaAngosta.addEventListener('change', guiaCortaV15);
const notaPieV15 = $('.view-note'); if (notaPieV15) notaPieV15.textContent = 'Departamento de Estudios Económicos · ADIMRA';

// «Ver supuestos»: además de abrir la consulta, la lleva a la vista.
document.addEventListener('click', e => {
 if (!e.target.closest?.('#abrirPromedio')) return;
 requestAnimationFrame(() => $('#consultaEquivalencia')?.scrollIntoView({behavior: movimientoReducido.matches ? 'auto' : 'smooth', block: 'start'}));
});

// Enlace para saltar al gráfico (visible solo con foco de teclado).
{
 const saltar = document.createElement('a'); saltar.href = '#lienzo'; saltar.className = 'saltar-grafico'; saltar.textContent = 'Ir al gráfico';
 saltar.onclick = e => {e.preventDefault(); const c = $('#lienzo'); c?.focus(); c?.scrollIntoView({block: 'center'});};
 $('#app').prepend(saltar);
}

// ===== Tanda 5 (11/10): pendientes y reordenamientos aprobados por Iván =====

// Cabecera del gráfico en dos filas: título y leyenda con «Agregar comparación»; índice, diferencia con la
// referencia y guía. La curva gana el alto que ocupaban la fila de la leyenda y la franja de la comparación.
const ordenarTanda5 = ordenarVista;
ordenarVista = function() {
 ordenarTanda5();
 const gcab = $('.chart-column .gcab'), h2 = gcab?.querySelector('h2');
 if (gcab && h2 && !gcab.querySelector('.gcab-fila')) {
  const fila1 = document.createElement('div'), fila2 = document.createElement('div');
  fila1.className = 'gcab-fila gcab-titulo'; fila2.className = 'gcab-fila gcab-meta';
  const izq = document.createElement('div'); izq.className = 'gcab-indice';
  const der = document.createElement('div'); der.className = 'gcab-guia';
  if ($('#indiceActual')) izq.append($('#indiceActual'));
  if ($('#comparacionActual')) izq.append($('#comparacionActual'));
  if ($('#granTxt')) der.append($('#granTxt'));
  if ($('#guiaGrafico')) der.append($('#guiaGrafico'));
  fila1.append(h2);
  if ($('#filaClaves')) fila1.append($('#filaClaves'));
  fila2.append(izq, der);
  gcab.replaceChildren(fila1, fila2);
 }
 // el ajuste fino del período queda debajo del gráfico aunque la leyenda haya subido
 const periodo = $('.chart-column .periodo'), envoltorio = $('.chart-column .envoltorio'), alcance = $('#alcanceCanastas');
 if (envoltorio && alcance) envoltorio.after(alcance);
 if (periodo && envoltorio) (alcance || envoltorio).after(periodo);

 // Canasta sectorial: el rubro y su descripción antes de la lista de países.
 const detalle = $('.stage>.basket #detalle'), cuerpo = $('.stage>.basket .basket-body');
 if (detalle && cuerpo && modo === 'sector') cuerpo.prepend(detalle);

 // Consultas: el dólar equivalente se abre debajo de su cifra; al pie quedan pestañas de ancho completo.
 const consulta = $('#consultaEquivalencia'), resumen = $('#resumenPrincipal'), soporte = $('.soporte-grafico');
 if (consulta && resumen && soporte && !soporte.querySelector('.pestanas-consulta')) {
  resumen.after(consulta);
  consulta.classList.add('panel-anclado');
  const metodo = soporte.querySelector('.ayuda-lectura');
  if (metodo) metodo.id = 'consultaMetodo';
  const nav = document.createElement('div'); nav.className = 'pestanas-consulta';
  const pestana = (destino, texto) => {
   const b = document.createElement('button'); b.type = 'button'; b.className = 'pestana-consulta';
   b.dataset.destino = destino; b.setAttribute('aria-controls', destino); b.textContent = texto;
   b.onclick = () => {
    const d = document.getElementById(destino); if (!d) return;
    const abrir = !d.open;
    d.open = abrir;
    if (abrir && destino === 'consultaEquivalencia') {
     $('#refPromedio')?.click();
     requestAnimationFrame(() => d.scrollIntoView({behavior: movimientoReducido.matches ? 'auto' : 'smooth', block: 'nearest'}));
    }
   };
   return b;
  };
  nav.append(pestana('consultaEquivalencia', 'Dólar equivalente: otra fecha, supuestos y escenarios'));
  if (metodo) nav.append(pestana('consultaMetodo', 'Cómo leerlo y metodología'));
  soporte.prepend(nav);
 }
};
function estadoPestanasV15() {
 document.querySelectorAll('.pestana-consulta').forEach(b => {
  const d = document.getElementById(b.dataset.destino);
  b.setAttribute('aria-expanded', d && d.open ? 'true' : 'false');
  // sin canasta cargada no hay dólar equivalente que consultar
  b.hidden = !d || (b.dataset.destino === 'consultaEquivalencia' && !!$('.stage.sin-pesos'));
 });
}
document.addEventListener('toggle', e => {
 if (!e.target.matches?.('#consultaEquivalencia, #consultaMetodo')) return;
 // una consulta abierta por vez
 if (e.target.open) ['consultaEquivalencia', 'consultaMetodo'].forEach(id => {const d = document.getElementById(id); if (d && d !== e.target) d.open = false;});
 estadoPestanasV15();
}, true);
// el panel del dólar se cierra con Esc o al tocar fuera, como el de comparaciones
document.addEventListener('keydown', e => {
 const c = $('#consultaEquivalencia');
 if (e.key !== 'Escape' || !c?.open || pantallaAngosta.matches) return;
 c.open = false; $('#abrirPromedio')?.focus({preventScroll: true});
});
document.addEventListener('pointerdown', e => {
 const c = $('#consultaEquivalencia');
 if (!c?.open || pantallaAngosta.matches) return;
 if (e.target.closest?.('#consultaEquivalencia, #abrirPromedio, .pestana-consulta, #tip')) return;
 c.open = false;
});

// Diferencia con la referencia en la cabecera: sin repetir el nombre de la canasta, que ya está en el título.
function comparacionCortaV15() {
 const s = $('#comparacionActual .comparacion-resultado>span:first-child');
 if (!s) return;
 const t = s.textContent, m = /\srespecto de\s(.+)$/.exec(t);
 if (m && t !== 'Respecto de ' + m[1]) s.textContent = 'Respecto de ' + m[1];
}
new MutationObserver(() => requestAnimationFrame(comparacionCortaV15)).observe($('#vista'), {childList: true, subtree: true, characterData: true});

// Barra del período: la serie completa como fondo del riel, años en los extremos y manijas que no se pisan.
function riel5() {
 const slider = $('.chart-column .periodo .slider'); if (!slider) return;
 const f = ejeMensual();
 let lienzo = slider.querySelector('.mini-serie');
 if (!lienzo) {
  lienzo = document.createElement('canvas'); lienzo.className = 'mini-serie'; lienzo.setAttribute('aria-hidden', 'true');
  slider.prepend(lienzo);
  ['a', 'b'].forEach(k => {const m = document.createElement('span'); m.className = 'manija manija-' + k; m.setAttribute('aria-hidden', 'true'); slider.append(m);});
  const anio0 = document.createElement('span'), anio1 = document.createElement('span');
  anio0.className = 'anio-extremo'; anio1.className = 'anio-extremo'; anio0.setAttribute('aria-hidden', 'true'); anio1.setAttribute('aria-hidden', 'true');
  anio0.textContent = f[0].slice(0, 4); anio1.textContent = f.at(-1).slice(0, 4);
  slider.before(anio0); slider.after(anio1);
 }
 // manijas visibles: siguen a los controles reales y se separan lo justo cuando quedan muy juntas
 const w = slider.clientWidth, n = f.length - 1;
 if (!w) return;
 let xa = r0 / n * w, xb = r1 / n * w;
 const minimo = 18;
 if (xb - xa < minimo) {const c = (xa + xb) / 2; xb = Math.min(w, Math.max(minimo, c + minimo / 2)); xa = xb - minimo;}
 slider.querySelector('.manija-a').style.left = xa + 'px';
 slider.querySelector('.manija-b').style.left = xb + 'px';
 // la ventana resaltada usa las mismas posiciones que las asas
 const act = slider.querySelector('.activo'); if (act) {act.style.left = xa + 'px'; act.style.width = (xb - xa) + 'px';}
 // serie completa de la canasta elegida, con la misma función que usa el tablero
 const y = typeof serieDeCanasta === 'function' ? serieDeCanasta('mensual') : null;
 const dpr = devicePixelRatio || 1, H = slider.clientHeight || 22;
 lienzo.width = w * dpr; lienzo.height = H * dpr;
 const cx = lienzo.getContext('2d'); cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, w, H);
 if (!y) return;
 const val = y.filter(v => v != null); if (val.length < 2) return;
 const lo = Math.min(...val), hi = Math.max(...val);
 const X = i => i / n * w, Y = v => 1 + (1 - (v - lo) / (hi - lo || 1)) * (H - 2);
 const trazo = (desde, hasta, color, ancho) => {
  cx.beginPath(); let mov = true;
  for (let i = desde; i <= hasta; i++) {const v = y[i]; if (v == null) {mov = true; continue;} if (mov) cx.moveTo(X(i), Y(v)); else cx.lineTo(X(i), Y(v)); mov = false;}
  cx.strokeStyle = color; cx.lineWidth = ancho; cx.lineJoin = 'round'; cx.stroke();
 };
 trazo(0, n, tono('--eje'), 1);
 trazo(r0, r1, tono('--azul'), 1.4);
}
const sincronizarTanda5 = sincronizarSlider;
sincronizarSlider = function() {sincronizarTanda5(); riel5();};
addEventListener('resize', () => requestAnimationFrame(riel5));

// Canasta propia vacía: los 28 países a todo el ancho, para que se vea de entrada que la canasta se arma acá.
// El gráfico aparece con el primer país cargado, cuando se confirma el valor (para no mover la grilla mientras se escribe).
function grillaPropiaV15(confirmado) {
 const stage = $('.stage'); if (!stage) return;
 const vacia = modo === 'empresa' && !norm(canastas[lado]);
 if (vacia) {stage.classList.add('propia-grilla'); return;}
 if (!stage.classList.contains('propia-grilla')) return;
 const escribiendo = document.activeElement?.tagName === 'INPUT' && document.activeElement.closest('#canastaLista');
 if (escribiendo && !confirmado) return;
 stage.classList.remove('propia-grilla');
 requestAnimationFrame(() => {chartAnterior = null; chartFirma = null; dibujar(); riel5();});
}
document.addEventListener('change', e => {if (e.target.closest?.('#canastaLista')) requestAnimationFrame(() => grillaPropiaV15(true));});
function encabezadoGrillaV15() {
 const cuerpo = $('#canastaLista')?.closest('.cuerpo'); if (!cuerpo || cuerpo.querySelector('.guia-grilla')) return;
 const g = document.createElement('div'); g.className = 'guia-grilla';
 const t = document.createElement('strong'); t.textContent = 'Armá tu canasta para ver el TCRM';
 const p = document.createElement('span'); p.textContent = 'Cargá un peso en al menos un país. El gráfico aparece con el primer país.';
 g.append(t, p); cuerpo.prepend(g);
}

const finalizarTanda5 = finalizarActualizacion;
finalizarActualizacion = function() {
 finalizarTanda5();
 // Período: con la canasta propia vacía queda a la vista, deshabilitado y con el motivo.
 const campo = $('.campo-periodo');
 if (campo) {
  const vacia = modo === 'empresa' && !norm(canastas[lado]);
  campo.hidden = false; campo.classList.toggle('inactivo', vacia);
  campo.querySelectorAll('button').forEach(b => {b.disabled = vacia;});
  const et = $('#etiquetaPeriodoV15'); if (et) et.textContent = vacia ? 'Período · cargá países para elegirlo' : 'Período';
 }
 // El último punto mensual es el promedio del mes en curso, distinto del «Último índice» diario.
 const g = $('#granTxt');
 const conSerie = (lineas.at(-1)?.y || []).some(v => v != null);
 if (g && !conSerie && /último punto/.test(g.textContent)) g.textContent = 'Promedios mensuales';
 if (g && conSerie && vista.gran !== 'diario' && fechas.length) {
  const f = fechas.at(-1), t = 'Promedios mensuales · último punto: ' + MESES[+f.slice(5, 7) - 1] + ' ' + f.slice(2, 4) + ' (prom.)';
  if (g.textContent !== t) g.textContent = t;
 }
 comparacionCortaV15();
 if (modo === 'empresa') {encabezadoGrillaV15(); grillaPropiaV15(false);} else $('.stage')?.classList.remove('propia-grilla');
 estadoPestanasV15();
 riel5();
};

// Fecha del punto leído en el eje X, en una píldora sobre los años, sin sumar alto.
const dibujarBaseTanda5 = dibujarBase;
dibujarBase = function(progreso = 1) {
 dibujarBaseTanda5(progreso);
 const i = puntoFijadoV9 ?? resaltado;
 if (progreso < 1 || i == null || !mapaX || !fechas[i]) return;
 const cv = $('#lienzo'), cx = cv.getContext('2d'), {X, m, H, pw} = mapaX;
 const [a, mes, d] = fechas[i].split('-');
 const texto = vista.gran === 'diario' ? +d + ' ' + MESES[+mes - 1] + ' ' + a : MESES[+mes - 1] + ' ' + a;
 cx.save(); cx.font = '600 12px ' + getComputedStyle(document.body).fontFamily;
 const an = cx.measureText(texto).width + 16, alto = 20;
 const x = Math.max(m.l, Math.min(m.l + pw - an, X(i) - an / 2)), y = H - alto - 2;
 cx.fillStyle = tono('--azul'); cx.beginPath();
 if (cx.roundRect) cx.roundRect(x, y, an, alto, 10); else cx.rect(x, y, an, alto);
 cx.fill();
 cx.fillStyle = tono('--sobre-azul'); cx.textAlign = 'center'; cx.fillText(texto, x + an / 2, y + 14);
 cx.restore();
};

// ===== Tanda 6 (11/10): ajustes pedidos por Iván sobre la tanda 5 =====

// Dólar equivalente: la consulta no repite la cifra de arriba; cuenta cómo se calcula con los números en uso.
function explicacionDolarV15() {
 const cont = $('#dolar'), a = modeloActual, r = referenciaActiva;
 if (!cont || cont.hidden || !a?.actual || a.dolar == null || r?.valor == null) return;
 let caja = cont.querySelector('.explicacion-dolar');
 if (!caja) {caja = document.createElement('div'); caja.className = 'explicacion-dolar'; cont.querySelector('.dol')?.after(caja);}
 const eq = a.dolar * r.valor / a.actual;
 const referencia = textoV15('.pregunta-equivalencia').replace(/^Para (volver al|recuperar el)\s*/, '') || 'TCRM de referencia';
 const filas = [
  ['Cotización observada del BCRA, ' + fechaCorta(a.fechaDolar), pesos(a.dolar)],
  [referencia.charAt(0).toUpperCase() + referencia.slice(1), fmt(r.valor)],
  ['TCRM actual, ' + fechaCorta(a.fecha), fmt(a.actual)],
 ];
 caja.replaceChildren();
 const t = document.createElement('p'); t.className = 'explicacion-titulo'; t.textContent = 'Cómo se calcula';
 const p1 = document.createElement('p');
 p1.textContent = 'El dólar equivalente responde a una pregunta: qué cotización del dólar haría falta hoy para que el TCRM de esta canasta vuelva al nivel de referencia. Se multiplica la cotización observada por el cociente entre el TCRM de referencia y el TCRM actual.';
 const tabla = document.createElement('table'); tabla.className = 'cuenta-dolar';
 const cuerpo = document.createElement('tbody');
 filas.forEach(([k, v]) => {const tr = document.createElement('tr'); const th = document.createElement('th'); th.scope = 'row'; th.textContent = k; const td = document.createElement('td'); td.textContent = v; tr.append(th, td); cuerpo.append(tr);});
 const total = document.createElement('tr'); total.className = 'total';
 const th = document.createElement('th'); th.scope = 'row'; th.textContent = pesos(a.dolar) + ' × ' + fmt(r.valor) + ' ÷ ' + fmt(a.actual);
 const td = document.createElement('td'); td.textContent = pesos(eq); total.append(th, td); cuerpo.append(total);
 tabla.append(cuerpo);
 const p2 = document.createElement('p');
 p2.textContent = 'El cálculo supone que todo lo demás queda como está hoy: los precios de la Argentina y de los países de la canasta, las cotizaciones de sus monedas frente al dólar y las ponderaciones. Es una referencia condicional. No anticipa la cotización futura ni estima un dólar de equilibrio.';
 caja.append(t, p1, tabla, p2);
 const nota = cont.querySelector('.dol-nota'); if (nota) nota.hidden = true;
}
const pintarDolarTanda6 = pintarDolar;
pintarDolar = function(y) {pintarDolarTanda6(y); explicacionDolarV15();};
new MutationObserver(() => {
 const c = $('#dolar'); if (c && !c.querySelector('.explicacion-dolar')) requestAnimationFrame(explicacionDolarV15);
}).observe($('#vista'), {childList: true, subtree: true});

// Canasta propia: al pasar de la grilla al gráfico, los países cargados suben al principio de la lista.
const grillaTanda6 = grillaPropiaV15;
grillaPropiaV15 = function(confirmado) {
 const antes = $('.stage')?.classList.contains('propia-grilla');
 grillaTanda6(confirmado);
 const lista = $('#canastaLista');
 if (antes && !$('.stage')?.classList.contains('propia-grilla') && lista && typeof ordenarCanastaPropia === 'function') {
  const dentro = lista.contains(document.activeElement);
  requestAnimationFrame(() => {ordenarCanastaPropia(lista, {mantenerFoco: dentro, mostrarArriba: true}); lista.scrollTop = 0;});
 }
};

// Lectura del gráfico más compacta: con una sola serie no hace falta la tabla de diferencias,
// y los supuestos se muestran al fijar el punto.
const tipTanda6 = tipEn;
tipEn = function(i) {
 const r = tipTanda6(i), tip = $('#tip');
 if (tip) tip.classList.toggle('una-serie', tip.querySelectorAll('tbody tr').length === 1);
 return r;
};

// «Importaciones» y «exportaciones» son de productos metalúrgicos: el título y la canasta lo dicen.
const finalizarTanda6 = finalizarActualizacion;
finalizarActualizacion = function() {
 finalizarTanda6();
 if (modo !== 'sector') return;
 const metal = t => t.replace(/^Canasta de (importaciones|exportaciones)$/, 'Canasta de $1 metalúrgicas');
 const titulo = $('.titulo-canasta'); if (titulo) titulo.textContent = metal(titulo.textContent);
};
const tituloTanda6 = tituloGraficoV15;
tituloGraficoV15 = function() {
 tituloTanda6();
 const h = $('.chart-column .gcab h2');
 if (h && modo === 'sector') h.textContent = h.textContent.replace(/^TCRM de (importaciones|exportaciones)/, 'TCRM de $1 metalúrgicas');
};

// Alto del gráfico en escritorio: ocupa lo que queda de la pantalla (entre 200 y 520 px), así el tablero
// entra en una vista aunque la cabecera sume una línea por las comparaciones, y la curva queda menos apaisada.
function ajustarAltoGraficoV15() {
 const cv = $('#lienzo'), col = $('.chart-column');
 if (!cv || !col) return;
 if (embebidoV15 || pantallaAngosta.matches || !cv.clientHeight) {if (cv.style.height) {cv.style.height = ''; dibujarBase();} return;}
 const actual = cv.clientHeight, fondo = col.getBoundingClientRect().bottom + scrollY;
 const nuevo = Math.max(200, Math.min(520, Math.round(actual + (innerHeight - 14) - fondo)));
 if (Math.abs(nuevo - actual) < 2) return;
 cv.style.height = nuevo + 'px';
 dibujarBase();
}
let esperaAltoV15 = 0;
const pedirAltoV15 = () => {cancelAnimationFrame(esperaAltoV15); esperaAltoV15 = requestAnimationFrame(ajustarAltoGraficoV15);};
addEventListener('resize', pedirAltoV15);
const finalizarAlto = finalizarActualizacion;
finalizarActualizacion = function() {finalizarAlto(); pedirAltoV15();};
// se recalcula si algo de arriba cambia de alto (tipografía cargada, cabecera con comparaciones, textos nuevos)
new ResizeObserver(pedirAltoV15).observe($('#app'));
document.fonts?.ready.then(pedirAltoV15);

// ===== Tanda 7 (11/10): «¿Qué mide y para qué sirve?» y etapas cambiarias =====

// Panel de lectura rápida, cerrado al abrir; vive en la franja superior para verse también dentro de la web.
{
 const enlace = document.createElement('button');
 enlace.type = 'button'; enlace.className = 'enlace-que-mide'; enlace.id = 'abrirQueMide';
 enlace.setAttribute('aria-expanded', 'false'); enlace.setAttribute('aria-controls', 'queMide');
 enlace.textContent = '¿Qué mide y para qué sirve?';
 const panel = document.createElement('section');
 panel.id = 'queMide'; panel.className = 'que-mide'; panel.hidden = true; panel.setAttribute('aria-label', 'Qué mide el TCRM metalúrgico y para qué sirve');
 const bloque = (titulo, ...nodos) => {const d = document.createElement('div'); d.className = 'que-mide-bloque'; const h = document.createElement('h2'); h.textContent = titulo; d.append(h, ...nodos); return d;};
 const p = t => {const e = document.createElement('p'); e.textContent = t; return e;};
 const lista = items => {const ul = document.createElement('ul'); items.forEach(t => {const li = document.createElement('li'); li.textContent = t; ul.append(li);}); return ul;};
 const formula = p('TCR = tipo de cambio nominal × precios del socio ÷ precios locales'); formula.className = 'que-mide-formula';
 const alcance = p('Resume monedas y precios. No mide costos, productividad, impuestos ni acceso a divisas.'); alcance.className = 'que-mide-alcance';
 const cerrar = document.createElement('button'); cerrar.type = 'button'; cerrar.className = 'que-mide-cerrar'; cerrar.setAttribute('aria-label', 'Cerrar');
 panel.append(
  bloque('Qué mide',
   p('Compara los precios de la Argentina con los de sus socios comerciales, expresados en la misma moneda. Cada país pesa según su participación en el comercio de productos metalúrgicos: una canasta sigue el origen de las importaciones del sector y otra, el destino de sus exportaciones.'),
   formula),
  bloque('Para qué sirve', lista([
   'Ver si el peso se abarató o se encareció frente a los países de donde vienen las importaciones que compiten con tu producción.',
   'Seguir la competitividad de precios frente a los destinos de las ventas del sector.',
   'Comparar tu rubro con el total metalúrgico y con el índice del BCRA.',
   'Armar la canasta de tu empresa y traducir el nivel a un dólar equivalente.'])),
  bloque('Cómo leerlo',
   p('Si la línea sube, hay depreciación real: lo producido en el país se abarata frente a lo de afuera. Si baja, hay apreciación real: lo importado se abarata y exportar se hace más difícil. Base 17 dic 2015 = 100.'),
   alcance),
  cerrar);
 const alternar = abrir => {
  panel.hidden = !abrir; enlace.setAttribute('aria-expanded', String(abrir));
  if (abrir && !movimientoReducido.matches) panel.animate?.([{opacity: 0, transform: 'translateY(-6px)'}, {opacity: 1, transform: 'none'}], {duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)'});
 };
 enlace.onclick = () => alternar(panel.hidden);
 cerrar.onclick = () => {alternar(false); enlace.focus();};
 panel.addEventListener('keydown', e => {if (e.key === 'Escape') {alternar(false); enlace.focus();}});
 $('#sello').before(enlace);
 franjaV15.after(panel);
}

// Etapas cambiarias: franjas de contexto sobre el gráfico, apagadas por defecto. Nombres definidos por Iván;
// textos y normas del informe v13 (filmina 7).
var etapasActivasV15 = false;
const ETAPAS_V15 = [
 {inicio: '1997-01-01', fin: '2002-01-06', nombre: 'Convertibilidad', corto: 'Convert.', periodo: '1997–2001',
  texto: 'Paridad fija con el dólar. La comparación metalúrgica anterior a febrero de 2003 es una reconstrucción con el primer vector comercial disponible.',
  fuente: 'https://www.argentina.gob.ar/normativa/nacional/ley-25561-71477/texto', detalles: []},
 {inicio: '2002-01-06', fin: '2011-11-01', nombre: 'Flotación administrada', corto: 'Flotación', periodo: '2002–oct. 2011',
  texto: 'La salida de la convertibilidad modificó el régimen cambiario. El período tuvo regulaciones e intervenciones distintas; esta franja no lo clasifica como una economía abierta.',
  fuente: 'https://www.argentina.gob.ar/normativa/nacional/decreto-260-2002-72193/texto', detalles: []},
 {inicio: '2011-11-01', fin: '2015-12-17', nombre: 'Cepo y DJAI', corto: 'Cepo y DJAI', periodo: 'nov. 2011–dic. 2015',
  texto: 'Se introdujeron restricciones para adquirir divisas y luego la DJAI para importar. El precio oficial no resume las condiciones efectivas de acceso ni de comercio.',
  fuente: 'https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/NotasTecnicas/Nota-tecnica-1-2018.pdf', detalles: []},
 {inicio: '2015-12-17', fin: '2019-09-01', nombre: 'Libre acceso a divisas y SIMI', corto: 'Libre acceso', periodo: 'dic. 2015–ago. 2019',
  texto: 'Se flexibilizó la compra de divisas, con límites iniciales y cambios posteriores. La SIMI y las licencias de importación conservaron condiciones comerciales específicas.',
  fuente: 'https://www.bcra.gob.ar/archivos/Pdfs/PublicacionesEstadisticas/inf2015.pdf', detalles: []},
 {inicio: '2019-09-01', fin: '2022-10-17', nombre: 'Cepo y SIMI', corto: 'Cepo y SIMI', periodo: 'sep. 2019–oct. 2022',
  texto: 'Retornaron los controles cambiarios. Desde 2020 cambiaron los requisitos para pagar importaciones; en 2022 se sumaron cupos y financiamiento bajo SIMI.',
  fuente: 'https://www.bcra.gob.ar/noticias/medidas-para-proteger-la-estabilidad-cambiaria-y-al-ahorrista/',
  detalles: [['Mayo de 2020: condiciones adicionales vinculadas con activos líquidos, pagos de importaciones y operaciones financieras.', 'https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7030.pdf'],
   ['Marzo de 2022: categorías SIMI A/B y financiamiento a 180 días para determinadas operaciones, con excepciones.', 'https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7466.pdf']]},
 {inicio: '2022-10-17', fin: '2023-12-13', nombre: 'Cepo y SIRA', corto: 'Cepo y SIRA', periodo: 'oct. 2022–dic. 2023',
  texto: 'El acceso a divisas para pagar quedó vinculado con el plazo de la declaración SIRA. Desde julio de 2023, el impuesto PAIS agregó un costo a importaciones alcanzadas.',
  fuente: 'https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7622.pdf',
  detalles: [['Impuesto PAIS sobre importaciones alcanzadas desde julio de 2023: un costo que el índice no incorpora.', 'https://www.argentina.gob.ar/normativa/nacional/decreto-377-2023-387135/texto']]},
 {inicio: '2023-12-13', fin: '2025-04-14', nombre: 'Apertura comercial con cepo', corto: 'Apertura con cepo', periodo: 'dic. 2023–abr. 2025',
  texto: 'Se estableció un calendario para nuevas importaciones y luego se acortaron los plazos. El impuesto PAIS y el esquema exportador 80/20 son referencias adicionales fuera del índice.',
  fuente: 'https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7917.pdf',
  detalles: [['Agosto de 2024: dos cuotas a 30 y 60 días para los bienes alcanzados.', 'https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8074.pdf'],
   ['Octubre de 2024: reducción a 30 días para los bienes alcanzados, con excepciones.', 'https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A8118.pdf'],
   ['Impuesto PAIS: finalización de su vigencia el 22 de diciembre de 2024 inclusive.', 'https://www.argentina.gob.ar/noticias/se-elimina-el-pago-cuenta-del-impuesto-pais-para-importaciones'],
   ['Liquidación exportadora 80/20: combinaba el mercado oficial con operaciones mediante valores negociables; derogación en abril de 2025.', 'https://www.argentina.gob.ar/normativa/nacional/decreto-269-2025-411653/texto']]},
 {inicio: '2025-04-14', fin: '9999-12-31', nombre: 'Apertura comercial y cambiaria', corto: 'Apertura c. y c.', periodo: 'desde abr. 2025',
  texto: 'Se introdujeron bandas y se flexibilizaron pagos de nuevas importaciones. Las medidas distinguen personas, empresas y obligaciones previas; no implican acceso empresarial irrestricto.',
  fuente: 'https://www.bcra.gob.ar/noticias/inicio-de-la-fase-3-del-programa-economico/',
  detalles: [['En enero de 2026 cambió la regla de ajuste de las bandas, ligada al dato de inflación informado por INDEC.', 'https://www.bcra.gob.ar/noticias/profundizacion-del-esquema-de-agregados-monetarios-fase-de-re-monetizacion-2026/']]},
];
function etapasVisiblesV15() {return etapasActivasV15 && fechas.length > 1 && !$('.stage.propia-grilla');}
function etapaDeFechaV15(f) {return ETAPAS_V15.find(e => f >= e.inicio && f < e.fin) || null;}
// tramos de cada etapa sobre el eje visible
let tramosEtapasV15 = [];
function tramosV15() {
 if (!mapaX || !fechas.length) return [];
 const {X, m, pw} = mapaX, f0 = fechas[0], f1 = fechas.at(-1);
 return ETAPAS_V15.filter(e => e.fin > f0 && e.inicio <= f1).map(e => {
  let i0 = fechas.findIndex(f => f >= e.inicio); if (i0 < 0) i0 = 0;
  let i1 = fechas.findIndex(f => f >= e.fin); if (i1 < 0) i1 = fechas.length - 1;
  // los bordes van entre dos observaciones, para que el corte coincida con el cambio de etapa
  const x0 = i0 === 0 ? m.l : (X(i0 - 1) + X(i0)) / 2, x1 = i1 === fechas.length - 1 && e.fin > f1 ? m.l + pw : (X(i1 - 1) + X(i1)) / 2;
  return {e, x0: Math.max(m.l, x0), x1: Math.min(m.l + pw, x1)};
 }).filter(t => t.x1 - t.x0 > 1);
}
const dibujarBaseTanda7 = dibujarBase;
dibujarBase = function(progreso = 1) {
 dibujarBaseTanda7(progreso);
 tramosEtapasV15 = [];
 if (!etapasVisiblesV15() || !mapaX) return;
 const cv = $('#lienzo'), cx = cv.getContext('2d'), {m, ph} = mapaX;
 const ff = getComputedStyle(document.body).fontFamily;
 tramosEtapasV15 = tramosV15();
 cx.save();
 // franjas detrás de lo ya dibujado: alternan un tinte muy suave para separar etapas sin competir con las líneas
 cx.globalCompositeOperation = 'destination-over';
 tramosEtapasV15.forEach((t, k) => {
  if (ETAPAS_V15.indexOf(t.e) % 2 === 0) {cx.fillStyle = tono('--seleccion'); cx.globalAlpha = .75; cx.fillRect(t.x0, m.t, t.x1 - t.x0, ph);}
 });
 cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
 cx.strokeStyle = tono('--regla'); cx.lineWidth = 1; cx.setLineDash([3, 3]);
 tramosEtapasV15.forEach((t, k) => {if (k) {const x = Math.round(t.x0) + .5; cx.beginPath(); cx.moveTo(x, m.t - 18); cx.lineTo(x, m.t + ph); cx.stroke();}});
 cx.setLineDash([]);
 // nombres en la franja de arriba del área del gráfico; si no entran, la versión corta; si tampoco, nada
 cx.font = '600 12px ' + ff; cx.textAlign = 'center'; cx.fillStyle = tono('--eje');
 tramosEtapasV15.forEach(t => {
  const ancho = t.x1 - t.x0 - 8;
  const texto = cx.measureText(t.e.nombre).width <= ancho ? t.e.nombre : cx.measureText(t.e.corto).width <= ancho ? t.e.corto : '';
  t.texto = texto;
  if (texto) cx.fillText(texto, (t.x0 + t.x1) / 2, m.t - 9);
 });
 cx.restore();
};

// Selector en la cabecera del gráfico, junto a las comparaciones.
function botonEtapasV15() {
 const fila = $('.gcab-titulo .claves'); if (!fila) return;
 let b = $('#bEtapas');
 if (!b) {
  b = document.createElement('button'); b.type = 'button'; b.id = 'bEtapas'; b.className = 'boton-etapas';
  b.textContent = 'Etapas cambiarias';
  b.onclick = () => {
   etapasActivasV15 = !etapasActivasV15; cerrarFichaEtapaV15();
   b.setAttribute('aria-pressed', String(etapasActivasV15));
   chartAnterior = null; dibujarBase();
   anunciar?.(etapasActivasV15 ? 'Etapas cambiarias visibles en el gráfico. Pasá el cursor o recorré con las flechas para ver la etapa de cada fecha; tocá el nombre de una etapa para ver su detalle.' : 'Etapas cambiarias ocultas.');
  };
 }
 b.setAttribute('aria-pressed', String(etapasActivasV15));
 b.hidden = !!$('.stage.propia-grilla');
 const panel = fila.querySelector('.panel-comparaciones');
 if (panel && b.nextElementSibling !== panel) panel.before(b); else if (!panel && !b.isConnected) fila.append(b);
}
const finalizarTanda7 = finalizarActualizacion;
finalizarActualizacion = function() {finalizarTanda7(); botonEtapasV15(); cerrarFichaEtapaV15();};

// La lectura del punto suma la etapa cuando las franjas están visibles.
const tipTanda7 = tipEn;
tipEn = function(i) {
 const r = tipTanda7(i), tip = $('#tip');
 if (!r || !tip || !etapasVisiblesV15() || !fechas[i]) return r;
 const e = etapaDeFechaV15(fechas[i]);
 if (e && !tip.querySelector('.etapa-tip')) {
  const p = document.createElement('p'); p.className = 'etapa-tip';
  const b = document.createElement('b'); b.textContent = e.nombre;
  p.append('Etapa: ', b, ' · ' + e.periodo);
  (tip.querySelector('.equivalente-tip') || tip.querySelector('.tabla-tooltip'))?.before(p);
 }
 return r;
};

// Ficha de una etapa: se abre al tocar su nombre arriba del gráfico.
function cerrarFichaEtapaV15() {$('#fichaEtapa')?.remove();}
function abrirFichaEtapaV15(t) {
 cerrarFichaEtapaV15();
 const env = $('#lienzo').parentElement, f = document.createElement('div');
 f.id = 'fichaEtapa'; f.className = 'ficha-etapa'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-label', 'Etapa cambiaria: ' + t.e.nombre);
 const h = document.createElement('p'); h.className = 'ficha-titulo'; h.textContent = t.e.nombre;
 const per = document.createElement('p'); per.className = 'ficha-periodo'; per.textContent = t.e.periodo;
 const tx = document.createElement('p'); tx.textContent = t.e.texto;
 f.append(h, per, tx);
 if (t.e.detalles.length) {
  const ul = document.createElement('ul');
  t.e.detalles.forEach(([d, u]) => {const li = document.createElement('li'); const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = d; li.append(a); ul.append(li);});
  f.append(ul);
 }
 const fu = document.createElement('a'); fu.className = 'ficha-fuente'; fu.href = t.e.fuente; fu.target = '_blank'; fu.rel = 'noopener'; fu.textContent = 'Norma o fuente';
 const nota = document.createElement('p'); nota.className = 'ficha-nota'; nota.textContent = 'Hito descriptivo: no clasifica por sí solo el grado de apertura.';
 const c = document.createElement('button'); c.type = 'button'; c.className = 'ficha-cerrar'; c.setAttribute('aria-label', 'Cerrar'); c.onclick = () => {cerrarFichaEtapaV15(); $('#lienzo').focus({preventScroll: true});};
 f.append(fu, nota, c);
 env.append(f);
 const ancho = f.offsetWidth, centro = (t.x0 + t.x1) / 2;
 f.style.left = Math.max(4, Math.min(env.clientWidth - ancho - 4, centro - ancho / 2)) + 'px';
 f.style.top = (mapaX.m.t + 4) + 'px';
 c.focus({preventScroll: true});
}
$('#vista').addEventListener('pointerdown', e => {
 const cv = e.target.closest?.('#lienzo');
 if (!cv || !etapasVisiblesV15() || !mapaX) return;
 const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
 if (y > mapaX.m.t) return;
 const t = tramosEtapasV15.find(t => x >= t.x0 && x <= t.x1);
 if (!t) return;
 e.stopPropagation(); e.preventDefault();
 abrirFichaEtapaV15(t);
}, true);
document.addEventListener('keydown', e => {if (e.key === 'Escape' && $('#fichaEtapa')) {cerrarFichaEtapaV15(); $('#lienzo')?.focus({preventScroll: true});}});
document.addEventListener('pointerdown', e => {if ($('#fichaEtapa') && !e.target.closest?.('#fichaEtapa, #lienzo')) cerrarFichaEtapaV15();});
// cursor de mano sobre los nombres
$('#vista').addEventListener('pointermove', e => {
 const cv = e.target.closest?.('#lienzo'); if (!cv) return;
 const y = e.clientY - cv.getBoundingClientRect().top;
 cv.style.cursor = etapasVisiblesV15() && mapaX && y <= mapaX.m.t ? 'pointer' : '';
});

// Metodología: la lectura del sentido pasó al panel de arriba; abajo quedan fórmulas, fuentes y la lista de etapas.
const ordenarTanda7 = ordenarVista;
ordenarVista = function() {
 ordenarTanda7();
 const metodo = $('.ayuda-lectura'); if (!metodo) return;
 metodo.querySelectorAll('p.lectura').forEach(p => {if (/^Si la línea sube/.test(p.textContent.trim())) p.hidden = true;});
 if (!metodo.querySelector('.lista-etapas')) {
  const d = document.createElement('div'); d.className = 'lista-etapas';
  const h = document.createElement('p'); h.className = 'lectura'; h.innerHTML = '<b>Etapas cambiarias.</b> Hitos descriptivos de las condiciones para operar; no clasifican por sí solos el grado de apertura. Fuente: ADIMRA, BCRA y normativa de comercio exterior.';
  const ul = document.createElement('ul');
  ETAPAS_V15.forEach(e => {const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = e.nombre + ' (' + e.periodo + '). '; const a = document.createElement('a'); a.href = e.fuente; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Fuente'; li.append(b, e.texto + ' ', a); ul.append(li);});
  d.append(h, ul);
  const pie = metodo.querySelector('.pie'); pie ? pie.before(d) : metodo.append(d);
 }
};
// el clic sobre los nombres de las etapas no elige fecha en el gráfico (eso redibujaría y cerraría la ficha)
['click', 'pointerup', 'mousedown', 'mouseup'].forEach(tipo => $('#vista').addEventListener(tipo, e => {
 const cv = e.target.closest?.('#lienzo');
 if (!cv || !etapasVisiblesV15() || !mapaX) return;
 if (e.clientY - cv.getBoundingClientRect().top <= mapaX.m.t) {e.stopPropagation(); e.preventDefault();}
}, true));
// sobre la franja de nombres no se muestra la lectura del punto; al abrir una ficha, la lectura se cierra
$('#vista').addEventListener('pointermove', e => {
 const cv = e.target.closest?.('#lienzo');
 if (!cv || !etapasVisiblesV15() || !mapaX || puntoFijadoV9 !== null) return;
 if (e.clientY - cv.getBoundingClientRect().top <= mapaX.m.t) {e.stopPropagation(); ocultarTip();}
}, true);
const abrirFichaTanda7 = abrirFichaEtapaV15;
abrirFichaEtapaV15 = function(t) {if (puntoFijadoV9 === null) ocultarTip(); abrirFichaTanda7(t);};

// En el celular, el toque fija la lectura al levantar el dedo: si el gráfico se corre al mostrarla
// (por ejemplo, con la comparación del BCRA), el clic posterior puede caer fuera del lienzo.
$('#vista').addEventListener('pointerup', e => {
 if (e.pointerType !== 'touch' || puntoFijadoV9 !== null || resaltado == null) return;
 const cv = e.target.closest?.('#lienzo'); if (!cv || typeof cv.onclick !== 'function') return;
 cv.onclick();
});

// La franja del selector activo se mide en píxeles. Si un selector cambia de ancho sin que cambie
// la ventana (fuentes, logos o columnas que terminan de acomodarse), se vuelve a medir.
const vigiaSelectoresV15 = typeof ResizeObserver === 'function' ? new ResizeObserver(() => actualizarSelectoresMovimiento(false)) : null;
const selectoresAntesV15 = actualizarSelectoresMovimiento;
actualizarSelectoresMovimiento = function(animar = true) {
 selectoresAntesV15(animar);
 document.querySelectorAll('.seleccion-deslizante').forEach(g => vigiaSelectoresV15?.observe(g));
};
actualizarSelectoresMovimiento(false);
