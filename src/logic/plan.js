// Plan: presupuestos, metas, deudas y gastos fijos. Todo en centavos.
//   presupuesto: { id, categoria, tope }
//   meta:  { id, nombre, icono, moneda: "ARS"|"USD", objetivo (0 = sin objetivo), ahorrado, fecha?, ts, mod }
//   deuda: { id, tipo: "debo"|"meDeben", quien, concepto, moneda?: "ARS"|"USD", total, pagado, vence?, ts, mod }
//   fijo:  { id, tipo: "gasto"|"ingreso", modo: "auto"|"recordar", nombre, moneda?: "ARS"|"USD", monto, categoria, medio, dia (1 a 31), activo,
//            desde "AAAA-MM", hechos: ["AAAA-MM"], pospuesto?: "AAAA-MM-DD" (dijo «todavía no»: se vuelve a preguntar ese día),
//            dijoNo?: "AAAA-MM-DD" (el día que lo dijo), ts? (cuándo se creó), mod }
//   Todos llevan mod (cuándo cambiaron por última vez): entre dos dispositivos gana lo más nuevo. Lo pone la app al guardar.
//   El orden de las metas (la prioridad) va aparte, en config.metasOrden { ids, mod }: así mover una meta no pisa la plata que otro dispositivo le sumó.
//   Sin moneda es en pesos. Un fijo en dólares se anota en pesos con el dólar de ese día (cotizar(fecha) → { valor, ... }).
//   modo "auto": se anota solo. modo "recordar": el día que toca, Inicio pregunta y la persona lo confirma.
import { delMes, diasDelMes, cambiarMes, sumarDias } from "./mes.js";
import { categoriaPara } from "./anotar.js";

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
// Las metas en el orden que eligió la persona (orden: ids, la primera es la más importante). Las que no están ahí van después, de la más vieja a la más nueva.
export function metasEnOrden(metas, orden = []) {
  const pos = (m) => { const i = orden.indexOf(m.id); return i < 0 ? Infinity : i; };
  return [...metas].sort((a, b) => pos(a) - pos(b) || a.ts - b.ts);
}
// Sube (delta -1) o baja (+1) una meta. Devuelve la lista nueva de ids, o null si no se puede mover.
export function moverMeta(metas, orden, id, delta) {
  const ids = metasEnOrden(metas, orden).map((m) => m.id), i = ids.indexOf(id), j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}

