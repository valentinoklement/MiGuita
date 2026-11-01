// Cuentas de la sección Análisis. Todo se calcula en el celu y en centavos, a partir de lo que ya está anotado.
// Con pocos datos no se saca ninguna conclusión: cada parte devuelve null hasta tener lo que necesita, y progreso() dice cuánto falta.
import { cambiarMes, delMes, gastosPor } from "./mes.js";
import { claveDe } from "./anotar.js";
import { resumenCuotas } from "./cuotas.js";
import { infoMeta } from "./plan.js";

export const DIAS_HORMIGA = 14;
export const MIN_VECES = 4;
const PARTE_HORMIGA = 0.03;  // gasto chico: como mucho el 3% de lo gastado en los últimos 30 días
const SUBA_MINIMA = 0.15;    // de un mes a otro, menos de 15% no es noticia
const PESO_MINIMO = 0.03;    // ni una categoría que mueve menos del 3% de lo gastado

const sumaDe = (movs, tipo) => movs.filter((m) => (tipo === "ingreso" ? m.tipo === "ingreso" : m.tipo !== "ingreso")).reduce((a, m) => a + m.monto, 0);
const promedio = (l) => (l.length ? l.reduce((a, x) => a + x, 0) / l.length : 0);
const hace30 = (hoy) => { const d = new Date(hoy + "T12:00:00"); d.setDate(d.getDate() - 29); return d.toISOString().slice(0, 10); };

// Desde cuándo anota: lo automático (fijos y cuotas) no cuenta.
export function diasUsando(movs, hoy) {
  const propias = movs.filter((m) => !m.fijo && !m.cuota).map((m) => m.fecha).sort();
  if (!propias.length) return 0;
  return Math.round((Date.parse(hoy + "T12:00:00") - Date.parse(propias[0] + "T12:00:00")) / 864e5) + 1;
}

// Los últimos meses, del más viejo al actual.
export function mesAMes(movs, hoy, n = 6) {
  const actual = hoy.slice(0, 7);
  return Array.from({ length: n }, (_, i) => cambiarMes(actual, i - n + 1)).map((mes) => {
    const d = delMes(movs, mes);
    return { mes, ingresos: sumaDe(d, "ingreso"), gastos: sumaDe(d, "gasto"), parcial: mes === actual };
  });
}
const conDatos = (m) => m.gastos > 0 || m.ingresos > 0;

// Lo que cambió en el último mes cerrado, contra el promedio de los anteriores.
export function loQueCambio(movs, hoy) {
  const meses = mesAMes(movs, hoy).filter((m) => !m.parcial);
  const ult = meses[meses.length - 1], antes = meses.slice(0, -1).filter((m) => m.gastos > 0);
  if (!ult?.gastos || !antes.length) return null;
  const cats = gastosPor(movs, ult.mes, "categoria"), ids = new Set(cats.map((c) => c.id));
  for (const m of antes) gastosPor(movs, m.mes, "categoria").forEach((c) => ids.add(c.id));
  const delta = [...ids].map((id) => {
    const monto = cats.find((c) => c.id === id)?.monto || 0;
    const prom = promedio(antes.map((m) => gastosPor(movs, m.mes, "categoria").find((c) => c.id === id)?.monto || 0));
    return { categoria: id, monto, promedio: Math.round(prom), parte: prom ? (monto - prom) / prom : 0, dif: monto - prom };
  }).filter((d) => d.promedio > 0 && Math.abs(d.parte) >= SUBA_MINIMA && Math.abs(d.dif) >= ult.gastos * PESO_MINIMO);
  const subio = delta.filter((d) => d.dif > 0).sort((a, b) => b.dif - a.dif)[0];
  const bajo = delta.filter((d) => d.dif < 0).sort((a, b) => a.dif - b.dif)[0];
  const guardar = (m) => (m.ingresos > 0 ? (m.ingresos - m.gastos) / m.ingresos : null);
  const pasadas = antes.map(guardar).filter((x) => x !== null);
  const promGastos = promedio(antes.map((m) => m.gastos));
  return { mes: ult.mes, subio: subio || null, bajo: bajo || null, guardo: guardar(ult), promedioGuardo: pasadas.length ? promedio(pasadas) : null, total: promGastos ? (ult.gastos - promGastos) / promGastos : 0 };
}

