// MiGuita: estado, guardado y eventos. Las pantallas están en pantallas.js.
import { Art } from "../art/art.js";
import { evaluar, leerMonto, montoEnCampo } from "../logic/dinero.js";
import { leerTexto } from "../logic/anotar.js";
import { RESPALDO } from "../logic/categorias.js";
import { fechaLocal, cambiarMes } from "../logic/mes.js";
import { infoRacha, salvavidasPara, festejoDeHoy } from "../logic/racha.js";
import { correrFijos, mesDeInicio, infoMeta, restante, movimientoDeFijo } from "../logic/plan.js";
import { abrirBase } from "../data/db.js";
import { centavos, fusionar, novedades, decodificar, codificar, validarAlias, sincronizarMiParte, pagadores } from "../logic/grupos.js";
import { nuevoCodigo, buscarCodigo, derivar, sincronizar, bajar, escuchar, pedir } from "../logic/sincro.js";
import { CONFIG_COMPARTIDA, nuevoCodigoVinculo, leerCodigoVinculo, derivarVinculo, aplanar, huellas, huella, sincronizarDatos } from "../logic/vinculo.js";
import { datosDeEjemplo, planDeEjemplo, grupoDeEjemplo } from "./ejemplo.js";
import { crearVistas, esc } from "./pantallas.js";
import { crearVistasPlan } from "./plan.js";
import { crearVistasGrupos, pesosDe } from "./grupos.js";
import { svgQR, escanear } from "./qr.js";
import { VERSION } from "../logic/migraciones.js";
import { estadoPresupuestos } from "../logic/plan.js";
import { buscarDolar, necesitaConfirmar, tocaActualizar, valorPara, aPesos } from "../logic/dolar.js";
import { presupuestosPorAvisar, enNoMolestar } from "../logic/avisos.js";
import { validarPin, armarCopia, abrirCopia } from "../logic/cifrado.js";
import { movimientosCSV } from "../logic/exportar.js";
import { leerCSV, leerXLSX, armarMovimientos, filasDesdePDF, claveComercio } from "../logic/importar.js";
import { textoDePDF } from "./pdf.js";
import { crearVistaImportar } from "./importar.js";
import { CHISTES, ESPECIALES } from "./chistes.js";
import { migrar } from "../logic/migraciones.js";
import { pantallaBloqueo } from "./bloqueo.js";
import { crearVistasAjustes } from "./ajustes.js";
import { hayHuella, registrarHuella } from "./huella.js";
import { crearVistasPrimera, instalada } from "./primera.js";

const PESTANAS = [["inicio", "Inicio"], ["grupos", "Grupos"], ["plan", "Plan"], ["mas", "Más"]];
const TAB_DE = { movimientos: "inicio", resumen: "inicio", racha: "inicio", categorias: "mas", editarCat: "mas", form: "plan",
  grupo: "grupos", juntada: "grupos", gform: "grupos", compartir: "grupos", unido: "grupos", quien: "grupos", whatsapp: "grupos",
  notif: "mas", seguridad: "mas", dolar: "mas", copias: "mas", dispositivos: "mas", instalar: "mas", tutorial: "mas", importar: "inicio" };
const SIN_BARRA = ["bienvenida", "primerIngreso", "tutorial"];
const PLAN = ["presupuestos", "metas", "deudas", "fijos"];
const hoy = fechaLocal();
const raiz = document.getElementById("app");

const base = await abrirBase();
// Con PIN, antes que nada va la pantalla de bloqueo.
if (base.bloqueada) await pantallaBloqueo(base, raiz);
const st = {
  movs: base.datos.movs,
  dias: base.datos.dias,
  presupuestos: base.datos.presupuestos,
  metas: base.datos.metas,
  deudas: base.datos.deudas,
  fijos: base.datos.fijos,
  grupos: base.datos.grupos,
  cotizaciones: base.datos.cotizaciones,
  seguridad: base.seguridad,
  hayHuella: false,
  pinFlujo: null,    // { modo, paso, primero, actual, error }
  segMsg: "",
  dolarPendiente: null,
  dolarError: "",
  dolarCargando: false,
  copiaFlujo: null,
  primera: { nombre: "", monto: "", moneda: "ARS", error: "" },
  tutorialPaso: 0,
  tutorialDesde: "", // a dónde se va al terminar el tutorial
  imp: { movs: [], elegidos: new Set(), soloGastos: true, sinTransf: false, medio: "mp", error: "", leyendo: false },
  puedeInstalar: false,
  versionNueva: null, // el modo sin internet ya bajó una versión nueva y espera
 // Chrome ofreció instalar la app (Android y compus)
  cfg: base.datos.config,
  persistente: base.persistente,
  pantalla: "inicio",
  mes: hoy.slice(0, 7),
  error: "",
  hoja: null,
  aviso: null,       // { texto, deshacer? }
  festejo: null,
  confirmar: "",     // "mov" | "todo": segundo toque para borrar
  filtro: { texto: "", tipo: "todos", cat: "" },
  catTab: "gasto",
  editCat: null,
  avisoLuego: 0,
  planTab: "presupuesto",
  form: null,        // { tipo, id, vals, error }
  verSaldadas: false,
  metaOk: null,
  grupoId: null,
  grupoTab: "gastos",
  gform: null,       // { tipo, id, vals, error }
  compartir: null,   // { codigo, svg, pegado, error, escaneando }
  unido: null,
  pendiente: null,   // grupo recién llegado, antes de elegir quién sos
  yoElegido: "",
  nombreNuevo: "",
  aliasQuien: "",
  juntadaId: null,   // juntada abierta ("" = gastos sueltos)
  vistoAntes: 0,     // cuándo se había mirado esa juntada (para marcar lo nuevo)
  whatsJ: undefined, // resumen de WhatsApp de una juntada
  errorQuien: "",
  errorAlias: "",
};
const V = crearVistas(st, hoy);
const VP = crearVistasPlan(st, hoy, V);
const VG = crearVistasGrupos(st, hoy, V);
let apagarCamara = null, videoCamara = null;
let timerAviso = 0;
const VA = crearVistasAjustes(st, hoy, V);
const VI = crearVistasPrimera(st, V);
const importarVista = crearVistaImportar(st, V);
// Lo que se guarda (cifrado, si hay PIN) y lo que va en una copia.
base.leerEstado = () => ({ schemaVersion: VERSION, movs: st.movs, dias: st.dias, presupuestos: st.presupuestos, metas: st.metas, deudas: st.deudas,
  fijos: st.fijos, grupos: st.grupos, cotizaciones: st.cotizaciones, config: st.cfg });
hayHuella().then((h) => { st.hayHuella = h; });
base.onError = () => mostrarAviso("No se pudo guardar el último cambio. Probá de nuevo.");

const nuevoId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");

/* ---------- guardado ---------- */
function guardarMov(mov) {
  const i = st.movs.findIndex((x) => x.id === mov.id);
  if (i >= 0) st.movs[i] = mov; else st.movs.push(mov);
  base.poner("movs", mov);
  programarVinculo();
}
function quitarMov(id) {
  st.movs = st.movs.filter((x) => x.id !== id);
  base.quitar("movs", id);
  programarVinculo();
}
function ponerDia(d) {
  st.dias = st.dias.filter((x) => x.fecha !== d.fecha).concat(d);
  base.poner("dias", d);
  programarVinculo();
}
// Presupuestos, metas, deudas y fijos.
function ponerItem(lista, obj) {
  const i = st[lista].findIndex((x) => x.id === obj.id);
  if (i >= 0) st[lista][i] = obj; else st[lista].push(obj);
  base.poner(lista, obj);
  programarVinculo();
}
function quitarItem(lista, id) {
  st[lista] = st[lista].filter((x) => x.id !== id);
  base.quitar(lista, id);
  programarVinculo();
}
function ponerConfig(k, v) {
  st.cfg[k] = v;
  base.guardarConfig(k);
  if (CONFIG_COMPARTIDA.includes(k)) programarVinculo();
}

/* ---------- mis dispositivos conectados ---------- */
// Se juntan con el servidor al abrir, al volver a la app, al volver internet, cuando otro dispositivo guarda
// (aviso al instante) y un ratito después de cada cambio propio.
let llaveVinculo = null, vinculoTimer = 0, vinculoCola = Promise.resolve(), aplicandoRemoto = false, escuchaVinculo = null;
function llaveV() {
  const c = st.cfg.vinculo?.codigo;
  if (llaveVinculo?.codigo !== c) llaveVinculo = { codigo: c, p: derivarVinculo(c) };
  return llaveVinculo.p;
}
function programarVinculo() {
  if (!st.cfg?.vinculo || aplicandoRemoto) return;
  clearTimeout(vinculoTimer);
  vinculoTimer = setTimeout(sincronizarVinculo, 2000);
}
function sincronizarVinculo() {
  vinculoCola = vinculoCola.then(vinculoUna).catch(() => {});
  return vinculoCola;
}
async function vinculoUna() {
  const vin = st.cfg.vinculo;
  if (!vin || navigator.onLine === false) return;
  const local = structuredClone(base.leerEstado()), antes = huellas(aplanar(local));
  let r;
  try { r = await sincronizarDatos(await llaveV(), local, vin.base); }
  catch (e) {
    const error = e.message === "version" ? "version" : /403/.test(e.message) ? "codigo" : "red";
    if (st.cfg.vinculo?.codigo === vin.codigo && st.cfg.vinculo.error !== error) { ponerConfig("vinculo", { ...st.cfg.vinculo, error }); dibujar(); }
    return;
  }
  if (st.cfg.vinculo?.codigo !== vin.codigo) return;
  // Se aplica lo que llegó, salvo lo que se cambió acá mientras viajaba (eso se manda en la próxima).
  const ahora = aplanar(base.leerEstado());
  let cambio = false, otraVez = false;
  aplicandoRemoto = true;
  try {
    for (const k of new Set([...r.M.keys(), ...ahora.keys()])) {
      const hAhora = ahora.has(k) ? huella(ahora.get(k)) : undefined;
      if (antes[k] !== hAhora) { otraVez = true; continue; }
      const m = r.M.get(k);
      if ((m === undefined ? undefined : huella(m)) === hAhora) continue;
      aplicarRemoto(k, m);
      cambio = true;
    }
  } finally { aplicandoRemoto = false; }
  ponerConfig("vinculo", { codigo: vin.codigo, v: r.v, base: r.base, ultimo: new Date().toISOString() });
  if (otraVez) programarVinculo();
  if (cambio || vin.error) dibujar();
}
function aplicarRemoto(k, x) {
  const i = k.indexOf("|"), lista = k.slice(0, i), id = k.slice(i + 1);
  if (lista === "config") { if (x !== undefined) ponerConfig(id, x); return; }
  if (lista === "dias") {
    if (x) ponerDia(x); else { st.dias = st.dias.filter((d) => d.fecha !== id); base.quitar("dias", id); }
    return;
  }
  if (lista === "grupos") {
    const local = st.grupos.find((g) => g.id === id);
    if (!x) { if (local) quitarItem("grupos", id); return; }
    const g = local ? { ...fusionar(local, x), yo: x.yo ?? local.yo, loc: x.loc ?? local.loc } : x; // ya se decidió al juntar: gana lo que llegó
    if (!g.yo) delete g.yo;
    if (!g.sync && x.sync) g.sync = { codigo: x.sync.codigo };
    guardarGrupo(g, false);
    if (g.sync) sincronizarGrupo(g.id);
    return;
  }
  if (x) ponerItem(lista, x); else quitarItem(lista, id);
}
// Mientras la app está a la vista, escucha: si otro dispositivo guarda algo, aparece solo.
function vigilarVinculo() {
  const c = !document.hidden && st.cfg.vinculo?.codigo;
  if ((escuchaVinculo?.codigo || false) === c) return;
  escuchaVinculo?.cortar?.(); escuchaVinculo = null;
  if (!c) return;
  const e = (escuchaVinculo = { codigo: c, cortar: null });
  llaveV().then((d) => { if (escuchaVinculo === e) e.cortar = escuchar(d, (v) => { if (st.cfg.vinculo && v !== st.cfg.vinculo.v) sincronizarVinculo(); }); });
}
async function prepararVinculo() {
  const c = st.cfg.vinculo?.codigo;
  if (!c) return;
  const svg = await svgQR(location.origin + location.pathname + "#v=" + c).catch(() => null);
  if (st.vinc && st.pantalla === "dispositivos") { st.vinc.svg = svg; dibujar(); }
}
async function crearVinculo() {
  ponerConfig("vinculo", { codigo: nuevoCodigoVinculo(), v: 0, base: {} });
  st.vinc = { ...st.vinc, error: "", trabajando: true, verCodigo: true }; dibujar();
  await sincronizarVinculo();
  st.vinc.trabajando = false;
  if (st.cfg.vinculo?.error) st.vinc.error = "No pude conectarme. Revisá internet: se va a mandar cuando vuelva.";
  else mostrarAviso("Listo. Ahora poné el código en tu otro dispositivo.");
  vigilarVinculo(); prepararVinculo(); dibujar();
}
async function unirVinculo() {
  const codigo = leerCodigoVinculo(st.vinc.pegado);
  if (!codigo) { st.vinc.error = "El código tiene 16 letras y números, por ejemplo K7QM-3XPA-9TRB-2HDW."; return dibujar(); }
  st.vinc.trabajando = true; st.vinc.error = ""; dibujar();
  try {
    const r = await pedir(await derivarVinculo(codigo), "GET");
    if (r.estado === 404) throw new Error("no");
    if (r.estado !== 200) throw new Error("red");
  } catch (e) {
    st.vinc.trabajando = false;
    st.vinc.error = e.message === "no" ? "No encontré ese código. Fijate que esté bien escrito." : "No pude conectarme. Revisá internet y probá de nuevo.";
    return dibujar();
  }
  // Lo de ejemplo no se junta con los datos de verdad.
  st.movs.filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarMov(x.id));
  PLAN.forEach((l) => st[l].filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarItem(l, x.id)));
  st.grupos.filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarItem("grupos", x.id));
  ponerConfig("vinculo", { codigo, v: 0, base: {} });
  await sincronizarVinculo();
  st.vinc = { pegado: "", error: st.cfg.vinculo?.error ? "Se conectó, pero no se pudo traer todo. Se reintenta solo." : "", trabajando: false, verCodigo: false };
  if (!st.cfg.vinculo?.error) mostrarAviso("¡Listo! Este dispositivo ya ve tus datos.");
  vigilarVinculo(); prepararVinculo(); dibujar();
}

