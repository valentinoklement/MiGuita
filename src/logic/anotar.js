// Anotar rápido por texto: "nafta 20000", "10 lucas birra", "dos palos alquiler", "hotel 100 usd".
// Busca todos los montos posibles y se queda con el que tiene sentido. "2 pizzas 18000": el 2 es una cantidad.
// Si de verdad no se puede saber ("super 1500 verdu 2000", "nafta 20"), devuelve duda: la app le pregunta a la persona.
// Ojo, documentado y probado: "1.5" se lee como 15 (el punto siempre es de miles); para decimales va la coma. Con "lucas", "1.5 lucas" son 1.500.
import { categoriasIniciales, paraAdivinar, RESPALDO } from "./categorias.js";
import { LEXICO_GASTO, LEXICO_INGRESO, ES_INGRESO, quitarAcentos } from "./lexico.js";

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const POR_DEFECTO = categoriasIniciales();

// La palabra completa, en singular o plural: "bar" no es "barrio" ni "barbería".
const contiene = (t, k) => new RegExp("(^|[^a-z0-9ñ])" + escapar(quitarAcentos(k)) + "(s|es)?($|[^a-z0-9ñ])").test(t);
function mejorDe(t, lista) {
  let id = null, largo = 0;
  for (const [cat, claves] of lista) for (const k of claves) if (k && k.length > largo && contiene(t, k)) { id = cat; largo = k.length; }
  return id;
}
// Lo que cargó la persona y el vocabulario de la app (solo en sus categorías visibles). Gana lo más específico: "uber eats" antes que "uber"; si empatan, lo de la persona.
export function adivinarCategoria(texto, lista, lexico = { ...LEXICO_GASTO, ...LEXICO_INGRESO }) {
  const t = quitarAcentos(texto);
  return mejorDe(t, [...lista, ...lista.map(([id]) => [id, lexico[id] || []])]) || lista[lista.length - 1][0];
}

const UNIDADES = "cero un dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis veintisiete veintiocho veintinueve".split(" ");
const PALABRAS = Object.fromEntries(UNIDADES.map((p, i) => [p, i]));
Object.assign(PALABRAS, { uno: 1, una: 1, veintiun: 21, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900 });
delete PALABRAS.cero;
const POR = { k: 1e3, mil: 1e3, miles: 1e3, luca: 1e3, lucas: 1e3, luka: 1e3, lukas: 1e3, lukitas: 1e3, luquitas: 1e3, luquita: 1e3, lks: 1e3, palo: 1e6, palos: 1e6, palito: 1e6, palitos: 1e6, millon: 1e6, millones: 1e6, gamba: 100, gambas: 100, gambita: 100, quina: 500, quinas: 500 };
const SOLO_CON_NUMERO = new Set(["k", "palo", "palos", "palito", "palitos", "millon", "millones", "miles", "gamba", "gambita", "quina"]);
const PESOS = new Set(["peso", "pesos", "pe", "mango", "mangos", "mangazos", "morlaco", "morlacos", "pesitos", "ars"]);
const DOLARES = new Set(["usd", "u$s", "us$", "dolar", "dolares", "verde", "verdes", "verdolagas", "dolarcitos"]);
const CANTIDADES = new Set("kg kilo kilos g gr grs gramos l lt lts litro litros ml cc cm mts metro metros m2 unidad unidades u hs hora horas dia dias semana semanas mes meses año años cuota cuotas persona personas porcion porciones noches noche latas lata botellas botella packs pack docena docenas".split(" "));
const FILLER = /^(gast[eé]|pagu[eé]|compr[eé]|me sali[oó]|sali[oó]|fueron|puse)\s+(en\s+|de\s+|por\s+)?/i;