// Gastos hormiga: chicos y repetidos en los últimos 30 días. Lo automático no entra.
export function gastosHormiga(movs, hoy, cuantos = 3) {
  if (diasUsando(movs, hoy) < DIAS_HORMIGA) return null;
  const desde = hace30(hoy), recientes = movs.filter((m) => m.tipo !== "ingreso" && m.fecha >= desde && m.fecha <= hoy);
  const total = recientes.reduce((a, m) => a + m.monto, 0), grupos = new Map();
  for (const m of recientes) {
    if (m.fijo || m.cuota) continue;
    const k = claveDe(m.detalle || "") || "cat:" + m.categoria;
    const g = grupos.get(k) || { detalle: m.detalle || "", categoria: m.categoria, veces: 0, monto: 0 };
    g.veces++; g.monto += m.monto;
    grupos.set(k, g);
  }
  const items = [...grupos.values()].filter((g) => g.veces >= MIN_VECES && g.monto / g.veces <= total * PARTE_HORMIGA)
    .sort((a, b) => b.monto - a.monto).slice(0, cuantos).map((g) => ({ ...g, anual: g.monto * 12 }));
  return items.length ? { items, total: items.reduce((a, g) => a + g.monto, 0) } : null;
}

// Las categorías con más plata de los últimos meses, para mirar una por una.
export function categoriasFuertes(movs, hoy, cuantas = 4) {
  const t = new Map();
  for (const m of mesAMes(movs, hoy)) for (const c of gastosPor(movs, m.mes, "categoria")) t.set(c.id, (t.get(c.id) || 0) + c.monto);
  return [...t.entries()].sort((a, b) => b[1] - a[1]).slice(0, cuantas).map(([id]) => id);
}
export const serieCategoria = (movs, hoy, id) => mesAMes(movs, hoy).map(({ mes, parcial }) => ({ mes, parcial, monto: gastosPor(movs, mes, "categoria").find((c) => c.id === id)?.monto || 0 }));

// En pesos, usando el dólar de hoy para lo que está en dólares. Sin dólar todavía, eso no se cuenta.
const enPesos = (monto, moneda, dolar) => (moneda === "USD" ? (dolar ? Math.round(monto * dolar / 100) : 0) : monto);
const fijosPorMes = (fijos, tipo, dolar) => fijos.filter((f) => f.activo && (f.tipo || "gasto") === tipo).reduce((a, f) => a + enPesos(f.monto, f.moneda, dolar), 0);

// Lo que viene los próximos meses: fijos más cuotas.
export function loQueViene(fijos, compras, hoy, dolar, meses = 6) {
  const porMes = fijosPorMes(fijos, "gasto", dolar);
  const filas = resumenCuotas(compras, [], hoy, meses).meses.map((m) => ({ mes: m.mes, fijos: porMes, cuotas: m.pesos + enPesos(m.usd, "USD", dolar) }));
  if (!filas.some((f) => f.fijos || f.cuotas)) return null;
  return filas.map((f) => ({ ...f, total: f.fijos + f.cuotas }));
}

// Cuánto de lo que cobrás ya está comprometido este mes.
export function comprometido(movs, fijos, compras, hoy, dolar) {
  const viene = loQueViene(fijos, compras, hoy, dolar);
  if (!viene) return null;
  const meses = mesAMes(movs, hoy), ultimoCobro = [...meses].reverse().find((m) => m.ingresos > 0)?.ingresos || 0;
  const ingreso = fijosPorMes(fijos, "ingreso", dolar) || ultimoCobro;
  const { fijos: f, cuotas: c } = viene[0];
  return { fijos: f, cuotas: c, ingreso, parte: ingreso ? (f + c) / ingreso : null, queda: ingreso ? ingreso - f - c : null };
}

