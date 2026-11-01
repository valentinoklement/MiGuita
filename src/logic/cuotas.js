// Compras en cuotas con tarjeta. Todo en centavos.
//   tarjeta: { id, nombre, ts }
//   compra:  { id, tarjeta (id), detalle, categoria, moneda?: "ARS"|"USD", total, cuotas, desde "AAAA-MM" (mes de la cuota 1), dia (1 a 31),
//              previas (las que ya estaban pagas al cargarla: no se anotan), hechas (hasta qué cuota ya se anotó), ts, mod }
// Como los fijos: una cuota se anota recién cuando llega su fecha, así lo que falta nunca cuenta como gastado antes de tiempo.
// El movimiento tiene id fijo "cq_<compra>_<n>" (nunca se duplica, tampoco entre dispositivos) y lleva cuota: { compra, n, de }.
import { cambiarMes, diasDelMes } from "./mes.js";
import { enPesos } from "./plan.js";

export const MAX_CUOTAS = 60;
export const SIN_TARJETA = "Sin tarjeta";

// El resto de dividir va en las primeras cuotas: la suma da exactamente el total.
export const montoCuota = (c, n) => Math.floor(c.total / c.cuotas) + (n <= c.total % c.cuotas ? 1 : 0);
export const mesCuota = (c, n) => cambiarMes(c.desde, n - 1);
export function fechaCuota(c, n) {
  const m = mesCuota(c, n);
  return m + "-" + String(Math.min(c.dia, diasDelMes(m))).padStart(2, "0");
}
export const hechasDe = (c) => Math.max(c.hechas || 0, c.previas || 0);
export const movsDeCompra = (movs, id) => movs.filter((x) => x.cuota?.compra === id);

export function movimientoDeCuota(c, n, cotizar) {
  const fecha = fechaCuota(c, n), monto = montoCuota(c, n);
  // Lo de ejemplo empieza con "ej_", así se va con el resto del ejemplo y no viaja a otros dispositivos.
  const id = (c.id.startsWith("ej_") ? "ej_" : "") + "cq_" + c.id + "_" + n;
  return enPesos({ id, tipo: "gasto", monto, detalle: c.detalle + " · cuota " + n + "/" + c.cuotas, categoria: c.categoria, medio: "credito", fecha,
    ts: Date.parse(fecha + "T12:00:00"), mod: Date.now(), cuota: { compra: c.id, n, de: c.cuotas } }, { moneda: c.moneda, monto }, cotizar);
}

// Anota las cuotas que ya llegaron a su fecha, aunque la app no se haya abierto ese día.
export function correrCuotas(compras, movs, hoy, cotizar) {
  const ids = new Set(movs.map((x) => x.id));
  const nuevos = [], cambiadas = [];
  for (const c of compras) {
    let hechas = hechasDe(c);
    for (let n = hechas + 1; n <= c.cuotas && fechaCuota(c, n) <= hoy; n++) {
      const mov = movimientoDeCuota(c, n, cotizar);
      if (!mov) break; // sin dólar todavía: se anota cuando lo haya
      if (!ids.has(mov.id)) { nuevos.push(mov); ids.add(mov.id); }
      hechas = n;
    }
    if (hechas !== c.hechas) cambiadas.push({ ...c, hechas });
  }
  return { nuevos, cambiadas };
}

// Cuánto falta pagar de una compra y cuándo viene la próxima cuota.
export function infoCompra(c) {
  const hechas = hechasDe(c), faltan = c.cuotas - hechas;
  let debe = 0;
  for (let n = hechas + 1; n <= c.cuotas; n++) debe += montoCuota(c, n);
  return { hechas, faltan, debe, terminada: faltan <= 0, proxima: faltan > 0 ? fechaCuota(c, hechas + 1) : "", cuota: montoCuota(c, Math.min(hechas + 1, c.cuotas)) };
}

const sumar = (t, c, monto) => { if (c.moneda === "USD") t.usd += monto; else t.pesos += monto; };
const nuevaFila = (id, nombre) => ({ id, nombre, compras: [], terminadas: [], debe: { pesos: 0, usd: 0 }, esteMes: { pesos: 0, usd: 0 } });

// Seguimiento: lo que se debe en total, por tarjeta (con sus compras) y lo que toca pagar mes a mes.
export function resumenCuotas(compras, tarjetas, hoy, meses = 6) {
  const mesHoy = hoy.slice(0, 7);
  const filas = Array.from({ length: meses }, (_, i) => ({ mes: cambiarMes(mesHoy, i), pesos: 0, usd: 0 }));
  const total = { pesos: 0, usd: 0 };
  const porTarjeta = new Map(tarjetas.map((t) => [t.id, nuevaFila(t.id, t.nombre)]));
  for (const c of compras) {
    // Si borraron la tarjeta, la compra sigue acá, como "Sin tarjeta".
    const clave = porTarjeta.has(c.tarjeta) ? c.tarjeta : "";
    if (!porTarjeta.has(clave)) porTarjeta.set("", nuevaFila("", SIN_TARJETA));
    const t = porTarjeta.get(clave), i = infoCompra(c);
    (i.terminada ? t.terminadas : t.compras).push({ ...c, info: i });
    sumar(t.debe, c, i.debe); sumar(total, c, i.debe);
    for (let n = (c.previas || 0) + 1; n <= c.cuotas; n++) {
      const m = mesCuota(c, n), fila = filas.find((f) => f.mes === m);
      if (fila) sumar(fila, c, montoCuota(c, n));
      if (m === mesHoy) sumar(t.esteMes, c, montoCuota(c, n));
    }
  }
  const lista = [...porTarjeta.values()];
  lista.forEach((t) => t.compras.sort((a, b) => a.info.proxima.localeCompare(b.info.proxima) || a.ts - b.ts));
  return { total, meses: filas, tarjetas: lista, terminadas: lista.reduce((a, t) => a + t.terminadas.length, 0) };
}
