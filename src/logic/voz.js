// Pasar un audio a texto. El audio va a nuestro servidor solo para eso: no se guarda. El texto se separa en gastos acá, en el celu.
import { SERVIDOR } from "./sincro.js";

export const MAX_SEGUNDOS = 90;
const FORMATOS = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

export const formatoDeAudio = (admite) => FORMATOS.find((f) => admite(f)) || "";

export async function pasarATexto(audio, pedir = globalThis.fetch.bind(globalThis)) {
  let r;
  try { r = await pedir(SERVIDOR + "/voz", { method: "POST", headers: { "Content-Type": audio.type || "audio/webm" }, body: audio }); }
  catch { throw new Error("No hay conexión. Para usar el micrófono hace falta internet."); }
  if (r.status === 429) throw new Error("Fueron muchos audios seguidos. Esperá un minuto y probá de nuevo.");
  if (r.status === 413) throw new Error("El audio quedó muy largo. Probá con uno más corto.");
  if (!r.ok) throw new Error("No pude escuchar el audio ahora. Probá de nuevo en un rato o escribilo.");
  return String((await r.json()).texto || "").trim();
}
