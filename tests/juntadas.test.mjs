// Juntadas: cada uno entra solo en lo que consumió, varios pueden haber pagado, y cada juntada se salda aparte.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as G from "../src/logic/grupos.js";
import { formatear } from "../src/logic/dinero.js";

const gente = ["juan", "nico", "fede", "lucas", "tomi", "santi"];
const compra = (id, t, m, p, a, extra = {}) => ({ id, t, m, p, a, sp: "eq", w: {}, f: "2026-11-01", ts: 1, j: "j1", ...extra });
const grupo = () => ({
  id: "g", nombre: "Los pibes", moneda: "ARS", ts: 1, yo: "lucas",
  miembros: [...gente, "pepe"].map((id) => ({ id, nombre: id[0].toUpperCase() + id.slice(1), alias: id === "juan" ? "juan.mp" : "", ts: 1 })),
  juntadas: [{ id: "j1", nombre: "Asado del sábado", f: "2026-11-01", gente, ts: 1 }],
  gastos: [
    compra("c1", "Comida", 48000, "juan", gente),
    compra("c2", "Fernet", 30000, "nico", ["nico", "fede", "lucas"]),
    compra("c3", "Birra", 24000, "juan", ["juan", "lucas", "tomi"]),
    compra("c4", "Hielo", 6000, "fede", ["nico", "fede", "lucas"]),
    { id: "viejo", t: "Algo de antes", m: 1000, p: "pepe", a: ["pepe", "juan"], sp: "eq", w: {}, f: "2026-10-01", ts: 1 },
  ],
  pagos: [],
});

test("el ejemplo del asado: 5 transferencias y nadie hace de intermediario", () => {
  const g = grupo();
  const ts = G.cuentas(g, "j1").map((t) => [t.de, t.a, t.m / 100]);
  assert.deepEqual(ts, [["lucas", "juan", 28000], ["tomi", "juan", 16000], ["fede", "juan", 12000], ["fede", "nico", 2000], ["santi", "nico", 8000]]);
  const d = G.detalleDe(g, "j1", "lucas");
  assert.equal(d.toca, 2800000);
  assert.deepEqual(d.lineas.map((l) => [l.t, l.parte / 100, l.entre]), [["Comida", 8000, 6], ["Fernet", 10000, 3], ["Birra", 8000, 3], ["Hielo", 2000, 3]]);
  assert.deepEqual(G.miSituacion(g), { debo: 2800000, meDeben: 0 });
  assert.equal(G.saldos(g, "j1").pepe, 0, "el que no fue no entra en la juntada");
  assert.ok(G.haySueltos(g), "lo de antes queda como gastos sueltos");
  assert.deepEqual(G.cuentas(g, "").map((t) => [t.de, t.a, t.m / 100]), [["juan", "pepe", 500]]);
});

test("pesos enteros: $3.333,33 pasa a $3.333 y lo de centavos se da por saldado", () => {
  const g = { ...grupo(), gastos: [compra("c", "Pizza", 10000, "juan", ["juan", "nico", "fede"])] };
  assert.deepEqual(G.cuentas(g, "j1").map((t) => t.m), [333300, 333300]);
  g.pagos = [{ id: "p1", de: "nico", a: "juan", m: 3333, f: "", ts: 2, j: "j1" }, { id: "p2", de: "fede", a: "juan", m: 3333, f: "", ts: 2, j: "j1" }];
  assert.deepEqual(G.cuentas(g, "j1"), [], "pagando lo redondeado quedan a mano");
});

test("pagaron varios la misma compra", () => {
  const g = { ...grupo(), gastos: [compra("c", "Carne", 40000, "juan", ["juan", "nico", "fede", "lucas"], { pp: { juan: 25000, nico: 15000 } })] };
  assert.deepEqual(G.pagadores(g.gastos[0]), { juan: 2500000, nico: 1500000 });
  assert.deepEqual(G.cuentas(g, "j1").map((t) => [t.de, t.a, t.m / 100]), [["fede", "juan", 10000], ["lucas", "juan", 5000], ["lucas", "nico", 5000]]);
  // Si los montos no suman el total, se toma solo a quien figura como que pagó.
  assert.deepEqual(G.pagadores({ m: 100, p: "juan", pp: { juan: 10, nico: 10 } }), { juan: 10000 });
});

test("lo nuevo viaja en los códigos y en la fusión sin perderse", async () => {
  const g = grupo();
  g.gastos[0].pp = { juan: 40000, nico: 8000 };
  g.pagos = [{ id: "p", de: "lucas", a: "juan", m: 28000, f: "2026-11-02", ts: 3, j: "j1" }];
  const vuelta = await G.decodificar(await G.codificar(g));
  assert.deepEqual(vuelta.juntadas, g.juntadas.map((x) => ({ ...x, x: false })));
  assert.equal(vuelta.gastos.find((x) => x.id === "c1").j, "j1");
  assert.deepEqual(vuelta.gastos.find((x) => x.id === "c1").pp, { juan: 40000, nico: 8000 });
  assert.equal(vuelta.pagos[0].j, "j1");
  assert.equal(vuelta.gastos.find((x) => x.id === "viejo").j, undefined);
  // Un celu con la versión vieja manda el mismo gasto sin j (misma hora): gana el que trae más datos.
  const sinJ = { ...vuelta, juntadas: undefined, gastos: vuelta.gastos.map(({ j, pp, ...x }) => x) };
  for (const [a, b] of [[vuelta, sinJ], [sinJ, vuelta]]) {
    const f = G.fusionar(a, b);
    assert.equal(f.gastos.find((x) => x.id === "c1").j, "j1");
    assert.equal(f.juntadas.length, 1);
  }
  // Borrar una juntada viaja como lápida.
  const borrada = { ...vuelta, juntadas: [{ ...vuelta.juntadas[0], x: true, ts: 9 }] };
  assert.equal(G.fusionar(vuelta, borrada).juntadas[0].x, true);
  assert.deepEqual(G.juntadasVivas(G.fusionar(vuelta, borrada)), []);
});

test("resumen de la juntada para WhatsApp", () => {
  const t = G.textoWhatsApp(grupo(), (c) => formatear(c), "j1");
  assert.match(t, /^\*Asado del sábado\*/);
  assert.match(t, /• Fernet: \$30\.000 \(pagó Nico, entre 3\)/);
  assert.match(t, /Lucas → Juan: \$28\.000 \(alias juan\.mp\)/);
  assert.match(t, /Fede → Nico: \$2\.000\n/);
});
