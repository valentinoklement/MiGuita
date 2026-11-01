// Grupos: dividir gastos. Portado de grp_logic.js de la app anterior (probado con 86.552 verificaciones);
// las funciones de reparto, saldos, saldar, fusión y limpieza son las mismas, con nombres en castellano.
//
// Grupo: { id, nombre, moneda: "ARS"|"USD", ts, miembros, gastos, pagos, yo?, loc? }
//   miembro: { id, nombre, alias?, ts, x? }
//   gasto:   { id, t (qué fue), m (monto en pesos, con decimales), p (quién pagó), a: [entre quiénes],
//              sp: "eq"|"sh"|"pc"|"ex" (parejo, partes, porcentaje, montos), w: {id: valor}, f, ts, x?, por }
//   pago:    { id, de, a, m, f, ts, x? }
// - Los montos del grupo van en pesos (como en los códigos G1 y G2 de la app anterior) y todas las cuentas
//   se hacen en centavos enteros con centavos().
// - x:true es una lápida: el registro está borrado, pero viaja para que el borrado llegue a todos.
// - yo (quién soy en este celu) y loc (sumar mi parte a mis gastos) son de cada celu y nunca viajan.

const num = (v) => { const n = +v; return isFinite(n) ? n : 0; };
export const centavos = (n) => Math.round(num(n) * 100);

export const MAX_MIEMBROS = 50;
export const MAX_REGISTROS = 1500;
const MAX_CODIGO = 400_000;        // caracteres de un código pegado
const MAX_DESCOMPRIMIDO = 2_000_000; // bytes del grupo ya descomprimido

/* ---------- reparto, saldos y saldar ---------- */

// Reparte total (centavos) entre ids. Siempre devuelve centavos enteros que suman EXACTAMENTE total
// (método del mayor resto). Montos exactos que suman el total se respetan tal cual.
export function repartir(total, tipo, ids, w) {
  const out = {}; ids = (ids || []).slice(); if (!ids.length || !(total >= 0)) return out;
  const wv = (i) => (w && w[i] !== undefined && w[i] !== "") ? num(w[i]) : null;
  if (tipo === "ex") { const cs = ids.map((i) => centavos(wv(i) || 0)); if (cs.reduce((a, b) => a + b, 0) === total) { ids.forEach((i, k) => (out[i] = cs[k])); return out; } }
  let pesos = ids.map((i) => (!tipo || tipo === "eq") ? 1 : tipo === "ex" ? centavos(wv(i) || 0) : (wv(i) === null ? (tipo === "sh" ? 1 : 0) : Math.max(0, wv(i))));
  let tp = pesos.reduce((a, b) => a + b, 0); if (!(tp > 0)) { pesos = ids.map(() => 1); tp = ids.length; }
  const raw = pesos.map((x) => total * x / tp), fl = raw.map(Math.floor); let resto = total - fl.reduce((a, b) => a + b, 0);
  const ord = raw.map((r, k) => [r - fl[k], k]).sort((p, q) => q[0] - p[0] || p[1] - q[1]);
  for (let k = 0; resto > 0; k++, resto--) fl[ord[k % ord.length][1]]++;
  for (let k = 0; resto < 0; k++, resto++) fl[ord[ord.length - 1 - (k % ord.length)][1]]--;
  ids.forEach((i, k) => (out[i] = fl[k])); return out;
}

export const totalGrupo = (g) => (g.gastos || []).reduce((a, x) => a + (x.x ? 0 : centavos(x.m)), 0);

// Lo que le toca a cada uno en un gasto (centavos).
export const partesDe = (x) => repartir(centavos(x.m), x.sp || "eq", (x.a && x.a.length ? x.a : [x.p]), x.w);

