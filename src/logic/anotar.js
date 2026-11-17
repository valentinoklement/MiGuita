// Anotar rápido por texto: "nafta 20000", "10 lucas birra", "dos palos alquiler", "hotel 100 usd".
// Busca todos los montos posibles y se queda con el que tiene sentido. "2 pizzas 18000": el 2 es una cantidad.
// Si de verdad no se puede saber ("super 1500 verdu 2000", "nafta 20"), devuelve duda: la app le pregunta a la persona.
// Ojo, documentado y probado: "1.5" se lee como 15 (el punto siempre es de miles); para decimales va la coma. Con "lucas", "1.5 lucas" son 1.500.
import { categoriasIniciales, paraAdivinar, RESPALDO } from "./categorias.js";
import { LEXICO_GASTO, LEXICO_INGRESO, ES_GASTO, ES_SUMAR, ES_PLATA, DEBILES, UNEN, sinFamilia, tipoDe, hayPista, quitarAcentos } from "./lexico.js";
import { idsDeTarjeta } from "./tarjeta.js";

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const POR_DEFECTO = categoriasIniciales();

// Dónde aparece una palabra clave en el texto, o -1. La palabra completa, en singular o plural: "bar" no es "barrio" ni "barbería".
function lugarDe(t, k) {
  const m = new RegExp("(^|[^a-z0-9ñ])" + escapar(quitarAcentos(k)) + "(s|es)?($|[^a-z0-9ñ])").exec(t);
  return m ? m.index + m[1].length : -1;
}
// Todas las pistas que hay en el texto. origen: 0 lo que la persona enseñó corrigiendo, 1 sus palabras clave, 2 el vocabulario de la app.
function pistas(t, propias, lista, lexico) {
  const out = [];
  const mirar = (cat, claves, origen) => {
    for (const k of claves) {
      if (!k) continue;
      const clave = quitarAcentos(k), desde = lugarDe(t, k);
      if (desde < 0) continue;
      out.push({ cat, largo: k.length, desde, hasta: desde + clave.length, origen, debil: origen > 0 && DEBILES.has(clave), detalle: UNEN.test(t.slice(0, desde)) });
    }
  };
  for (const [cat, claves] of propias) mirar(cat, claves, 0);
  for (const [cat, claves] of lista) mirar(cat, claves, 1);
  for (const [cat] of lista) mirar(cat, lexico[cat] || [], 2);
  return out;
}
const sePisan = (a, b) => a.desde < b.hasta && b.desde < a.hasta;
// De todas las pistas, la que manda. No es solo «la más larga»:
//   - lo que la persona enseñó vale dentro de una frase más larga, salvo que afuera haya otra palabra clara: si enseñó «pago» → Deudas, «pago luz» sigue yendo a Servicios;
//   - una marca o una palabra de pago («patagonia», «cuota») pierde contra cualquier palabra clara: «farmacia patagonia», «cuota del gimnasio»;
//   - el detalle pierde contra la cosa: «helado de frutilla» es helado, «gin con pepino» es gin.
// Entre las que quedan gana la más larga ("uber eats" antes que "uber"); si empatan, lo de la persona y después el orden de sus categorías.
function mejorDe(t, propias, lista, lexico) {
  let ps = pistas(t, propias, lista, lexico);
  const claras = ps.filter((p) => p.origen > 0 && !p.debil);
  ps = ps.filter((p) => p.origen > 0 || !claras.some((c) => !sePisan(c, p)));
  if (ps.some((p) => !p.debil)) ps = ps.filter((p) => !p.debil);
  ps = ps.filter((p) => !p.detalle || !ps.some((q) => !q.detalle && q.hasta <= p.desde));
  let mejor = null;
  for (const p of ps) if (!mejor || p.largo > mejor.largo) mejor = p;
  return mejor ? mejor.cat : null;
}
// Lo que cargó la persona y el vocabulario de la app (solo en sus categorías visibles).
// propias: lo que la persona enseñó corrigiendo, como [[categoría, [clave]]].
export function adivinarCategoria(texto, lista, lexico = { ...LEXICO_GASTO, ...LEXICO_INGRESO }, propias = []) {
  const t = quitarAcentos(sinFamilia(texto));
  return mejorDe(t, propias, lista, lexico) || lista[lista.length - 1][0];
}

