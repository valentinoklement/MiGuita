// Copia los dibujos de la muestra de diseño (../diseno/pantallas-papel-crema.html, fuera de este repositorio) a src/art/art.js.
// Solo toma las funciones de dibujo, no las pantallas de ejemplo. Uso: node tools/extraer-arte.cjs
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const muestra = fs.readFileSync(path.join(raiz, "..", "diseno", "pantallas-papel-crema.html"), "utf8").split(/\r?\n/);

// Rangos de líneas (1 = primera) de la muestra que son dibujos puros.
const RANGOS = [
  [233, 236],  // colores base, L(), F(), f1()
  [238, 324],  // media luna y Miguita
  [325, 348],  // facturas amigas
  [354, 386],  // pan francés, bolsa, masa, miñón
  [415, 415],  // ico()
  [417, 444],  // colores extra, cd(), 8 categorías dibujadas
  [479, 482],  // hbar()
  [497, 505],  // íconos de la barra de abajo
  [549, 592],  // escalera de racha e ingredientes
  [594, 594],  // stSvg()
  [601, 602],  // ojo abierto y tachado
  [663, 695],  // íconos de 16 categorías, ingresos y metas
];

function tomar(desde, hasta) {
  const t = muestra.slice(desde - 1, hasta);
  // Las pantallas de ejemplo de la muestra (S, S2, S3) traen textos de muestra: no pueden entrar.
  if (t.some((l) => /document\.|\bS[23]\.|var S[23]?=\{/.test(l)))
    throw new Error("El rango " + desde + "-" + hasta + " trae pantalla o datos de ejemplo");
  return t.join("\n");
}

let cuerpo = RANGOS.map(([a, b]) => tomar(a, b)).join("\n");

// Los 16 de gasto y 4 de ingreso, con el ícono de cada uno. "Banda/música" pasa a "Hobbies".
cuerpo += `
  // Íconos por id de categoría (ver src/logic/categorias.js). Las categorías nuevas usan el de Otros.
  var ICONOS={super:CAT[0][1],carne:IC.carne,comida:IC.burger,auto:CAT[1][1],transporte:IC.bus,gym:IC.gym,subs:IC.subs,hobbies:IC.guitar,salidas:CAT[2][1],ropa:CAT[5][1],salud:CAT[4][1],regalos:CAT[6][1],servicios:CAT[3][1],deudas:IC.debt,edu:IC.edu,otros:CAT[7][1],
    sueldo:IC.sueldo,extra:IC.extra,regalo_in:IC.regalo2,otros_in:IC.otrosin};
  function catIcon(id){return ICONOS[id]||CAT[7][1];}
  var METAS=[["meta","Meta",IC.target],["viaje","Viaje",IC.plane],["emergencia","Emergencia",IC.life],["casa","Casa",CAT[3][1]],["auto","Auto",CAT[1][1]],["compu","Compu",IC.laptop],["hobbies","Hobbies",IC.guitar],["regalo","Regalo",CAT[6][1]]];
  function metaIcon(id){for(var i=0;i<METAS.length;i++)if(METAS[i][0]===id)return METAS[i][2];return IC.target;}
  function stage(i,on){var s=STAGES[i];return stSvg(s[2](),"0 0 64 54",on!==false);}
  function ingredient(i,on){return stSvg(ING[i](),"0 0 28 28",on);}
  // Gastos por día del mes (centavos); el día marcado va en dorado.
  function dayBars(vals,marca){
    var max=Math.max.apply(null,vals.concat([1])),n=vals.length,w=240/n,f='',l='',i,x,h,y;
    for(i=0;i<n;i++){x=6+i*w;h=vals[i]?Math.max(vals[i]/max*52,3):1.5;y=62-h;
      f+='<rect x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(w*.68)+'" height="'+f1(h)+'" rx="1.6" fill="'+(i===marca?"#F4AE3D":CRUST)+'"/>';
      if(vals[i])l+='<rect x="'+f1(x)+'" y="'+f1(y)+'" width="'+f1(w*.68)+'" height="'+f1(h)+'" rx="1.6" stroke-width="1.3"/>';}
    l+='<path d="M3 63Q120 66 245 62" stroke-width="2"/>';
    return '<svg class="bg" viewBox="0 0 248 70" role="img" aria-label="Gastos por día">'+F(f)+L(l)+'</svg>';
  }
  return {miguita:slice,luna:luna,factura:friend,pan:loaf,bolsa:bag,masa:dough,minion:miniRoll,
    navIcon:navIco,icono:ico,barra:hbar,catIcon:catIcon,metaIcon:metaIcon,ICONOS_META:METAS.map(function(m){return {id:m[0],nombre:m[1]};}),premio:stage,ingrediente:ingredient,barrasDias:dayBars,salvavidas:IC.life,
    PREMIOS:STAGES.map(function(s){return {dias:s[0],nombre:s[1]};}),OJO:EYE,OJO_TAPADO:EYEOFF};
`;

const salida = `/* Generado por tools/extraer-arte.cjs desde diseno/pantallas-papel-crema.html. No editar a mano. */
export const Art = (function(){
${cuerpo}
})();
`;

fs.mkdirSync(path.join(raiz, "src", "art"), { recursive: true });
fs.writeFileSync(path.join(raiz, "src", "art", "art.js"), salida);
console.log("art.js listo:", salida.length, "caracteres");
