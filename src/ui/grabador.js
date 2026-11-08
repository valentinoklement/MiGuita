// Hablar en vez de escribir: graba, pasa el audio a texto y lo deja en la lista para revisar (o en el comentario que se estaba escribiendo).
import { pasarATexto, formatoDeAudio, MAX_SEGUNDOS } from "../logic/voz.js";
import { leerVarios } from "../logic/anotar.js";
import { MAX_COMENTARIO } from "../logic/buzon.js";

export function crearGrabador({ st, abrir, volver, dibujar }) {
  let grabacion = null;
  function cortarGrabacion() { grabacion?.cortar(); grabacion = null; }
  const pararGrabacion = () => grabacion?.parar();

  async function grabarVoz() {
    cortarGrabacion();
    st.voz = { paso: "pidiendo" };
    if (st.pantalla === "grabar") dibujar(); else { abrir("grabar"); dibujar(); }
    let flujo;
    try { flujo = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) {
      if (st.pantalla !== "grabar") return;
      st.voz = { paso: "error", error: e?.name === "NotAllowedError" ? "Necesito permiso para usar el micrófono. Podés darlo en los ajustes del navegador." : "No encontré el micrófono de este celu." };
      return dibujar();
    }
    if (st.pantalla !== "grabar") { flujo.getTracks().forEach((t) => t.stop()); return; }
    const mimeType = formatoDeAudio((f) => MediaRecorder.isTypeSupported(f));
    let rec;
    try { rec = new MediaRecorder(flujo, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 }); }
    catch { flujo.getTracks().forEach((t) => t.stop()); st.voz = { paso: "error", error: "Este navegador no deja grabar audio. Probá escribirlo." }; return dibujar(); }
    const partes = [];
    let cortado = false;
    const reloj = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_SEGUNDOS * 1000);
    const apagar = () => { clearTimeout(reloj); flujo.getTracks().forEach((t) => t.stop()); };
    grabacion = {
      parar: () => { if (rec.state === "recording") rec.stop(); },
      cortar: () => { cortado = true; apagar(); if (rec.state === "recording") rec.stop(); },
    };
    rec.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
    rec.onstop = async () => {
      apagar();
      grabacion = null;
      if (cortado) return;
      st.voz = { paso: "enviando" }; dibujar();
      try {
        const texto = await pasarATexto(new Blob(partes, { type: rec.mimeType || mimeType }));
        if (st.pantalla !== "grabar") return;
        if (st.vozPara === "comentario") {
          if (!texto.trim()) { st.voz = { paso: "nada", texto }; return dibujar(); }
          st.com.texto = ((st.com.texto ? st.com.texto + " " : "") + texto.trim()).slice(0, MAX_COMENTARIO);
          st.voz = null; st.vozPara = "";
          return volver();
        }
        const items = leerVarios(texto, st.cfg.categorias, st.cfg.aprendidas || {});
        if (!items.length) { st.voz = { paso: "nada", texto }; return dibujar(); }
        st.voz = null;
        st.varios = { items, texto, voz: true, editando: null, error: "" };
        history.replaceState({ p: "revisar" }, ""); st.pantalla = "revisar"; scrollTo(0, 0);
      } catch (e) { st.voz = { paso: "error", error: e.message }; }
      dibujar();
    };
    rec.start();
    st.voz = { paso: "grabando" };
    dibujar();
  }

  return { grabarVoz, cortarGrabacion, pararGrabacion };
}