function mostrarAviso(texto, deshacer) {
  clearTimeout(timerAviso);
  st.aviso = { texto, deshacer };
  timerAviso = setTimeout(() => { st.aviso = null; dibujar(); }, deshacer ? 6000 : 4500);
}

// Guarda un movimiento nuevo o editado, ofrece deshacer y festeja si la racha llegó a un premio.
function anotar(mov, anterior) {
  const antes = infoRacha(st.movs, st.dias, hoy);
  guardarMov(mov);
  st.mes = mov.fecha.slice(0, 7);
  const texto = (anterior ? "Cambiado: " : "Anotado: ") + (mov.detalle || V.nombreCat(mov.categoria)) + " " + V.plata(mov.monto);
  mostrarAviso(texto, () => (anterior ? guardarMov(anterior) : quitarMov(mov.id)));
  revisarFestejo(antes);
  avisarPresupuesto();
}

async function avisarPresupuesto() {
  const mes = hoy.slice(0, 7), n = st.cfg.notif;
  const cats = presupuestosPorAvisar(estadoPresupuestos(st.presupuestos, st.movs, mes), mes, st.cfg.avisados || []);
  if (!cats.length) return;
  ponerConfig("avisados", [...(st.cfg.avisados || []), ...cats.map((c) => mes + "|" + c)].slice(-60));
  const ahora = new Date().toTimeString().slice(0, 5);
  if (!n.tipos.presupuesto || enNoMolestar(n.noMolestar, ahora) || globalThis.Notification?.permission !== "granted") return;
  const reg = await navigator.serviceWorker?.ready;
  reg?.showNotification("MiGuita", { body: "Ya usaste el 90% del presupuesto de " + cats.map(V.nombreCat).join(" y ") + ".", tag: "presupuesto", silent: n.forma === "silencio" });
}

function revisarFestejo(antes) {
  const ahora = infoRacha(st.movs, st.dias, hoy);
  const n = festejoDeHoy(ahora);
  if (!antes.hoyHecho && n && st.cfg.ultimoFestejo !== hoy + ":" + n) {
    ponerConfig("ultimoFestejo", hoy + ":" + n);
    st.festejo = n;
  }
}

function revisarSalvavidas() {
  const motivos = V.motivosApretado();
  const f = salvavidasPara(st.movs, st.dias, hoy, motivos);
  if (!f) return;
  ponerDia({ fecha: f, salvavidas: true });
  mostrarAviso("Te regalamos un salvavidas: ayer cuenta para tu racha. Motivo: " + motivos[0] + ".");
}

// Anota los gastos fijos que ya llegaron a su día.
// El dólar guardado para una fecha (el tipo elegido en Más › Dólar), o null si todavía no hay.
function cotizar(fecha) {
  const d = st.cfg.dolar, c = valorPara(fecha, d.tipo, st.cotizaciones, d.manual);
  return c && { ...c, tipo: d.tipo };
}
function revisarFijos() {
  const { nuevos, cambiados } = correrFijos(st.fijos, st.movs, hoy, cotizar);
  nuevos.forEach(guardarMov);
  cambiados.forEach((f) => ponerItem("fijos", f));
  if (nuevos.length === 1) mostrarAviso("Se anotó solo: " + nuevos[0].detalle + " " + V.plata(nuevos[0].monto));
  else if (nuevos.length > 1) mostrarAviso("Se anotaron solos " + nuevos.length + " gastos fijos.");
}

/* ---------- formularios de Plan ---------- */
const LISTA_DE = { presupuesto: "presupuestos", meta: "metas", deuda: "deudas", fijo: "fijos", ahorro: "metas", pago: "deudas" };
const FORM_DE_TAB = { presupuesto: "presupuesto", metas: "meta", deudas: "deuda", fijos: "fijo" };

function abrirForm(tipo, id) {
  const x = id ? st[LISTA_DE[tipo]].find((i) => i.id === id) : null;
  if (id && !x) return;
  const m = montoEnCampo;
  const usadas = new Set(st.presupuestos.map((p) => p.categoria));
  const vals = {
    presupuesto: () => x ? { categoria: x.categoria, tope: m(x.tope) } : { categoria: (st.cfg.categorias.gasto.find((c) => !c.oculta && !usadas.has(c.id)) || {}).id || "otros", tope: "" },
    meta: () => x ? { nombre: x.nombre, icono: x.icono, moneda: x.moneda, objetivo: m(x.objetivo), ahorrado: m(x.ahorrado), fecha: x.fecha || "" } : { nombre: "", icono: "meta", moneda: "ARS", objetivo: "", ahorrado: "", fecha: "" },
    deuda: () => x ? { tipo: x.tipo, quien: x.quien, concepto: x.concepto, moneda: x.moneda || "ARS", total: m(x.total), pagado: m(x.pagado), vence: x.vence || "" } : { tipo: "debo", quien: "", concepto: "", moneda: "ARS", total: "", pagado: "", vence: "" },
    fijo: () => x ? { tipo: x.tipo || "gasto", modo: x.modo || "auto", nombre: x.nombre, moneda: x.moneda || "ARS", monto: m(x.monto), categoria: x.categoria, dia: String(x.dia), medio: x.medio, activo: x.activo } : { tipo: "gasto", modo: "auto", nombre: "", moneda: "ARS", monto: "", categoria: "servicios", dia: "", medio: "", activo: true },
    ahorro: () => ({ monto: "" }),
    pago: () => ({ monto: m(restante(x)), anotar: true }),
  }[tipo]();
  st.form = { tipo, id: id || null, vals, error: "" };
  abrir("form");
}

// Devuelve un texto de error, o null si se guardó.
function guardarForm() {
  const { tipo, id, vals: v } = st.form;
  const monto = (k, nombre, { cero = false } = {}) => {
    const c = leerMonto(v[k] === "" && cero ? "0" : v[k]);
    if (c === null || (!cero && c <= 0)) throw "Revisá " + nombre + ": escribilo con números, por ejemplo 70.000.";
    return c;
  };
  const deshacerItem = (lista, antes, nuevo) => () => (antes ? ponerItem(lista, antes) : quitarItem(lista, nuevo.id));
  try {
    if (tipo === "presupuesto") {
      const antes = st.presupuestos.find((p) => p.id === id);
      const p = { id: id || nuevoId(), categoria: v.categoria, tope: monto("tope", "el tope") };
      ponerItem("presupuestos", p);
      mostrarAviso("Presupuesto de " + V.nombreCat(p.categoria) + ": " + V.plata(p.tope), deshacerItem("presupuestos", antes, p));
    } else if (tipo === "meta") {
      if (!v.nombre.trim()) throw "Poné para qué ahorrás.";
      const antes = st.metas.find((x) => x.id === id);
      const m = { id: id || nuevoId(), nombre: v.nombre.trim(), icono: v.icono, moneda: v.moneda, objetivo: monto("objetivo", "el objetivo"), ahorrado: monto("ahorrado", "lo ahorrado", { cero: true }), fecha: v.fecha || "", ts: antes?.ts || Date.now() };
      ponerItem("metas", m);
      mostrarAviso((antes ? "Guardada: " : "Nueva meta: ") + m.nombre, deshacerItem("metas", antes, m));
    } else if (tipo === "deuda") {
      if (!v.quien.trim() && !v.concepto.trim()) throw "Poné quién o por qué.";
      const antes = st.deudas.find((x) => x.id === id);
      const d = { id: id || nuevoId(), tipo: v.tipo, quien: v.quien.trim(), concepto: v.concepto.trim(), moneda: v.moneda, total: monto("total", "el monto total"), pagado: monto("pagado", "lo pagado", { cero: true }), vence: v.vence || "", ts: antes?.ts || Date.now() };
      if (d.pagado > d.total) throw "Lo pagado no puede ser más que el total.";
      ponerItem("deudas", d);
      mostrarAviso("Deuda guardada", deshacerItem("deudas", antes, d));
    } else if (tipo === "fijo") {
      if (!v.nombre.trim()) throw "Poné un nombre, por ejemplo «Alquiler».";
      const dia = Number(v.dia);
      if (!Number.isInteger(dia) || dia < 1 || dia > 31) throw "El día tiene que ser un número del 1 al 31.";
      const antes = st.fijos.find((x) => x.id === id);
      const reactivado = v.activo && (!antes || !antes.activo);
      const f = { id: id || nuevoId(), tipo: v.tipo, modo: v.modo, nombre: v.nombre.trim(), moneda: v.moneda, monto: monto("monto", "el monto"), categoria: v.categoria, medio: v.medio, dia, activo: !!v.activo,
        desde: reactivado || !antes ? mesDeInicio(dia, hoy) : antes.desde, hechos: antes?.hechos || [] };
      ponerItem("fijos", f);
      mostrarAviso("Fijo guardado. " + (f.activo ? (f.desde === hoy.slice(0, 7) ? "Empieza este mes." : "Empieza el mes que viene.") : "Está pausado."), deshacerItem("fijos", antes, f));
      revisarFijos();
    } else if (tipo === "ahorro") {
      const antes = st.metas.find((x) => x.id === id);
      const m = { ...antes, ahorrado: antes.ahorrado + monto("monto", "el monto") };
      ponerItem("metas", m);
      mostrarAviso("Sumaste " + V.plata(m.ahorrado - antes.ahorrado, { moneda: m.moneda === "USD" ? "US$ " : "$" }) + " a " + m.nombre, () => ponerItem("metas", antes));
      if (infoMeta(m, hoy).cumplida && !infoMeta(antes, hoy).cumplida) st.metaOk = m;
    } else if (tipo === "pago") {
      const antes = st.deudas.find((x) => x.id === id);
      const c = monto("monto", "el monto");
      const $ = (n) => V.plata(n, { moneda: antes.moneda === "USD" ? "US$ " : "$" });
      if (c > restante(antes)) throw "Es más de lo que falta (" + $(restante(antes)) + ").";
      const cot = antes.moneda === "USD" && v.anotar ? cotizar(hoy) : null;
      if (antes.moneda === "USD" && v.anotar && !cot) throw "Para anotarlo en pesos falta el valor del dólar. Cargalo en Más › Dólar o apagá «Anotarlo también».";
      const d = { ...antes, pagado: antes.pagado + c };
      ponerItem("deudas", d);
      const me = d.tipo === "meDeben";
      let mov = null;
      if (v.anotar) {
        mov = { id: nuevoId(), tipo: me ? "ingreso" : "gasto", monto: c, detalle: (me ? "Cobro: " : "Pago: ") + (d.concepto || d.quien), categoria: me ? "otros_in" : "deudas", medio: "", fecha: hoy, ts: Date.now(), mod: Date.now() };
        if (cot) { mov.monto = aPesos(c, cot.valor); mov.usd = { monto: c, valor: cot.valor, fecha: cot.fecha, tipo: cot.tipo, fuente: cot.fuente, estimado: cot.estimado }; }
        guardarMov(mov);
      }
      mostrarAviso((me ? "Cobraste " : "Pagaste ") + $(c) + (restante(d) ? "" : ". ¡Saldada!"), () => { ponerItem("deudas", antes); if (mov) quitarMov(mov.id); });
    }
  } catch (e) {
    if (typeof e === "string") return e;
    throw e;
  }
  return null;
}