// Una meta sin objetivo (objetivo 0) es un lugar para ir guardando, como «Ahorros»: no falta nada, nunca se cumple y la fecha no cuenta.
export function infoMeta(m, hoy) {
  const sinObjetivo = !(m.objetivo > 0);
  const falta = sinObjetivo ? 0 : Math.max(0, m.objetivo - m.ahorrado);
  const parte = sinObjetivo ? 0 : Math.min(1, m.ahorrado / m.objetivo);
  const cumplida = !sinObjetivo && falta === 0;
  let vencida = false, porMes = null;
  if (!cumplida && !sinObjetivo && m.fecha) {
    if (m.fecha < hoy) vencida = true;
    else {
      // Meses que faltan contando el actual: de octubre a abril son 7 (oct, nov, dic, ene, feb, mar, abr).
      const meses = Math.max(1, (Number(m.fecha.slice(0, 4)) - Number(hoy.slice(0, 4))) * 12 + Number(m.fecha.slice(5, 7)) - Number(hoy.slice(5, 7)) + 1);
      porMes = Math.ceil(falta / meses / 100) * 100;
    }
  }
  return { falta, parte, cumplida, vencida, porMes, sinObjetivo };
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

// En qué categoría queda el pago de una deuda. Pagar la tarjeta no es «una deuda» cualquiera: si la deuda se llama como una
// tarjeta («Visa», «Tarjeta del banco»), va a «Pago de tarjeta» (salvo que la persona haya ocultado esa categoría).
// cats: las categorías de la persona; sin ellas, siempre Deudas.
export function categoriaDePago(d, cats) {
  if (d.tipo === "meDeben") return "otros_in";
  return cats && categoriaPara((d.concepto || "") + " " + (d.quien || ""), cats, "gasto") === "tarjeta" ? "tarjeta" : "deudas";
}

// El movimiento de pagar (o cobrar) una parte de una deuda. Lo de una deuda de ejemplo también es de ejemplo.
// monto: lo pagado, en la moneda de la deuda. cot: el dólar de hoy si la deuda es en dólares (sin él devuelve null).
export function movimientoDePago(d, monto, { id, hoy, ahora, cot = null, cats = null }) {
  const me = d.tipo === "meDeben";
  const mov = { id: (d.id.startsWith("ej_") ? "ej_" : "") + id, tipo: me ? "ingreso" : "gasto", monto, detalle: (me ? "Cobro: " : "Pago: ") + (d.concepto || d.quien),
    categoria: categoriaDePago(d, cats), medio: "", fecha: hoy, ts: ahora, mod: ahora };
  if (d.moneda === "USD") {
    if (!cot) return null;
    mov.monto = Math.round(monto * cot.valor / 100);
    mov.usd = { monto, valor: cot.valor, fecha: cot.fecha, tipo: cot.tipo, fuente: cot.fuente, estimado: cot.estimado };
  }
  return mov;
}

/* ---------- gastos fijos ---------- */
// Si se crea (o se reactiva) después de su día del mes, empieza el mes siguiente.
export function mesDeInicio(dia, hoy) {
  const mes = hoy.slice(0, 7);
  return Math.min(dia, diasDelMes(mes)) >= Number(hoy.slice(8, 10)) ? mes : cambiarMes(mes, 1);
}

// El día que le toca a un fijo en un mes (el 31 en febrero es el 28).
export const fechaDeFijo = (f, mes) => mes + "-" + String(Math.min(f.dia, diasDelMes(mes))).padStart(2, "0");
// Un fijo se anota una sola vez por mes: su movimiento tiene id fijo "fx_<fijo>_<mes>". Lo de un fijo de ejemplo también es de ejemplo.
const idDeFijo = (f, mes) => (f.id.startsWith("ej_") ? "ej_" : "") + "fx_" + f.id + "_" + mes;
// La hora de lo que se anota solo: el comienzo de su día, o el momento en que se creó el fijo o la compra si fue después.
// Así da lo mismo en todos los dispositivos, y lo que ya estaba anotado cuando se cargó la plata ese día no se resta de nuevo.
export const horaDeAuto = (fecha, creado) => Math.max(Date.parse(fecha + "T00:00:00"), creado || 0);

// Pasa a pesos el movimiento de un fijo en dólares. null si todavía no hay valor del dólar para esa fecha.
export function enPesos(mov, f, cotizar) {
  if (f.moneda !== "USD") return mov;
  const c = cotizar && cotizar(mov.fecha);
  if (!c) return null;
  return { ...mov, monto: Math.round(f.monto * c.valor / 100), usd: { monto: f.monto, valor: c.valor, fecha: c.fecha, tipo: c.tipo, fuente: c.fuente, estimado: c.estimado } };
}

// Anota los fijos que ya llegaron a su día y no se anotaron todavía, con su fecha correcta,
// aunque la app no se haya abierto ese día (hasta 12 meses atrás). El mes queda en "hechos".
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
      const fecha = fechaDeFijo(f, m);
      if (fecha > hoy) continue;
      const id = idDeFijo(f, m);
      // "fx_<fijo>_<mes>" a secas: así se llamaban antes también los de un fijo de ejemplo.
      if (!ids.has(id) && !ids.has("fx_" + f.id + "_" + m)) {
        const mov = enPesos({ id, tipo: f.tipo || "gasto", monto: f.monto, detalle: f.nombre, categoria: f.categoria, medio: f.medio || "", fecha, ts: horaDeAuto(fecha, f.ts), mod: Date.now(), fijo: f.id }, f, cotizar);
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

// El mes por el que un fijo «que me pregunte» espera respuesta, o "" si no hay ninguno.
// Se sigue preguntando hasta que llega el día del mes siguiente: decir «todavía no» a fin de mes no pierde ese cobro.
export function mesPendiente(f, hoy) {
  if (!f.activo || f.modo !== "recordar" || !(f.monto > 0) || f.pospuesto > hoy) return "";
  const mesHoy = hoy.slice(0, 7), mes = fechaDeFijo(f, mesHoy) <= hoy ? mesHoy : cambiarMes(mesHoy, -1);
  return mes >= f.desde && !(f.hechos || []).includes(mes) ? mes : "";
}
// Fijos "recordar" que ya llegaron a su día y todavía no se confirmaron ni se descartaron.
export const fijosPorConfirmar = (fijos, hoy) => fijos.filter((f) => mesPendiente(f, hoy));

// «Todavía no»: no se da por hecho y se vuelve a preguntar a los 3 días (pedido del usuario, 2026-11-11; antes era al otro día),
// también si en el medio cambia el mes.
export const DIAS_PARA_VOLVER_A_PREGUNTAR = 3;
export const posponer = (f, hoy) => ({ ...f, pospuesto: sumarDias(hoy, DIAS_PARA_VOLVER_A_PREGUNTAR), dijoNo: hoy });
// Ese mes queda cerrado y no se pregunta más por él: porque se anotó, o porque la persona dijo «Este mes no» (y entonces no se anota nada).
export function conMesCerrado(f, mes) {
  const { pospuesto, dijoNo, ...resto } = f;
  return { ...resto, hechos: [...new Set([...(f.hechos || []), mes])].sort().slice(-24) };
}

// Con qué fecha se anota un fijo que la persona confirma a mano, y si hay que preguntarle algo.
//   - Si dijo «todavía no», la plata se movió después: va con la fecha de hoy.
//   - Si cargó o corrigió su plata después del día previsto (o del último «todavía no»), no se puede saber si ese número
//     ya lo tenía en cuenta: va con la fecha de hoy y se pregunta (duda).
//   - Si no, va con la fecha prevista.
export function fechaAlConfirmar(f, mes, hoy, saldo) {
  const prevista = fechaDeFijo(f, mes), pospuso = !!f.pospuesto && f.pospuesto > prevista;
  // El último día en que se sabe que esa plata todavía no se había movido: cuando dijo «todavía no» (los fijos pospuestos con la
  // versión anterior no guardaban el día: ahí se preguntaba de nuevo al día siguiente).
  const sinPlataHasta = pospuso ? f.dijoNo || sumarDias(f.pospuesto, -1) : prevista;
  const duda = !!saldo && !saldo.implicito && saldo.fecha >= sinPlataHasta && !(saldo.fecha === hoy && saldo.listo);
  return { fecha: pospuso || duda ? hoy : prevista, duda };
}

// El movimiento de un fijo para un mes (mismo id que si se anotara solo, así nunca se duplica).
// fecha y ts: cuando lo confirma la persona (ver fechaAlConfirmar). Sin eso, como si se anotara solo.
export function movimientoDeFijo(f, mes, cotizar, { fecha = fechaDeFijo(f, mes), ts = horaDeAuto(fecha, f.ts) } = {}) {
  return enPesos({ id: idDeFijo(f, mes), tipo: f.tipo || "gasto", monto: f.monto, detalle: f.nombre, categoria: f.categoria, medio: f.medio || "", fecha, ts, mod: Date.now(), fijo: f.id }, f, cotizar);
}
