// Tarjeta de crédito. Lo que se compra con crédito es un gasto del mes en que se compra, pero la plata sale recién cuando
// se paga la tarjeta (decisión del usuario, 2026-11-17: «que la tarjeta no reste dos veces»). Así nada se cuenta dos veces:
//   · «Te queda» (cuenta() en saldo.js): lo comprado con crédito no resta; pagar la tarjeta sí.
//   · Lo gastado (Resumen, Análisis, topes, Tu mes): lo comprado con crédito cuenta el día que se compró; del pago de la tarjeta
//     cuenta solo lo que no estaba anotado como compra con crédito. Si la persona anota solo el pago, ese pago es su gasto.
//
// Las marcas en el movimiento:
//   enTarjeta: true   comprado con crédito (medio "credito") desde esta versión: se paga con el resumen. La pone app.js al guardar
//                     según la hora en que se anotó (ver marcarTarjeta). Lo anotado con crédito antes no la tiene y sigue restando
//                     como siempre: así el número no cambia solo al actualizar, ni en un dispositivo que todavía tiene la versión vieja.
//   salda: true       en un pago de la tarjeta: con ese pago la tarjeta quedó en cero, aunque los montos no coincidan
//                     (el dólar cambió, una bonificación, un redondeo del banco).
//   sinElegir: <monto> en un pago de la tarjeta: la parte que la persona dijo que es un gasto nuevo (intereses, impuestos, o compras que
//                     no anotó). Ese pago no cubre compras con crédito por esa parte, así no se lleva las del resumen siguiente, y no se
//                     le vuelve a preguntar.
import { quitarAcentos } from "./lexico.js";
import { sumarDias } from "./mes.js";

export const esDeCredito = (m) => m.enTarjeta === true && m.medio === "credito";

// Las categorías que son pagar una tarjeta: «Pago de tarjeta» y las que la persona se armó con nombre de tarjeta («Tarjeta Visa»,
// «Master»). La SUBE también es una tarjeta, pero cargarla es un gasto de transporte.
const NOMBRE_DE_TARJETA = /(^|[^a-z])(tarjetas?|visa|master|mastercard|amex|american express|naranja|cabal)($|[^a-z])/;
export function idsDeTarjeta(cats) {
  const ids = new Set(["tarjeta"]);
  for (const c of cats?.gasto || []) {
    const n = quitarAcentos(c.nombre || "");
    if (NOMBRE_DE_TARJETA.test(n) && !/sube/.test(n)) ids.add(c.id);
  }
  return ids;
}
export const esPagoDeTarjeta = (m, ids) => m.tipo !== "ingreso" && ids.has(m.categoria) && !esDeCredito(m);
const enOrden = (a, b) => a.fecha.localeCompare(b.fecha) || a.ts - b.ts;

// Lo que se debe de la tarjeta y cuánto de cada pago ya estaba contado como gasto (por compras con crédito anotadas antes).
// Se recorre en orden: cada compra suma a lo que se debe; cada pago lo baja, nunca más de lo que se debe; lo devuelto a la tarjeta
// también lo baja y puede dejar saldo a favor (debe < 0), que el próximo resumen descuenta. Un pago con salda deja todo en cero.
// Lo de ejemplo no entra.
export function cuentaDeTarjeta(movs, ids) {
  const lista = movs.filter((m) => !m.id.startsWith("ej_") && (esDeCredito(m) || esPagoDeTarjeta(m, ids))).sort(enOrden);
  let debe = 0;
  const cubierto = new Map();
  for (const m of lista) {
    if (esDeCredito(m)) debe += m.tipo === "ingreso" ? -m.monto : m.monto;
    else {
      const c = Math.max(0, Math.min(debe, m.monto - gastoNuevo(m)));
      if (c) cubierto.set(m.id, c);
      debe = m.salda ? 0 : debe - c;
    }
  }
  return { debe, cubierto };
}
// La parte de un pago que la persona dijo que es un gasto nuevo (ver sinElegir).
const gastoNuevo = (m) => (typeof m.sinElegir === "number" ? Math.min(m.monto, Math.max(0, m.sinElegir)) : 0);
// Lo que falta pagar de la tarjeta, para mostrar (un saldo a favor no se muestra como deuda).
export const porPagar = (movs, ids) => Math.max(0, cuentaDeTarjeta(movs, ids).debe);
// La parte de un pago que no cubren compras con crédito anotadas: puede ser un gasto nuevo o compras anotadas sin decir «crédito».
export const sinCubrir = (movs, ids, pago) => pago.monto - (cuentaDeTarjeta(movs, ids).cubierto.get(pago.id) || 0);

