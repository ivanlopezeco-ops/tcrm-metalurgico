// Contrasta el navegador con las series calculadas por Python, usando el corte publicado.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results');
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'publico/index.html'),'utf8');
const D=JSON.parse(html.match(/window\.DATOS\s*=\s*([\s\S]*?);\s*<\/script>/)[1]);
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const app=scripts.at(-1)[1];
const expose=`window.qa={
 sector:(l,p,g)=>{modo='sector';lado=l;preset=p;vista.gran=g;apagados=new Set();comparaciones=new Set();render();return serieDeCanasta(g);},
 propia:g=>{modo='empresa';canastas[lado]=Object.fromEntries(G.map(p=>[p,p===g?100:0]));render();return serieDeCanasta('diario');},
 modelo:()=>modeloActual
};`;
const instrumented=html.replace(app,app.replace(/\}\)\(\);\s*$/,expose+'\n})();'));
const target=path.join(out,'datos.html');fs.writeFileSync(target,instrumented);
let checks=0;const check=(ok,msg)=>{assert(ok,msg);checks++};
(async()=>{
 const browser=await chromium.launch(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(target).href);
  // En cada rubro, el navegador debe utilizar la serie oficial con ponderadores móviles.
  for(const lado of ['IMPO','EXPO'])for(const [nombre,preset] of Object.entries(D.presets[lado])){
   if(preset.tipo==='familia')continue;
   for(const gran of ['mensual','diario']){
    const y=await page.evaluate(({lado,nombre,gran})=>window.qa.sector(lado,nombre,gran),{lado,nombre,gran});
    const key=nombre==='Total del intercambio'?lado+' total':lado+' - '+nombre;
    assert.deepEqual(y,D.oficiales[gran][key],lado+' / '+nombre+' / '+gran);checks++;
   }
  }
  // Una canasta propia de un único socio reproduce ese bilateral, base 17/12/2015.
  for(const pais of ['Brasil','China','Estados Unidos']){
   const y=await page.evaluate(g=>window.qa.propia(g),pais),bil=D.diario.bil[pais];
   const ancla=bil[D.diario.fechas.indexOf('2015-12-17')];
   const i=bil.findLastIndex(v=>v!=null);
   check(Math.abs(y[i]-100*bil[i]/ancla)<0.001,'Bilateral de '+pais);
  }
  const model=await page.evaluate(()=>window.qa.modelo());
  const i=D.diario.fechas.indexOf(model.fechaDolar);
  check(model.dolar===D.dolar.diario[i],'Cotización alineada con su fecha');
  check(!html.includes('datos al 11 sep 2026'),'Sin fecha congelada en la interfaz');
  check(!html.includes('../tcrm-atlas-v'),'Sin enlaces a carpetas locales');
  check(errors.length===0,'Sin errores de ejecución');
  fs.writeFileSync(path.join(out,'datos-verification.json'),JSON.stringify({checks,ultimoDato:D.diario.fechas.at(-1),cotizacion:model,result:'OK'},null,2));
  console.log({checks,ultimoDato:D.diario.fechas.at(-1),result:'OK'});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
