import { test } from "node:test";
import assert from "node:assert/strict";
import { tuPlata, parteDePlata, hayQuePreguntar, enMetas, apartado, podesUsar, ahorroSinPreguntar } from "../src/logic/saldo.js";
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

test("el pan muestra cuánto queda de lo que tuviste este mes", () => {
  const mes = "2026-11";
  assert.equal(parteDePlata(null, [], mes), 0);
  assert.equal(parteDePlata(saldo, [], mes), 1);
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 15000, "2026-11-02", 2000)], mes), 0.5);
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 20000, "2026-11-02", 2000), m("b", "ingreso", 10000, "2026-11-03", 3000)], mes), 0.5);
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 90000, "2026-11-02", 2000)], mes), 0);
});

test("el pan se llena de nuevo al mes siguiente, aunque pasen muchos sueldos", () => {
  const movs = [];
  for (let i = 1; i <= 9; i++) movs.push(m("s" + i, "ingreso", 500000, "2026-1" + (i % 2) + "-0" + i, 2000 + i), m("g" + i, "gasto", 500000, "2026-1" + (i % 2) + "-0" + i, 2100 + i));
  movs.push(m("nuevo", "ingreso", 500000, "2027-01-01", 9000));
  assert.equal(parteDePlata(saldo, movs, "2027-01"), 1);
});

const meta = (id, ahorrado, moneda = "ARS") => ({ id, ahorrado, moneda });

test("lo guardado para metas no es plata para usar", () => {
  const metas = [meta("a", 1000000), meta("d", 50000, "USD"), meta("ej_x", 7777)];
  assert.equal(enMetas(metas), 1000000);
  assert.equal(enMetas(metas, "USD"), 50000);
  assert.equal(apartado(saldo, metas), 1000000);
  assert.equal(podesUsar(saldo, [], metas), 2000000);
  assert.equal(podesUsar(null, [], metas), null);
});

test("si los ahorros están aparte de la plata cargada, no se restan", () => {
  const metas = [meta("a", 1000000)];
  assert.equal(ahorroSinPreguntar(saldo, metas), 1000000);
  const aparte = { ...saldo, vistas: 1000000, aparte: 1000000 };
  assert.equal(ahorroSinPreguntar(aparte, metas), 0);
  assert.equal(podesUsar(aparte, [], metas), 3000000);
  // Lo que se suma después sí sale de la plata.
  const despues = { ...aparte, vistas: 1200000 };
  assert.equal(podesUsar(despues, [], [meta("a", 1200000)]), 2800000);
  assert.equal(ahorroSinPreguntar(despues, [meta("a", 1200000)]), 0);
});

test("los ahorros no agrandan el pan", () => {
  const metas = [meta("a", 1000000)];
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 10000, "2026-11-02", 2000)], "2026-11", metas), 0.5);
});