function borrarForm() {
  const lista = LISTA_DE[st.form.tipo];
  const x = st[lista].find((i) => i.id === st.form.id);
  quitarItem(lista, x.id);
  mostrarAviso("Borrado", () => ponerItem(lista, x));
}

/* ---------- grupos ---------- */
const grupoActual = () => st.grupos.find((g) => g.id === st.grupoId);

// Guarda el grupo y pone al día "mi parte" en mis gastos.
// Si el grupo está conectado, el cambio se manda al servidor un ratito después (subir = false: vino del servidor).
function guardarGrupo(g, subir = true) {
  if (subir && g.sync) g = { ...g, sync: { ...g.sync, pendiente: true } };
  ponerItem("grupos", g);
  const { poner, quitar } = sincronizarMiParte(g, st.movs, "otros", hoy);
  poner.forEach(guardarMov);
  quitar.forEach(quitarMov);
  if (subir && g.sync) programarSubida(g.id);
}
// Deshacer en un grupo: lo que vuelve atrás lleva la hora de ahora, para que le gane al cambio que ya viajó a los demás.
function restaurarGrupo(antes) {
  const act = st.grupos.find((x) => x.id === antes.id), ahora = Date.now();
  const re = (lista) => antes[lista].map((y) => { const c = act?.[lista].find((z) => z.id === y.id); return c && JSON.stringify(c) !== JSON.stringify(y) ? { ...y, ts: ahora } : y; });
  guardarGrupo({ ...antes, sync: act?.sync, ts: act && JSON.stringify([act.nombre, act.moneda]) !== JSON.stringify([antes.nombre, antes.moneda]) ? ahora : antes.ts,
    miembros: re("miembros"), gastos: re("gastos"), pagos: re("pagos"), ...(antes.juntadas && { juntadas: re("juntadas") }) });
}
const copiaGrupo = (g) => structuredClone(g);
// Lo que pasó en una juntada mientras la miro (o lo que cambio yo) no se marca como "nuevo".
function marcarVisto() {
  const g = grupoActual();
  if (!g || st.juntadaId == null) return;
  ponerConfig("vistos", Object.fromEntries(Object.entries({ ...(st.cfg.vistos || {}), [g.id + "|" + st.juntadaId]: Date.now() }).slice(-300)));
}
// Pone mi alias en mi persona del grupo. Devuelve el mismo grupo si no hay nada que cambiar.
function conMiAlias(g, alias) {
  const yo = g.miembros.find((m) => m.id === g.yo);
  if (!alias || !yo || yo.alias === alias) return g;
  return { ...g, miembros: g.miembros.map((m) => (m.id === yo.id ? { ...m, alias, ts: Date.now() } : m)) };
}

function irA(p) {
  history.replaceState({ p }, "");
  st.pantalla = p;
  scrollTo(0, 0);
}

async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); }
  catch {
    const t = document.createElement("textarea");
    t.value = texto; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); } catch { /* sin copiar */ }
    t.remove();
  }
}

async function unirCodigo(texto) {
  const corto = /G[123]:/.test(texto) ? null : buscarCodigo(texto);
  if (corto) return unirCorto(corto);
  let g;
  try { g = await decodificar(texto); }
  catch { st.compartir.error = "Ese código no es válido. Pedile que lo copie de nuevo."; dibujar(); return; }
  entrarAGrupo(g);
}

/* ---------- grupos conectados ---------- */
// Cada grupo conectado se junta con el servidor al abrir la app, al volver a ella, al recuperar internet,
// cuando otro guarda (aviso al instante) y un ratito después de cada cambio propio.
const llaves = new Map(), colas = new Map(), subidas = new Map();
const llaveDe = (codigo) => { if (!llaves.has(codigo)) llaves.set(codigo, derivar(codigo)); return llaves.get(codigo); };
function sincronizarGrupo(id, avisar = false) {
  const p = (colas.get(id) || Promise.resolve()).then(() => sincroUna(id, avisar));
  colas.set(id, p.catch(() => {}));
  return p;
}
function programarSubida(id) { clearTimeout(subidas.get(id)); subidas.set(id, setTimeout(() => sincronizarGrupo(id), 700)); }
const sincronizarTodos = () => st.grupos.filter((g) => g.sync).forEach((g) => sincronizarGrupo(g.id));

async function sincroUna(id, avisar) {
  const g = st.grupos.find((x) => x.id === id);
  if (!g?.sync || navigator.onLine === false) return;
  let r;
  try { r = await sincronizar(await llaveDe(g.sync.codigo), g); }
  catch (e) {
    const error = /403/.test(e.message) ? "codigo" : "red";
    const ahora = st.grupos.find((x) => x.id === id);
    if (ahora?.sync && ahora.sync.error !== error) { ponerItem("grupos", { ...ahora, sync: { ...ahora.sync, error } }); dibujar(); }
    return;
  }
  const ahora = st.grupos.find((x) => x.id === id);
  if (!ahora?.sync || ahora.sync.codigo !== g.sync.codigo) return;
  const cambioLocal = ahora !== g; // se anotó algo mientras viajaba: se junta y se vuelve a mandar
  const f = cambioLocal ? fusionar(ahora, r.g) : r.g;
  f.sync = { codigo: ahora.sync.codigo, v: r.v, ...(cambioLocal && { pendiente: true }) };
  const n = novedades(ahora, f);
  const hayNuevo = ["gastos", "pagos", "miembros"].some((k) => n[k].nuevos || n[k].cambiados);
  if (!hayNuevo && JSON.stringify(f.sync) === JSON.stringify(ahora.sync)) return;
  guardarGrupo(f, false);
  if (cambioLocal) programarSubida(id);
  if (hayNuevo && avisar && !st.aviso) mostrarAviso("Llegó algo nuevo en «" + f.nombre + "».");
  dibujar();
}

// Mientras se mira un grupo conectado, queda escuchando: si otro anota algo, aparece solo.
let escucha = null;
function vigilar() {
  const g = !document.hidden && TAB_DE[st.pantalla] === "grupos" ? grupoActual() : null;
  const quiero = g?.sync ? g.id + "|" + g.sync.codigo : "";
  if ((escucha?.clave || "") === quiero) return;
  dejarDeEscuchar();
  if (!quiero) return;
  const gid = g.id, e = (escucha = { clave: quiero, cortar: null });
  llaveDe(g.sync.codigo).then((d) => {
    if (escucha !== e) return;
    e.cortar = escuchar(d, (v) => { const x = st.grupos.find((y) => y.id === gid); if (x?.sync && v !== x.sync.v) sincronizarGrupo(gid, true); });
  });
}
function dejarDeEscuchar() { escucha?.cortar?.(); escucha = null; }

async function conectarGrupo() {
  const g = grupoActual();
  if (!g || st.compartir.conectando) return;
  st.compartir.conectando = true; st.compartir.error = ""; dibujar();
  const codigo = nuevoCodigo();
  try {
    const r = await sincronizar(await llaveDe(codigo), g);
    guardarGrupo({ ...fusionar(grupoActual() || g, r.g), sync: { codigo, v: r.v } }, false);
    mostrarAviso("¡Listo! El grupo quedó conectado.");
  } catch { if (st.compartir) st.compartir.error = "No pude conectar el grupo. Revisá que tengas internet y probá de nuevo."; }
  if (st.compartir) st.compartir.conectando = false;
  await prepararCompartir();
  dibujar();
}

async function unirCorto(codigo) {
  st.compartir.error = ""; st.compartir.uniendo = true; dibujar();
  try {
    const r = await bajar(await llaveDe(codigo));
    if (!r) st.compartir.error = "No encontré un grupo con ese código. Revisá que esté bien escrito.";
    else { st.compartir.uniendo = false; return entrarAGrupo({ ...r.g, sync: { codigo, v: r.v } }); }
  } catch (e) {
    st.compartir.error = /403/.test(e.message) ? "Ese código no es de ningún grupo. Revisá que esté bien escrito." : "No pude conectarme. Revisá que tengas internet y probá de nuevo.";
  }
  if (st.compartir) st.compartir.uniendo = false;
  dibujar();
}

function entrarAGrupo(g) {
  const local = st.grupos.find((x) => x.id === g.id);
  if (local) {
    const f = fusionar(local, g);
    if (g.sync) f.sync = g.sync;
    st.unido = novedades(local, f);
    guardarGrupo(f);
    st.grupoId = f.id;
    irA("unido");
  } else {
    st.pendiente = g;
    st.errorQuien = ""; st.nombreNuevo = st.cfg.nombre || ""; st.aliasQuien = st.cfg.alias || "";
    // Si el grupo lo armó alguien solo, lo normal es sumarse; si ya hay más gente anotada, que elija.
    st.yoElegido = g.miembros.filter((m) => !m.x).length <= 1 ? "_otra" : "";
    irA("quien");
  }
  dibujar();
}

const invitacion = () => "Sumate al grupo «" + grupoActual().nombre + "» en MiGuita: " + st.compartir.link + "\n\nO en Grupos › Unirme con un código, poné: " + st.compartir.codigo;

function abrirGForm(tipo, id, vals) {
  st.gform = { tipo, id: id || null, vals, error: "" };
  st.confirmar = "";
  abrir("gform");
}

function formGasto(x) {
  const g = grupoActual(), vivos = g.miembros.filter((m) => !m.x);
  const j = x ? x.j : st.juntadaId || undefined;
  if (j) {
    const ju = (g.juntadas || []).find((y) => y.id === j);
    const gente = vivos.map((m) => m.id).filter((i) => !ju || ju.gente.includes(i));
    if (!x) return { j, t: "", m: "", pagan: g.yo && gente.includes(g.yo) ? [g.yo] : gente.slice(0, 1), pp: {}, a: gente, f: ju?.f || hoy };
    const pg = pagadores(x), varios = Object.keys(pg).length > 1;
    return { j, t: x.t, m: montoEnCampo(centavos(x.m)), pagan: Object.keys(pg), pp: varios ? Object.fromEntries(Object.entries(pg).map(([k, c]) => [k, montoEnCampo(c)])) : {}, a: [...x.a], f: x.f || hoy };
  }
  if (!x) return { t: "", m: "", p: g.yo && vivos.some((m) => m.id === g.yo) ? g.yo : vivos[0]?.id, a: vivos.map((m) => m.id), sp: "eq", w: {}, f: hoy };
  const w = {};
  for (const [k, val] of Object.entries(x.w || {})) w[k] = x.sp === "ex" ? montoEnCampo(centavos(val)) : String(val);
  return { t: x.t, m: montoEnCampo(centavos(x.m)), p: x.p, a: [...x.a], sp: x.sp, w, f: x.f || hoy };
}

