const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url');
const out=path.resolve(__dirname,'../test-results'),checks=[],errors=[];
const check=(ok,s)=>{assert(ok,s);checks.push(s);};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 try{
 const page=await b.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'../publico/index.html')).href);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(750);
 check(await page.locator('[data-comparador="ninguno"]').getAttribute('aria-pressed')==='true','Sin comparación inicial');
 for(const [width,height,theme] of [[1440,900,'light'],[1440,900,'dark'],[1366,768,'light'],[390,844,'light'],[390,844,'dark']]){
  await page.setViewportSize({width,height});if(await page.locator('html').getAttribute('data-theme')!==theme)await page.locator('#tema').click();await page.waitForTimeout(350);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sin desborde '+width+' '+theme);
  if(width===390)check((await page.locator('#guiaGrafico').textContent()).includes('Tocá'),'Guía táctil tras cambiar ancho '+theme);
  if(width>1200){check(await page.locator('.stage').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'Tablero principal en una pantalla '+width);}
  await page.screenshot({path:path.join(out,`v9-${width}-${theme}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1440,height:900});await page.locator('#tema').click();
 let c=await page.locator('#lienzo').boundingBox();await page.mouse.move(c.x+c.width*.6,c.y+c.height*.5);
 check((await page.locator('#tip').textContent()).includes('Dólar equivalente'),'Hover muestra dólar');
 await page.locator('.panel-comparaciones summary').click();await page.locator('[data-comparador="bcra"]').click();await page.locator('.panel-comparaciones summary').click();c=await page.locator('#lienzo').boundingBox();await page.mouse.move(c.x+c.width*.5,c.y+c.height*.5);
 let text=await page.locator('#tip').textContent();check(text.includes('ITCRM BCRA')&&text.includes('Dólar equivalente'),'BCRA y equivalencia simultáneos');
 await page.mouse.click(c.x+c.width*.5,c.y+c.height*.5);await page.mouse.move(5,5);
 check(await page.locator('#tip').evaluate(e=>e.classList.contains('ver')&&e.classList.contains('fijado')),'Clic fija lectura fuera del gráfico');
 check(await page.locator('#tip').getAttribute('aria-hidden')==='false','Lectura fijada expuesta a tecnología asistiva');
 check(await page.locator('#tip .equivalente-tip b').textContent()===await page.locator('#dolar .dol-b .v').textContent(),'Tooltip y cálculo heredado coinciden al fijar fecha');
 await page.screenshot({path:path.join(out,'v9-tooltip.png'),fullPage:true});
 await page.keyboard.press('Escape');check(!(await page.locator('#tip').getAttribute('class')).includes('ver'),'Escape cierra');
 check(await page.locator('#tip').getAttribute('aria-hidden')==='true'&&await page.locator('.cerrar-lectura').getAttribute('tabindex')==='-1','Lectura oculta fuera del foco y árbol accesible');
 await page.locator('#lienzo').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');
 check((await page.locator('#tip').getAttribute('class')).includes('fijado'),'Enter fija lectura');await page.keyboard.press('Escape');
 await page.locator('#abrirPromedio').click();check(await page.locator('#dolar .dol-b .v').isVisible(),'Promedio visible consultable');
 await page.locator('#refFecha').click();check(await page.locator('#fechaObjetivo').isVisible(),'Fecha alternativa accesible');
 await page.locator('#consultaEquivalencia>summary').click();
 await page.locator('#selRubro').selectOption({label:'Autopartes'});check((await page.locator('#detalle').textContent()).includes('Autopartes'),'Filtro rubro actualiza contexto');
 await page.locator('#mEmpresa').click();await page.locator('#bBorrar').click();
 const list=page.locator('#canastaLista'),order=await list.locator('.fila').evaluateAll(es=>es.map(e=>e.dataset.g));
 await list.locator('input[data-g="Brasil"]').fill('70');await list.locator('input[data-g="China"]').fill('30');
 check(JSON.stringify(order)===JSON.stringify(await list.locator('.fila').evaluateAll(es=>es.map(e=>e.dataset.g))),'Carga estable');
 await list.hover();await page.mouse.wheel(0,250);await page.waitForTimeout(150);check(await list.evaluate(e=>e.scrollTop)>0,'Scroll interno real');
 check(JSON.stringify(order)===JSON.stringify(await list.locator('.fila').evaluateAll(es=>es.map(e=>e.dataset.g))),'Scroll no reordena');
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#comparacionPropia summary').click();await page.locator('[data-comparador="ninguno"]').click();await page.locator('#comparacionPropia summary').click();
 check(await page.locator('.selection-marker').last().evaluate(e=>getComputedStyle(e).transitionDuration)==='0s','Movimiento reducido');
 const mobile=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(pathToFileURL(path.join(__dirname,'../publico/index.html')).href);await mobile.waitForTimeout(750);
 await mobile.locator('.panel-comparaciones summary').tap();await mobile.locator('[data-comparador="bcra"]').tap();await mobile.locator('.panel-comparaciones summary').tap();await mobile.locator('#lienzo').scrollIntoViewIfNeeded();
 const mc=await mobile.locator('#lienzo').boundingBox();await mobile.touchscreen.tap(mc.x+mc.width*.5,mc.y+mc.height*.4);
 check((await mobile.locator('#tip').getAttribute('class')).includes('fijado'),'Toque móvil fija lectura');
 const fit=await mobile.locator('#tip').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});check(fit,'Tooltip táctil dentro del ancho móvil');
 await mobile.locator('.cerrar-lectura').tap();check(!(await mobile.locator('#tip').getAttribute('class')).includes('ver'),'Toque cierra lectura');await mobile.close();
 check(errors.length===0,'Sin errores JavaScript');
 fs.writeFileSync(path.join(out,'browser-verification.json'),JSON.stringify({checks:checks.length,passed:checks,errors,result:'OK'},null,2));console.log(checks);
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
