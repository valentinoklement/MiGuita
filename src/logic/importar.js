// Importar el resumen de movimientos de una billetera o banco (Mercado Pago y otros), en Excel (.xlsx) o CSV.
// Mercado Pago no deja que otras apps se conecten a la cuenta de una persona, pero sí deja bajar el resumen:
// este módulo lo lee, encuentra las columnas de fecha, detalle y monto, y arma los movimientos con su categoría.
import { adivinarCategoria } from "./anotar.js";
import { paraAdivinar } from "./categorias.js";

/* ---------- CSV ---------- */
export function leerCSV(texto) {
  const t = String(texto).replace(/^﻿/, "");
  const muestra = t.split(/\r?\n/).slice(0, 10).join("\n");
  const sep = [";", ",", "\t"].map((s) => [s, muestra.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  const filas = []; let fila = [], celda = "", comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; fila.push(celda); filas.push(fila); fila = []; celda = ""; }
    else celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas.filter((f) => f.some((x) => x.trim()));
}

/* ---------- Excel (.xlsx): un zip con XML adentro ---------- */
async function inflar(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function archivosZip(u8) {
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let fin = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  if (fin < 0) throw new Error("no es un Excel");
  const total = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const out = {};
  for (let n = 0; n < total; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo = dv.getUint16(p + 10, true), comp = dv.getUint32(p + 20, true);
    const largoNombre = dv.getUint16(p + 28, true), extra = dv.getUint16(p + 30, true), coment = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nombre = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + largoNombre));
    const datos = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const crudo = u8.subarray(datos, datos + comp);
    if (/^xl\/(sharedStrings|worksheets\/sheet\d+)\.xml$/.test(nombre))
      out[nombre] = new TextDecoder().decode(metodo === 8 ? await inflar(crudo) : crudo);
    p += 46 + largoNombre + extra + coment;
  }
  return out;
}
const sinXml = (s) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const columna = (ref) => [...ref.replace(/\d/g, "")].reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;