// Devuelve un texto de error, o null si se guardó.
function guardarGForm() {
  const { tipo, id, vals: v } = st.gform;
  const g = grupoActual(), antes = g && copiaGrupo(g), ahora = Date.now();
  const deshacer = () => restaurarGrupo(antes);
  if (tipo === "grupoNuevo") {
    const nombre = v.nombre.trim();
    if (!nombre) return "Ponele un nombre al grupo.";
    const filas = v.miembros.map((m, i) => ({ nombre: m.nombre.trim() || (i ? "" : st.cfg.nombre || "Yo"), alias: m.alias })).filter((m) => m.nombre);
    if (!filas.length) return "Poné tu nombre.";
    const miembros = [];
    for (const m of filas) {
      const al = validarAlias(m.alias);
      if (!al.ok) return m.nombre + ": " + al.error;
      miembros.push({ id: nuevoId(), nombre: m.nombre.slice(0, 40), alias: al.alias, ts: ahora, x: false });
    }
    const nuevo = { id: nuevoId(), nombre: nombre.slice(0, 60), moneda: v.moneda, ts: ahora, yo: miembros[0].id, loc: false, miembros, gastos: [], pagos: [] };
    guardarGrupo(nuevo);
    st.grupoId = nuevo.id; st.grupoTab = "gastos";
    irA("grupo");
    // Como en las mejores apps de este tipo: el grupo nace conectado y lo primero es invitar.
    st.compartir = { codigo: "", svg: "", pegado: "", error: "", escaneando: false };
    abrir("compartir");
    conectarGrupo();
    return "listo";
  }
  if (tipo === "grupoEditar") {
    if (!v.nombre.trim()) return "Ponele un nombre al grupo.";
    guardarGrupo({ ...g, nombre: v.nombre.trim().slice(0, 60), moneda: v.moneda, ts: ahora });
  } else if (tipo === "gasto" && v.j) {
    const total = leerMonto(v.m);
    if (!total) return "Revisá cuánto salió: escribilo con números, por ejemplo 30.000.";
    if (!v.pagan.length) return "Elegí quién pagó.";
    if (!v.a.length) return "Elegí entre quiénes se divide.";
    let pp;
    if (v.pagan.length > 1) {
      const vacios = v.pagan.filter((i) => !String(v.pp[i] ?? "").trim());
      if (vacios.length > 1) return "Poné cuánto puso cada uno (podés dejar uno solo vacío).";
      const c = Object.fromEntries(v.pagan.filter((i) => !vacios.includes(i)).map((i) => [i, leerMonto(v.pp[i]) || 0]));
      const suma = Object.values(c).reduce((s, n) => s + n, 0);
      if (vacios.length) c[vacios[0]] = total - suma;
      if (Object.values(c).some((n) => n <= 0) || Object.values(c).reduce((s, n) => s + n, 0) !== total) return "Lo que puso cada uno suma " + V.plata(suma) + " y la compra es " + V.plata(total) + ".";
      pp = Object.fromEntries(Object.entries(c).map(([k, n]) => [k, n / 100]));
    }
    const x = { id: id || nuevoId(), t: (v.t.trim() || "Compra").slice(0, 80), m: total / 100, p: v.pagan[0], a: v.a, sp: "eq", w: {}, f: v.f || hoy, ts: ahora, x: false, por: g.yo || "", j: v.j, ...(pp && { pp }) };
    guardarGrupo({ ...g, gastos: [...g.gastos.filter((y) => y.id !== x.id), x] });
    mostrarAviso((id ? "Cambiado: " : "Sumado: ") + x.t, deshacer);
  } else if (tipo === "juntada") {
    const nombre = v.nombre.trim();
    if (!nombre) return "Ponele un nombre, por ejemplo «asado del sábado».";
    if (v.gente.length < 2) return "Marcá quiénes fueron (al menos dos).";
    const ju = { id: id || nuevoId(), nombre: nombre.slice(0, 60), f: v.f || hoy, gente: v.gente, ts: ahora, x: false };
    // Si alguien ya no figura como que fue, sale de las compras de esa juntada.
    const gastos = g.gastos.map((x) => x.j === ju.id && !x.x && x.a.some((i) => !ju.gente.includes(i)) ? { ...x, a: x.a.filter((i) => ju.gente.includes(i)), ts: ahora } : x);
    guardarGrupo({ ...g, gastos, juntadas: [...(g.juntadas || []).filter((y) => y.id !== ju.id), ju] });
    if (!id) { st.juntadaId = ju.id; st.vistoAntes = ahora; history.replaceState({ p: "juntada" }, ""); st.pantalla = "juntada"; scrollTo(0, 0); return "listo"; }
  } else if (tipo === "gasto") {
    const total = leerMonto(v.m);
    if (!total) return "Revisá el monto: escribilo con números, por ejemplo 41.200.";
    if (!v.a.length) return "Elegí entre quiénes se reparte.";
    const w = pesosDe(v);
    if (v.sp === "pc") {
      const suma = v.a.reduce((a, i) => a + (Number(w[i]) || 0), 0);
      if (Math.abs(suma - 100) > 0.01) return "Los porcentajes suman " + Math.round(suma * 100) / 100 + "%. Tienen que sumar 100.";
    }
    if (v.sp === "ex") {
      const suma = v.a.reduce((a, i) => a + centavos(w[i] || 0), 0);
      if (suma !== total) return "Los montos suman " + V.plata(suma) + " y el gasto es " + V.plata(total) + ".";
    }
    const x = { id: id || nuevoId(), t: (v.t.trim() || "Gasto").slice(0, 80), m: total / 100, p: v.p, a: v.a, sp: v.sp, w: v.sp === "eq" ? {} : w, f: v.f || hoy, ts: ahora, x: false, por: g.yo || "" };
    guardarGrupo({ ...g, gastos: [...g.gastos.filter((y) => y.id !== x.id), x] });
    mostrarAviso((id ? "Cambiado: " : "Sumado: ") + x.t, deshacer);
  } else if (tipo === "pago") {
    const c = leerMonto(v.m);
    if (!c) return "Revisá el monto: escribilo con números.";
    if (!v.de || !v.a || v.de === v.a) return "Elegí quién paga y a quién (tienen que ser personas distintas).";
    const viejo = id && g.pagos.find((y) => y.id === id);
    const p = { id: id || nuevoId(), de: v.de, a: v.a, m: c / 100, f: v.f || hoy, ts: ahora, x: false, ...(viejo?.j && { j: viejo.j }) };
    guardarGrupo({ ...g, pagos: [...g.pagos.filter((y) => y.id !== p.id), p] });
    mostrarAviso("Pago registrado", deshacer);
  } else if (tipo === "persona") {
    const nombre = v.nombre.trim();
    if (!nombre) return "Poné un nombre.";
    const al = validarAlias(v.alias);
    if (!al.ok) return al.error;
    if (!id && g.miembros.filter((m) => !m.x).length >= 50) return "Un grupo puede tener hasta 50 personas.";
    const mid = id || nuevoId();
    const m = { ...(g.miembros.find((y) => y.id === mid) || { x: false }), id: mid, nombre: nombre.slice(0, 40), alias: al.alias, ts: ahora };
    const nuevo = { ...g, miembros: [...g.miembros.filter((y) => y.id !== mid), m] };
    if (v.soyYo) nuevo.yo = mid; else if (g.yo === mid) delete nuevo.yo;
    guardarGrupo(nuevo);
  }
  return null;
}

function borrarGForm() {
  const { tipo, id } = st.gform;
  const g = grupoActual(), antes = copiaGrupo(g), ahora = Date.now();
  const lapida = (lista) => lista.map((y) => (y.id === id ? { ...y, x: true, ts: ahora } : y));
  if (tipo === "grupoEditar") {
    quitarItem("grupos", g.id);
    mostrarAviso("Borraste " + g.nombre + " de este celu.", () => ponerItem("grupos", antes));
    history.go(-2);
    return;
  }
  if (tipo === "juntada") {
    const fuera = (lista) => lista.map((y) => (y.j === id && !y.x ? { ...y, x: true, ts: ahora } : y));
    guardarGrupo({ ...g, juntadas: lapida(g.juntadas || []), gastos: fuera(g.gastos), pagos: fuera(g.pagos) });
    mostrarAviso("Juntada borrada", () => restaurarGrupo(antes));
    history.go(-2);
    return;
  }
  if (tipo === "gasto") guardarGrupo({ ...g, gastos: lapida(g.gastos) });
  else if (tipo === "pago") guardarGrupo({ ...g, pagos: lapida(g.pagos) });
  else if (tipo === "persona") guardarGrupo({ ...g, miembros: lapida(g.miembros) });
  mostrarAviso("Borrado", () => restaurarGrupo(antes));
  volver();
}

async function prepararCompartir() {
  const g = grupoActual();
  if (!g) return;
  // Conectado: código corto y un link (el QR lleva el link, así se abre directo con la cámara del celu).
  const link = g.sync ? location.origin + location.pathname + "#u=" + g.sync.codigo : "";
  const codigo = g.sync ? g.sync.codigo : await codificar(g);
  const svg = await svgQR(link || codigo).catch(() => null);
  if (st.compartir && st.pantalla === "compartir") { Object.assign(st.compartir, { codigo, svg, link }); dibujar(); }
}

function cerrarCamara() {
  apagarCamara?.();
  apagarCamara = null; videoCamara = null;
  if (st.compartir) st.compartir.escaneando = false;
}

/* ---------- dólar ---------- */
const horaAhora = () => new Date().toTimeString().slice(0, 5);
function guardarCotizacion(r) {
  ponerItem("cotizaciones", { id: hoy + "|" + st.cfg.dolar.tipo, fecha: hoy, tipo: st.cfg.dolar.tipo, valor: r.valor, fuente: r.fuente, hora: horaAhora() });
}
async function actualizarDolar(silencio) {
  const d = st.cfg.dolar;
  st.dolarCargando = true; st.dolarError = "";
  if (!silencio) dibujar();
  const r = await buscarDolar(d.tipo, d.fuente);
  st.dolarCargando = false;
  if (!r) st.dolarError = "No se pudo traer el dólar. Se usa el último valor guardado o el que cargaste a mano.";
  else {
    const anterior = valorPara(hoy, d.tipo, st.cotizaciones, 0)?.valor;
    if (necesitaConfirmar(r.valor, anterior)) st.dolarPendiente = { ...r, anterior };
    else guardarCotizacion(r);
  }
  if (!silencio || st.pantalla === "dolar") dibujar();
}

/* ---------- seguridad ---------- */
async function terminarPin(secreto) {
  const f = st.pinFlujo;
  const error = validarPin(secreto, f.modo);
  if (error) { f.error = error; f.actual = ""; return; }
  if (f.paso === 1) { f.primero = secreto; f.actual = ""; f.paso = 2; f.error = ""; return; }
  if (secreto !== f.primero) { st.pinFlujo = { modo: f.modo, paso: 1, primero: "", actual: "", error: "No coinciden. Empezá de nuevo." }; return; }
  f.error = "Cifrando tus datos…"; dibujar();
  if (st.seguridad) await base.cambiarSecreto(secreto, f.modo); else await base.activarSeguridad(secreto, f.modo);
  st.seguridad = base.seguridad;
  st.pinFlujo = null;
  st.segMsg = "Listo: tus datos quedaron cifrados. Hacé una copia de seguridad por si te olvidás.";
}

// Al volver a la app: se tapa en multitarea y se bloquea según lo elegido.
let ocultaDesde = 0;
let toques = 0, chisteTimer = 0, toquesTimer = 0;
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) {
    ocultaDesde = Date.now();
    if (st.cfg.tapar) document.body.classList.add("tapado");
    dejarDeEscuchar();
    escuchaVinculo?.cortar?.(); escuchaVinculo = null;
    if (st.seguridad?.bloqueo === "salir") await base.terminar();
    return;
  }
  document.body.classList.remove("tapado");
  const seg = st.seguridad;
  const minutos = seg ? (seg.bloqueo === "salir" ? 0 : Number(seg.bloqueo)) : Infinity;
  if (fechaLocal() !== hoy || Date.now() - ocultaDesde >= minutos * 60000) { await base.terminar(); location.reload(); return; }
  vigilar();
  sincronizarTodos();
  vigilarVinculo();
  sincronizarVinculo();
});
addEventListener("online", () => { sincronizarTodos(); sincronizarVinculo(); });
// Si la app queda abierta pasada la medianoche, se recarga con el día nuevo (salvo que esté anotando algo).
setInterval(async () => {
  if (fechaLocal() !== hoy && !st.hoja && !document.hidden) { await base.terminar(); location.reload(); }
}, 60000);

/* ---------- copias ---------- */
async function crearCopia() {
  const f = st.copiaFlujo;
  if (f.c1.length < 8) { f.error = "La contraseña tiene que tener 8 caracteres o más."; return; }
  if (f.c1 !== f.c2) { f.error = "Las dos contraseñas no coinciden."; return; }
  f.trabajando = true; f.error = ""; dibujar();
  const texto = await armarCopia(base.leerEstado(), f.c1);
  const nombre = "MiGuita-copia-" + hoy + ".miguita";
  const archivo = new File([texto], nombre, { type: "application/json" });
  ponerConfig("copias", { ...st.cfg.copias, ultima: new Date().toISOString() });
  st.copiaFlujo = { paso: "listo", nombre, archivo, url: URL.createObjectURL(archivo), compartible: !!navigator.canShare?.({ files: [archivo] }) };
}
async function leerCopia() {
  const f = st.copiaFlujo;
  if (!f.texto) { f.error = "Elegí el archivo de la copia."; return; }
  f.trabajando = true; f.error = ""; dibujar();
  try {
    const { datos, creada } = await abrirCopia(f.texto, f.c1);
    const d = migrar(datos);
    f.datos = d; f.creada = creada;
    f.resumen = { movs: d.movs.length, grupos: d.grupos.length };
  } catch (e) { f.error = e.message; }
  f.trabajando = false;
}

