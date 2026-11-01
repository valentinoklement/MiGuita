import { test } from "node:test";
import assert from "node:assert/strict";
import { datosDelMes, mesParaMostrar, elegirDelMes } from "../src/logic/tumes.js";
import { chisteDelMes } from "../src/ui/chistes.js";

const mov = (id, fecha, monto, categoria = "super", o = {}) => ({ id, tipo: "gasto", monto, categoria, fecha, ts: 1, ...o });

test("los números del mes", () => {
  const movs = [mov("a", "2026-10-01", 100), mov("b", "2026-10-02", 300, "comida"), mov("c", "2026-10-03", 100, "auto"), mov("d", "2026-10-03", 50, "gym"),
    mov("i", "2026-10-05", 1000, "sueldo", { tipo: "ingreso" }), mov("z", "2026-11-01", 999), mov("q", "2026-10-20", 500, "otros", { cuota: { compra: "x" } })];
  const d = datosDelMes(movs, [{ fecha: "2026-10-04", sinGasto: true }, { fecha: "2026-09-30" }], "2026-10");
  assert.equal(d.gastos, 1050);
  assert.equal(d.ingresos, 1000);
  assert.deepEqual(d.top.map((t) => t.id), ["otros", "comida", "super"]);
  assert.equal(d.totalDias, 31);
  assert.equal(d.diasAnotados, 5); // del 1 al 5; la cuota que se anotó sola no cuenta
  assert.equal(d.mejorRacha, 5);
});

test("el aviso aparece una sola vez, con el mes que cerró y datos de verdad", () => {
  const movs = [mov("a", "2026-10-01", 100)];
  assert.equal(mesParaMostrar(movs, "2026-11-01", ""), "2026-10");
  assert.equal(mesParaMostrar(movs, "2026-11-01", "2026-10"), null);
  assert.equal(mesParaMostrar(movs, "2026-12-01", "2026-10"), null);
  assert.equal(mesParaMostrar([mov("ej_a", "2026-10-01", 100)], "2026-11-01", ""), null);
  assert.equal(mesParaMostrar([mov("i", "2026-10-01", 100, "sueldo", { tipo: "ingreso" })], "2026-11-01", ""), null);
});

test("cada mes tiene su chiste, siempre el mismo", () => {
  assert.equal(chisteDelMes("2026-10", "comida", elegirDelMes), chisteDelMes("2026-10", "comida", elegirDelMes));
  assert.ok(chisteDelMes("2026-10", "no-existe", elegirDelMes).length > 5);
  assert.ok(chisteDelMes("2026-10", undefined, elegirDelMes).length > 5);
  const lista = ["a", "b", "c", "d"];
  assert.ok(new Set(["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"].map((m) => elegirDelMes(lista, m))).size > 1);
});
