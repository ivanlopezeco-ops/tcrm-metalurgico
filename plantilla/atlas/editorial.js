// Identidad visual tomada del informe; no interviene en datos ni cálculos.
const logosEditorial = $('.cab .logos');
logosEditorial.replaceChildren();
for (const [nombre, imagen, clase] of [
 ['ADIMRA', '__LOGO_ADIMRA__', 'logo-adimra'],
 ['Departamento de Estudios Económicos', '__LOGO_ESTUDIOS__', 'logo-estudios']
]) {
 const logo = document.createElement('img');
 logo.alt = nombre;
 logo.src = 'data:image/png;base64,' + imagen;
 logo.className = clase;
 logosEditorial.append(logo);
}
