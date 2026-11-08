// Avisos con la app cerrada. El servidor sabe solo a dónde mandar el aviso, a qué horas y el último día que se anotó algo (para no avisar si ya anotaste).
// Se le cuenta al abrir la app, al volver a ella, al cambiar los horarios y al anotar. cfg.avisos = { id, token, enviado: "AAAA-MM-DD|..." }
import { diasAnotados } from "../logic/racha.js";
import { planDeAvisos, CLAVE_AVISOS } from "../logic/avisos.js";
import { SERVIDOR, unb64Claves } from "../logic/sincro.js";

export function crearAvisos({ st, hoy, ponerConfig, mostrarAviso, dibujar }) {
  let avisosTimer = 0;
  const hexa = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const pedirAvisos = (metodo, ruta, cuerpo) => fetch(SERVIDOR + "/a/" + st.cfg.avisos.id + ruta, { method: metodo, cache: "no-store",
    headers: { Authorization: "Bearer " + st.cfg.avisos.token, ...(cuerpo && { "Content-Type": "application/json" }) }, body: cuerpo && JSON.stringify(cuerpo) });
  function programarAvisos() {
    if (!st.cfg?.avisos) return;
    clearTimeout(avisosTimer);
    avisosTimer = setTimeout(() => enviarAvisos().catch(() => {}), 1500);
  }
  async function suscripcionAvisos() {
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64Claves(CLAVE_AVISOS) });
  }
  async function enviarAvisos() {
    const av = st.cfg.avisos;
    if (!av || navigator.onLine === false || globalThis.Notification?.permission !== "granted") return;
    const sub = (await suscripcionAvisos()).toJSON();
    const anoto = [...diasAnotados(st.movs, st.dias)].filter((f) => f <= hoy).sort().pop() || "";
    const cuerpo = { sub, zona: Intl.DateTimeFormat().resolvedOptions().timeZone, plan: planDeAvisos(st.cfg.notif), anoto, silencio: st.cfg.notif.forma === "silencio" };
    // Una vez por día alcanza si no cambió nada: así el servidor sabe que la app se sigue usando.
    const huellaAvisos = hoy + "|" + JSON.stringify(cuerpo);
    if (av.enviado === huellaAvisos) return;
    const r = await pedirAvisos("PUT", "", cuerpo);
    if (r.ok && st.cfg.avisos) ponerConfig("avisos", { ...st.cfg.avisos, enviado: huellaAvisos });
  }
  async function activarAvisos() {
    const p = await Notification.requestPermission();
    if (p !== "granted") { mostrarAviso("Sin permiso para avisar. Mirá abajo cómo activarlo."); return dibujar(); }
    st.avisosTrabajando = true; dibujar();
    const viejo = st.cfg.avisos;
    try {
      if (!viejo) ponerConfig("avisos", { id: hexa(), token: hexa() });
      await enviarAvisos();
      if (!st.cfg.avisos?.enviado) throw new Error("sin enviar");
      mostrarAviso("¡Listo! Los avisos te llegan aunque la app esté cerrada.");
    } catch {
      if (!viejo) ponerConfig("avisos", null);
      mostrarAviso("No se pudieron activar. Revisá internet y probá de nuevo.");
    }
    st.avisosTrabajando = false; dibujar();
  }
  async function apagarAvisos() {
    await pedirAvisos("DELETE", "").catch(() => {});
    ponerConfig("avisos", null);
    try { await (await (await navigator.serviceWorker.ready).pushManager.getSubscription())?.unsubscribe(); } catch { /* ya no estaba */ }
  }

  return { programarAvisos, enviarAvisos, activarAvisos, apagarAvisos, pedirAvisos };
}