// Los gastos que pueden ser compras de esa tarjeta anotadas sin decir «crédito»: los de los 60 días antes del pago, del más nuevo al
// más viejo. Nada de pagos, de lo ya marcado con crédito, de grupos ni de ejemplo. Si la persona los elige, pasan a ser compras con
// crédito y el pago los cubre: así cuenta una sola vez, en la plata y en lo gastado.
// Si un pago anterior quedó con una parte sin cubrir, lo de antes de ese pago no se ofrece: se lo llevaría ese pago y no este.
// (Un pago anterior cubierto del todo no molesta: lo que se elija de antes queda debiéndose y lo cubre este. Así funcionan dos tarjetas.)
export const DIAS_PARA_ELEGIR = 60;
export function comprasPosibles(movs, ids, pago, dias = DIAS_PARA_ELEGIR) {
  const desde = sumarDias(pago.fecha, -dias), { cubierto } = cuentaDeTarjeta(movs, ids);
  const corte = movs.filter((m) => m.id !== pago.id && !m.id.startsWith("ej_") && esPagoDeTarjeta(m, ids) && enOrden(m, pago) < 0 && (cubierto.get(m.id) || 0) < m.monto - gastoNuevo(m))
    .sort(enOrden).pop();
  return movs.filter((m) => m.tipo === "gasto" && m.id !== pago.id && !/^(ej|gx|gp)_/.test(m.id) && !esDeCredito(m) && !esPagoDeTarjeta(m, ids) &&
    m.fecha >= desde && enOrden(m, pago) < 0 && (!corte || enOrden(corte, m) < 0)).sort((a, b) => enOrden(b, a));
}
// Lo que el pago seguiría sin cubrir si las compras elegidas pasan a ser con crédito (se prueba sobre una copia, así tiene en cuenta el
// saldo a favor y lo que ya se debía). Si queda algo, son intereses, impuestos u otro gasto nuevo.
export function restoSiEligen(movs, ids, pago, elegidas) {
  const copia = movs.map((m) => (elegidas.has(m.id) ? { ...m, medio: "credito", enTarjeta: true } : m));
  return Math.max(0, sinCubrir(copia, ids, pago));
}
// El pago por el que Inicio pregunta «¿Ya anotaste lo que compraste con esa tarjeta?»: el más nuevo de los últimos 60 días que tiene una
// parte sin cubrir, compras para elegir y no se contestó «es un gasto nuevo». Sale de los datos: vuelve sola después de «Deshacer»,
// no se pierde si se cierra la app y se va sola cuando el pago queda cubierto.
export function pagoParaElegir(movs, ids, hoy) {
  const desde = sumarDias(hoy, -DIAS_PARA_ELEGIR);
  const pagos = movs.filter((m) => !m.id.startsWith("ej_") && esPagoDeTarjeta(m, ids) && m.sinElegir === undefined && m.fecha >= desde && m.fecha <= hoy).sort((a, b) => enOrden(b, a));
  return pagos.find((p) => sinCubrir(movs, ids, p) > 0 && comprasPosibles(movs, ids, p).length) || null;
}
// El pago al que se le puede poner «quedó paga»: el último, si después no se compró nada con crédito y todavía queda algo por pagar.
// Si después hubo compras, lo que se debe es de esas compras: primero hay que anotar el pago.
export function pagoParaSaldar(movs, ids) {
  const enJuego = movs.filter((m) => !m.id.startsWith("ej_") && (esDeCredito(m) || esPagoDeTarjeta(m, ids))).sort(enOrden);
  const ultimo = enJuego.at(-1);
  return ultimo && esPagoDeTarjeta(ultimo, ids) && !ultimo.salda && porPagar(movs, ids) > 0 ? ultimo : null;
}

// Los movimientos tal como cuentan para lo gastado y lo que entró: sin la parte de cada pago de la tarjeta que ya figuraba como compra
// con crédito, y sin lo devuelto a la tarjeta (no entró a la plata: baja lo que se debe). Todo lo que suma gastos o ingresos
// (Resumen, Análisis, topes, Tu mes) usa esta lista, así lo que entró es el mismo número en todas las pantallas.
export function paraGastos(movs, ids) {
  const { cubierto } = cuentaDeTarjeta(movs, ids);
  if (!cubierto.size && !movs.some((m) => m.tipo === "ingreso" && esDeCredito(m))) return movs;
  const out = [];
  for (const m of movs) {
    if (m.tipo === "ingreso" && esDeCredito(m)) continue;
    const c = cubierto.get(m.id) || 0;
    if (c && c >= m.monto) continue;
    out.push(c ? { ...m, monto: m.monto - c } : m);
  }
  return out;
}

// Lo de la tarjeta en un mes: lo comprado con crédito (todavía no salió de la plata), lo devuelto a la tarjeta (no entró a la plata),
// lo pagado de la tarjeta que ya figuraba como gasto (pagado), todo lo que se pagó de la tarjeta (pagos) y lo que falta pagar hoy.
export function tarjetaDelMes(movs, mes, ids) {
  const { cubierto, debe } = cuentaDeTarjeta(movs, ids);
  let compras = 0, devuelto = 0, pagado = 0, pagos = 0;
  for (const m of movs) {
    if (m.id.startsWith("ej_") || !m.fecha.startsWith(mes)) continue;
    if (esDeCredito(m)) { if (m.tipo === "ingreso") devuelto += m.monto; else compras += m.monto; }
    else if (esPagoDeTarjeta(m, ids)) { pagado += cubierto.get(m.id) || 0; pagos += m.monto; }
  }
  return { compras, devuelto, pagado, pagos, debe: Math.max(0, debe) };
}