// Saldo de cada integrante en centavos: positivo = le deben, negativo = debe. La suma siempre es 0.
export function saldos(g) {
  const b = {}; (g.miembros || []).forEach((m) => { if (!m.x) b[m.id] = 0; });
  const add = (i, c) => { b[i] = (b[i] || 0) + c; };
  (g.gastos || []).forEach((x) => { if (x.x) return; const T = centavos(x.m); if (T <= 0 || !x.p) return;
    const sh = partesDe(x); add(x.p, T); for (const i in sh) add(i, -sh[i]); });
  (g.pagos || []).forEach((p) => { if (p.x) return; const c = centavos(p.m); if (c <= 0 || !p.de || !p.a) return; add(p.de, c); add(p.a, -c); });
  return b;
}

// Pagos que dejan a todos en cero, con a lo sumo (integrantes − 1) transferencias.
export function saldar(b) {
  const cr = [], de = []; Object.keys(b).sort().forEach((i) => { if (b[i] > 0) cr.push([i, b[i]]); else if (b[i] < 0) de.push([i, -b[i]]); });
  const desc = (p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1); cr.sort(desc); de.sort(desc);
  const out = []; let i = 0, j = 0;
  while (i < cr.length && j < de.length) { const t = Math.min(cr[i][1], de[j][1]); out.push({ de: de[j][0], a: cr[i][0], m: t }); cr[i][1] -= t; de[j][1] -= t; if (!cr[i][1]) i++; if (!de[j][1]) j++; }
  return out;
}

/* ---------- fusión ---------- */
// Sin conflictos: unión por id; si un registro está en los dos, gana el de ts mayor
// (empate: el de texto JSON mayor, así el resultado no depende del orden).
function elegir(o, r) { if (!o) return r; const a = num(o.ts), b = num(r.ts); if (b > a) return r; if (b < a) return o; return JSON.stringify(r) > JSON.stringify(o) ? r : o; }
export function fusionarLista(x, y) {
  const m = new Map(); for (const r of (x || [])) m.set(r.id, elegir(m.get(r.id), r)); for (const r of (y || [])) m.set(r.id, elegir(m.get(r.id), r));
  return [...m.values()].sort((p, q) => num(p.ts) - num(q.ts) || (String(p.id) < String(q.id) ? -1 : 1));
}
export function fusionar(a, b) {
  const top = elegir({ ts: a.ts, nombre: a.nombre, moneda: a.moneda }, { ts: b.ts, nombre: b.nombre, moneda: b.moneda });
  const g = { id: a.id, yo: a.yo, loc: a.loc, sync: a.sync, nombre: top.nombre, moneda: top.moneda, ts: Math.max(num(a.ts), num(b.ts)),
    miembros: fusionarLista(a.miembros, b.miembros), gastos: fusionarLista(a.gastos, b.gastos), pagos: fusionarLista(a.pagos, b.pagos) };
  if (g.yo === undefined) delete g.yo;
  if (g.loc === undefined) delete g.loc;
  if (g.sync === undefined) delete g.sync;
  return g;
}

// Qué trajo un código respecto de lo que ya había (para la pantalla "Código unido").
export function novedades(antes, despues) {
  const cuenta = (lista) => {
    const viejos = new Map((antes?.[lista] || []).map((r) => [r.id, JSON.stringify(r)]));
    let nuevos = 0, cambiados = 0;
    for (const r of despues[lista] || []) { if (!viejos.has(r.id)) nuevos++; else if (viejos.get(r.id) !== JSON.stringify(r)) cambiados++; }
    return { nuevos, cambiados };
  };
  return { gastos: cuenta("gastos"), pagos: cuenta("pagos"), miembros: cuenta("miembros") };
}

/* ---------- alias ---------- */
// Solo alias de Mercado Pago (6 a 20 letras, números, puntos o guiones). Un CBU/CVU (22 números) nunca se guarda.
export function validarAlias(texto) {
  const s = String(texto ?? "").trim();
  if (!s) return { ok: true, alias: "" };
  if ((s.match(/\d/g) || []).length >= 18) return { ok: false, error: "Eso parece un CBU o CVU. Por seguridad, solo se guarda el alias." };
  if (!/^[A-Za-z0-9.-]{6,20}$/.test(s)) return { ok: false, error: "El alias tiene de 6 a 20 letras, números, puntos o guiones, sin espacios." };
  return { ok: true, alias: s.toLowerCase() };
}