const UNIDADES = "cero un dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis veintisiete veintiocho veintinueve".split(" ");
const PALABRAS = Object.fromEntries(UNIDADES.map((p, i) => [p, i]));
Object.assign(PALABRAS, { uno: 1, una: 1, veintiun: 21, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900 });
delete PALABRAS.cero;
const POR = { k: 1e3, mil: 1e3, miles: 1e3, luca: 1e3, lucas: 1e3, luka: 1e3, lukas: 1e3, lukitas: 1e3, lukita: 1e3, luquitas: 1e3, luquita: 1e3, lucitas: 1e3, lucita: 1e3, luquis: 1e3, luqui: 1e3, lks: 1e3, palo: 1e6, palos: 1e6, palito: 1e6, palitos: 1e6, millon: 1e6, millones: 1e6, gamba: 100, gambas: 100, gambita: 100, quina: 500, quinas: 500 };
const SOLO_CON_NUMERO = new Set(["k", "palo", "palos", "palito", "palitos", "millon", "millones", "miles", "gamba", "gambas", "gambita", "quina", "quinas"]);
const PESOS = new Set(["peso", "pesos", "pe", "mango", "mangos", "mangazos", "morlaco", "morlacos", "pesitos", "ars"]);
const DOLARES = new Set(["usd", "u$s", "us$", "dolar", "dolares", "verde", "verdes", "verdolagas", "dolarcitos"]);
// Antes del número solo vale lo que no se confunde: en «manzanas verdes 3000», «verdes» es el color.
const DOLARES_ANTES = new Set(["usd", "u$s", "us$", "dolar", "dolares"]);
// Multiplicadores que también son cosas: «2 palitos salados 3000» son dos paquetes, no dos millones.
const TAMBIEN_COSAS = new Set(["palito", "palitos", "gamba", "gambas", "gambita", "quina", "quinas"]);
const FRASES_DEL_LEXICO = new Set(Object.values({ ...LEXICO_GASTO, ...LEXICO_INGRESO }).flat().map(quitarAcentos).filter((k) => k.includes(" ")).map((k) => k.split(" ").slice(0, 2).join(" ")));
const CANTIDADES = new Set("kg kilo kilos g gr grs gramos l lt lts litro litros ml cc cm mts metro metros m2 unidad unidades u hs hora horas dia dias semana semanas mes meses año años cuota cuotas persona personas porcion porciones noches noche latas lata botellas botella packs pack docena docenas".split(" "));
const FILLER = /^(an[oó]tame|anot[aá]|p[oó]neme|pon[eé]|agr[eé]game|agreg[aá]|registr[aá]|cargame|carg[aá]|garp[eé]|tir[eé]|me cost[oó]|cost[oó]|se me fueron|se me fue|se fueron|se fue|s[uú]mame|s[uú]male|sumar|sum[aá]|r[eé]stame|r[eé]stale|restar|rest[aá]|s[aá]came|desc[oó]ntame|qu[ií]tame|ingr[eé]same|acr[eé]ditame|me gast[eé]|gast[eé]|pagu[eé]|compr[eé]|cobr[eé]|me sali[oó]|sali[oó]|fueron|puse)(\s+|$)(en\s+|de\s+|del\s+|por\s+)?((el|la|los|las)\s+)?/i;

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
    else if (previo && DOLARES_ANTES.has(previo.t)) { c.usd = c.fuerte = true; c.desde = previo.i; }
    const sig = toks[j + 1];
    if (sig && PESOS.has(sig.t)) { c.fuerte = true; c.hasta = sig.f; j++; }
    else if (sig && DOLARES.has(sig.t)) { c.usd = c.fuerte = true; c.hasta = sig.f; j++; }
    lista.push(c);
    return j;
  };
  // «2 palitos salados 3000», «3 gambas al ajillo 12000»: después de «palitos» viene una palabra y es algo que se compra
  // (está en el vocabulario), o en la frase hay otro monto de verdad. Entonces el número de adelante es una cantidad.
  // iMult: dónde está la palabra («palitos»); iNum: dónde está su número, si lo tiene en cifras.
  const esUnaCosa = (iMult, iNum = -1) => {
    const mult = toks[iMult].t, otra = toks[iMult + 1]?.t;
    if (!TAMBIEN_COSAS.has(mult) || !otra || !/^[a-zñ]+$/.test(otra) || otra === "y" || PESOS.has(otra) || DOLARES.has(otra) || /^medi[oa]$/.test(otra)) return false;
    if (FRASES_DEL_LEXICO.has(mult + " " + otra)) return true;
    return toks.some((x, n) => n !== iNum && /^\d/.test(x.t) && !x.t.includes("/") && numero(x.t) >= 100);
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
      if (pegado && esUnaCosa(i + 1, i)) continue;
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
      if (m && esUnaCosa(j + 1)) { i = j + 1; continue; } // «dos palitos salados 3000»
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
  const resto = sin.replace(/\s+/g, " ").trim().replace(/^[+\-−¡¿]\s*/, "").replace(/\s*[!?]+$/, "").replace(FILLER, "").replace(/^(en|de|por|del)\s+((el|la|los|las)\s+)?/i, "").replace(/\s+[-–−]$/, "").replace(/\s*[.,;:]+$/, "").trim();
  const plano = quitarAcentos(s);
  const soloSigno = quitarAcentos(resto); // "más 10 lucas", "10 lucas menos": la palabra es la orden, no el detalle
  const conSigno = /^\+/.test(s) || soloSigno === "mas" || soloSigno === "menos";
  let tipo = /^\+/.test(s) || soloSigno === "mas" ? "ingreso" : soloSigno === "menos" ? "gasto" : tipoDe(plano);
  // Sin ninguna pista en el texto, vale lo que la persona enseñó: si pasó «Juan» a un ingreso, la próxima vez «Juan 5000» es un ingreso.
  const sabido = !conSigno && !hayPista(plano) && tipoAprendido(resto, cats, aprendidas);
  if (sabido) tipo = sabido;
  // "Sumame 10 lucas" es plata que entró; "sumame 10 lucas de nafta" es un gasto más para la cuenta. «Me llegó plata de papá» es plata que entró.
  else if (tipo === "ingreso" && ES_SUMAR.test(plano) && !ES_PLATA.test(plano) && categoriaDe(resto, cats, "gasto", aprendidas) !== RESPALDO.gasto) tipo = "gasto";
  const detalle = soloSigno === "mas" || soloSigno === "menos" ? "" : resto;
  const conMedio = conQuePago(resto, plano, tipo, cats, aprendidas);
  const r = { tipo: conMedio.tipo, monto: Math.round(e.c.valor * 100), detalle: detalle ? detalle[0].toUpperCase() + detalle.slice(1) : "", categoria: conMedio.categoria };
  if (e.c.usd) r.moneda = "USD";
  if (e.opciones) r.opciones = e.opciones.map((v) => Math.round(v * 100));
  if (conMedio.medio) r.medio = conMedio.medio;
  return r;
}