function numero(t, conMultiplicador) {
  const s = t.replace(/[.,]+$/, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", "."));
  if (/^\d+,\d{3}$/.test(s)) return parseFloat(s.replace(",", ""));       // "15,500": nadie escribe tres decimales
  if (/^\d+\.\d{1,2}$/.test(s) && conMultiplicador) return parseFloat(s); // "1.5 lucas"
  return parseFloat(s.replace(/\./g, "").replace(",", "."));
}

// Todos los montos que aparecen en el texto: { valor (pesos), fuerte, palabra, usd, desde, hasta }.
function buscarMontos(original) {
  const s = quitarAcentos(original);
  const toks = [...s.matchAll(/u\$s|us\$|\$|\d+\/\d+(\/\d+)?|\d[\d.,]*|[a-zñ]+\d*/g)].map((m) => ({ t: m[0], i: m.index, f: m.index + m[0].length }));
  const lista = [];
  const conMoneda = (c, i) => {
    let j = i, previo = toks[c.ini - 1];
    if (previo?.t === "$") { c.fuerte = true; c.desde = previo.i; }
    else if (previo && DOLARES.has(previo.t)) { c.usd = c.fuerte = true; c.desde = previo.i; }
    const sig = toks[j + 1];
    if (sig && PESOS.has(sig.t)) { c.fuerte = true; c.hasta = sig.f; j++; }
    else if (sig && DOLARES.has(sig.t)) { c.usd = c.fuerte = true; c.hasta = sig.f; j++; }
    lista.push(c);
    return j;
  };
  // "y media" / "y medio" después de un multiplicador.
  const yMedia = (i) => toks[i + 1]?.t === "y" && /^medi[oa]$/.test(toks[i + 2]?.t || "");
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (k.t.includes("/")) continue; // fechas y fracciones: "3/12", "1/2"
    if (/^\d/.test(k.t)) {
      const sigT = toks[i + 1];
      const pegado = sigT && (POR[sigT.t] !== undefined) && (sigT.i - k.f <= 1);
      if (!pegado && sigT && CANTIDADES.has(sigT.t)) continue;
      // "3 x 2000" o "3x2000": la cuenta total.
      if (sigT?.t === "x" && /^\d/.test(toks[i + 2]?.t || "")) {
        const q = numero(k.t), u = numero(toks[i + 2].t);
        if (q && u) lista.push({ valor: q * u, fuerte: true, desde: k.i, hasta: toks[i + 2].f, ini: i });
        i += 2; continue;
      }
      if (/^x\d+$/.test(sigT?.t || "")) { const q = numero(k.t), u = Number(sigT.t.slice(1)); if (q && u) lista.push({ valor: q * u, fuerte: true, desde: k.i, hasta: sigT.f, ini: i }); i++; continue; }
      let valor = numero(k.t, pegado), j = i;
      if (!valor) continue;
      let fuerte = false;
      if (pegado) {
        const m = POR[sigT.t];
        valor *= m; j = i + 1; fuerte = true;
        if (yMedia(j)) { valor += m / 2; j += 2; }
        // "2 mil 500", "2 mil quinientos"
        const cola = toks[j + 1];
        if (m === 1e3 && cola && /^\d{1,3}$/.test(cola.t) && !CANTIDADES.has(toks[j + 2]?.t) && !POR[toks[j + 2]?.t]) { valor += Number(cola.t); j++; }
        else if (m === 1e3 && cola && PALABRAS[cola.t] >= 100) { valor += PALABRAS[cola.t]; j++; }
      }
      i = conMoneda({ valor, fuerte, decimal: /[.,]\d{1,2}$/.test(k.t), desde: k.i, hasta: toks[j].f, ini: i }, j);
      continue;
    }
    // Con palabras: "dos lucas", "media luca", "un palo y medio", "treinta y cinco mil", "quinientos pesos".
    if (/^medi[oa]$/.test(k.t) && POR[toks[i + 1]?.t]) {
      lista.push({ valor: POR[toks[i + 1].t] / 2, fuerte: true, palabra: true, desde: k.i, hasta: toks[i + 1].f, ini: i });
      i++; continue;
    }
    if (PALABRAS[k.t] !== undefined || k.t === "mil") {
      let j = i, total = 0, parte = 0, vio = false;
      for (; j < toks.length; j++) {
        const w = toks[j].t;
        if (PALABRAS[w] !== undefined) { parte += PALABRAS[w]; vio = true; }
        else if (w === "y" && vio && PALABRAS[toks[j + 1]?.t] !== undefined) continue;
        else if (w === "mil") { total += (parte || 1) * 1000; parte = 0; vio = true; }
        else break;
      }
      j--;
      const m = POR[toks[j + 1]?.t];
      let fin = j, valor = total + parte;
      if (m && toks[j + 1].t !== "mil") {
        valor *= m; fin = j + 1;
        if (yMedia(fin)) { valor += m / 2; fin += 2; }
      }
      const conPalabraDePlata = fin !== j || PESOS.has(toks[fin + 1]?.t) || DOLARES.has(toks[fin + 1]?.t);
      if (valor && (conPalabraDePlata || valor >= 100)) i = conMoneda({ valor, fuerte: true, palabra: true, desde: k.i, hasta: toks[fin].f, ini: i }, fin);
      else i = Math.max(i, j);
      continue;
    }
    // "una luca" ya pasó por arriba; "nafta luca" o "luca nafta" son mil pesos.
    if (POR[k.t] && (!SOLO_CON_NUMERO.has(k.t) || yMedia(i)) && k.t !== "mil") {
      let valor = POR[k.t], fin = i;
      if (yMedia(fin)) { valor += POR[k.t] / 2; fin += 2; }
      i = conMoneda({ valor, fuerte: true, palabra: true, desde: k.i, hasta: toks[fin].f, ini: i }, fin);
    }
  }
  return lista;
}

