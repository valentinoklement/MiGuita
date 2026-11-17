// Mis dispositivos conectados: se juntan con el servidor al abrir, al volver a la app, al volver internet,
// cuando otro dispositivo guarda (aviso al instante) y un ratito después de cada cambio propio.
import { nuevoCodigoVinculo, leerCodigoVinculo, derivarVinculo, aplanar, huellas, huella, sincronizarDatos } from "../logic/vinculo.js";
import { fusionar } from "../logic/grupos.js";
import { escuchar, pedir } from "../logic/sincro.js";
import { svgQR } from "./qr.js";

export function crearConexion({ st, base, listasPlan, ponerConfig, quitarConfig, ponerDia, ponerItem, quitarItem, quitarMov, guardarGrupo, sincronizarGrupo, mostrarAviso, dibujar }) {
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
    if (lista === "config") { if (x !== undefined) ponerConfig(id, x); else quitarConfig(id); return; }
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
    // Lo comprado con crédito que llega sin la marca de la tarjeta viene de un dispositivo con la versión vieja: sigue restando como
    // siempre. Se deja escrito (enTarjeta: false) para que editarlo o deshacer no lo cambie (ver marcarTarjeta en app.js).
    if (x && lista === "movs" && x.medio === "credito" && x.enTarjeta === undefined) x = { ...x, enTarjeta: false };
    if (x) ponerItem(lista, x, false); else quitarItem(lista, id); // false: llega tal cual, sin cambiarle la hora
  }
  function cortarEscucha() { escuchaVinculo?.cortar?.(); escuchaVinculo = null; }
  // Mientras la app está a la vista, escucha: si otro dispositivo guarda algo, aparece solo.
  function vigilarVinculo() {
    const c = !document.hidden && st.cfg.vinculo?.codigo;
    if ((escuchaVinculo?.codigo || false) === c) return;
    cortarEscucha();
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
    listasPlan.forEach((l) => st[l].filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarItem(l, x.id)));
    st.grupos.filter((x) => x.id.startsWith("ej_")).forEach((x) => quitarItem("grupos", x.id));
    ponerConfig("vinculo", { codigo, v: 0, base: {} });
    await sincronizarVinculo();
    st.vinc = { pegado: "", error: st.cfg.vinculo?.error ? "Se conectó, pero no se pudo traer todo. Se reintenta solo." : "", trabajando: false, verCodigo: false };
    if (!st.cfg.vinculo?.error) mostrarAviso("¡Listo! Este dispositivo ya ve tus datos.");
    vigilarVinculo(); prepararVinculo(); dibujar();
  }

  return { programarVinculo, sincronizarVinculo, vigilarVinculo, prepararVinculo, crearVinculo, unirVinculo, cortarEscucha };
}