/* ---------- navegación (el botón "atrás" del celu también funciona) ---------- */
function abrir(p) {
  history.pushState({ p }, "");
  st.pantalla = p;
  st.confirmar = "";
  scrollTo(0, 0);
}
function volver() {
  if (history.state?.p === st.pantalla && TAB_DE[st.pantalla]) history.back();
  else { st.pantalla = TAB_DE[st.pantalla] || "inicio"; dibujar(); }
}
function abrirHoja(datos) {
  history.pushState({ p: st.pantalla, hoja: 1 }, "");
  st.confirmar = "";
  st.hoja = {
    modo: "nuevo", id: null, tipo: "gasto", expr: "", tocada: true, centavos: 0,
    categoria: "super", medio: "", fecha: hoy, detalle: "", error: "", moneda: "ARS", ...datos,
  };
  dibujar();
  raiz.querySelector(".sheet [data-act=tecla]")?.focus();
}
function cerrarHoja() {
  if (history.state?.hoja) history.back();
  else { st.hoja = null; dibujar(); }
}
addEventListener("popstate", (e) => {
  if (st.hoja) st.hoja = null;
  else if (st.festejo) st.festejo = null;
  else st.pantalla = e.state?.p || "inicio";
  st.confirmar = "";
  dibujar();
});
history.replaceState({ p: "inicio" }, "");

/* ---------- dibujar ---------- */
function proximamente(titulo, etapa, dibujo) {
  return `<div class="top"><div><small>Muy pronto</small><h1>${titulo}</h1></div></div>` +
    `<div class="soon">${dibujo}<b>Se está horneando</b><span>Esta parte llega en la etapa ${etapa}.</span></div>`;
}

function dibujar() {
  document.body.className = st.cfg.tema + (st.cfg.movimiento ? " motion" : "");
  document.querySelector('meta[name="theme-color"]').content = st.cfg.tema === "dark" ? "#33211A" : "#E2C9A0";
  const P = {
    ...V,
    grupos: () => proximamente("Grupos", 4, Art.factura("fact")),
    plan: VP.plan,
    form: VP.formulario,
    grupos: VG.lista,
    grupo: VG.unGrupo,
    juntada: VG.juntada,
    gform: VG.formulario,
    compartir: VG.compartir,
    unido: VG.unido,
    quien: VG.quien,
    whatsapp: VG.whatsapp,
    notif: VA.notif,
    seguridad: VA.seguridad,
    dolar: VA.dolar,
    copias: VA.copias,
    dispositivos: VA.dispositivos,
    bienvenida: VI.bienvenida,
    primerIngreso: VI.primerIngreso,
    instalar: VI.instalar,
    tutorial: VI.tutorial,
    importar: importarVista,
  };
  if (st.pantalla !== "compartir" && apagarCamara) cerrarCamara();
  vigilar();
  const tab = TAB_DE[st.pantalla] || st.pantalla;
  const foco = document.activeElement?.dataset?.act;
  const enCampo = foco && /^(buscar|nombre|catNombre|catClaves|detalle|campo|gcampo|gPersona|gPeso|gPP|nombreNuevo|aliasQuien|miAlias)$/.test(foco) ? { act: foco, k: document.activeElement.dataset.k, i: document.activeElement.dataset.i, pos: document.activeElement.selectionStart } : null;
  raiz.innerHTML = `<main class="scr" id="pantalla">` +
    (st.versionNueva ? `<div class="snack pp nueva" role="status"><span>Hay una versión nueva de MiGuita</span><button class="btnmini" data-act="actualizarApp">Actualizar</button></div>` : "") +
    `${P[st.pantalla]()}</main>` +
    (SIN_BARRA.includes(st.pantalla) ? "" : `<nav class="nav" aria-label="Secciones">` + PESTANAS.map(([k, t]) =>
      `<button data-act="ir" data-v="${k}"${k === tab ? ' aria-current="page"' : ""}>${Art.navIcon(k)}${t}</button>`).join("") + "</nav>") +
    (st.hoja ? V.hoja() : "") +
    (st.festejo ? V.festejo(st.festejo) : "") +
    (st.metaOk ? VP.metaLograda(st.metaOk) : "") +
    (st.aviso && !st.hoja ? `<div class="snack pp" role="status"><span>${esc(st.aviso.texto)}</span>${st.aviso.deshacer ? `<button class="btnmini" data-act="deshacer">Deshacer</button>` : ""}</div>` : "");
  raiz.querySelectorAll(".pp").forEach((e) => e.style.setProperty("--dl", (-Math.random() * 2.5).toFixed(2) + "s"));
  // La cámara sigue andando aunque se redibuje la pantalla.
  if (videoCamara) raiz.querySelector("video.cam")?.replaceWith(videoCamara);
  if (enCampo) {
    const el = raiz.querySelector(`[data-act="${enCampo.act}"]${enCampo.k ? `[data-k="${CSS.escape(enCampo.k)}"]` : ""}${enCampo.i ? `[data-i="${enCampo.i}"]` : ""}`);
    if (el) { el.focus(); try { el.setSelectionRange(enCampo.pos, enCampo.pos); } catch { /* fecha */ } }
  }
  ponerSiguiente();
}

// Teclado del celu: "Siguiente" pasa al próximo campo de la pantalla y en el último dice "Listo" y lo cierra.
// (Los formularios con botón propio, como Anotar o el PIN, se mandan con Enter como siempre.)
function camposDeTexto() {
  return [...raiz.querySelectorAll("input, textarea")].filter((el) => !el.disabled && !el.readOnly && !el.closest("form") &&
    !["hidden", "file", "checkbox", "radio", "date", "range"].includes(el.type) && el.offsetParent !== null);
}
function ponerSiguiente() {
  const cs = camposDeTexto();
  cs.forEach((el, i) => { if (el.tagName === "INPUT") el.enterKeyHint = i < cs.length - 1 ? "next" : "done"; });
}
raiz.addEventListener("keydown", (e) => {
  if (e.key !== "Enter" || e.target.tagName !== "INPUT" || e.target.closest("form") || e.isComposing) return;
  const cs = camposDeTexto(), i = cs.indexOf(e.target);
  if (i < 0) return;
  e.preventDefault();
  if (cs[i + 1]) cs[i + 1].focus(); else e.target.blur();
});

/* ---------- eventos ---------- */
raiz.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (e.target.dataset.form === "pinClave") {
    await terminarPin(raiz.querySelector("#pinClave").value);
    return dibujar();
  }
  const txt = raiz.querySelector("#rapido").value.trim();
  if (!txt) return abrirHoja();
  const p = leerTexto(txt, st.cfg.categorias);
  if (!p) {
    st.error = "No encontré el monto. Probá con «" + (txt.replace(/\d/g, "").trim().slice(0, 20) || "nafta") + " 20000».";
    dibujar();
    raiz.querySelector("#rapido").value = txt;
    raiz.querySelector("#rapido").focus();
    return;
  }
  st.error = "";
  anotar({ id: nuevoId(), ...p, medio: "", fecha: hoy, ts: Date.now(), mod: Date.now() });
  dibujar();
});

function itemCat() {
  const { tipo, id } = st.editCat;
  return tipo === "medios" ? st.cfg.medios.find((m) => m.id === id) : st.cfg.categorias[tipo].find((c) => c.id === id);
}
function guardarCats() {
  const k = st.editCat.tipo === "medios" ? "medios" : "categorias";
  ponerConfig(k, st.cfg[k]);
}

