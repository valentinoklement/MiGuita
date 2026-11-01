// Plan: presupuestos, metas, deudas y gastos fijos. Todo en centavos.
//   presupuesto: { id, categoria, tope }
//   meta:  { id, nombre, icono, moneda: "ARS"|"USD", objetivo, ahorrado, fecha?, ts }
//   deuda: { id, tipo: "debo"|"meDeben", quien, concepto, moneda?: "ARS"|"USD", total, pagado, vence?, ts }
//   fijo:  { id, tipo: "gasto"|"ingreso", modo: "auto"|"recordar", nombre, moneda?: "ARS"|"USD", monto, categoria, medio, dia (1 a 31), activo,
//            desde "AAAA-MM", hechos: ["AAAA-MM"] }
//   Sin moneda es en pesos. Un fijo en dólares se anota en pesos con el dólar de ese día (cotizar(fecha) → { valor, ... }).
//   modo "auto": se anota solo. modo "recordar": el día que toca, Inicio pregunta y la persona lo confirma.
import { delMes, diasDelMes, cambiarMes } from "./mes.js";

/* ---------- presupuestos ---------- */
// Estado de cada presupuesto en el mes: gastado, lo que queda (0 a 1) y nivel (ok, cerca desde 80%, pasado desde 100%).
export function estadoPresupuestos(presupuestos, movs, mes) {
  const gastos = delMes(movs, mes).filter((x) => x.tipo !== "ingreso");
  return presupuestos.filter((p) => p.tope > 0).map((p) => {
    const gastado = gastos.filter((x) => x.categoria === p.categoria).reduce((a, x) => a + x.monto, 0);
    const uso = gastado / p.tope;
    return { ...p, gastado, resto: p.tope - gastado, uso, queda: Math.max(0, 1 - uso), nivel: uso >= 1 ? "pasado" : uso >= 0.8 ? "cerca" : "ok" };
  }).sort((a, b) => b.uso - a.uso);
}

// El peor entre el gasto del mes sobre ingresos y los presupuestos (especificación, sección 7).
export function estadoConPresupuestos(estadoIngresos, estados) {
  const orden = ["ok", "mid", "bad"];
  let peor = orden.indexOf(estadoIngresos);
  for (const e of estados) peor = Math.max(peor, e.nivel === "pasado" ? 2 : e.nivel === "cerca" ? 1 : 0);
  return orden[peor];
}

/* ---------- metas ---------- */
export function infoMeta(m, hoy) {
  const falta = Math.max(0, m.objetivo - m.ahorrado);
  const parte = m.objetivo > 0 ? Math.min(1, m.ahorrado / m.objetivo) : 0;
  const cumplida = m.objetivo > 0 && falta === 0;
  let vencida = false, porMes = null;
  if (!cumplida && m.fecha) {
    if (m.fecha < hoy) vencida = true;
    else {
      // Meses que faltan contando el actual: de octubre a abril son 7 (oct, nov, dic, ene, feb, mar, abr).
      const meses = Math.max(1, (Number(m.fecha.slice(0, 4)) - Number(hoy.slice(0, 4))) * 12 + Number(m.fecha.slice(5, 7)) - Number(hoy.slice(5, 7)) + 1);
      porMes = Math.ceil(falta / meses / 100) * 100;
    }
  }
  return { falta, parte, cumplida, vencida, porMes };
}

/* ---------- deudas ---------- */
export const restante = (d) => Math.max(0, d.total - d.pagado);

const suma = (ds, tipo, usd) => ds.filter((d) => d.tipo === tipo && (d.moneda === "USD") === usd).reduce((a, d) => a + restante(d), 0);
export function resumenDeudas(deudas, hoy) {
  const activas = deudas.filter((d) => restante(d) > 0)
    .sort((a, b) => (a.vence || "9999").localeCompare(b.vence || "9999") || restante(b) - restante(a));
  return {
    activas,
    saldadas: deudas.filter((d) => restante(d) === 0),
    debo: suma(activas, "debo", false),
    meDeben: suma(activas, "meDeben", false),
    deboUsd: suma(activas, "debo", true),
    meDebenUsd: suma(activas, "meDeben", true),
    vencida: (d) => !!d.vence && d.vence < hoy && restante(d) > 0,
  };
}

