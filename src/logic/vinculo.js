// Mis dispositivos conectados: el celu y la compu (o dos celus) ven los mismos datos, sin cuenta ni mail.
// Un código de 16 letras es la única llave: de él salen la dirección en el servidor, el permiso y la clave de cifrado
// (con otra "sal" que los grupos, así un código nunca sirve para las dos cosas). El servidor guarda una caja cifrada.
//
// Cómo se juntan los cambios (de a tres): cada dispositivo recuerda la huella de cada dato tal como quedó en la última
// sincronización ("base"). Si solo cambió uno de los dos lados, gana ese cambio (también si fue borrar). Si cambiaron
// los dos, gana el más nuevo (mod o ts); los grupos se juntan registro por registro y lo aprendido, palabra por palabra.
// Para que «el más nuevo» sea cierto, todo lo que la persona cambia lleva mod (la app lo pone al guardar): metas, deudas, fijos,
// topes, tarjetas, compras, la plata cargada y las platas. Lo que no lo lleva (nombre, alias, dólar) se resuelve a favor del último
// dispositivo que sincroniza, salvo que ese lado tenga lo de fábrica y el otro no: lo de fábrica (lo que trae un dispositivo recién
// instalado) no tiene nada de la persona y nunca pisa lo que ella cambió.
// Las categorías y los medios se juntan uno por uno (por id), con la misma regla, y cada uno lleva mod desde que se edita: nunca se
// borran (solo se ocultan), así que no se pierde ninguno de los dos lados, con su nombre, sus palabras y su ícono. Uno de fábrica sin
// tocar que está en un solo lado falta a propósito en el otro (la migración no lo agregó porque la persona ya tenía uno igual): queda,
// pero oculto, así no aparece repetido y lo ya anotado en él conserva su nombre.
import { LISTAS, VERSION, migrar } from "./migraciones.js";
import { fusionar } from "./grupos.js";
import { RESPALDO } from "./categorias.js";
import { derivar, cerrarObjeto, abrirObjeto, pedir, nuevoCodigo } from "./sincro.js";

// Lo de la configuración que es de la persona (no de cada aparato: tema, PIN, avisos y demás quedan en cada uno).
export const CONFIG_COMPARTIDA = ["nombre", "alias", "categorias", "medios", "dolar", "aprendidas", "saldo", "platas", "metasOrden"];
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

// Lo de fábrica: la configuración de un dispositivo recién instalado. Se compara sin importar el orden de las claves.
let FABRICA = null;
const fabrica = () => (FABRICA ??= migrar({}).config);
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, v[c]])) : v));
const deFabrica = (k, x) => { const f = fabrica()[k]; return f !== undefined && canon(f) === canon(x); };
// Entre dos valores sin hora (o con la misma), gana el de acá, salvo que el de acá sea de fábrica y el del otro lado no.
const empate = (l, r, intactoL, intactoR) => (intactoL && !intactoR ? r : l);

// Junta dos listas de categorías o de medios por id (l: la de acá; r: la del servidor). Si una está en los dos lados, gana la de mod
// más nuevo; en un empate, la que se cambió. Las de un solo lado se suman (antes de la de respaldo: «Otros» va última), salvo una de
// fábrica sin tocar cuando el otro lado es una lista de verdad: esa queda oculta. orden: de qué lado sale el orden ("l" o "r").
// «Sin tocar»: sin mod y como la de fábrica; las palabras pueden ser menos (una versión vieja traía menos palabras, y no por eso la
// persona la cambió).
// ocultar: cómo se llama la marca de oculto (las categorías usan «oculta»; los medios, «oculto»).
export function juntarPorId(l, r, { respaldo = null, fab = [], orden = "l", ocultar = "oculta" } = {}) {
  const valido = (x) => x && typeof x === "object" && typeof x.id === "string";
  const lista = (x) => (Array.isArray(x) ? x.filter(valido) : []);
  const Ls = lista(l), Rs = lista(r), deL = new Map(Ls.map((x) => [x.id, x])), deR = new Map(Rs.map((x) => [x.id, x]));
  const F = new Map((Array.isArray(fab) ? fab : []).map((x) => [x.id, x]));
  const intacto = (x) => {
    const f = F.get(x.id);
    if (x.mod || !f) return false;
    const { claves, ...resto } = x, { claves: fc, ...fr } = f;
    if (!Array.isArray(fc)) return canon(x) === canon(f);
    return canon(resto) === canon(fr) && Array.isArray(claves) && claves.every((k) => fc.includes(k));
  };
  const deVerdad = (xs) => xs.length > 0 && (!respaldo || xs.some((x) => x.id === respaldo));
  const elegir = (id) => {
    const x = deL.get(id), y = deR.get(id);
    if (x && y) return reciente(x) !== reciente(y) ? (reciente(y) > reciente(x) ? y : x) : empate(x, y, intacto(x), intacto(y));
    const solo = x || y;
    return intacto(solo) && deVerdad(x ? Rs : Ls) ? { ...solo, [ocultar]: true } : solo;
  };
  const [base, otra] = orden === "r" ? [Rs, Ls] : [Ls, Rs];
  const ids = [...new Set(base.map((x) => x.id))], faltan = [...new Set(otra.map((x) => x.id))].filter((id) => !deL.has(id) || !deR.has(id));
  const i = respaldo ? ids.indexOf(respaldo) : -1;
  const todos = i < 0 ? [...ids, ...faltan.filter((id) => !ids.includes(id))] : [...ids.slice(0, i), ...faltan.filter((id) => !ids.includes(id)), ...ids.slice(i)];
  return todos.map(elegir);
}
const objeto = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});
function juntarCategorias(l, r, orden) {
  const fab = fabrica().categorias;
  return { ...objeto(r), ...objeto(l),
    gasto: juntarPorId(l?.gasto, r?.gasto, { respaldo: RESPALDO.gasto, fab: fab.gasto, orden }),
    ingreso: juntarPorId(l?.ingreso, r?.ingreso, { respaldo: RESPALDO.ingreso, fab: fab.ingreso, orden }) };
}