/* ---------- validación de lo que llega de afuera ---------- */
// Nada raro entra al grupo: ids acotados, textos cortados, montos finitos y no negativos, listas con tope.
export function limpiar(o) {
  const okId = (v) => /^[A-Za-z0-9_-]{1,40}$/.test(String(v == null ? "" : v)) ? String(v) : null;
  const s = (v, n) => String(v == null ? "" : v).slice(0, n);
  const fecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : "";
  if (!o || typeof o !== "object" || !okId(o.id)) return null;
  const g = { id: okId(o.id), nombre: s(o.nombre, 60).trim() || "Grupo", moneda: o.moneda === "USD" ? "USD" : "ARS", ts: num(o.ts), miembros: [], gastos: [], pagos: [] };
  (Array.isArray(o.miembros) ? o.miembros : []).slice(0, MAX_MIEMBROS).forEach((m) => {
    const i = okId(m && m.id); if (!i) return;
    const al = validarAlias(m.alias);
    g.miembros.push({ id: i, nombre: s(m.nombre, 40).trim() || "?", alias: al.ok ? al.alias : "", ts: num(m.ts), x: !!m.x });
  });
  (Array.isArray(o.gastos) ? o.gastos : []).slice(0, MAX_REGISTROS).forEach((x) => {
    const i = okId(x && x.id), p = okId(x && x.p); if (!i || !p) return;
    const w = {}; if (x.w && typeof x.w === "object") for (const k in x.w) { const kk = okId(k); if (kk && Object.prototype.hasOwnProperty.call(x.w, k)) w[kk] = num(x.w[k]); }
    g.gastos.push({ id: i, t: s(x.t, 80).trim() || "Gasto", m: Math.max(0, num(x.m)), p, a: (Array.isArray(x.a) ? x.a : []).map(okId).filter(Boolean).slice(0, MAX_MIEMBROS),
      sp: ["eq", "sh", "ex", "pc"].includes(x.sp) ? x.sp : "eq", w, f: fecha(x.f), ts: num(x.ts), x: !!x.x, por: okId(x.por) || "" });
  });
  (Array.isArray(o.pagos) ? o.pagos : []).slice(0, MAX_REGISTROS).forEach((p) => {
    const i = okId(p && p.id), de = okId(p && p.de), a = okId(p && p.a); if (!i || !de || !a) return;
    g.pagos.push({ id: i, de, a, m: Math.max(0, num(p.m)), f: fecha(p.f), ts: num(p.ts), x: !!p.x });
  });
  return g;
}

/* ---------- código para compartir ---------- */
// G3 (nuevo): "G3:" + JSON comprimido en base64 + "." + suma de verificación (CRC32 del JSON).
// Se siguen leyendo G2 (comprimido) y G1 (sin comprimir) de la app anterior.
export const b64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export const unb64 = (t) => { t = t.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; const s = atob(t), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };

