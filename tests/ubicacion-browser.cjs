const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url');
const checks=[],errors=[],geometry=[],out=path.join(__dirname,'../test-results');
const check=(ok,s)=>{assert(ok,s);checks.push(s)};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 try{
  const p=await b.newPage({viewport:{width:1440,height:900}});p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.join(__dirname,'../publico/index.html')).href);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
  check(await p.locator('.cab .logos img').count()===2&&await p.locator('.pie-identidad .logos img').count()===0,'Los dos logos están en la cabecera y conservan su identidad');
  check(await p.locator('.selector-flujo').evaluate(e=>e.parentElement.firstElementChild===e),'El flujo encabeza el orden del DOM de los controles');
  await p.locator('#bImpo').hover();await p.locator('#ayudaFlujoV13').waitFor({state:'visible'});
  check((await p.locator('#ayudaFlujoV13').textContent()).includes('origen de las compras')&&(await p.locator('#ayudaFlujoV13').textContent()).includes('pueden cambiar el TCRM'),'Hover explica origen y efecto de los pesos sin una nueva interpretación');
  await p.locator('#ayudaFlujoV13').hover();await p.waitForTimeout(160);check(await p.locator('#ayudaFlujoV13').isVisible(),'La ayuda permanece visible al pasar el cursor sobre ella');
  await p.keyboard.press('Escape');check(!(await p.locator('#ayudaFlujoV13').isVisible()),'Escape permite descartar la ayuda');
  await p.locator('#bExpo').focus();check((await p.locator('#ayudaFlujoV13').textContent()).includes('destino de las ventas'),'El foco de teclado explica exportaciones');
  await p.keyboard.press('Enter');await p.waitForTimeout(350);
  check(await p.locator('#bExpo').getAttribute('aria-pressed')==='true'&&(await p.locator('.basket summary').textContent()).includes('exportaciones'),'La elección actualiza el índice y la canasta');
  check(await p.locator('.lado').evaluate(e=>{const a=e.querySelector('[aria-pressed=true]').getBoundingClientRect(),m=e.querySelector('.selection-marker').getBoundingClientRect();return Math.abs(a.left-m.left)<1&&Math.abs(a.width-m.width)<1}),'El marcador queda alineado después del cambio de flujo');
  await p.locator('#bImpo').click();await p.waitForTimeout(350);
  for(const [width,height,theme] of [[1440,900,'light'],[1366,768,'light'],[1100,800,'light'],[768,1024,'light'],[390,844,'light'],[390,844,'dark'],[320,640,'light']]){
   await p.setViewportSize({width,height});if(await p.locator('html').getAttribute('data-theme')!==theme)await p.locator('#tema').click();await p.waitForTimeout(350);
   const g=await p.evaluate(()=>{const r=s=>{const e=document.querySelector(s),b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom,cssHeight:getComputedStyle(e).height}};return {viewport:[innerWidth,innerHeight],theme:document.documentElement.dataset.theme,stage:r('.stage'),canvas:r('#lienzo'),scope:r('.scope'),cab:r('.cab'),field:r('.scope-field'),flow:r('.selector-flujo')}});
   geometry.push(g);
   if(width>=1300)check(g.stage.bottom<=height,'Vista principal en una pantalla '+width+' '+theme);
   check(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sin desborde '+width+' '+theme);
   check(await p.locator('.scope-field label').isVisible(),'Rótulo de rubro visible '+width+' '+theme);
   check(await p.locator('#bImpo').evaluate(e=>e.getBoundingClientRect().height>=44),'Selector accesible al toque '+width+' '+theme);
   check(await p.locator('.selector-flujo').evaluate(e=>e.getBoundingClientRect().bottom<innerHeight),'Canasta visible sin bajar '+width+' '+theme);
   await p.locator('.ayuda-flujo').click();check(await p.locator('.ayuda-flujo').getAttribute('aria-expanded')==='true','Ayuda fijada por clic o toque '+width+' '+theme);
   check(await p.locator('#ayudaFlujoV13').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}),'Ayuda contenida en la pantalla '+width+' '+theme);
   await p.locator('.ayuda-flujo').click();check(!(await p.locator('#ayudaFlujoV13').isVisible()),'Segundo toque cierra la ayuda '+width+' '+theme);
   await p.locator('.ayuda-flujo').click();
   await p.screenshot({path:path.join(out,'v13-'+width+'-'+theme+'-ayuda.png')});
   await p.screenshot({path:path.join(out,'v13-'+width+'-'+theme+'.png'),fullPage:true});await p.keyboard.press('Escape');
  }
  await p.locator('#mEmpresa').click();await p.locator('.ayuda-flujo').click();
  check((await p.locator('#ayudaFlujoV13').textContent()).includes('conserva los pesos que cargaste'),'Canasta propia explica cargas separadas');
  await p.keyboard.press('Escape');await p.locator('#canastaLista input[data-g="Brasil"]').fill('20');await p.locator('#bExpo').click();
  check(Number(await p.locator('#canastaLista input[data-g="Brasil"]').inputValue())===0,'Ventas mantiene una carga independiente');
  await p.locator('#bImpo').click();check(await p.locator('#canastaLista input[data-g="Brasil"]').inputValue()==='20','Compras recupera la carga previa');
  check(errors.length===0,'Sin errores JavaScript');
  fs.writeFileSync(path.join(out,'ubicacion-verification.json'),JSON.stringify({checks,geometry,errors,resultado:'OK'},null,2));console.log({checks:checks.length,resultado:'OK'});
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
