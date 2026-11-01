// Guardado en el celu con IndexedDB. Si el navegador no lo deja (modo privado de algunos navegadores),
// trabaja en memoria y avisa: los datos se pierden al cerrar.
//
// Dos modos:
// - Sin PIN: una tienda por cada lista de LISTAS, más "config" (clave k, valor v; incluye schemaVersion).
// - Con PIN: todo va junto y cifrado en la tienda "cofre" (un solo registro "datos"). Sin cifrar quedan solo
//   "seguridad" (la clave de datos envuelta con el PIN, intentos y preferencias de bloqueo) y "temaBloqueo".
import { migrar, LISTAS } from "../logic/migraciones.js";
import * as C from "../logic/cifrado.js";

const NOMBRE = "miguita";
const VERSION_IDB = 4; // subirla cuando se agrega una tienda nueva
const TIENDAS = { ...LISTAS, config: "k", cofre: "k" };
const RESERVADAS = ["seguridad", "temaBloqueo", "schemaVersion"]; // claves de config que no son de la persona

const prom = (req) => new Promise((ok, mal) => { req.onsuccess = () => ok(req.result); req.onerror = () => mal(req.error); });
const fin = (tx) => new Promise((ok, mal) => { tx.oncomplete = ok; tx.onerror = () => mal(tx.error); tx.onabort = () => mal(tx.error); });