// Con qué se pagó, solo cuando lo dice sin dudas. Importa por la tarjeta: lo comprado con crédito no resta de «Te queda» hasta que
// se paga (ver logic/tarjeta.js). Devuelve { medio, desde, hasta } (dónde está la frase en el texto) o null.
//   crédito: «con la tarjeta de crédito», «con mi tarjeta de crédito», «en la tarjeta de crédito», «con la visa de crédito»,
//            «con la de crédito», «con crédito». No: «con el crédito», «por el crédito», «con crédito del banco / de Mercado Pago /
//            hipotecario / personal» (es un préstamo), «cargué crédito en el celu». En un ingreso tiene que decir «tarjeta».
//   débito: igual, con «débito». efectivo: «en efectivo», «con efectivo».
// «Con la visa» sola no alcanza: hay Visa de débito.
const I = "(?:^|[^a-z0-9ñ])", F = "(?=$|[^a-z0-9ñ])", MARCA = "(?:visa|master|mastercard|amex|cabal|naranja)";
const conTarjeta = (que) => new RegExp(I + "((?:con|en|por)\\s+(?:(?:la|mi|una|tu)\\s+)?(?:tarjeta\\s+(?:de\\s+)?(?:" + MARCA + "\\s+)?|" + MARCA + "\\s+(?:de\\s+)?)" + que + ")" + F);
const conLaDe = (que) => new RegExp(I + "(con\\s+(?:(?:la|mi)\\s+de\\s+)?" + que + ")" + F + "(?!\\s+(?:de|del|hipotecario|personal|prendario|anses)" + F + ")");
const DICHOS = [["credito", conTarjeta("credito"), true], ["credito", conLaDe("credito"), false], ["debito", conTarjeta("debito"), true], ["debito", conLaDe("debito"), false],
  ["efectivo", new RegExp(I + "((?:con|en)\\s+(?:efectivo|cash))" + F), true]];
