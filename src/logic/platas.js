// Tus platas: además de los pesos del número de Inicio, lo que tengas en dólares, cripto, inversiones u otro lado.
//   cfg.platas: { items: [...], orden: [ids], ocultas: [ids], mod (cuándo se cambió) }. Viaja entre tus dispositivos.
//   item: { id, tipo: "usd"|"usdt"|"usdc"|"inv"|"otra", nombre, moneda: "USD"|"ARS", monto (centavos), color (0 a 5), fecha "AAAA-MM-DD" (cuándo cambió el monto) }
// Cada una se actualiza a mano. "pesos" (lo que te queda, que se mueve con lo que anotás) y "total" no son items: siempre están en la lista.
// cfg.vistaPlata (de cada dispositivo) es la última que quedó a la vista.
import { aPesos } from "./dolar.js";

export const TIPOS_PLATA = [["usd", "Dólares", "USD"], ["usdt", "USDT", "USD"], ["usdc", "USDC", "USD"], ["inv", "Inversiones", "ARS"], ["otra", "Otra", "ARS"]];
const COLOR_DE = { usd: 0, usdt: 1, usdc: 2, inv: 3, otra: 4 };
const CANT_COLORES = 6;
const ETIQUETAS = { usd: "US$ ", usdt: "USDT ", usdc: "USDC " };
const LETRAS = { usd: "US$", usdt: "₮", usdc: "US$", inv: "%" };

export const etiquetaDe = (x) => (x.moneda === "USD" ? ETIQUETAS[x.tipo] || "US$ " : "$");
export const letraDe = (x) => LETRAS[x.tipo] || (x.moneda === "USD" ? "US$" : "$");

// Puede venir de otro dispositivo o de una copia vieja: nunca se confía en que esté completa.
export function limpiar(p) {
  const items = (Array.isArray(p?.items) ? p.items : []).filter((x) => x && typeof x.id === "string" && x.id !== "total" && x.id !== "pesos" && Number.isFinite(x.monto))
    .map((x) => ({ ...x, moneda: x.moneda === "USD" ? "USD" : "ARS", nombre: String(x.nombre ?? "").slice(0, 24), color: Number.isInteger(x.color) ? ((x.color % CANT_COLORES) + CANT_COLORES) % CANT_COLORES : 0 }));
  const ids = ["total", "pesos", ...items.map((x) => x.id)];
  const orden = [...new Set([...(Array.isArray(p?.orden) ? p.orden : []).filter((i) => ids.includes(i)), ...ids])];
  const ocultas = (Array.isArray(p?.ocultas) ? p.ocultas : []).filter((i) => ids.includes(i));
  return { items, orden, ocultas };
}

// Lo que se ve en Inicio, en orden. El total recién tiene sentido con dos platas para sumar y con los pesos cargados.
export function vistas(p, { conPesos = true } = {}) {
  const { orden, ocultas } = limpiar(p);
  const prendidas = orden.filter((id) => !ocultas.includes(id));
  const ver = prendidas.filter((id) => id !== "total" || (conPesos && prendidas.filter((x) => x !== "total").length >= 2));
  return ver.length ? ver : ["pesos"];
}

// La última que dejaste a la vista; si ya no está, los pesos o la primera.
export const elegirVista = (vs, guardada) => (vs.includes(guardada) ? guardada : vs.includes("pesos") ? "pesos" : vs[0]);
export function siguienteVista(vs, guardada) {
  const i = vs.indexOf(elegirVista(vs, guardada));
  return vs[(i + 1) % vs.length];
}

export const enPesos = (x, dolar) => (x.moneda === "USD" ? (dolar ? aPesos(x.monto, dolar) : null) : x.monto);

// Todo junto: suma lo que está prendido, igual a lo que se ve en cada puntito. usar: el número de pesos.
export function totalDe(p, usar, dolar) {
  const { items, ocultas } = limpiar(p);
  let pesos = ocultas.includes("pesos") ? 0 : usar, sinDolar = false;
  for (const x of items) {
    if (ocultas.includes(x.id)) continue;
    const v = enPesos(x, dolar);
    if (v === null) sinDolar = true; else pesos += v;
  }
  return { pesos, usd: dolar ? Math.round(pesos * 100 / dolar) : null, sinDolar };
}

export function moverVista(p, id, delta) {
  const q = limpiar(p), i = q.orden.indexOf(id), j = i + delta;
  if (i < 0 || j < 0 || j >= q.orden.length) return q;
  const orden = [...q.orden];
  [orden[i], orden[j]] = [orden[j], orden[i]];
  return { ...q, orden };
}

export function alternarVista(p, id) {
  const q = limpiar(p);
  return { ...q, ocultas: q.ocultas.includes(id) ? q.ocultas.filter((x) => x !== id) : [...q.ocultas, id] };
}

// El color propio de ese tipo de plata; si ya está usado, el primero libre.
export function colorLibre(items, tipo) {
  const usados = new Set(items.map((x) => x.color)), propio = COLOR_DE[tipo] ?? 4;
  if (!usados.has(propio)) return propio;
  for (let c = 0; c < CANT_COLORES; c++) if (!usados.has(c)) return c;
  return items.length % CANT_COLORES;
}