function abrirIDB() {
  return new Promise((ok, mal) => {
    if (!("indexedDB" in globalThis)) return mal(new Error("sin IndexedDB"));
    const req = indexedDB.open(NOMBRE, VERSION_IDB);
    req.onupgradeneeded = () => {
      for (const [t, clave] of Object.entries(TIENDAS)) if (!req.result.objectStoreNames.contains(t)) req.result.createObjectStore(t, { keyPath: clave });
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => mal(req.error);
    req.onblocked = () => mal(new Error("base bloqueada"));
  });
}

async function leerTodo(idb) {
  const nombres = [...Object.keys(LISTAS), "config"];
  const tx = idb.transaction(nombres, "readonly");
  const valores = await Promise.all(nombres.map((t) => prom(tx.objectStore(t).getAll())));
  const d = Object.fromEntries(nombres.map((t, i) => [t, valores[i]]));
  const config = Object.fromEntries(d.config.filter((x) => !RESERVADAS.includes(x.k)).map((x) => [x.k, x.v]));
  d.schemaVersion = d.config.find((x) => x.k === "schemaVersion")?.v;
  d.config = config;
  // Una base recién creada no tiene nada: que la migración la arme desde cero.
  if (d.schemaVersion === undefined) for (const t of Object.keys(LISTAS)) if (!d[t].length) delete d[t];
  return d;
}

// Escribe los datos en claro. Deja intactas las claves reservadas que se le pasen en "dejar".
async function escribirTodo(idb, d, dejar = {}) {
  const tx = idb.transaction(Object.keys(TIENDAS), "readwrite");
  for (const t of Object.keys(TIENDAS)) tx.objectStore(t).clear();
  for (const t of Object.keys(LISTAS)) (d[t] || []).forEach((x) => tx.objectStore(t).put(x));
  for (const [k, v] of Object.entries({ ...d.config, ...dejar, schemaVersion: d.schemaVersion })) tx.objectStore("config").put({ k, v });
  await fin(tx);
}

async function leerUno(idb, tienda, k) {
  return prom(idb.transaction(tienda).objectStore(tienda).get(k));
}

export async function abrirBase() {
  let idb = null;
  try { idb = await abrirIDB(); } catch { /* sigue en memoria */ }
  let seg = idb ? (await leerUno(idb, "config", "seguridad"))?.v || null : null;
  let clave = null, crudo = null, timer = 0, pendiente = null;

  const base = {
    persistente: !!idb,
    bloqueada: !!seg?.activa,
    seguridad: seg,
    temaBloqueo: idb ? (await leerUno(idb, "config", "temaBloqueo"))?.v || "dark" : "dark",
    datos: null,
    onError: () => {},
    leerEstado: () => base.datos, // la app lo reemplaza por una función que arma el estado actual
  };

  async function cargarClaro() {
    let d = idb ? await leerTodo(idb) : {};
    const antes = d.schemaVersion;
    d = migrar(d);
    if (idb && antes !== d.schemaVersion) await escribirTodo(idb, d);
    base.datos = d;
  }

  async function guardarSeg() {
    if (!idb) return;
    const tx = idb.transaction("config", "readwrite");
    tx.objectStore("config").put({ k: "seguridad", v: seg });
    await fin(tx);
  }

  async function guardarCofre() {
    const caja = await C.cifrar(clave, base.leerEstado());
    const tx = idb.transaction(["cofre", "config"], "readwrite");
    tx.objectStore("cofre").put({ k: "datos", ...caja });
    tx.objectStore("config").put({ k: "temaBloqueo", v: base.leerEstado().config.tema });
    await fin(tx);
  }
  // Con PIN, cada cambio vuelve a cifrar todo junto (se agrupan los cambios seguidos).
  function programar() {
    clearTimeout(timer);
    pendiente ||= new Promise((ok) => {
      timer = setTimeout(async () => {
        try { await guardarCofre(); } catch (e) { base.onError(e); }
        pendiente = null; ok();
      }, 300);
    });
    return pendiente;
  }

  base.poner = async (tienda, obj) => {
    if (!idb) return;
    if (clave) return programar();
    try { const tx = idb.transaction(tienda, "readwrite"); tx.objectStore(tienda).put(obj); await fin(tx); } catch (e) { base.onError(e); }
  };
  base.quitar = async (tienda, k) => {
    if (!idb) return;
    if (clave) return programar();
    try { const tx = idb.transaction(tienda, "readwrite"); tx.objectStore(tienda).delete(k); await fin(tx); } catch (e) { base.onError(e); }
  };
  base.guardarConfig = (k) => base.poner("config", { k, v: base.datos.config[k] });
  base.terminar = async () => { if (pendiente) { clearTimeout(timer); await guardarCofre(); pendiente = null; } };

  /* ---------- desbloquear ---------- */
  // Devuelve null si abrió, o un texto para la persona. secreto: PIN o contraseña.
  base.desbloquear = async (secreto, conHuella = null) => {
    const ahora = Date.now();
    if (seg.esperaHasta > ahora) return "Esperá " + Math.ceil((seg.esperaHasta - ahora) / 1000) + " segundos para probar de nuevo.";
    try {
      ({ clave, crudo } = conHuella ? await C.abrirConSecreto(seg.huella.caja, conHuella) : await C.abrirCofre(seg.cofre, secreto));
    } catch {
      seg.errores = (seg.errores || 0) + 1;
      if (seg.borrarTras10 && seg.errores >= 10) { await base.borrarTodo(); return "Se borraron los datos de este celu."; }
      const espera = C.esperaTrasErrores(seg.errores);
      seg.esperaHasta = espera ? ahora + espera : 0;
      await guardarSeg();
      return (seg.modo === "clave" ? "Contraseña incorrecta." : "PIN incorrecto.") + (espera ? " Esperá " + espera / 1000 + " segundos." : "");
    }
    const caja = await leerUno(idb, "cofre", "datos");
    let d = caja ? await C.descifrar(clave, caja) : {};
    const antes = d.schemaVersion;
    d = migrar(d);
    base.datos = d;
    if (antes !== d.schemaVersion) { base.leerEstado = () => d; await guardarCofre(); }
    seg.errores = 0; seg.esperaHasta = 0;
    await guardarSeg();
    base.bloqueada = false;
    return null;
  };

  /* ---------- activar, cambiar y quitar el PIN ---------- */
  base.activarSeguridad = async (secreto, modo) => {
    const nuevo = await C.crearCofre(secreto);
    clave = nuevo.clave; crudo = nuevo.crudo;
    seg = { activa: true, modo, cofre: nuevo.cofre, errores: 0, esperaHasta: 0, bloqueo: "salir", tapar: true, borrarTras10: false, huella: null, ...(seg && { bloqueo: seg.bloqueo, tapar: seg.tapar }) };
    base.seguridad = seg;
    await guardarCofre();
    // Recién con el cofre guardado se borran los datos en claro.
    const tx = idb.transaction([...Object.keys(LISTAS), "config"], "readwrite");
    for (const t of Object.keys(LISTAS)) tx.objectStore(t).clear();
    tx.objectStore("config").clear();
    tx.objectStore("config").put({ k: "seguridad", v: seg });
    tx.objectStore("config").put({ k: "temaBloqueo", v: base.leerEstado().config.tema });
    await fin(tx);
  };
  base.cambiarSecreto = async (secreto, modo) => {
    seg.cofre = await C.reenvolver(crudo, secreto); seg.modo = modo;
    await guardarSeg();
  };
  base.quitarSeguridad = async () => {
    await base.terminar();
    const d = base.leerEstado();
    clave = null; crudo = null; seg = null; base.seguridad = null;
    await escribirTodo(idb, d);
  };
  base.ajustarSeguridad = async (cambios) => { Object.assign(seg, cambios); await guardarSeg(); };

  // Huella o cara: guarda la clave de datos envuelta con el secreto que da el celu (WebAuthn PRF).
  base.guardarHuella = async (credencial, sal, secreto) => {
    const caja = await (await C.envolverConSecreto(crudo, secreto)).envolver();
    seg.huella = { credencial, sal, caja };
    await guardarSeg();
  };

  /* ---------- restaurar y borrar ---------- */
  base.reemplazarTodo = async (datos) => {
    const d = migrar(datos);
    base.datos = d;
    if (!idb) return;
    if (clave) { base.leerEstado = () => d; await guardarCofre(); }
    else await escribirTodo(idb, d);
  };
  base.borrarTodo = async () => {
    idb?.close();
    await new Promise((ok) => { const r = indexedDB.deleteDatabase(NOMBRE); r.onsuccess = r.onerror = r.onblocked = ok; });
  };

  if (!base.bloqueada) await cargarClaro();
  // Pedir que el navegador no borre los datos por falta de espacio.
  try { navigator.storage?.persist?.(); } catch { /* opcional */ }
  return base;
}
