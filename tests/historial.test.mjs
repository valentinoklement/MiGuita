import { test } from "node:test";
import assert from "node:assert/strict";
import { conHistorial, fusionar, limpiar, MAX_HISTORIAL } from "../src/logic/grupos.js";

const grupo = (o = {}) => ({ id: "g1", nombre: "Amigos", moneda: "ARS", ts: 1, yo: "a", miembros: [{ id: "a", nombre: "Ana", ts: 1 }, { id: "b", nombre: "Beto", ts: 1 }], gastos: [], pagos: [], ...o });
const gasto = (o = {}) => ({ id: "x", t: "Fernet", m: 100, p: "a", a: ["a", "b"], sp: "eq", w: {}, f: "2026-11-01", ts: 1, x: false, ...o });

test("anota quién sumó, cambió y borró", () => {
  const g0 = grupo();
  const g1 = conHistorial(g0, { ...g0, gastos: [gasto()] }, 1000);
  assert.deepEqual([g1.hist[0].q, g1.hist[0].k, g1.hist[0].t, g1.hist[0].por, g1.hist[0].m], ["a", "g", "Fernet", "a", 100]);
  const g2 = conHistorial(g1, { ...g1, gastos: [gasto({ m: 200, ts: 2 })] }, 1000 + 3600e3);
  assert.deepEqual([g2.hist[1].q, g2.hist[1].m0, g2.hist[1].m], ["c", 100, 200]);
  const g3 = conHistorial(g2, { ...g2, gastos: [gasto({ m: 200, ts: 3, x: true })] }, 1000 + 7200e3);
  assert.equal(g3.hist[2].q, "b");
  assert.equal(g3.hist.length, 3);
});

test("cambios que solo tocan la hora no se anotan", () => {
  const g0 = grupo({ gastos: [gasto()] });
  const g1 = conHistorial(g0, { ...g0, gastos: [gasto({ ts: 99 })] }, 1000);
  assert.equal(g1.hist, undefined);
});

test("tocar varias veces lo mismo en un ratito queda como un solo cambio", () => {
  const g0 = grupo({ gastos: [gasto()] });
  const g1 = conHistorial(g0, { ...g0, gastos: [gasto({ a: ["a"], ts: 2 })] }, 1000);
  const g2 = conHistorial(g1, { ...g1, gastos: [gasto({ a: ["b"], ts: 3 })] }, 2000);
  assert.equal(g2.hist.length, 1);
  assert.equal(g2.hist[0].e, 1);
  assert.equal(g2.hist[0].ts, 2000);
  assert.equal(g2.hist[0].id, g1.hist[0].id);
});

test("borrar una juntada se anota una vez, no por cada compra", () => {
  const j = { id: "j", nombre: "Asado", f: "", gente: [], ts: 1, x: false };
  const g0 = grupo({ juntadas: [j], gastos: [gasto({ j: "j" })] });
  const g1 = conHistorial(g0, { ...g0, juntadas: [{ ...j, x: true, ts: 2 }], gastos: [gasto({ j: "j", x: true, ts: 2 })] }, 1000);
  assert.equal(g1.hist.length, 1);
  assert.deepEqual([g1.hist[0].k, g1.hist[0].q, g1.hist[0].j], ["j", "b", "j"]);
});

test("viaja entre celus: se junta y pasa por limpiar sin perderse", () => {
  const g0 = grupo();
  const mio = conHistorial(g0, { ...g0, gastos: [gasto()] }, 1000);
  const suyo = conHistorial({ ...g0, yo: "b" }, { ...g0, yo: "b", gastos: [gasto({ id: "y", t: "Birra" })] }, 2000);
  const f = limpiar(fusionar(mio, suyo));
  assert.deepEqual(f.hist.map((h) => [h.t, h.por]), [["Fernet", "a"], ["Birra", "b"]]);
  assert.deepEqual(limpiar(fusionar(f, f)).hist, f.hist);
});

test("limpiar descarta lo que no sirve y recorta el texto", () => {
  const g = limpiar(grupo({ hist: [{ id: "1", ts: 1, por: "a", q: "a", k: "g", o: "x", t: "z".repeat(200), m: 5 }, { id: "2", q: "hackeo", k: "g", o: "x" }, { id: "<b>", q: "a", k: "g", o: "x" }] }));
  assert.equal(g.hist.length, 1);
  assert.equal(g.hist[0].t.length, 80);
});

test("no crece sin fin", () => {
  const hist = Array.from({ length: MAX_HISTORIAL + 50 }, (_, i) => ({ id: "h" + i, ts: i, por: "a", q: "a", k: "g", o: "x" + i, t: "t" }));
  const g0 = grupo({ hist });
  assert.equal(limpiar(g0).hist.length, MAX_HISTORIAL);
  assert.equal(fusionar(g0, grupo()).hist.length, MAX_HISTORIAL);
  assert.equal(conHistorial(g0, { ...g0, gastos: [gasto()] }, 1e9).hist.length, MAX_HISTORIAL);
});

test("cambiar el nombre del grupo y sumar una persona se anota", () => {
  const g0 = grupo();
  const g1 = conHistorial(g0, { ...g0, nombre: "Los pibes", miembros: [...g0.miembros, { id: "c", nombre: "Caro", ts: 5 }] }, 1000);
  assert.deepEqual(g1.hist.map((h) => [h.k, h.q, h.t]), [["m", "a", "Caro"], ["n", "c", "Los pibes"]]);
});