const TABLA_CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
export function crc32(u8) { let c = 0xFFFFFFFF; for (const b of u8) c = TABLA_CRC[(c ^ b) & 0xFF] ^ (c >>> 8); return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0"); }

export async function transformar(u8, flujo, limite) {
  const s = new Blob([u8]).stream().pipeThrough(flujo);
  const partes = []; let total = 0;
  for await (const p of s) { total += p.length; if (total > limite) throw new Error("demasiado grande"); partes.push(p); }
  const out = new Uint8Array(total); let o = 0; for (const p of partes) { out.set(p, o); o += p.length; }
  return out;
}

export async function codificar(g) {
  const c = limpiar(g);
  const u8 = new TextEncoder().encode(JSON.stringify(c));
  if (typeof CompressionStream === "undefined") return "G1:" + b64(u8);
  const z = await transformar(u8, new CompressionStream("deflate-raw"), Infinity);
  return "G3:" + b64(z) + "." + crc32(u8);
}

// Acepta el código con texto alrededor (por ejemplo, un mensaje de WhatsApp entero). Lanza Error si no sirve.
export async function decodificar(texto) {
  const t = String(texto ?? "");
  if (t.length > MAX_CODIGO) throw new Error("demasiado largo");
  const m = /G([123]):([A-Za-z0-9_-]+)(?:\.([0-9a-f]{8}))?/.exec(t);
  if (!m) throw new Error("sin código");
  let u8 = unb64(m[2]);
  if (m[1] !== "1") u8 = await transformar(u8, new DecompressionStream("deflate-raw"), MAX_DESCOMPRIMIDO);
  if (m[1] === "3" && crc32(u8) !== m[3]) throw new Error("código roto");
  const g = limpiar(JSON.parse(new TextDecoder().decode(u8)));
  if (!g) throw new Error("código inválido");
  return g;
}

/* ---------- mi parte en mis gastos ---------- */
export function miParte(g) {
  if (!g.yo) return 0;
  return (g.gastos || []).reduce((a, x) => a + (x.x ? 0 : (partesDe(x)[g.yo] || 0)), 0);
}

// Movimientos personales que tiene que haber por este grupo (id fijo "gx_<grupo>_<gasto>").
// Con loc apagado no hay ninguno. Devuelve qué poner y qué quitar; respeta categoría y medio que la persona cambió.
export function sincronizarMiParte(g, movs, categoria = "otros", hoy = "") {
  const prefijo = "gx_" + g.id + "_";
  const actuales = new Map(movs.filter((x) => x.id.startsWith(prefijo)).map((x) => [x.id, x]));
  const poner = [], quedan = new Set();
  if (g.loc && g.yo && g.moneda === "ARS") {
    for (const x of g.gastos || []) {
      if (x.x) continue;
      const parte = partesDe(x)[g.yo] || 0;
      if (parte <= 0) continue;
      const id = prefijo + x.id, viejo = actuales.get(id);
      const fecha = x.f || viejo?.fecha || hoy;
      if (!fecha) continue;
      const mov = { id, tipo: "gasto", monto: parte, detalle: (g.nombre + ": " + x.t).slice(0, 80), categoria: viejo?.categoria || categoria, medio: viejo?.medio || "",
        fecha, ts: viejo?.ts || num(x.ts) || Date.now(), mod: viejo?.mod || 0, grupo: g.id };
      quedan.add(id);
      if (!viejo || viejo.monto !== mov.monto || viejo.detalle !== mov.detalle || viejo.fecha !== mov.fecha) poner.push({ ...mov, mod: Date.now() });
    }
  }
  const quitar = [...actuales.keys()].filter((id) => !quedan.has(id));
  return { poner, quitar };
}

/* ---------- resumen para WhatsApp ---------- */
export function textoWhatsApp(g, formato) {
  const vivos = (g.miembros || []).filter((m) => !m.x);
  const nombre = (id) => vivos.find((m) => m.id === id)?.nombre || "?";
  const total = totalGrupo(g);
  const pagos = saldar(saldos(g));
  let t = "*" + g.nombre + "*\nTotal " + formato(total) + (vivos.length ? " · " + formato(Math.round(total / vivos.length)) + " por persona" : "");
  if (!pagos.length) return t + "\n\nTodos están al día.";
  for (const p of pagos) {
    const alias = vivos.find((m) => m.id === p.a)?.alias;
    t += "\n\n" + nombre(p.de) + " le paga a " + nombre(p.a) + " " + formato(p.m) + (alias ? "\nalias: " + alias : "");
  }
  return t;
}