// Si seguís guardando como venís, cuándo llegás a tu meta. Promedio de los últimos 3 meses cerrados.
export function llegadaMeta(metas, movs, hoy) {
  const cerrados = mesAMes(movs, hoy).filter((m) => !m.parcial && conDatos(m)).slice(-3);
  const ritmo = promedio(cerrados.map((m) => m.ingresos - m.gastos));
  if (ritmo <= 0 || !cerrados.length) return null;
  const meta = metas.find((m) => m.moneda !== "USD" && !infoMeta(m, hoy).cumplida);
  if (!meta) return null;
  const falta = infoMeta(meta, hoy).falta;
  return { nombre: meta.nombre, mes: cambiarMes(hoy.slice(0, 7), Math.ceil(falta / ritmo)) };
}

// Los gastos de cada mes cerrado en pesos y en dólares, con el dólar que había ese mes. Sin dólar guardado de ese mes, no entra.
export function enDolares(movs, cotizaciones, tipo, hoy) {
  const filas = mesAMes(movs, hoy, 7).filter((m) => !m.parcial && m.gastos > 0).map((m) => {
    const del = cotizaciones.filter((c) => c.tipo === tipo && c.fecha.startsWith(m.mes));
    const valor = promedio(del.map((c) => c.valor));
    return valor ? { mes: m.mes, pesos: m.gastos, usd: Math.round(m.gastos * 100 / valor) } : null;
  }).filter(Boolean);
  if (filas.length < 2) return null;
  const a = filas[0], z = filas[filas.length - 1];
  return { filas, pesos: (z.pesos - a.pesos) / a.pesos, usd: (z.usd - a.usd) / a.usd };
}

// Cuánto falta para que se abra cada parte (de 0 a 1).
export function progreso(movs, hoy) {
  const cerrados = mesAMes(movs, hoy).filter((m) => !m.parcial && m.gastos > 0).length, dias = diasUsando(movs, hoy);
  const conAlgo = mesAMes(movs, hoy).filter(conDatos).length;
  return {
    hormiga: { parte: Math.min(1, dias / DIAS_HORMIGA), faltan: Math.max(0, DIAS_HORMIGA - dias) },
    cambio: { parte: Math.min(1, cerrados / 2), faltan: Math.max(0, 2 - cerrados) },
    meses: { parte: Math.min(1, conAlgo / 2), faltan: Math.max(0, 2 - conAlgo) },
  };
}
export const hayMesAMes = (movs, hoy) => mesAMes(movs, hoy).filter(conDatos).length >= 2;

// El resumen para pegar en una IA: solo categorías y totales. Nunca el detalle de cada gasto, que puede tener nombres.
export function resumenParaIA({ movs, fijos, compras, hoy, dolar, nombreCat, nombreMes, formatear }) {
  const $ = (c) => formatear(c, { moneda: "$" });
  const meses = mesAMes(movs, hoy).filter(conDatos);
  const lineas = ["Estos son mis gastos, anotados en una app. Son montos en pesos argentinos.", ""];
  for (const m of meses) {
    const cats = gastosPor(movs, m.mes, "categoria").map((c) => nombreCat(c.id) + " " + $(c.monto)).join(", ");
    lineas.push(`${nombreMes(m.mes)}${m.parcial ? " (va hasta hoy)" : ""}: entró ${$(m.ingresos)}, salió ${$(m.gastos)}.${cats ? " " + cats + "." : ""}`);
  }
  const comp = comprometido(movs, fijos, compras, hoy, dolar);
  if (comp) lineas.push("", `Por mes tengo ${$(comp.fijos)} de gastos fijos. Este mes pago ${$(comp.cuotas)} de cuotas.`);
  const debo = resumenCuotas(compras, [], hoy).total;
  if (debo.pesos) lineas.push(`Me falta pagar ${$(debo.pesos)} en cuotas.`);
  lineas.push("", "Mirá estos datos y decime en qué me conviene recortar, qué te llama la atención y qué podría hacer para ahorrar más. Hablame simple.");
  return lineas.join("\n");
}
