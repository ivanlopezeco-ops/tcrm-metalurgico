const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const at=f=>path.join(__dirname,f),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const read=f=>fs.readFileSync(at(f),'utf8').replace(/\r\n/g,'\n');
const base=read('base.html');
if(hash(base)!=='3bae0e7d3e06ab72d9ae27ad28265eb085c8bd6e6a57b52e3fac582305fcc025')throw Error('Cambió la base congelada');
const scripts=[...base.matchAll(/<script>([\s\S]*?)<\/script>/g)],old=scripts.at(-1)[1];
let app=old.replace("$('#mSector').onclick=",read('v9.js')+'\n'+read('canastas.js')+'\n'+read('cierre.js')+'\n'+read('editorial.js').replace('__LOGO_ADIMRA__',fs.readFileSync(at('assets/logo-adimra.png')).toString('base64')).replace('__LOGO_ESTUDIOS__',fs.readFileSync(at('assets/logo-estudios-economicos.png')).toString('base64'))+'\n'+read('interacciones.js')+'\n'+read('ubicacion.js')+"\n$('#mSector').onclick=");
const hook="  if(modo==='sector'){\n    const T=TEXTO_LADO[lado];";
if(!app.includes(hook))throw Error('Falta punto de comparación de canastas');
app=app.replace(hook,"  agregarCanastaContraparte();\n"+hook)
 .replace('<button id="bProm">Usar el promedio del sector</button>','')
 .replace(/    \$\('#bProm'\)\.onclick=\(\)=>\{const b=D\.presets\[lado\]\['Total del intercambio'\]\.w;\s*G\.forEach\(\(g,i\)=>canastas\[lado\]\[g\]=Math\.round\(b\[i\]\*1000\)\/10\); render\(\);\};/,'');
if(app.includes("$('#bProm')"))throw Error('Quedó un enlace al control eliminado');
app=app.replace('lineas.push({y:rc,c:NARANJA,w:3.6,et:comparar});','if(compararPropiaV9) lineas.push({y:rc,c:NARANJA,w:3.6,et:comparar});');
app=app.replace('  sincronizarSlider();\n  dibujar();','  if(modo===\'empresa\'&&!norm(canastas[lado]))lineas=[];\n  sincronizarSlider();\n  dibujar();');
app=app.replace("$('#bBorrar').onclick=()=>{deshacerCanasta", "$('#bBorrar').onclick=()=>{compararPropiaV9=false;comparadorActual='ninguno';verBCRA=false;deshacerCanasta");
app=app.replace(/<p class="view-note">[\s\S]*?<\/p>/,'<p class="view-note">Atlas v14 · ADIMRA</p>');
new vm.Script(app);
const html=base.replace(old,app).replace('</style>',read('v9.css')+'\n'+read('editorial.css').replace('__POPPINS_600__',fs.readFileSync(at('assets/Poppins-SemiBold.ttf')).toString('base64'))+'\n'+read('profundidad.css')+'\n'+read('interacciones.css')+'\n'+read('ubicacion.css')+'\n'+read('logos.css')+'\n</style>')
 .replace('<title>TCRM · Atlas v8 · ADIMRA</title>','<title>TCRM · Atlas v14 · ADIMRA</title>')
 .replace(/<p class="view-note">[\s\S]*?<\/p>/,'<p class="view-note">Atlas v14 · ADIMRA</p>');
const partes=html.split('__TCRM_DATOS__');
if(partes.length!==2)throw Error('Falta el punto de inserción de datos');
const cuerpo=partes[1].replace(/^;<\/script>\s*/, '');
const destinos=[['../cabecera.html',partes[0]],['../cuerpo.html',cuerpo]];
for(const [archivo,contenido] of destinos){
 if(process.argv.includes('--check')){
  if(fs.readFileSync(at(archivo),'utf8')!==contenido)throw Error('Regenerar '+archivo);
 }else fs.writeFileSync(at(archivo),contenido);
}
console.log('Plantillas Atlas v14: OK. Los datos se insertan desde Python.');