raiz.addEventListener("click", (e) => {
  if (e.target.type === "date") { try { e.target.showPicker(); } catch { /* el navegador lo abre solo */ } return; }
  const b = e.target.closest("[data-act]");
  if (!b || b.tagName === "INPUT" || b.tagName === "SELECT") return;
  const act = b.dataset.act, v = b.dataset.v;
  const s = st.hoja;
  if (!["borrarMov", "borrarTodo", "borrarPlan", "borrarG", "quitarPin", "aplicarCopia", "desconectarGrupo", "desconectarVinculo"].includes(act)) st.confirmar = "";
  switch (act) {
    case "ir": history.replaceState({ p: v }, ""); st.pantalla = v; st.error = ""; scrollTo(0, 0); break;
    case "abrir": if (v === "tutorial") { st.tutorialPaso = 0; st.tutorialDesde = ""; } abrir(v); if (v === "dispositivos") prepararVinculo(); break;
    case "volver": return volver();
    case "mes": st.mes = cambiarMes(st.mes, +v); break;
    case "ocultar": ponerConfig("ocultar", !st.cfg.ocultar); break;
    case "tema": ponerConfig("tema", v); break;
    case "movimiento": ponerConfig("movimiento", !st.cfg.movimiento); break;
    case "deshacer": st.aviso?.deshacer?.(); st.aviso = null; clearTimeout(timerAviso); break;
    case "nuevo": return abrirHoja();
    case "luego": st.avisoLuego = Date.now() + 3600e3; break;
    case "noGaste": {
      const antes = infoRacha(st.movs, st.dias, hoy);
      ponerDia({ fecha: hoy, sinGasto: true });
      mostrarAviso("Listo: hoy cuenta para tu racha.");
      revisarFestejo(antes);
      break;
    }
    case "cerrarFestejo": st.festejo = null; st.metaOk = null; break;
    case "editar": {
      const x = st.movs.find((m) => m.id === v);
      if (!x) break;
      const m = x.usd ? x.usd.monto : x.monto;
      return abrirHoja({ modo: "editar", id: x.id, tipo: x.tipo, moneda: x.usd ? "USD" : "ARS", expr: m % 100 ? "" : String(m / 100), tocada: false, centavos: m, categoria: x.categoria, medio: x.medio, fecha: x.fecha, detalle: x.detalle });
    }
    case "filtro": st.filtro.tipo = v; break;
    case "quitarEjemplo":
      st.movs.filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarMov(x.id));
      PLAN.forEach((l) => st[l].filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarItem(l, x.id)));
      st.movs.filter((x) => x.id.startsWith("gx_ej_")).forEach((x) => quitarMov(x.id));
      st.grupos.filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarItem("grupos", x.id));
      mostrarAviso("Listo, quedó vacío para que empieces con lo tuyo."); break;
    case "ponerEjemplo": cargarEjemplo(); st.mes = hoy.slice(0, 7); break;
    case "borrarTodo":
      if (st.confirmar !== "todo") { st.confirmar = "todo"; break; }
      st.confirmar = "";
      if (st.cfg.vinculo) { escuchaVinculo?.cortar?.(); escuchaVinculo = null; ponerConfig("vinculo", null); }
      [...st.movs].forEach((x) => quitarMov(x.id));
      [...st.dias].forEach((d) => base.quitar("dias", d.fecha));
      st.dias = [];
      PLAN.forEach((l) => [...st[l]].forEach((x) => quitarItem(l, x.id)));
      [...st.grupos].forEach((x) => quitarItem("grupos", x.id));
      mostrarAviso("Se borró todo lo anotado en este celu."); break;
    /* Grupos */
    case "abrirGrupo": st.grupoId = v; st.grupoTab = "gastos"; abrir("grupo"); break;
    case "grupoTab": st.grupoTab = v; break;
    case "nuevoGrupo":
      abrirGForm("grupoNuevo", null, { nombre: "", moneda: "ARS", miembros: [{ nombre: st.cfg.nombre || "", alias: st.cfg.alias || "" }, { nombre: "", alias: "" }] }); break;
    case "sumarFila": if (st.gform.vals.miembros.length < 50) st.gform.vals.miembros.push({ nombre: "", alias: "" }); break;
    case "quitarFila": st.gform.vals.miembros.splice(+v, 1); break;
    case "editarGrupo": { const g = grupoActual(); abrirGForm("grupoEditar", g.id, { nombre: g.nombre, moneda: g.moneda }); break; }
    case "sumarGastoG": abrirGForm("gasto", null, formGasto()); break;
    case "nuevaJuntada": {
      const g = grupoActual();
      abrirGForm("juntada", null, { nombre: "", f: hoy, gente: g.miembros.filter((m) => !m.x).map((m) => m.id), otro: "" }); break;
    }
    case "editarJuntada": {
      const ju = grupoActual().juntadas.find((x) => x.id === st.juntadaId);
      abrirGForm("juntada", ju.id, { nombre: ju.nombre, f: ju.f || hoy, gente: [...ju.gente], otro: "" }); break;
    }
    case "abrirJuntada":
      st.juntadaId = v; st.vistoAntes = st.cfg.vistos?.[grupoActual().id + "|" + v] || 0;
      marcarVisto(); abrir("juntada"); break;
    case "gGente": { const x = st.gform.vals.gente; st.gform.vals.gente = x.includes(v) ? x.filter((i) => i !== v) : [...x, v]; st.gform.error = ""; break; }
    case "gSumarOtro": {
      const g = grupoActual(), nombre = (st.gform.vals.otro || "").trim().slice(0, 40);
      if (!nombre) break;
      if (g.miembros.filter((m) => !m.x).length >= 50) { st.gform.error = "Un grupo puede tener hasta 50 personas."; break; }
      const m = { id: nuevoId(), nombre, alias: "", ts: Date.now(), x: false };
      guardarGrupo({ ...g, miembros: [...g.miembros, m] });
      st.gform.vals.gente = [...st.gform.vals.gente, m.id]; st.gform.vals.otro = "";
      mostrarAviso(nombre + " se sumó al grupo."); break;
    }
    case "gPaga": { const x = st.gform.vals.pagan; st.gform.vals.pagan = x.includes(v) ? x.filter((i) => i !== v) : [...x, v]; st.gform.error = ""; break; }
    case "celda": case "columna": {
      const g = grupoActual(), [gid, pid] = v.split("|"), x = g.gastos.find((y) => y.id === gid);
      if (!x) break;
      let a;
      if (act === "celda") a = x.a.includes(pid) ? x.a.filter((i) => i !== pid) : [...x.a, pid];
      else {
        const ju = (g.juntadas || []).find((y) => y.id === x.j), gente = g.miembros.filter((m) => !m.x && (!ju || ju.gente.includes(m.id))).map((m) => m.id);
        a = gente.every((i) => x.a.includes(i)) ? [] : gente;
      }
      guardarGrupo({ ...g, gastos: g.gastos.map((y) => (y.id === gid ? { ...y, a, ts: Date.now() } : y)) });
      marcarVisto(); break;
    }
    case "yaPague": {
      const g = grupoActual(), antes = copiaGrupo(g), [de, a, m] = v.split("|");
      const nombre = (i) => (i === g.yo ? "Vos" : g.miembros.find((y) => y.id === i)?.nombre || "?");
      const p = { id: nuevoId(), de, a, m: +m / 100, f: hoy, ts: Date.now(), x: false, ...(st.juntadaId && { j: st.juntadaId }) };
      guardarGrupo({ ...g, pagos: [...g.pagos, p] });
      marcarVisto();
      mostrarAviso("Anotado: " + nombre(de) + " le pasó " + V.plata(+m) + " a " + nombre(a) + ".", () => restaurarGrupo(antes)); break;
    }
    case "tocarMiguita": {
      // Easter egg: cada toque, un chiste; tocándola muchas veces seguidas salen los especiales.
      clearTimeout(chisteTimer); clearTimeout(toquesTimer);
      toques++;
      let texto = ESPECIALES[toques];
      if (!texto) { let i; do i = Math.floor(Math.random() * CHISTES.length); while (CHISTES.length > 1 && CHISTES[i] === st.chiste?.texto); texto = CHISTES[i]; }
      st.chiste = { n: toques, texto, giro: !!ESPECIALES[toques] };
      chisteTimer = setTimeout(() => { st.chiste = null; if (st.pantalla === "inicio") dibujar(); }, 4500);
      toquesTimer = setTimeout(() => { toques = 0; }, 20000);
      break;
    }
    case "crearVinculo": crearVinculo(); return;
    case "unirVinculo": unirVinculo(); return;
    case "verCodigoVinculo": st.vinc.verCodigo = !st.vinc.verCodigo; break;
    case "copiarCodigoVinculo": copiar(st.cfg.vinculo.codigo); mostrarAviso("Código copiado. Pegalo solo en tus dispositivos."); break;
    case "desconectarVinculo": {
      if (st.confirmar !== "vinculo") { st.confirmar = "vinculo"; break; }
      st.confirmar = "";
      escuchaVinculo?.cortar?.(); escuchaVinculo = null;
      ponerConfig("vinculo", null);
      mostrarAviso("Listo: este dispositivo ya no se actualiza con los otros. Tus datos quedan acá.");
      break;
    }
    case "copiarAlias": copiar(v); mostrarAviso("Alias copiado. Pegalo en Mercado Pago."); break;
    case "whatsJuntada": st.whatsJ = st.juntadaId ?? ""; abrir("whatsapp"); break;
    case "editarGastoG": abrirGForm("gasto", v, formGasto(grupoActual().gastos.find((x) => x.id === v))); break;
    case "gEntre": { const a = st.gform.vals.a; st.gform.vals.a = a.includes(v) ? a.filter((i) => i !== v) : [...a, v]; st.gform.error = ""; break; }
    case "gSel": st.gform.vals[b.dataset.k] = v; st.gform.error = ""; break;
    case "registrarPagoG": {
      const g = grupoActual(), vivos = g.miembros.filter((m) => !m.x);
      const [de, a, m] = v ? v.split("|") : [g.yo || vivos[0]?.id, (vivos.find((x) => x.id !== (g.yo || vivos[0]?.id)) || {}).id, ""];
      abrirGForm("pago", null, { de, a, m: m ? montoEnCampo(+m) : "", f: hoy }); break;
    }
    case "editarPagoG": { const p = grupoActual().pagos.find((x) => x.id === v); abrirGForm("pago", v, { de: p.de, a: p.a, m: montoEnCampo(centavos(p.m)), f: p.f || hoy }); break; }
    case "editarPersona": { const g = grupoActual(), m = g.miembros.find((x) => x.id === v); abrirGForm("persona", v, { nombre: m.nombre, alias: m.alias || "", soyYo: g.yo === v }); break; }
    case "nuevaPersona": abrirGForm("persona", null, { nombre: "", alias: "", soyYo: false }); break;
    case "gSoyYo": st.gform.vals.soyYo = !st.gform.vals.soyYo; break;
    case "grupoLoc": {
      const g = grupoActual();
      guardarGrupo({ ...g, loc: !g.loc });
      mostrarAviso(g.loc ? "Tu parte ya no se suma a tus gastos." : "Tu parte de cada gasto se suma a tus gastos.");
      break;
    }
    case "guardarG": {
      const error = guardarGForm();
      if (!error || error === "listo") marcarVisto();
      if (error === "listo") break;
      if (error) { st.gform.error = error; break; }
      return volver();
    }
    case "borrarG":
      if (st.confirmar !== "g") { st.confirmar = "g"; break; }
      st.confirmar = "";
      return borrarGForm();
    case "abrirCompartir":
      st.compartir = { codigo: "", svg: "", pegado: "", error: "", escaneando: false };
      abrir("compartir"); prepararCompartir(); break;
    case "unirme":
      st.grupoId = null;
      st.compartir = { codigo: "", svg: "", pegado: "", error: "", escaneando: false };
      abrir("compartir"); break;
    case "copiarCodigo": if (st.compartir.codigo) { copiar(st.compartir.codigo); mostrarAviso(st.compartir.link ? "Código copiado." : "Código copiado. Pegalo en WhatsApp."); } break;
    case "copiarLink": if (st.compartir.link) { copiar(invitacion()); mostrarAviso("Invitación copiada. Pegala en WhatsApp."); } break;
    case "conectarGrupo": conectarGrupo(); return;
    case "desconectarGrupo": {
      if (st.confirmar !== "desconectar") { st.confirmar = "desconectar"; break; }
      st.confirmar = "";
      const { sync, ...resto } = grupoActual();
      guardarGrupo(resto, false);
      mostrarAviso("Listo: este celu ya no se actualiza con el grupo.");
      prepararCompartir(); break;
    }
    case "compartirCodigo":
      if (st.compartir.link) navigator.share({ text: invitacion() }).catch(() => {});
      else if (st.compartir.codigo) navigator.share({ text: "Sumate al grupo «" + grupoActual().nombre + "» en MiGuita. Pegá este código en Grupos, Unirme con un código:\n\n" + st.compartir.codigo }).catch(() => {});
      return;
    case "unirCodigo": cerrarCamara(); unirCodigo(st.compartir.pegado); return;
    case "escanear":
      if (st.compartir.escaneando) { cerrarCamara(); break; }
      st.compartir.escaneando = true; st.compartir.error = "";
      dibujar();
      videoCamara = raiz.querySelector("video.cam");
      escanear(videoCamara, (texto) => { cerrarCamara(); unirCodigo(texto); })
        .then((f) => { if (st.compartir?.escaneando) apagarCamara = f; else f(); })
        .catch(() => { cerrarCamara(); st.compartir.error = "No pude abrir la cámara. Revisá el permiso o pegá el código."; dibujar(); });
      return;
    case "abrirWhatsApp": st.whatsJ = undefined; abrir("whatsapp"); break;
    case "copiarResumen": {
      const t = raiz.querySelector(".wa")?.textContent || "";
      copiar(t); mostrarAviso("Resumen copiado"); break;
    }
    case "monedaHoja": s.moneda = v; break;
    /* avisos */
    case "notifCant": st.cfg.notif.cantidad = +v; ponerConfig("notif", st.cfg.notif); break;
    case "notifForma": st.cfg.notif.forma = v; ponerConfig("notif", st.cfg.notif); break;
    case "notifTipo": st.cfg.notif.tipos[v] = !st.cfg.notif.tipos[v]; ponerConfig("notif", st.cfg.notif); break;
    case "notifNM": st.cfg.notif.noMolestar.activo = !st.cfg.notif.noMolestar.activo; ponerConfig("notif", st.cfg.notif); break;
    case "probarAviso":
      if (!("Notification" in globalThis)) { mostrarAviso("Este navegador no permite avisos."); break; }
      Notification.requestPermission().then(async (p) => {
        if (p !== "granted") { mostrarAviso("Sin permiso para avisar. Mirá abajo cómo activarlo."); return dibujar(); }
        const reg = await navigator.serviceWorker?.ready;
        if (!reg) { new Notification("MiGuita", { body: "¿Anotaste tus gastos de hoy?" }); return; }
        reg.showNotification("MiGuita", { body: "¿Anotaste tus gastos de hoy?", tag: "prueba", silent: st.cfg.notif.forma === "silencio", data: { url: "./#anotar" },
          actions: [{ action: "anotar", title: "Anotar" }, { action: "luego", title: "Más tarde" }] });
        dibujar();
      });
      return;
    /* seguridad */
    case "ponerPin":
      st.pinFlujo = { modo: v, paso: 1, primero: "", actual: "", error: "" }; st.segMsg = "";
      if (st.pantalla !== "seguridad") abrir("seguridad");
      break;
    case "cancelarPin": st.pinFlujo = null; break;
    case "pinNuevo": {
      const f = st.pinFlujo;
      if (v === "OK") { terminarPin(f.actual).then(dibujar); return; }
      if (v === "⌫") f.actual = f.actual.slice(0, -1); else if (f.actual.length < 6) f.actual += v;
      f.error = ""; break;
    }
    case "quitarPin":
      if (st.confirmar !== "pin") { st.confirmar = "pin"; break; }
      st.confirmar = "";
      base.quitarSeguridad().then(() => { st.seguridad = null; st.segMsg = "Se quitó el PIN: los datos ya no están cifrados."; dibujar(); });
      return;
    case "huella":
      if (st.seguridad.huella) { base.ajustarSeguridad({ huella: null }).then(dibujar); return; }
      registrarHuella().then((h) => base.guardarHuella(h.credencial, h.sal, h.secreto)).then(() => { st.segMsg = "Listo: podés abrir con la huella o la cara."; dibujar(); })
        .catch((e) => { st.segMsg = /PRF/.test(e.message) ? "Tu celu no permite abrir los datos cifrados con la huella. Seguís usando el PIN." : "No se pudo activar la huella."; dibujar(); });
      return;
    case "bloqueo": base.ajustarSeguridad({ bloqueo: v }).then(dibujar); return;
    case "borrar10": base.ajustarSeguridad({ borrarTras10: !st.seguridad.borrarTras10 }).then(dibujar); return;
    case "tapar": ponerConfig("tapar", !st.cfg.tapar); break;
    /* dólar */
    case "actualizarDolar": actualizarDolar(false); return;
    case "confirmarDolar": guardarCotizacion(st.dolarPendiente); st.dolarPendiente = null; break;
    case "descartarDolar": st.dolarPendiente = null; break;
    case "dolarTipo": st.cfg.dolar.tipo = v; ponerConfig("dolar", st.cfg.dolar); if (tocaActualizar(st.cfg.dolar, st.cotizaciones, hoy, "23:59")) { actualizarDolar(false); return; } break;
    case "dolarFuente": st.cfg.dolar.fuente = v; ponerConfig("dolar", st.cfg.dolar); break;
    case "dolarConv": st.cfg.dolar.conversion = v; ponerConfig("dolar", st.cfg.dolar); break;
    /* copias */
    case "copiaAuto": ponerConfig("copias", { ...st.cfg.copias, auto: !st.cfg.copias.auto }); break;
    case "copiaCada": ponerConfig("copias", { ...st.cfg.copias, cada: v }); break;
    case "posponerCopia": ponerConfig("copias", { ...st.cfg.copias, pospuesta: new Date().toISOString() }); break;
    /* importar el resumen de una billetera o banco */
    case "impSolo": st.imp.soloGastos = v === "si"; break;
    case "impTransf": st.imp.sinTransf = v === "sacar"; break;
    case "impMedio": st.imp.medio = v; st.imp.movs.forEach((m) => (m.medio = v)); break;
    case "impElegir": if (st.imp.elegidos.has(v)) st.imp.elegidos.delete(v); else st.imp.elegidos.add(v); break;
    case "impOtro": st.imp = { ...st.imp, movs: [], elegidos: new Set(), error: "" }; break;
    case "impAnotar": {
      const lista = st.imp.movs.filter((m) => st.imp.elegidos.has(m.id) && (!st.imp.soloGastos || m.tipo === "gasto") && (!st.imp.sinTransf || !m.transferencia));
      lista.forEach((m) => guardarMov({ ...m, medio: st.imp.medio }));
      mostrarAviso("Anotaste " + lista.length + (lista.length === 1 ? " movimiento" : " movimientos") + " del resumen.", () => lista.forEach((m) => quitarMov(m.id)));
      st.imp = { ...st.imp, movs: [], elegidos: new Set(), error: "" };
      if (lista.length) st.mes = lista[0].fecha.slice(0, 7);
      return volver();
    }
    case "exportarExcel": {
      const nombre = "MiGuita-movimientos-" + hoy + ".csv";
      const archivo = new File([movimientosCSV(st.movs, V.nombreCat, V.nombreMedio)], nombre, { type: "text/csv" });
      st.exportado = { nombre, archivo, url: URL.createObjectURL(archivo), compartible: !!navigator.canShare?.({ files: [archivo] }) };
      break;
    }
    case "compartirExcel": navigator.share({ files: [st.exportado.archivo], title: "Mis movimientos de MiGuita" }).catch(() => {}); return;
    case "hacerCopia": st.copiaFlujo = { paso: "crear", c1: "", c2: "", error: "" }; break;
    case "crearCopia": crearCopia().then(dibujar); return;
    case "compartirCopia": navigator.share({ files: [st.copiaFlujo.archivo], title: "Copia de MiGuita" }).catch(() => {}); return;
    case "restaurarCopia": st.copiaFlujo = { paso: "restaurar", c1: "", texto: "", error: "" }; break;
    case "abrirCopia": leerCopia().then(dibujar); return;
    case "aplicarCopia":
      if (st.confirmar !== "copia") { st.confirmar = "copia"; break; }
      base.reemplazarTodo(st.copiaFlujo.datos).then(() => location.reload());
      return;
    case "cancelarCopia": if (st.copiaFlujo?.url) URL.revokeObjectURL(st.copiaFlujo.url); st.copiaFlujo = null; break;
    /* primera vez */
    case "yaUsoMiguita":
      // Dispositivo nuevo de alguien que ya usa la app: directo a poner el código.
      ponerConfig("primeraVez", hoy); ponerConfig("tutorialVisto", true);
      irA("inicio"); st.vinc = { pegado: st.vinc?.pegado || "", error: "", trabajando: false, verCodigo: false }; abrir("dispositivos"); break;
    case "empezar": st.tutorialPaso = 0; st.tutorialDesde = "primerIngreso"; irA("tutorial"); break;
    case "tutorialPaso": st.tutorialPaso = +v; break;
    case "saltarTutorial":
      ponerConfig("tutorialVisto", true);
      if (st.tutorialDesde) { irA(st.tutorialDesde); st.tutorialDesde = ""; break; }
      return volver();
    case "conEjemplo": ponerConfig("primeraVez", hoy); cargarEjemplo(); irA("inicio"); break;
    case "primeraMoneda": st.primera.moneda = v; break;
    case "primeraSaltar": case "primeraSeguir": {
      const pr = st.primera;
      if (act === "primeraSeguir" && pr.monto.trim()) {
        const c = leerMonto(pr.monto);
        if (!c) { pr.error = "Escribilo con números, por ejemplo 620.000."; break; }
        const mov = { id: nuevoId(), tipo: "ingreso", monto: c, detalle: "Ingreso del mes", categoria: "sueldo", medio: "", fecha: hoy, ts: Date.now(), mod: Date.now() };
        if (pr.moneda === "USD") {
          const d = st.cfg.dolar, cot = valorPara(hoy, d.tipo, st.cotizaciones, d.manual);
          if (!cot) { pr.error = "Todavía no tengo el valor del dólar. Cargalo en pesos o probá en un rato."; break; }
          mov.monto = aPesos(c, cot.valor);
          mov.usd = { monto: c, valor: cot.valor, fecha: cot.fecha, tipo: d.tipo, fuente: cot.fuente, estimado: cot.estimado };
        }
        guardarMov(mov);
      }
      if (pr.nombre.trim()) ponerConfig("nombre", pr.nombre.trim().slice(0, 30));
      ponerConfig("primeraVez", hoy);
      st.desdePrimera = !instalada();
      irA(st.desdePrimera ? "instalar" : "inicio");
      break;
    }
    case "actualizarApp": base.terminar().then(() => st.versionNueva.postMessage({ tipo: "actualizar" })); return;
    case "instalarYa":
      if (!pedidoInstalar) break;
      pedidoInstalar.prompt();
      pedidoInstalar.userChoice.then((r) => { if (r.outcome === "accepted") { pedidoInstalar = null; st.puedeInstalar = false; } dibujar(); });
      return;
    case "listoInstalar": if (st.desdePrimera) { st.desdePrimera = false; irA("inicio"); break; } return volver();
    case "verGrupo": st.grupoTab = "gastos"; irA("grupo"); break;
    case "elegirYo":
      st.yoElegido = v; st.errorQuien = "";
      st.nombreNuevo = v === "_otra" ? st.cfg.nombre || "" : st.pendiente.miembros.find((m) => m.id === v)?.nombre || "";
      break;
    case "listoQuien": {
      let g = structuredClone(st.pendiente);
      if (!st.yoElegido) { st.errorQuien = "Elegí quién sos."; break; }
      const al = validarAlias(st.aliasQuien);
      if (!al.ok) { st.errorQuien = al.error; break; }
      // El alias que pone acá queda como "Mi alias para cobrar" si todavía no tenía uno.
      if (al.alias && !st.cfg.alias) ponerConfig("alias", al.alias);
      if (st.yoElegido === "_otra") {
        const nombre = st.nombreNuevo.trim();
        if (!nombre) { st.errorQuien = "Poné tu nombre."; break; }
        const m = { id: nuevoId(), nombre: nombre.slice(0, 40), alias: al.alias, ts: Date.now(), x: false };
        g.miembros.push(m); g.yo = m.id;
      } else {
        g.yo = st.yoElegido; g = conMiAlias(g, al.alias);
        // Si corrigió su nombre, queda el que puso él.
        const nombre = st.nombreNuevo.trim().slice(0, 40);
        if (nombre && nombre !== g.miembros.find((m) => m.id === g.yo)?.nombre)
          g = { ...g, miembros: g.miembros.map((m) => (m.id === g.yo ? { ...m, nombre, ts: Date.now() } : m)) };
      }
      g.loc = false;
      if (!st.cfg.nombre && st.nombreNuevo.trim()) ponerConfig("nombre", st.nombreNuevo.trim().slice(0, 30));
      guardarGrupo(g);
      st.pendiente = null; st.grupoId = g.id; st.grupoTab = "gastos";
      mostrarAviso("Te sumaste a " + g.nombre + ".");
      irA("grupo"); break;
    }
    /* Plan */
    case "planTab": st.planTab = v; break;
    case "verPlan": st.planTab = v; history.replaceState({ p: "plan" }, ""); st.pantalla = "plan"; scrollTo(0, 0); break;
    case "nuevoPlan": abrirForm(v); break;
    case "editarPlan": abrirForm(FORM_DE_TAB[st.planTab], v); break;
    case "sumarAhorro": abrirForm("ahorro", v); break;
    case "pagarDeuda": abrirForm("pago", v); break;
    case "verSaldadas": st.verSaldadas = !st.verSaldadas; break;
    case "fijoActivo": {
      const f = st.fijos.find((x) => x.id === v);
      ponerItem("fijos", { ...f, activo: !f.activo, desde: f.activo ? f.desde : mesDeInicio(f.dia, hoy) });
      revisarFijos();
      break;
    }
    case "formSel":
      st.form.vals[b.dataset.k] = v; st.form.error = "";
      // Al pasar de gasto a ingreso, la categoría tiene que ser del tipo correcto.
      if (st.form.tipo === "fijo" && b.dataset.k === "tipo") st.form.vals.categoria = v === "ingreso" ? "sueldo" : "servicios";
      break;
    case "confirmarFijo": case "saltearFijo": {
      const f = st.fijos.find((x) => x.id === v), mes = hoy.slice(0, 7);
      if (!f) break;
      if (act === "confirmarFijo") {
        const mov = movimientoDeFijo(f, mes, cotizar);
        if (!mov) { mostrarAviso("Falta el valor del dólar para anotarlo. Cargalo en Más › Dólar."); break; }
        if (!st.movs.some((x) => x.id === mov.id)) guardarMov(mov);
        mostrarAviso((f.tipo === "ingreso" ? "Anotado: cobraste " : "Anotado: pagaste ") + f.nombre + " " + V.plata(mov.monto), () => { quitarMov(mov.id); ponerItem("fijos", f); });
      } else mostrarAviso("Listo, este mes no se anota " + f.nombre + ".", () => ponerItem("fijos", f));
      ponerItem("fijos", { ...f, hechos: [...(f.hechos || []), mes].slice(-24) });
      break;
    }
    case "cambiarFijo": {
      // Confirmar con otro monto: se abre la hoja de anotar con los datos del fijo.
      const f = st.fijos.find((x) => x.id === v), mov = movimientoDeFijo({ ...f, moneda: "ARS" }, hoy.slice(0, 7));
      ponerItem("fijos", { ...f, hechos: [...(f.hechos || []), hoy.slice(0, 7)].slice(-24) });
      return abrirHoja({ tipo: mov.tipo, moneda: f.moneda === "USD" ? "USD" : "ARS", expr: f.monto % 100 ? "" : String(f.monto / 100), tocada: false, centavos: f.monto, categoria: mov.categoria, medio: mov.medio, fecha: mov.fecha, detalle: f.nombre });
    }
    case "formSwitch": st.form.vals[v] = !st.form.vals[v]; break;
    case "guardarPlan": {
      const error = guardarForm();
      if (error) { st.form.error = error; break; }
      return volver();
    }
    case "borrarPlan":
      if (st.confirmar !== "plan") { st.confirmar = "plan"; break; }
      st.confirmar = "";
      borrarForm();
      return volver();
    /* categorías y medios */
    case "catTab": st.catTab = v; break;
    case "editarCat": st.editCat = { tipo: st.catTab, id: v }; abrir("editarCat"); break;
    case "agregarCat": {
      const id = "c_" + nuevoId().slice(0, 8);
      if (st.catTab === "medios") { st.cfg.medios.push({ id, nombre: "Nuevo medio", oculto: false }); ponerConfig("medios", st.cfg.medios); }
      else {
        const lista = st.cfg.categorias[st.catTab];
        lista.splice(lista.findIndex((c) => c.id === RESPALDO[st.catTab]), 0, { id, nombre: "Nueva categoría", claves: [], oculta: false });
        ponerConfig("categorias", st.cfg.categorias);
      }
      st.editCat = { tipo: st.catTab, id };
      abrir("editarCat");
      dibujar();
      raiz.querySelector('[data-act="catNombre"]')?.select();
      return;
    }
    case "catOcultar": {
      const c = itemCat();
      if (st.editCat.tipo === "medios") c.oculto = !c.oculto; else c.oculta = !c.oculta;
      guardarCats(); break;
    }
    /* hoja de anotar */
    case "fondo": if (e.target !== b) return; return cerrarHoja();
    case "cerrarHoja": return cerrarHoja();
    case "tipo":
      if (s.tipo !== v) { s.tipo = v; s.categoria = st.cfg.categorias[v].find((c) => !c.oculta)?.id || RESPALDO[v]; }
      if (v === "ingreso" && !s.medio) s.medio = "transferencia";
      break;
    case "cat": s.categoria = v; break;
    case "medio": s.medio = s.medio === v ? "" : v; break;
    case "fecha": s.fecha = v; break;
    case "tecla": {
      // Al editar, un número reemplaza el monto anterior; + o − siguen desde él.
      let x = s.tocada || !/^\d$|^000$/.test(v) ? s.expr : "";
      if (v === "⌫") x = x.slice(0, -1);
      else if (v === "+" || v === "−") { if (x && !/[+−]$/.test(x)) x += v; }
      else if (x.replace(/.*[+−]/, "").length < 10) x = (x + v).replace(/(^|[+−])0+(\d)/g, "$1$2");
      s.expr = x; s.tocada = true; s.error = ""; break;
    }
    case "guardar": {
      const total = s.tocada ? evaluar(s.expr) : s.centavos;
      if (total <= 0) { s.error = "Poné un monto mayor a cero."; break; }
      const anterior = s.modo === "editar" ? st.movs.find((x) => x.id === s.id) : null;
      const mov = { id: s.id || nuevoId(), tipo: s.tipo, monto: total, detalle: s.detalle.trim(), categoria: s.categoria, medio: s.medio, fecha: s.fecha, ts: anterior?.ts || Date.now(), mod: Date.now() };
      if (s.moneda === "USD") {
        // Se guarda el monto en dólares, la cotización usada (fecha y fuente) y el monto en pesos.
        const d = st.cfg.dolar, c = valorPara(d.conversion === "hoy" ? hoy : s.fecha, d.tipo, st.cotizaciones, d.manual);
        if (!c) { s.error = "Falta el valor del dólar. Cargalo en Más › Dólar."; break; }
        mov.monto = aPesos(total, c.valor);
        mov.usd = { monto: total, valor: c.valor, fecha: c.fecha, tipo: d.tipo, fuente: c.fuente, estimado: c.estimado };
      }
      if (anterior?.id.startsWith("imp_") && anterior.categoria !== mov.categoria && mov.detalle)
        ponerConfig("aprendidas", Object.fromEntries(Object.entries({ ...(st.cfg.aprendidas || {}), [claveComercio(mov.detalle)]: mov.categoria }).slice(-500)));
      anotar(mov, anterior);
      cerrarHoja();
      break;
    }
    case "borrarMov": {
      if (st.confirmar !== "mov") { st.confirmar = "mov"; break; }
      st.confirmar = "";
      const x = st.movs.find((m) => m.id === s.id);
      quitarMov(s.id);
      mostrarAviso("Borrado: " + (x.detalle || V.nombreCat(x.categoria)), () => guardarMov(x));
      cerrarHoja();
      break;
    }
    default: return;
  }
  dibujar();
  if (["tecla", "cat", "medio", "fecha", "tipo", "filtro", "catTab", "tema", "borrarMov", "borrarTodo", "planTab", "formSel", "formSwitch", "fijoActivo", "borrarPlan", "grupoTab", "gSel", "gEntre", "gGente", "gPaga", "celda", "columna", "gSoyYo", "grupoLoc", "elegirYo", "borrarG", "monedaHoja", "notifCant", "notifForma", "notifTipo", "notifNM", "pinNuevo", "tapar", "dolarTipo", "dolarFuente", "dolarConv", "copiaAuto", "copiaCada", "quitarPin", "aplicarCopia"].includes(act))
    raiz.querySelector(`[data-act="${act}"]${b.dataset.k ? `[data-k="${CSS.escape(b.dataset.k)}"]` : ""}${v ? `[data-v="${CSS.escape(v)}"]` : ""}`)?.focus();
});

