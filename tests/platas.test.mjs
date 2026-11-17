// Mis platas (dólares, cripto, inversiones) y las metas con prioridad.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../src/logic/platas.js";
import { metasEnOrden, moverMeta } from "../src/logic/plan.js";

const usd = { id: "p_u", tipo: "usd", nombre: "Dólares", moneda: "USD", monto: 100000, color: 0 };
const usdt = { id: "p_t", tipo: "usdt", nombre: "USDT", moneda: "USD", monto: 50000, color: 1 };

test("metas: ordenar por prioridad sin tocar las metas", () => {
  const metas = [{ id: "a", ts: 1 }, { id: "b", ts: 2 }, { id: "c", ts: 3 }];
  assert.deepEqual(metasEnOrden(metas).map((m) => m.id), ["a", "b", "c"], "sin elegir, de la más vieja a la más nueva");
  const orden = moverMeta(metas, undefined, "c", -1);
  assert.deepEqual(orden, ["a", "c", "b"], "devuelve la lista de ids: las metas no se reescriben");
  assert.deepEqual(metasEnOrden(metas, orden).map((m) => m.id), ["a", "c", "b"]);
  assert.equal(moverMeta(metas, orden, "a", -1), null, "la primera no sube más");
  assert.equal(moverMeta(metas, orden, "b", 1), null, "la última no baja más");
  assert.deepEqual(metasEnOrden([...metas, { id: "d", ts: 0 }], orden).map((m) => m.id), ["a", "c", "b", "d"], "una nueva sin orden va al final");
  assert.deepEqual(metasEnOrden(metas, ["zz", "c"]).map((m) => m.id), ["c", "a", "b"], "un id que ya no existe no molesta");
});

test("platas: qué puntitos se ven y en qué orden", () => {
  assert.deepEqual(P.vistas(undefined), ["pesos"], "sin otras platas, un solo número");
  assert.deepEqual(P.vistas({ items: [usd, usdt] }), ["total", "pesos", "p_u", "p_t"]);
  assert.deepEqual(P.vistas({ items: [usd] }, { conPesos: false }), ["pesos", "p_u"], "sin plata cargada no hay total");
  const p = { items: [usd, usdt], orden: ["p_t", "pesos"], ocultas: ["p_u"] };
  assert.deepEqual(P.vistas(p), ["p_t", "pesos", "total"], "orden propio y la apagada no se ve");
  assert.deepEqual(P.vistas({ items: [], ocultas: ["pesos", "total"] }), ["pesos"], "nunca queda sin nada");
  assert.deepEqual(P.vistas({ items: [usd], ocultas: ["pesos"] }), ["p_u"], "con una sola prendida no hay total");
});

test("platas: abre en la última que dejaste y pasa a la siguiente", () => {
  const vs = ["pesos", "p_u", "p_t"];
  assert.equal(P.elegirVista(vs, "p_t"), "p_t");
  assert.equal(P.elegirVista(vs, "ya_no_esta"), "pesos");
  assert.equal(P.elegirVista(["p_u", "p_t"], undefined), "p_u");
  assert.equal(P.siguienteVista(vs, "pesos"), "p_u");
  assert.equal(P.siguienteVista(vs, "p_t"), "pesos", "después de la última vuelve a la primera");
});

test("platas: reordenar y apagar", () => {
  const movida = P.moverVista({ items: [usd, usdt] }, "p_t", -1);
  assert.deepEqual(movida.orden, ["total", "pesos", "p_t", "p_u"]);
  assert.equal(P.moverVista(movida, "total", -1).orden[0], "total", "la primera no sube más");
  assert.ok(P.alternarVista({}, "pesos").ocultas.includes("pesos"));
  assert.deepEqual(P.alternarVista({ ocultas: ["pesos"] }, "pesos").ocultas, []);
});

test("platas: todo junto suma lo mismo que se ve en cada puntito", () => {
  const dol = { id: "u", tipo: "usd", nombre: "D", moneda: "USD", monto: 10000, color: 0 }, inv = { id: "i", tipo: "inv", nombre: "F", moneda: "ARS", monto: 500000, color: 3 };
  assert.deepEqual(P.totalDe({ items: [dol, inv] }, 100000, 125000), { pesos: 12500000 + 500000 + 100000, usd: Math.round((12500000 + 600000) * 100 / 125000), sinDolar: false });
  assert.deepEqual(P.totalDe({ items: [dol, inv] }, 100000, 0), { pesos: 600000, usd: null, sinDolar: true }, "sin dólar avisa que falta");
  assert.equal(P.totalDe({ items: [dol, inv], ocultas: ["u"] }, 100000, 125000).pesos, 600000, "la apagada no suma");
  assert.equal(P.totalDe({ items: [inv], ocultas: ["pesos"] }, 100000, 0).pesos, 500000);
});

test("platas: lo que llega de otro lado no puede romper nada", () => {
  for (const malo of [null, undefined, 3, "x", { items: "y" }, { items: [null, {}, { id: 3, monto: 1 }, { id: "a" }] }, { orden: "z", ocultas: 9 }]) assert.deepEqual(P.limpiar(malo), { items: [], orden: ["total", "pesos"], ocultas: [] });
  const r = P.limpiar({ items: [{ id: "total", monto: 1 }, { id: "ok", monto: 5, moneda: "EUR", color: 99, nombre: "x".repeat(50) }], orden: ["ok", "nada"], ocultas: ["nada"] });
  assert.deepEqual(r.items.map((x) => x.id), ["ok"], "nadie puede hacerse pasar por el total");
  assert.equal(r.items[0].moneda, "ARS");
  assert.ok(r.items[0].color >= 0 && r.items[0].color < 6);
  assert.equal(r.items[0].nombre.length, 24);
  assert.deepEqual(r.orden, ["ok", "total", "pesos"]);
  assert.deepEqual(r.ocultas, []);
});

test("platas: colores y etiquetas", () => {
  assert.equal(P.colorLibre([{ color: 0 }], "usd"), 1, "dos dólares no comparten color");
  assert.equal(P.colorLibre([], "inv"), 3);
  assert.equal(P.etiquetaDe({ tipo: "usdt", moneda: "USD" }), "USDT ");
  assert.equal(P.etiquetaDe({ tipo: "inv", moneda: "USD" }), "US$ ");
  assert.equal(P.etiquetaDe({ tipo: "inv", moneda: "ARS" }), "$");
});
