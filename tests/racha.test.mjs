// Racha, salvavidas y festejos (reglas portadas de la app anterior).
import { test } from "node:test";
import assert from "node:assert/strict";
import { infoRacha, apretado, salvavidasPara, festejoDeHoy } from "../src/logic/racha.js";
import { sumarDias } from "../src/logic/mes.js";

const HOY = "2026-10-31";
const m = (f, tipo = "gasto", monto = 100) => ({ fecha: f, tipo, monto, categoria: "super" });
const atras = (...ds) => ds.map((d) => m(sumarDias(HOY, -d)));

test("racha actual, mejor racha y total de días", () => {
  assert.deepEqual(infoRacha([], [], HOY), { actual: 0, mejor: 0, hoyHecho: false, total: 0, proximo: 7 });
  const r = infoRacha(atras(0, 1, 2, 4, 5, 6, 7, 8), [], HOY);
  assert.equal(r.actual, 3);
  assert.equal(r.mejor, 5);
  assert.equal(r.total, 8);
  assert.equal(r.hoyHecho, true);
  // Hoy todavía no se anotó: la racha sigue viva desde ayer.
  const s = infoRacha(atras(1, 2), [], HOY);
  assert.equal(s.actual, 2);
  assert.equal(s.hoyHecho, false);
  assert.equal(infoRacha(atras(2, 3), [], HOY).actual, 0);
  assert.equal(infoRacha([m("2026-11-01"), m("2026-10-31")], [], "2026-11-01").actual, 2); // cruza el mes
});

test("'No gasté hoy' y salvavidas cuentan como día anotado", () => {
  const r = infoRacha(atras(2, 3), [{ fecha: HOY, sinGasto: true }, { fecha: sumarDias(HOY, -1), salvavidas: true }], HOY);
  assert.equal(r.actual, 4);
  assert.equal(r.hoyHecho, true);
});

test("movimientos con fecha futura no suman a la racha ni al total", () => {
  const r = infoRacha([m(HOY), m(sumarDias(HOY, 1))], [], HOY);
  assert.equal(r.actual, 1);
  assert.equal(r.total, 1);
});

test("próximo premio", () => {
  assert.equal(infoRacha(atras(0, 1, 2, 3, 4, 5, 6), [], HOY).proximo, 14);
  const largo = Array.from({ length: 120 }, (_, i) => i);
  assert.equal(infoRacha(atras(...largo), [], HOY).proximo, null);
});

test("apretado: casi todo gastado, presupuestos y deudas", () => {
  const ing = { fecha: "2026-10-01", tipo: "ingreso", monto: 1000, categoria: "sueldo" };
  assert.deepEqual(apretado([ing, m("2026-10-05", "gasto", 899)], HOY), []);
  assert.deepEqual(apretado([ing, m("2026-10-05", "gasto", 900)], HOY), ["ya gastaste casi todo lo que cobraste"]);
  assert.deepEqual(apretado([m("2026-09-05", "gasto", 5000), ing], HOY), [], "otro mes no cuenta");
  assert.deepEqual(apretado([ing, m("2026-10-05", "gasto", 80)], HOY, [{ categoria: "super", tope: 100 }], [], () => "Súper"), ["estás llegando al tope de Súper"]);
  assert.deepEqual(apretado([ing, m("2026-10-05", "gasto", 100)], HOY, [{ categoria: "super", tope: 100 }], [], () => "Súper"), ["te pasaste del presupuesto de Súper"]);
  assert.deepEqual(apretado([ing], HOY, [], [{ restante: 1000 }]), ["debés más de lo que cobrás en el mes"]);
  assert.deepEqual(apretado([], HOY, [], [{ restante: 1000 }]), [], "sin ingresos no se compara con deudas");
});

test("salvavidas: solo con racha de 2+, ayer vacío, apretado y cada 30 días", () => {
  const motivo = ["ya gastaste casi todo lo que cobraste"];
  const base = atras(2, 3);
  assert.equal(salvavidasPara(base, [], HOY, motivo), "2026-10-30");
  assert.equal(salvavidasPara(base, [], HOY, []), null, "si no está apretado, no");
  assert.equal(salvavidasPara(atras(2), [], HOY, motivo), null, "racha de 1 no alcanza");
  assert.equal(salvavidasPara(atras(1, 2, 3), [], HOY, motivo), null, "ayer ya está anotado");
  assert.equal(salvavidasPara(base, [{ fecha: "2026-10-05", salvavidas: true }], HOY, motivo), null, "hubo uno hace 26 días");
  assert.equal(salvavidasPara(base, [{ fecha: "2026-10-01", salvavidas: true }], HOY, motivo), "2026-10-30", "hace 30 días ya se puede");
  assert.equal(salvavidasPara(base, [{ fecha: "2026-10-30", sinGasto: true }], HOY, motivo), null, "ayer marcó que no gastó");
});

test("festejos en 7, 14, 21, 30, 60, 100, 200 y 365", () => {
  assert.equal(festejoDeHoy({ hoyHecho: true, actual: 7 }), 7);
  assert.equal(festejoDeHoy({ hoyHecho: true, actual: 8 }), null);
  assert.equal(festejoDeHoy({ hoyHecho: false, actual: 7 }), null);
  assert.equal(festejoDeHoy({ hoyHecho: true, actual: 365 }), 365);
  assert.equal(festejoDeHoy({ hoyHecho: true, actual: 3 }), null, "el 3 de la app anterior ya no festeja");
});