export function medioDicho(plano, tipo = "gasto") {
  for (const [medio, re, claro] of DICHOS) {
    if (tipo === "ingreso" && medio === "credito" && !claro) continue;
    const m = re.exec(plano);
    if (m) { const desde = m.index + m[0].indexOf(m[1]); return { medio, desde, hasta: desde + m[1].length }; }
  }
  return null;
}
const ES_DEVOLUCION = /(^|[^a-z])(devolucion|devolvieron|reintegro|reintegraron|reembolso|reembolsaron|anulacion|anularon)($|[^a-z])/;
// El medio, la categoría y si entra o sale. La categoría se elige sin la frase del medio: «pagué con la tarjeta de crédito 30000» no es pagar
// la tarjeta (va a Otros y la app pregunta en qué va). Una devolución a la tarjeta de crédito es plata que vuelve a la tarjeta: baja lo que se debe.
function conQuePago(resto, plano, tipo, cats, aprendidas) {
  const d = medioDicho(quitarAcentos(resto), tipo);
  const texto = d ? (resto.slice(0, d.desde) + " " + resto.slice(d.hasta)).replace(/\s+/g, " ").trim() : resto;
  if (d?.medio === "credito" && tipo === "gasto" && ES_DEVOLUCION.test(plano) && !ES_GASTO.test(plano)) tipo = "ingreso";
  const categoria = categoriaDe(texto, cats, tipo, aprendidas);
  // Pagar la tarjeta con crédito no existe: «pagué la visa con crédito» es pagar la tarjeta.
  const medio = !d || (d.medio === "credito" && tipo !== "ingreso" && idsDeTarjeta(cats).has(categoria)) ? "" : d.medio;
  return { tipo, categoria, medio };
}

// Varios gastos dichos o escritos de corrido: "15 mil de nafta, 10 lucas de birra y 8 mil en el súper".
// Primero corta por comas y palabras como "y" o "después"; si en un pedazo quedan varios montos, corta por los montos.
const SEPARA = /[;\n]|[,.](?=\s|$)|\s+(?:y\s+)?(?:despues|tambien|ademas|luego|aparte|mas)\s+|\s+[ye]\s+/g;
const COLA = /^[\s,.;:]+|[\s,.;:]+$/g;
const ARRANQUE = /^(?:(?:y|e|despu[eé]s|tambi[eé]n|adem[aá]s|luego|aparte|m[aá]s|bueno|este|eh|che|hoy|ayer)[\s,]+)+/i;
const esReal = (c) => c.fuerte || c.valor >= 100;

export function leerVarios(texto, cats = POR_DEFECTO, aprendidas = {}) {
  const s = String(texto).replace(/\s+/g, " ").trim(), plano = quitarAcentos(s);
  const montos = buscarMontos(s).filter(esReal);
  if (!montos.length) return [];
  const dentro = (i) => montos.some((c) => i >= c.desde && i < c.hasta);
  // Los cortes, como posiciones donde empieza cada pedazo.
  const cortes = new Set([0]);
  for (const m of plano.matchAll(SEPARA)) if (!dentro(m.index) && !dentro(m.index + m[0].length - 1)) cortes.add(m.index);
  const orden = [...cortes].sort((a, b) => a - b);
  let pedazos = orden.map((a, i) => [a, orden[i + 1] ?? s.length]);
  // Un pedazo con varios montos: "super 15 mil nafta 20 mil" (el monto al final) o "15 mil nafta 20 mil birra" (al principio).
  pedazos = pedazos.flatMap(([a, b]) => {
    const suyos = montos.filter((c) => c.desde >= a && c.desde < b);
    if (suyos.length < 2) return [[a, b]];
    const antes = s.slice(a, suyos[0].desde).replace(/[\s,;.]/g, " ").trim().replace(ARRANQUE, "").replace(FILLER, "").trim();
    const puntos = antes ? suyos.slice(0, -1).map((c) => c.hasta) : suyos.slice(1).map((c) => c.desde);
    const lim = [a, ...puntos, b];
    const partes = lim.slice(0, -1).map((x, i) => [x, lim[i + 1]]);
    // Con el monto al final, lo que queda después del último monto se suma en el paso siguiente.
    if (antes && suyos[suyos.length - 1].hasta < b) { partes[partes.length - 1] = [partes[partes.length - 1][0], suyos[suyos.length - 1].hasta]; partes.push([suyos[suyos.length - 1].hasta, b]); }
    return partes;
  });
  // Lo que no tiene monto va con el pedazo de al lado: "15 mil nafta y birra", "2 cafés y una medialuna 5000".
  const juntos = [];
  for (const [a, b] of pedazos) {
    const tiene = montos.some((c) => c.desde >= a && c.desde < b);
    if (!tiene && juntos.length && juntos[juntos.length - 1].tiene) juntos[juntos.length - 1].b = b;
    else if (juntos.length && !juntos[juntos.length - 1].tiene) { juntos[juntos.length - 1].b = b; juntos[juntos.length - 1].tiene = tiene; }
    else juntos.push({ a, b, tiene });
  }
  let anterior = "gasto";
  return juntos.filter((x) => x.tiene).flatMap((x) => {
    // Al principio de todo, "más 10 lucas" es plata que entra: ahí "más" no une con nada de antes.
    const pedazo = s.slice(x.a, x.b).replace(COLA, "");
    const frase = x.a === 0 && /^m[aá]s\s/i.test(pedazo) ? pedazo : pedazo.replace(ARRANQUE, "");
    let r = leerTexto(frase, cats, aprendidas);
    if (!r) return [];
    // "Me pasaron 20 lucas de Juan y 10 lucas de Pedro": lo segundo también entró. "Cobré 500 mil y 20 mil de nafta": la nafta no.
    if (r.tipo === "gasto" && anterior === "ingreso" && r.categoria === RESPALDO.gasto && !ES_GASTO.test(quitarAcentos(frase)))
      r = { ...r, tipo: "ingreso", categoria: categoriaDe(r.detalle, cats, "ingreso", aprendidas) };
    anterior = r.tipo;
    if (!r.opciones) return [r];
    const { opciones, ...resto } = r;
    return [{ ...resto, monto: Math.max(...opciones), revisar: true }];
  });
}