/* ---------- gastos fijos ---------- */
// Si se crea (o se reactiva) después de su día del mes, empieza el mes siguiente.
export function mesDeInicio(dia, hoy) {
  const mes = hoy.slice(0, 7);
  return Math.min(dia, diasDelMes(mes)) >= Number(hoy.slice(8, 10)) ? mes : cambiarMes(mes, 1);
}

// Anota los fijos que ya llegaron a su día y no se anotaron todavía, con su fecha correcta,
// aunque la app no se haya abierto ese día (hasta 12 meses atrás). Un fijo se anota una sola vez por mes:
// el movimiento tiene id fijo "fx_<fijo>_<mes>" y el mes queda en "hechos".
// Pasa a pesos el movimiento de un fijo en dólares. null si todavía no hay valor del dólar para esa fecha.
function enPesos(mov, f, cotizar) {
  if (f.moneda !== "USD") return mov;
  const c = cotizar && cotizar(mov.fecha);
  if (!c) return null;
  return { ...mov, monto: Math.round(f.monto * c.valor / 100), usd: { monto: f.monto, valor: c.valor, fecha: c.fecha, tipo: c.tipo, fuente: c.fuente, estimado: c.estimado } };
}

export function correrFijos(fijos, movs, hoy, cotizar) {
  const ids = new Set(movs.map((x) => x.id));
  const nuevos = [], cambiados = [];
  const mesHoy = hoy.slice(0, 7), limite = cambiarMes(mesHoy, -11);
  for (const f of fijos) {
    if (!f.activo || !(f.monto > 0) || f.modo === "recordar") continue;
    const hechos = new Set(f.hechos || []);
    let cambio = false;
    for (let m = f.desde > limite ? f.desde : limite; m <= mesHoy; m = cambiarMes(m, 1)) {
      if (hechos.has(m)) continue;
      const fecha = m + "-" + String(Math.min(f.dia, diasDelMes(m))).padStart(2, "0");
      if (fecha > hoy) continue;
      const id = "fx_" + f.id + "_" + m;
      if (!ids.has(id)) {
        const mov = enPesos({ id, tipo: f.tipo || "gasto", monto: f.monto, detalle: f.nombre, categoria: f.categoria, medio: f.medio || "", fecha, ts: Date.parse(fecha + "T12:00:00"), mod: Date.now(), fijo: f.id }, f, cotizar);
        if (!mov) continue; // sin dólar todavía: se anota cuando lo haya
        nuevos.push(mov);
        ids.add(id);
      }
      hechos.add(m);
      cambio = true;
    }
    if (cambio) cambiados.push({ ...f, hechos: [...hechos].sort().slice(-24) });
  }
  return { nuevos, cambiados };
}

// Fijos "recordar" de este mes que ya llegaron a su día y todavía no se confirmaron ni se descartaron.
export function fijosPorConfirmar(fijos, hoy) {
  const mes = hoy.slice(0, 7);
  return fijos.filter((f) => f.activo && f.modo === "recordar" && f.monto > 0 && f.desde <= mes && !(f.hechos || []).includes(mes) &&
    mes + "-" + String(Math.min(f.dia, diasDelMes(mes))).padStart(2, "0") <= hoy);
}

// El movimiento de un fijo para un mes (mismo id que si se anotara solo, así nunca se duplica).
export function movimientoDeFijo(f, mes, cotizar) {
  const fecha = mes + "-" + String(Math.min(f.dia, diasDelMes(mes))).padStart(2, "0");
  return enPesos({ id: "fx_" + f.id + "_" + mes, tipo: f.tipo || "gasto", monto: f.monto, detalle: f.nombre, categoria: f.categoria, medio: f.medio || "", fecha, ts: Date.parse(fecha + "T12:00:00"), mod: Date.now(), fijo: f.id }, f, cotizar);
}