raiz.addEventListener("input", (e) => {
  const act = e.target.dataset.act, val = e.target.value;
  if (act === "detalle") st.hoja.detalle = val;
  else if (act === "buscar") { st.filtro.texto = val; dibujar(); }
  else if (act === "nombre") st.cfg.nombre = val;
  else if (act === "catNombre") itemCat().nombre = val;
  else if (act === "gcampo") { st.gform.vals[e.target.dataset.k] = val; st.gform.error = ""; dibujar(); }
  else if (act === "gPersona") st.gform.vals.miembros[+e.target.dataset.i][e.target.dataset.k] = val;
  else if (act === "gPeso") { st.gform.vals.w[e.target.dataset.k] = val; st.gform.error = ""; dibujar(); }
  else if (act === "gPP") { st.gform.vals.pp[e.target.dataset.k] = val; st.gform.error = ""; }
  else if (act === "pegado") { st.compartir.pegado = val; st.compartir.error = ""; }
  else if (act === "codigoVinculo") { st.vinc.pegado = val; st.vinc.error = ""; }
  else if (act === "nombreNuevo") st.nombreNuevo = val;
  else if (act === "aliasQuien") { st.aliasQuien = val; st.errorQuien = ""; }
  else if (act === "miAlias") { st.errorAlias = ""; }
  else if (act === "primeraNombre") st.primera.nombre = val;
  else if (act === "primeraMonto") { st.primera.monto = val; st.primera.error = ""; }
  else if (act === "copiaC1") st.copiaFlujo.c1 = val;
  else if (act === "copiaC2") st.copiaFlujo.c2 = val;
  else if (act === "campo") { st.form.vals[e.target.dataset.k] = val; st.form.error = ""; dibujar(); }
  else if (act === "catClaves") itemCat().claves = val.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 60);
});
raiz.addEventListener("change", (e) => {
  const act = e.target.dataset.act;
  if (act === "otra" && e.target.value) { st.hoja.fecha = e.target.value > hoy ? hoy : e.target.value; dibujar(); }
  else if (act === "filtroCat") { st.filtro.cat = e.target.value; dibujar(); }
  else if (act === "campoSel" || act === "campoFecha") { st.form.vals[e.target.dataset.k] = e.target.value; dibujar(); }
  else if (act === "nombre") ponerConfig("nombre", e.target.value.trim());
  else if (act === "notifHora" && e.target.value) { st.cfg.notif.horas[+e.target.dataset.i] = e.target.value; ponerConfig("notif", st.cfg.notif); }
  else if ((act === "notifDesde" || act === "notifHasta") && e.target.value) { st.cfg.notif.noMolestar[act === "notifDesde" ? "desde" : "hasta"] = e.target.value; ponerConfig("notif", st.cfg.notif); }
  else if (act === "dolarHora" && e.target.value) { st.cfg.dolar.hora = e.target.value; ponerConfig("dolar", st.cfg.dolar); }
  else if (act === "dolarManual") {
    const c = leerMonto(e.target.value);
    st.cfg.dolar.manual = c && c >= 100 && c <= 1e9 ? c : 0; ponerConfig("dolar", st.cfg.dolar); dibujar();
  } else if (act === "impArchivo") {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10e6) { st.imp.error = "Ese archivo es muy grande. Bajá el resumen de menos meses."; return dibujar(); }
    st.imp.leyendo = true; st.imp.error = ""; dibujar();
    f.arrayBuffer().then(async (buf) => {
      const u8 = new Uint8Array(buf);
      const esPDF = u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46; // "%PDF"
      const filas = esPDF ? filasDesdePDF(await textoDePDF(u8)) : u8[0] === 0x50 && u8[1] === 0x4b ? await leerXLSX(u8) : leerCSV(new TextDecoder().decode(u8));
      const movs = armarMovimientos(filas, st.cfg.categorias, st.movs, st.imp.medio, st.cfg.aprendidas || {});
      if (!movs.length && !filas.length) throw new Error("vacío");
      st.imp.movs = movs;
      st.imp.elegidos = new Set(movs.map((m) => m.id));
      if (!movs.length) st.imp.error = "No encontré movimientos nuevos en ese archivo. Si ya lo habías traído, está todo anotado.";
    }).catch(() => { st.imp.error = navigator.onLine === false ? "Para leer un PDF por primera vez hace falta internet. Probá de nuevo con conexión." : "No pude leer ese archivo. Usá el «Resumen de cuenta» en PDF, o un Excel o CSV."; })
      .finally(() => { st.imp.leyendo = false; dibujar(); });
  } else if (act === "copiaArchivo") {
    const a = e.target.files?.[0];
    if (!a) return;
    if (a.size > 20e6) { st.copiaFlujo.error = "Ese archivo es demasiado grande para ser una copia."; return dibujar(); }
    a.text().then((t) => { st.copiaFlujo.texto = t; st.copiaFlujo.error = ""; });
  }
  else if (act === "miAlias") {
    const al = validarAlias(e.target.value);
    if (!al.ok) { st.errorAlias = al.error; dibujar(); return; }
    ponerConfig("alias", al.alias);
    // Mi alias nuevo llega solo a todos mis grupos (a los conectados, también a los celus de los demás).
    if (al.alias) st.grupos.filter((g) => g.yo).forEach((g) => { const n = conMiAlias(g, al.alias); if (n !== g) guardarGrupo(n); });
    dibujar();
  }
  else if (act === "catNombre") {
    const c = itemCat();
    c.nombre = e.target.value.trim() || (st.editCat.tipo === "medios" ? "Medio sin nombre" : "Sin nombre");
    guardarCats(); dibujar();
  } else if (act === "catClaves") guardarCats();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && (st.hoja || st.festejo)) { if (st.hoja) cerrarHoja(); else { st.festejo = null; dibujar(); } }
});

