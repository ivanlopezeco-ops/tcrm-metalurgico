// Necesita la página servida por http (el marco no carga archivos locales): py -3 -m http.server 8791 desde la raíz del repo, o TCRM_URL=<dirección>.
// Modo embebido (sección Tableros de la web): cabecera oculta, tema de la web, altura informada al marco.
const {chromium}=require('playwright'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url');
const checks=[],errors=[],check=(ok,s)=>{assert(ok,s);checks.push(s);};
(async()=>{
 const b=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{});
 try{
  const src=process.env.TCRM_URL||'http://127.0.0.1:8791/publico/index.html';
  for(const [w,h] of [[990,800],[390,844]]){
   const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errors.push(e.message));
   await p.setContent(`<!doctype html><body style="margin:0"><iframe id="f" style="width:100%;height:600px;border:0" src="${src}?embed&tema=dark"></iframe><script>window.alturas=[];addEventListener('message',e=>{if(e.data&&e.data.tipo==='tcrm-altura'){alturas.push(e.data.altura);document.getElementById('f').style.height=e.data.altura+'px'}});</script></body>`);
   await p.waitForTimeout(2500);
   const f=p.frame({url:/index.html/});
   check(await f.evaluate(()=>document.documentElement.classList.contains('embebido')),'Clase embebido '+w);
   check(await f.evaluate(()=>getComputedStyle(document.querySelector('.cab')).display==='none'),'Cabecera propia oculta '+w);
   check(await f.evaluate(()=>document.documentElement.dataset.theme==='dark'),'Tema tomado del parámetro '+w);
   check(await f.evaluate(()=>!!document.querySelector('.franja-modos #sello')&&document.querySelector('#sello').offsetHeight>0),'Sello de actualización visible '+w);
   check((await p.evaluate(()=>alturas.length))>0,'Altura informada al marco '+w);
   const alto=await p.evaluate(()=>alturas.at(-1)),contenido=await f.evaluate(()=>Math.ceil(document.querySelector('#app').getBoundingClientRect().height));
   check(Math.abs(alto-contenido)<3,'Altura coincide con el contenido '+w);
   check(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sin desborde embebido '+w);
   await p.evaluate(()=>document.getElementById('f').contentWindow.postMessage({tipo:'adimra-tema',tema:'light'},'*'));await p.waitForTimeout(500);
   check(await f.evaluate(()=>document.documentElement.dataset.theme==='light'),'Tema cambia por mensaje de la web '+w);
   check(await f.evaluate(()=>/\$\s?[\d.]+/.test(document.getElementById('dolarResumenV15').textContent)),'Dólar equivalente en el resumen '+w);
   check(await f.evaluate(()=>document.getElementById('dolarResumenV15').textContent===document.querySelector('#dolar .dol-b .v').textContent),'Resumen y consulta del dólar coinciden '+w);
   await p.close();
  }
  check(errors.length===0,'Sin errores JavaScript');
  console.log({checks:checks.length,resultado:'OK'});
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
