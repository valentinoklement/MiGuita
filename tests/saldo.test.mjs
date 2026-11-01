import { test } from "node:test";
import assert from "node:assert/strict";
import { tuPlata, parteDePlata, hayQuePreguntar } from "../src/logic/saldo.js";
import { resumenMes } from "../src/logic/mes.js";

const saldo = { monto: 3000000, ts: 1000, fecha: "2026-11-02" };
const m = (id, tipo, pesos, fecha, ts, extra = {}) => ({ id, tipo, monto: pesos * 100, detalle: "", categoria: "otros", medio: "", fecha, ts, mod: ts, ...extra });

test("arranca del número cargado y se mueve con lo que se anota después", () => {
  assert.equal(tuPlata(null, []), null);
  assert.equal(tuPlata(saldo, []), 3000000);
  assert.equal(tuPlata(saldo, [m("a", "gasto", 5000, "2026-11-02", 2000), m("b", "ingreso", 1000, "2026-11-03", 3000)]), 2600000);
});

test("lo anterior no se resta dos veces", () => {
  assert.equal(tuPlata(saldo, [m("viejo", "gasto", 5000, "2026-11-01", 500)]), 3000000);
  assert.equal(tuPlata(saldo, [m("ayer", "gasto", 5000, "2026-11-01", 2000)]), 3000000); // lo anotó hoy, pero con fecha de ayer
  assert.equal(tuPlata(saldo, [m("mañana", "gasto", 5000, "2026-11-02", 500)]), 3000000);
  assert.equal(tuPlata(saldo, [m("asado", "gasto", 10000, "2026-11-02", 2000, { previo: true })]), 3000000); // el caso del asado
  assert.equal(tuPlata(saldo, [m("ej_1", "gasto", 5000, "2026-11-02", 2000)]), 3000000);
});

test("pregunta solo el día que se cargó y hasta que digan que no", () => {
  const mov = m("a", "gasto", 1, "2026-11-02", 2000);
  assert.equal(hayQuePreguntar(saldo, mov, "2026-11-02"), true);
  assert.equal(hayQuePreguntar(saldo, mov, "2026-11-03"), false);
  assert.equal(hayQuePreguntar({ ...saldo, listo: true }, mov, "2026-11-02"), false);
  assert.equal(hayQuePreguntar(null, mov, "2026-11-02"), false);
});

test("tu plata no toca el resumen del mes: no es un ingreso", () => {
  const movs = [m("g", "gasto", 5000, "2026-11-02", 2000)];
  assert.equal(resumenMes(movs, "2026-11-02").ingresos, 0);
});

test("el pan muestra cuánto queda de la plata cargada más lo que entró", () => {
  assert.equal(parteDePlata(null, []), 0);
  assert.equal(parteDePlata(saldo, []), 1);
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 15000, "2026-11-02", 2000)]), 0.5);
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 20000, "2026-11-02", 2000), m("b", "ingreso", 10000, "2026-11-03", 3000)]), 0.5);
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 90000, "2026-11-02", 2000)]), 0);
});