/* ---------- arranque ---------- */
function cargarEjemplo() {
  datosDeEjemplo(hoy).forEach((x) => { if (!st.movs.some((m) => m.id === x.id)) guardarMov(x); });
  const plan = planDeEjemplo(hoy);
  PLAN.forEach((l) => plan[l].forEach((x) => { if (!st[l].some((i) => i.id === x.id)) ponerItem(l, x); }));
  if (!st.grupos.some((g) => g.id === "ej_g1")) guardarGrupo(grupoDeEjemplo(hoy));
}
// La primera vez: bienvenida (con la opción de mirar la app con datos de ejemplo).
if (!st.cfg.primeraVez) irA("bienvenida");
// Quien ya usaba la app ve el tutorial una vez (se puede saltear).
else if (!st.cfg.tutorialVisto) { st.tutorialPaso = 0; st.tutorialDesde = "inicio"; irA("tutorial"); }
revisarFijos();
revisarSalvavidas();
sincronizarTodos();
sincronizarVinculo();
vigilarVinculo();
// Link para conectar este dispositivo: ...#v=<código>
if (location.hash.startsWith("#v=")) {
  const codigo = decodeURIComponent(location.hash.slice(3));
  history.replaceState({ p: "inicio" }, "", location.pathname + location.search);
  st.vinc = { pegado: codigo, error: "", trabajando: false, verCodigo: false };
  if (!st.cfg.primeraVez) { ponerConfig("primeraVez", hoy); ponerConfig("tutorialVisto", true); irA("inicio"); }
  abrir("dispositivos");
}
// Link para unirse a un grupo: ...#g=<código largo> o ...#u=<código corto>
if (location.hash.startsWith("#g=") || location.hash.startsWith("#u=")) {
  const codigo = decodeURIComponent(location.hash.slice(3));
  history.replaceState({ p: "inicio" }, "", location.pathname + location.search);
  st.compartir = { codigo: "", svg: "", pegado: codigo, error: "", escaneando: false };
  st.grupoId = null;
  abrir("compartir");
  unirCodigo(codigo);
}
// Instalar con un toque: Chrome avisa que se puede instalar y la app guarda ese pedido para el botón.
let pedidoInstalar = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); pedidoInstalar = e; st.puedeInstalar = true; if (st.pantalla === "instalar") dibujar(); });
addEventListener("appinstalled", () => { pedidoInstalar = null; st.puedeInstalar = false; mostrarAviso("¡Listo! MiGuita quedó instalada. Abrila desde el ícono."); dibujar(); });
// Tocar el aviso abre la hoja de anotar.
const anotarDesdeAviso = () => { if (location.hash === "#anotar") { history.replaceState({ p: "inicio" }, "", location.pathname + location.search); abrirHoja(); } };
addEventListener("hashchange", anotarDesdeAviso);
// Tapa para la multitarea (se ve a Miguita en vez de los números).
document.body.insertAdjacentHTML("beforeend", `<div id="tapa" aria-hidden="true">${Art.miguita("ok")}</div>`);
if (tocaActualizar(st.cfg.dolar, st.cotizaciones, hoy, horaAhora())) actualizarDolar(true);
dibujar();
anotarDesdeAviso();

// Versión nueva: el modo sin internet la baja en segundo plano y la app ofrece actualizar con un toque.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const habia = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("./sw.js").then((reg) => {
    const avisar = () => { if (reg.waiting && habia) { st.versionNueva = reg.waiting; dibujar(); } };
    // La versión nueva puede haber empezado a bajarse antes de que la app llegue a escuchar: se sigue también esa.
    const seguir = (w) => w?.addEventListener("statechange", avisar);
    avisar();
    seguir(reg.installing);
    reg.addEventListener("updatefound", () => seguir(reg.installing));
    document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}).then(avisar); });
  }).catch(() => {});
  let recargando = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (habia && !recargando) { recargando = true; location.reload(); } });
}