// La categoría de un texto para un tipo ya decidido (lo usa la hoja de anotar mientras se escribe el detalle).
export const categoriaPara = (texto, cats, tipo, aprendidas = {}) => categoriaDe(texto, cats, tipo, aprendidas);
function categoriaDe(texto, cats, tipo, aprendidas) {
  const lista = paraAdivinar(cats, tipo), visibles = new Set(lista.map(([id]) => id)), ya = aprendidas[claveDe(texto)];
  if (ya && visibles.has(ya)) return ya;
  // Lo corregido vale también dentro de una frase más larga: «papas fritas» enseña «2 papas fritas grandes».
  const propias = Object.entries(aprendidas).filter(([k, id]) => k.length >= 3 && visibles.has(id)).map(([k, id]) => [id, [k]]);
  return adivinarCategoria(texto, lista, undefined, propias);
}
// Si la persona le enseñó una categoría a ese texto, también se sabe si es plata que entra o que sale. "" si no enseñó nada.
function tipoAprendido(texto, cats, aprendidas) {
  const ya = aprendidas[claveDe(texto)];
  if (!ya) return "";
  return cats.ingreso.some((c) => c.id === ya && !c.oculta) ? "ingreso" : cats.gasto.some((c) => c.id === ya && !c.oculta) ? "gasto" : "";
}
// Cómo se recuerda lo que la persona corrigió: "Cumple de Ana" y "cumple de ana" son lo mismo.
export const claveDe = (texto) => quitarAcentos(texto).replace(/[^a-z0-9ñ ]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
// Sin monto: al menos se aprovecha lo escrito para abrir la hoja casi completa.
export function leerSinMonto(texto, cats = POR_DEFECTO, aprendidas = {}) {
  const resto = String(texto).trim().replace(FILLER, ""), plano = quitarAcentos(texto);
  const tipo = (!hayPista(plano) && tipoAprendido(resto, cats, aprendidas)) || tipoDe(plano);
  const conMedio = conQuePago(resto, plano, tipo, cats, aprendidas);
  const r = { tipo: conMedio.tipo, detalle: resto ? resto[0].toUpperCase() + resto.slice(1) : "", categoria: conMedio.categoria };
  if (conMedio.medio) r.medio = conMedio.medio;
  return r;
}
// ¿Quedó en la categoría de "no sé"? Entonces conviene preguntar.
export const quedoSinCategoria = (r) => r.detalle && r.categoria === RESPALDO[r.tipo];
// Un monto con palabras en un formulario ("20 mil", "2 lucas"). null si no es claramente un solo monto.
export function montoEnPalabras(texto) {
  const r = leerTexto(texto);
  return r && !r.opciones && !r.detalle && !r.moneda ? r.monto : null;
}