// Junta lo de acá (L) con lo del servidor (R), sabiendo cómo estaban la última vez (B: huellas).
export function juntar(L, R, B) {
  const M = new Map();
  // Sin huellas de antes, este dispositivo recién se conecta: las categorías y los medios quedan en el orden del que ya se usaba.
  const orden = Object.keys(B).length ? "l" : "r";
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
    else if (k === "config|aprendidas") v = { ...r, ...l };  // lo que enseñó cada dispositivo se suma; lo olvidado queda como "" y no vuelve
    else if (k === "config|categorias") v = juntarCategorias(l, r, orden);
    else if (k === "config|medios") v = juntarPorId(l, r, { fab: fabrica().medios, orden, ocultar: "oculto" });
    else if (reciente(r) !== reciente(l)) v = reciente(r) > reciente(l) ? r : l;
    else if (k.startsWith("config|")) v = empate(l, r, deFabrica(k.slice(7), l), deFabrica(k.slice(7), r));
    else v = l;
    if (v !== undefined) M.set(k, v);
  }
  return M;
}

// Deja iguales este dispositivo y el servidor. local: mis datos (como base.leerEstado()); base: huellas de la última vez;
// vAntes: la versión de la caja la última vez. Devuelve { M (mapa juntado), v, base (huellas nuevas) }. Si otro guardó justo en el
// medio (409), vuelve a juntar.
export async function sincronizarDatos(d, local, base, ir, vAntes = 0) {
  let L = aplanar(local), B = base || {};
  let r = await pedir(d, "GET", null, ir);
  // La versión de una caja solo sube: si es menor que la última vez, la caja venció y otro dispositivo la volvió a crear con lo
  // suyo. Las huellas de antes ya no sirven (lo que falta no es que «el otro lo borró»): se junta como la primera vez.
  if (r.datos && vAntes && r.v < vAntes) B = {};
  for (let i = 0; i < 5; i++) {
    if (r.estado !== 200 && r.estado !== 404 && r.estado !== 409) throw new Error("servidor " + r.estado);
    let R = new Map(), v = 0;
    if (r.datos) {
      const obj = await abrirObjeto(r.datos, d.clave, MAX_DESCOMPRIMIDO);
      if (obj.schemaVersion > VERSION) throw new Error("version");
      R = aplanar(migrar(obj));
      v = r.v;
    }
    // Si en el servidor no hay nada (la caja venció después de 400 días sin cambios, o se borró), no es que «el otro borró todo»:
    // se junta como la primera vez y lo de acá vuelve a subir entero.
    const M = juntar(L, R, r.datos ? B : {}), hM = huellas(M);
    if (r.datos && iguales(hM, huellas(R))) return { M, v, base: hM };
    const s = await pedir(d, "PUT", { v, datos: await cerrarObjeto(armar(M), d.clave) }, ir);
    if (s.estado === 200) return { M, v: s.v, base: hM };
    if (s.estado !== 409) throw new Error("servidor " + s.estado);
    // Otro guardó en el medio: lo mío ya incluye lo que había antes; se junta de nuevo con lo nuevo.
    L = M; B = huellas(R); r = s;
  }
  throw new Error("demasiados cambios a la vez");
}
