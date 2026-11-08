// Cuenta, sin saber quién sos, cuánta gente abre la app, la instala y la sigue usando. Cada dispositivo manda cada cosa una sola vez,
// sin ningún identificador y sin nada de lo que anotás. Se puede apagar en Ajustes › Privacidad.
import { SERVIDOR } from "./sincro.js";

export const EVENTOS = ["abrio", "anoto", "instalada", "semana", "mes"];

// Qué falta contar en este dispositivo.
export function porContar({ hechos = [], desde, hoy, anoto, instalada }) {
  const dias = desde ? (Date.parse(hoy) - Date.parse(desde)) / 864e5 : 0;
  const toca = { abrio: true, anoto: !!anoto, instalada: !!instalada, semana: dias >= 7, mes: dias >= 30 };
  return EVENTOS.filter((e) => toca[e] && !hechos.includes(e));
}

export async function contar(ev, ir = fetch) {
  const r = await ir(SERVIDOR + "/cuenta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ev }) });
  return r.ok;
}
