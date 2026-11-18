// «Lo de siempre»: lo que la persona anota igual una y otra vez (el café, el bondi), para anotarlo de nuevo con un toque desde Inicio.
// Solo lo que anotó ella (nada de fijos, cuotas, grupos ni ejemplo), en pesos, con el mismo detalle y el mismo monto.
import { claveDe } from "./anotar.js";
import { sumarDias } from "./mes.js";

// Pedido del usuario (2026-11-18): desde la quinta vez, y las cinco en los últimos diez días (hoy y los nueve de antes). Si se deja
// de comprar unos días, deja de aparecer solo.
export const VECES_REPETIDO = 5;
export const DIAS_REPETIDO = 10;
export const CUANTOS_REPETIDOS = 3;

export function repetidos(movs, hoy, { veces = VECES_REPETIDO, dias = DIAS_REPETIDO, cuantos = CUANTOS_REPETIDOS } = {}) {
  const desde = sumarDias(hoy, 1 - dias), grupos = new Map();
  for (const m of movs) {
    if (m.tipo !== "gasto" || !m.detalle || m.fecha < desde || m.fecha > hoy) continue;
    if (m.fijo || m.cuota || m.usd || m.yaAnotado || /^(ej|gx|gp|fx|cq)_/.test(m.id)) continue;
    const k = claveDe(m.detalle) + "|" + m.monto;
    const g = grupos.get(k) || { veces: 0, ultimo: m };
    g.veces++;
    if (m.fecha > g.ultimo.fecha || (m.fecha === g.ultimo.fecha && m.ts > g.ultimo.ts)) g.ultimo = m;
    grupos.set(k, g);
  }
  return [...grupos.values()].filter((g) => g.veces >= veces)
    .sort((a, b) => b.veces - a.veces || b.ultimo.fecha.localeCompare(a.ultimo.fecha) || b.ultimo.ts - a.ultimo.ts).slice(0, cuantos)
    // Lo anota como la última vez: misma categoría y mismo medio (si fue con crédito, también va a la tarjeta).
    .map(({ veces, ultimo: m }) => ({ detalle: m.detalle, monto: m.monto, categoria: m.categoria, medio: m.medio || "", veces }));
}