// Elige el monto. opciones: si hay más de una respuesta razonable, para preguntar.
function elegirMonto(lista) {
  if (!lista.length) return null;
  const fuertes = lista.filter((c) => c.fuerte), cifras = lista.filter((c) => !c.palabra);
  if (fuertes.length === 1 && !(fuertes[0].palabra && cifras.some((c) => c.valor >= 100))) return { c: fuertes[0], quitar: [fuertes[0]] };
  const grandes = lista.filter((c) => c.valor >= 100);
  if (grandes.length === 1) return { c: grandes[0], quitar: grandes };
  if (grandes.length > 1) {
    const v = grandes.map((c) => c.valor);
    return { c: grandes[0], quitar: grandes, opciones: [...new Set([...v, v.reduce((a, b) => a + b, 0)])] };
  }
  // Solo números chicos: "nafta 20" ¿son 20 pesos o 20 lucas?
  const c = lista[lista.length - 1];
  if (c.decimal) return { c, quitar: [c] };
  return { c, quitar: [c], opciones: [c.valor, c.valor * 1000] };
}

export function leerTexto(texto, cats = POR_DEFECTO, aprendidas = {}) {
  const s = String(texto).replace(/\s+/g, " ").trim();
  const e = elegirMonto(buscarMontos(s));
  if (!e) return null;
  let sin = s;
  for (const c of [...e.quitar].sort((a, b) => b.desde - a.desde)) sin = sin.slice(0, c.desde) + " " + sin.slice(c.hasta);
  const resto = sin.replace(/\s+/g, " ").trim().replace(FILLER, "").replace(/^(en|de|por)\s+/i, "").replace(/\s+[-–−]$/, "").trim();
  const norm = quitarAcentos(resto);
  const tipo = ES_INGRESO.test(norm) ? "ingreso" : "gasto";
  const r = { tipo, monto: Math.round(e.c.valor * 100), detalle: resto ? resto[0].toUpperCase() + resto.slice(1) : "", categoria: categoriaDe(resto, cats, tipo, aprendidas) };
  if (e.c.usd) r.moneda = "USD";
  if (e.opciones) r.opciones = e.opciones.map((v) => Math.round(v * 100));
  return r;
}

function categoriaDe(texto, cats, tipo, aprendidas) {
  const lista = paraAdivinar(cats, tipo), ya = aprendidas[claveDe(texto)];
  return ya && lista.some(([id]) => id === ya) ? ya : adivinarCategoria(texto, lista);
}
// Cómo se recuerda lo que la persona corrigió: "Cumple de Ana" y "cumple de ana" son lo mismo.
export const claveDe = (texto) => quitarAcentos(texto).replace(/[^a-z0-9ñ ]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
// Sin monto: al menos se aprovecha lo escrito para abrir la hoja casi completa.
export function leerSinMonto(texto, cats = POR_DEFECTO, aprendidas = {}) {
  const resto = String(texto).trim().replace(FILLER, "");
  const tipo = ES_INGRESO.test(quitarAcentos(resto)) ? "ingreso" : "gasto";
  return { tipo, detalle: resto ? resto[0].toUpperCase() + resto.slice(1) : "", categoria: categoriaDe(resto, cats, tipo, aprendidas) };
}
// ¿Quedó en la categoría de "no sé"? Entonces conviene preguntar.
export const quedoSinCategoria = (r) => r.detalle && r.categoria === RESPALDO[r.tipo];
// Un monto con palabras en un formulario ("20 mil", "2 lucas"). null si no es claramente un solo monto.
export function montoEnPalabras(texto) {
  const r = leerTexto(texto);
  return r && !r.opciones && !r.detalle && !r.moneda ? r.monto : null;
}
