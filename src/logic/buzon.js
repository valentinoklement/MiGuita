// Buzón de comentarios mientras la app está en prueba. Se manda solo lo que la persona escribe, su nombre y el tipo de celu.
// Cuando termine la prueba con amigos, poner EN_PRUEBA en false: desaparecen el cartel y el premio.
import { SERVIDOR } from "./sincro.js";

export const EN_PRUEBA = true;
export const TIPOS_COMENTARIO = [["idea", "Una idea"], ["error", "Algo anda mal"], ["otro", "Otra cosa"]];
export const MAX_COMENTARIO = 1500;

export function aparato(ua = "") {
  const so = /iPhone|iPad|iPod/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "otro";
  return so;
}

export async function mandarComentario({ tipo, texto, nombre, version, ua }, ir = fetch) {
  const t = String(texto ?? "").trim();
  if (t.length < 3) throw new Error("vacio");
  const r = await ir(SERVIDOR + "/buzon", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, texto: t.slice(0, MAX_COMENTARIO), nombre: String(nombre ?? "").trim().slice(0, 40), version, aparato: aparato(ua) }) });
  if (!r.ok) throw new Error(r.status === 429 ? "muchos" : "red");
}
