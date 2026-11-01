// Mis dispositivos conectados: el celu y la compu (o dos celus) ven los mismos datos, sin cuenta ni mail.
// Un código de 16 letras es la única llave: de él salen la dirección en el servidor, el permiso y la clave de cifrado
// (con otra "sal" que los grupos, así un código nunca sirve para las dos cosas). El servidor guarda una caja cifrada.
//
// Cómo se juntan los cambios (de a tres): cada dispositivo recuerda la huella de cada dato tal como quedó en la última
// sincronización ("base"). Si solo cambió uno de los dos lados, gana ese cambio (también si fue borrar). Si cambiaron
// los dos, gana el más nuevo (mod o ts); los grupos se juntan registro por registro.
import { LISTAS, VERSION, migrar } from "./migraciones.js";
import { fusionar } from "./grupos.js";
import { derivar, cerrarObjeto, abrirObjeto, pedir, nuevoCodigo } from "./sincro.js";

// Lo de la configuración que es de la persona (no de cada aparato: tema, PIN, avisos y demás quedan en cada uno).
export const CONFIG_COMPARTIDA = ["nombre", "alias", "categorias", "medios", "dolar", "aprendidas"];
const SAL = "MiGuita-mis-dispositivos-v1";
const MAX_DESCOMPRIMIDO = 20_000_000;

export const nuevoCodigoVinculo = () => nuevoCodigo(16);
export function leerCodigoVinculo(texto) {
  const s = String(texto ?? "").toUpperCase().replace(/^.*#V=/, "").replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(s) ? s.replace(/(.{4})(?=.)/g, "$1-") : null;
}
export const derivarVinculo = (codigo) => derivar(codigo, SAL);

// Un grupo viaja entre mis dispositivos sin lo que cambia solo (versión, pendiente, error): solo su código.
const grupoParaViajar = (g) => { const { sync, ...resto } = g; return sync ? { ...resto, sync: { codigo: sync.codigo } } : resto; };

// Todos mis datos como un mapa "lista|id" → registro. Lo de ejemplo no viaja.
export function aplanar(d) {
  const m = new Map();
  for (const [lista, clave] of Object.entries(LISTAS))
    for (const x of d[lista] || []) {
      if (x == null || String(x[clave]).startsWith("ej_")) continue;
      m.set(lista + "|" + x[clave], lista === "grupos" ? grupoParaViajar(x) : x);
    }
  for (const k of CONFIG_COMPARTIDA) if (d.config?.[k] !== undefined) m.set("config|" + k, d.config[k]);
  return m;
}
export function armar(m) {
  const d = { schemaVersion: VERSION, config: {} };
  for (const l of Object.keys(LISTAS)) d[l] = [];
  for (const [k, v] of m) {
    const i = k.indexOf("|"), l = k.slice(0, i);
    if (l === "config") d.config[k.slice(i + 1)] = v; else if (d[l]) d[l].push(v);
  }
  return d;
}

// Huella corta de un registro (FNV-1a + largo): para saber si cambió sin guardar copias enteras.
export function huella(x) {
  const s = JSON.stringify(x);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + "." + s.length.toString(36);
}
export const huellas = (m) => Object.fromEntries([...m].map(([k, v]) => [k, huella(v)]));
const iguales = (a, b) => { const ka = Object.keys(a); return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]); };
const reciente = (x) => Number(x?.mod || x?.ts || 0);

// Junta lo de acá (L) con lo del servidor (R), sabiendo cómo estaban la última vez (B: huellas).
export function juntar(L, R, B) {
  const M = new Map();
  for (const k of new Set([...L.keys(), ...R.keys(), ...Object.keys(B)])) {
    const l = L.get(k), r = R.get(k), b = B[k];
    const hl = l === undefined ? undefined : huella(l), hr = r === undefined ? undefined : huella(r);
    let v;
    if (hl === hr) v = l;
    else if (hl === b) v = r;              // solo cambió el otro (o lo borró)
    else if (hr === b) v = l;              // solo cambié yo (o lo borré)
    else if (l === undefined) v = r;       // yo lo borré y el otro lo cambió: queda el cambio
    else if (r === undefined) v = l;
    else if (k.startsWith("grupos|")) v = fusionar(l, r);
    else v = reciente(r) > reciente(l) ? r : l;
    if (v !== undefined) M.set(k, v);
  }
  return M;
}

// Deja iguales este dispositivo y el servidor. local: mis datos (como base.leerEstado()); base: huellas de la última vez.
// Devuelve { M (mapa juntado), v, base (huellas nuevas) }. Si otro guardó justo en el medio (409), vuelve a juntar.
export async function sincronizarDatos(d, local, base, ir) {
  let L = aplanar(local), B = base || {};
  let r = await pedir(d, "GET", null, ir);
  for (let i = 0; i < 5; i++) {
    if (r.estado !== 200 && r.estado !== 404 && r.estado !== 409) throw new Error("servidor " + r.estado);
    let R = new Map(), v = 0;
    if (r.datos) {
      const obj = await abrirObjeto(r.datos, d.clave, MAX_DESCOMPRIMIDO);
      if (obj.schemaVersion > VERSION) throw new Error("version");
      R = aplanar(migrar(obj));
      v = r.v;
    }
    const M = juntar(L, R, B), hM = huellas(M);
    if (r.datos && iguales(hM, huellas(R))) return { M, v, base: hM };
    const s = await pedir(d, "PUT", { v, datos: await cerrarObjeto(armar(M), d.clave) }, ir);
    if (s.estado === 200) return { M, v: s.v, base: hM };
    if (s.estado !== 409) throw new Error("servidor " + s.estado);
    // Otro guardó en el medio: lo mío ya incluye lo que había antes; se junta de nuevo con lo nuevo.
    L = M; B = huellas(R); r = s;
  }
  throw new Error("demasiados cambios a la vez");
}
