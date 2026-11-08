import { test } from "node:test";
import assert from "node:assert/strict";
import { tuPlata, parteDePlata, hayQuePreguntar, enMetas, apartado, podesUsar, ahorroSinPreguntar, enElMes, desglose, anotadoAntes, saldoDesde, saldoEfectivo } from "../src/logic/saldo.js";
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

test("primero un gasto y después la plata: el orden no importa si no estaba restado", () => {
  const nafta = m("nafta", "gasto", 20000, "2026-11-08", 500);
  const antes = anotadoAntes([nafta], "2026-11");
  assert.deepEqual([antes.gastos, antes.ingresos, antes.lista.length], [2000000, 0, 1]);
  // El caso del audio: 20.000 de nafta y después 100.000 → quedan 80.000.
  const s = saldoDesde(10000000, antes.lista);
  assert.equal(tuPlata(s, [nafta]), 8000000);
  assert.equal(hayQuePreguntar(s, m("x", "gasto", 1, "2026-11-08", 900), "2026-11-08"), false); // ya contestó: no se pregunta más
  // Lo que se anota después sigue sumando y restando.
  assert.equal(tuPlata(s, [nafta, m("y", "ingreso", 5000, "2026-11-09", 900)]), 8500000);
  // Si ya estaba restado, el número queda como lo cargó.
  assert.equal(tuPlata({ monto: 10000000, ts: 1000, fecha: "2026-11-08" }, [nafta]), 10000000);
});

test("lo que no se pregunta: ejemplos, lo marcado como previo y otros meses", () => {
  const movs = [m("ej_1", "gasto", 1, "2026-11-08", 1), m("p", "gasto", 1, "2026-11-08", 1, { previo: true }), m("v", "gasto", 1, "2026-10-08", 1)];
  assert.equal(anotadoAntes(movs, "2026-11").lista.length, 0);
});

test("la cuenta que se muestra da lo mismo que el número de Inicio", () => {
  const movs = [m("a", "gasto", 20000, "2026-11-02", 2000), m("b", "ingreso", 50000, "2026-11-03", 3000)];
  const metas = [meta("x", 1000000)];
  const d = desglose(saldo, movs, metas, "2026-11");
  assert.deepEqual(d, { tenias: 3000000, entro: 5000000, gasto: 2000000, metas: 1000000, queda: 5000000 });
  assert.equal(d.queda, podesUsar(saldo, movs, metas));
  assert.equal(desglose(null, movs, metas, "2026-11"), null);
});

test("las dos respuestas a la pregunta dan cuentas que cierran y no se contradicen con lo anotado", () => {
  const nafta = m("nafta", "gasto", 20000, "2026-11-08", 500);
  // «Ya está restado»: tenés 100.000 después de gastar 20.000, así que empezaste con 120.000.
  const yaEstaba = { monto: 10000000, ts: 1000, fecha: "2026-11-08" };
  assert.deepEqual(enElMes(yaEstaba, [nafta], "2026-11"), { usar: 10000000, gastado: 2000000, hubo: 12000000 });
  assert.deepEqual(desglose(yaEstaba, [nafta], [], "2026-11"), { tenias: 12000000, entro: 0, gasto: 2000000, metas: 0, queda: 10000000 });
  // «Restalo»: empezaste con 100.000 y quedan 80.000.
  const restado = saldoDesde(10000000, [nafta]);
  assert.deepEqual(enElMes(restado, [nafta], "2026-11"), { usar: 8000000, gastado: 2000000, hubo: 10000000 });
  assert.deepEqual(desglose(restado, [nafta], [], "2026-11"), { tenias: 10000000, entro: 0, gasto: 2000000, metas: 0, queda: 8000000 });
});

test("con la plata cargada otro mes, la cuenta arranca con lo que quedó al empezar este mes", () => {
  const movs = [m("n", "gasto", 10000, "2026-11-20", 2000), m("d", "gasto", 5000, "2026-12-03", 3000), m("e", "ingreso", 2000, "2026-12-04", 4000)];
  const d = desglose(saldo, movs, [], "2026-12");
  assert.deepEqual(d, { tenias: 2000000, entro: 200000, gasto: 500000, metas: 0, queda: 1700000 });
  assert.equal(d.queda, podesUsar(saldo, movs, []));
  assert.equal(enElMes(saldo, movs, "2026-12").gastado, d.gasto);
});

test("«gastaste tanto de tanto» usa lo mismo que el pan", () => {
  const movs = [m("a", "gasto", 15000, "2026-11-02", 2000)];
  assert.deepEqual(enElMes(saldo, movs, "2026-11"), { usar: 1500000, gastado: 1500000, hubo: 3000000 });
  assert.equal(parteDePlata(saldo, movs, "2026-11"), 0.5);
  assert.deepEqual(enElMes(saldo, movs, "2026-12"), { usar: 1500000, gastado: 0, hubo: 1500000 });
});

test("sin plata cargada, lo que sobra pasa al mes siguiente", () => {
  const movs = [m("n", "gasto", 20000, "2026-11-02", 2000), m("s", "ingreso", 100000, "2026-11-05", 3000)];
  assert.equal(saldoEfectivo(null, []), null);
  assert.equal(saldoEfectivo(null, [m("n", "gasto", 1, "2026-11-02", 1)]), null); // solo gastos: todavía no se sabe cuánto hay
  const s = saldoEfectivo(null, movs);
  assert.equal(tuPlata(s, movs), 8000000); // primero el gasto y después el ingreso
  assert.deepEqual(desglose(s, movs, [], "2026-11"), { tenias: 0, entro: 10000000, gasto: 2000000, metas: 0, queda: 8000000 });
  // Empieza diciembre: los 80.000 siguen estando.
  assert.deepEqual(desglose(s, movs, [], "2026-12"), { tenias: 8000000, entro: 0, gasto: 0, metas: 0, queda: 8000000 });
  // Lo gastado antes del mes del primer ingreso no se resta: se pagó con plata que la app no conocía.
  const conViejo = [m("v", "gasto", 90000, "2026-10-20", 500), ...movs];
  assert.equal(tuPlata(saldoEfectivo(null, conViejo), conViejo), 8000000);
  // Si después carga cuánto tiene, manda eso. Los ahorros de metas no se restan sin haber preguntado.
  assert.equal(saldoEfectivo(saldo, movs), saldo);
  assert.equal(podesUsar(s, movs, [meta("a", 1000000)]), 8000000);
  // Lo de ejemplo no cuenta como primer ingreso.
  assert.equal(saldoEfectivo(null, [m("ej_1", "ingreso", 1, "2026-11-02", 1)]), null);
});

test("los ahorros no agrandan el pan", () => {
  const metas = [meta("a", 1000000)];
  assert.equal(parteDePlata(saldo, [m("a", "gasto", 10000, "2026-11-02", 2000)], "2026-11", metas), 0.5);
});
