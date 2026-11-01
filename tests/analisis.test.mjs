import { test } from "node:test";
import assert from "node:assert/strict";
import { mesAMes, loQueCambio, gastosHormiga, categoriasFuertes, comprometido, loQueViene, llegadaMeta, enDolares, progreso, diasUsando, hayMesAMes, resumenParaIA } from "../src/logic/analisis.js";

const HOY = "2026-11-20";
let n = 0;
const g = (fecha, categoria, pesos, detalle = categoria, extra = {}) => ({ id: "m" + n++, tipo: "gasto", monto: pesos * 100, detalle, categoria, medio: "", fecha, ts: 1, mod: 1, ...extra });
const ing = (fecha, pesos) => ({ id: "m" + n++, tipo: "ingreso", monto: pesos * 100, detalle: "Sueldo", categoria: "sueldo", medio: "", fecha, ts: 1, mod: 1 });

test("con pocos datos no saca conclusiones", () => {
  const movs = [g("2026-11-18", "super", 5000)];
  assert.equal(loQueCambio(movs, HOY), null);
  assert.equal(gastosHormiga(movs, HOY), null);
  assert.equal(hayMesAMes(movs, HOY), false);
  assert.equal(enDolares(movs, [], "blue", HOY), null);
  assert.equal(diasUsando(movs, HOY), 3);
  const p = progreso(movs, HOY);
  assert.equal(p.hormiga.faltan, 11);
  assert.equal(p.cambio.faltan, 2);
  assert.equal(diasUsando([g("2026-01-01", "x", 1, "x", { fijo: "f" })], HOY), 0);
});

test("lo que cambió: el último mes cerrado contra el promedio de antes", () => {
  const movs = [g("2026-09-05", "salidas", 100000), g("2026-09-06", "super", 200000), ing("2026-09-01", 500000),
    g("2026-10-05", "salidas", 200000), g("2026-10-06", "super", 100000), ing("2026-10-01", 500000), g("2026-11-05", "salidas", 999999)];
  const c = loQueCambio(movs, HOY);
  assert.equal(c.mes, "2026-10");
  assert.deepEqual([c.subio.categoria, Math.round(c.subio.parte * 100), c.subio.promedio / 100], ["salidas", 100, 100000]);
  assert.deepEqual([c.bajo.categoria, Math.round(c.bajo.parte * 100)], ["super", -50]);
  assert.equal(Math.round(c.guardo * 100), 40);
  assert.equal(Math.round(c.promedioGuardo * 100), 40);
});

test("lo que cambió: lo chico o parejo no es noticia", () => {
  const movs = [g("2026-09-05", "salidas", 100000), g("2026-09-06", "kiosco", 100), g("2026-10-05", "salidas", 105000), g("2026-10-06", "kiosco", 500)];
  const c = loQueCambio(movs, HOY);
  assert.equal(c.subio, null);
  assert.equal(c.bajo, null);
});

test("gastos hormiga: chicos, repetidos, sin lo automático", () => {
  const movs = [g("2026-10-01", "x", 1), g("2026-11-10", "servicios", 500000, "Alquiler")];
  for (let d = 10; d < 15; d++) movs.push(g("2026-11-" + d, "comida", 2000, d % 2 ? "Kiosco" : "kiosco"));
  for (let d = 10; d < 15; d++) movs.push(g("2026-11-" + d, "auto", 100, "Peaje automático", { fijo: "f" }));
  movs.push(g("2026-11-10", "comida", 2000, "Café"), g("2026-11-11", "comida", 2000, "Café"));
  const h = gastosHormiga(movs, HOY);
  assert.deepEqual(h.items.map((x) => [x.veces, x.monto / 100, x.anual / 100]), [[5, 10000, 120000]]);
  assert.equal(h.total, 1000000);
});