export async function leerXLSX(bytes) {
  const z = await archivosZip(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  const textos = [...(z["xl/sharedStrings.xml"] || "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => sinXml(m[1]));
  const hoja = z["xl/worksheets/sheet1.xml"] || Object.entries(z).find(([k]) => k.includes("worksheets"))?.[1];
  if (!hoja) throw new Error("no es un Excel");
  const filas = [];
  for (const [, fila] of hoja.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const f = [];
    for (const [, attrs, cuerpo] of fila.matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /r="([A-Z]+)\d+"/.exec(attrs)?.[1], tipo = /t="(\w+)"/.exec(attrs)?.[1];
      let v = "";
      if (tipo === "inlineStr") v = sinXml(cuerpo || "");
      else { const x = /<v>([\s\S]*?)<\/v>/.exec(cuerpo || "")?.[1] ?? ""; v = tipo === "s" ? textos[+x] ?? "" : sinXml(x); }
      f[ref ? columna(ref) : f.length] = v;
    }
    filas.push(Array.from(f, (x) => x ?? ""));
  }
  return filas.filter((f) => f.some((x) => String(x).trim()));
}

/* ---------- fechas y montos escritos de mil maneras ---------- */
export function leerFecha(v) {
  const s = String(v ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(s);
  if (m) {
    const a = m[3].length === 2 ? "20" + m[3] : m[3];
    if (+m[2] < 1 || +m[2] > 12 || +m[1] < 1 || +m[1] > 31) return null;
    return `${a}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // Excel guarda las fechas como número de días desde 1899-12-30.
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 864e5);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

// Devuelve centavos con signo, o null. "-$ 1.234,56", "1234.56", "(1.234,56)", "-1,234.56"
export function leerImporte(v) {
  let s = String(v ?? "").trim().replace(/\s|\$|ARS|US\$|USD/gi, "");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (s.startsWith("-")) { neg = true; s = s.slice(1); } else if (s.startsWith("+")) s = s.slice(1);
  if (s.endsWith("-")) { neg = true; s = s.slice(0, -1); }
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const coma = s.lastIndexOf(","), punto = s.lastIndexOf(".");
  let n;
  if (coma >= 0 && punto >= 0) n = coma > punto ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (coma >= 0) n = /,\d{1,2}$/.test(s) && (s.match(/,/g) || []).length === 1 ? s.replace(",", ".") : s.replace(/,/g, "");
  else if (punto >= 0) n = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s; // "1.234.567" miles; "1234.56" decimales
  else n = s;
  const c = Math.round(parseFloat(n) * 100);
  return isFinite(c) ? (neg ? -c : c) : null;
}

/* ---------- encontrar las columnas ---------- */
const sinTildes = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const NOMBRES = {
  fecha: /fecha|date|dia\b/,
  detalle: /descrip|detalle|concepto|referencia|motivo|titulo|title|comercio|operacion|tipo de operacion/,
  monto: /monto|importe|valor|neto|amount|total|credito|debito|movimiento/,
};

export function encontrarColumnas(filas) {
  for (let i = 0; i < Math.min(filas.length, 20); i++) {
    const enc = filas[i].map(sinTildes);
    const col = {};
    for (const [k, re] of Object.entries(NOMBRES)) col[k] = enc.findIndex((h, j) => re.test(h) && !Object.values(col).includes(j));
    // "monto" puede venir como "Valor neto" o "Monto bruto": se prefiere el neto.
    const neto = enc.findIndex((h) => /neto/.test(h));
    if (neto >= 0) col.monto = neto;
    if (col.fecha >= 0 && col.monto >= 0) return { encabezado: i, ...col };
  }
  // Sin encabezado reconocible: se adivina mirando el contenido.
  const datos = filas.slice(0, 30), anchos = Math.max(...datos.map((f) => f.length));
  const puntaje = (fn) => Array.from({ length: anchos }, (_, j) => datos.filter((f) => fn(f[j])).length);
  const pf = puntaje((x) => leerFecha(x)), pm = puntaje((x) => leerImporte(x) !== null && !leerFecha(x)), pd = puntaje((x) => /[a-z]{3}/i.test(x || "") && !leerFecha(x));
  const mejor = (p) => p.indexOf(Math.max(...p));
  return { encabezado: -1, fecha: mejor(pf), monto: mejor(pm), detalle: mejor(pd) };
}

/* ---------- armar los movimientos ---------- */
const huella = (s) => { let h = 0x811c9dc5; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };

// Devuelve [{ id, tipo, monto, detalle, categoria, medio, fecha, nuevo }], sin los que ya estaban anotados.
export function armarMovimientos(filas, cats, existentes = [], medio = "mp") {
  const c = encontrarColumnas(filas);
  if (c.fecha < 0 || c.monto < 0) return [];
  const ya = new Set(existentes.map((x) => x.id));
  const vistos = new Map();
  const out = [];
  for (const f of filas.slice(c.encabezado + 1)) {
    const fecha = leerFecha(f[c.fecha]), importe = leerImporte(f[c.monto]);
    if (!fecha || !importe) continue;
    const detalle = String(c.detalle >= 0 ? f[c.detalle] ?? "" : "").replace(/\s+/g, " ").trim().slice(0, 80);
    const tipo = importe < 0 ? "gasto" : "ingreso";
    const clave = fecha + "|" + importe + "|" + sinTildes(detalle);
    const n = (vistos.get(clave) || 0) + 1; vistos.set(clave, n); // dos compras iguales el mismo día son dos movimientos
    const id = "imp_" + huella(clave + "|" + n);
    if (ya.has(id)) continue;
    out.push({ id, tipo, monto: Math.abs(importe), detalle: detalle ? detalle[0].toUpperCase() + detalle.slice(1) : "Movimiento importado",
      categoria: adivinarCategoria(detalle, paraAdivinar(cats, tipo)), medio, fecha, ts: Date.parse(fecha + "T12:00:00") + n, mod: Date.now() });
  }
  return out.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