test("lo que viene y lo comprometido suman fijos y cuotas", () => {
  const fijos = [{ id: "f", tipo: "gasto", activo: true, monto: 38000000, moneda: "ARS", dia: 1 }, { id: "p", tipo: "gasto", activo: false, monto: 999, moneda: "ARS", dia: 1 }, { id: "s", tipo: "ingreso", activo: true, monto: 95000000, moneda: "ARS", dia: 1 }, { id: "n", tipo: "gasto", activo: true, monto: 1000, moneda: "USD", dia: 1 }];
  const compras = [{ id: "c", tarjeta: "t", detalle: "Tele", categoria: "otros", total: 28500000, cuotas: 2, desde: "2026-11", dia: 5, previas: 0, hechas: 0, ts: 1, mod: 1 }];
  const v = loQueViene(fijos, compras, HOY, 150000);
  assert.deepEqual(v.map((x) => x.mes), ["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"]);
  assert.equal(v[0].fijos, 38000000 + 1500000);
  assert.equal(v[0].cuotas, 14250000);
  assert.equal(v[2].cuotas, 0);
  assert.equal(loQueViene(fijos, compras, HOY, 0)[0].fijos, 38000000); // sin dólar, lo de dólares no se inventa
  const c = comprometido([], fijos, compras, HOY, 0);
  assert.equal(c.ingreso, 95000000);
  assert.equal(Math.round(c.parte * 100), 55);
  assert.equal(c.queda, 95000000 - 38000000 - 14250000);
  assert.equal(loQueViene([], [], HOY, 0), null);
  assert.equal(comprometido([], [], [], HOY, 0), null);
});

test("meta: cuándo llega guardando como viene", () => {
  const movs = [ing("2026-10-01", 500000), g("2026-10-02", "super", 300000)];
  const metas = [{ id: "m", nombre: "Viaje", moneda: "ARS", objetivo: 100000000, ahorrado: 40000000, ts: 1 }];
  assert.deepEqual(llegadaMeta(metas, movs, HOY), { nombre: "Viaje", mes: "2027-02" });
  assert.equal(llegadaMeta(metas, [g("2026-10-02", "super", 300000)], HOY), null); // si no guarda, no promete nada
  assert.equal(llegadaMeta([{ ...metas[0], moneda: "USD" }], movs, HOY), null);
});

test("en dólares: con el dólar de cada mes, solo meses cerrados", () => {
  const movs = [g("2026-09-05", "super", 100000), g("2026-10-05", "super", 130000), g("2026-11-05", "super", 900000)];
  const cot = (fecha, valor) => ({ id: fecha + "|blue", fecha, tipo: "blue", valor: valor * 100, fuente: "x" });
  const d = enDolares(movs, [cot("2026-09-10", 1000), cot("2026-10-10", 1300), cot("2026-10-20", 1300), cot("2026-11-10", 1500)], "blue", HOY);
  assert.deepEqual(d.filas.map((x) => [x.mes, x.usd / 100]), [["2026-09", 100], ["2026-10", 100]]);
  assert.equal(Math.round(d.pesos * 100), 30);
  assert.equal(d.usd, 0);
  assert.equal(enDolares(movs, [cot("2026-10-10", 1300)], "blue", HOY), null);
  assert.equal(enDolares(movs, [cot("2026-09-10", 1000), cot("2026-10-10", 1300)], "oficial", HOY), null);
});

test("mes a mes y categorías fuertes", () => {
  const movs = [g("2026-10-05", "super", 300), g("2026-11-05", "salidas", 900), ing("2026-11-01", 1000)];
  const m = mesAMes(movs, HOY);
  assert.equal(m.length, 6);
  assert.deepEqual(m[5], { mes: "2026-11", ingresos: 100000, gastos: 90000, parcial: true });
  assert.deepEqual(categoriasFuertes(movs, HOY), ["salidas", "super"]);
});

test("el resumen para la IA no lleva el detalle de cada gasto", () => {
  const t = resumenParaIA({ movs: [g("2026-11-05", "salidas", 900, "Cumple de Ana"), ing("2026-11-01", 1000)], fijos: [], compras: [], hoy: HOY, dolar: 0, nombreCat: (id) => "Cat " + id, nombreMes: () => "Noviembre", formatear: (c) => "$" + c / 100 });
  assert.ok(t.includes("Cat salidas $900"));
  assert.ok(t.includes("entró $1000"));
  assert.ok(!t.includes("Ana"));
});
