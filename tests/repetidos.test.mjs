// «Lo de siempre»: lo que la persona anota igual una y otra vez, para anotarlo de nuevo con un toque desde Inicio.
import { test } from "node:test";
import assert from "node:assert/strict";
import { repetidos, VECES_REPETIDO, CUANTOS_REPETIDOS } from "../src/logic/repetidos.js";

const HOY = "2026-11-17";
let n = 0;
const m = (detalle, pesos, fecha = HOY, extra = {}) => ({ id: "m" + ++n, tipo: "gasto", monto: pesos * 100, detalle, categoria: "comida", medio: "", fecha, ts: ++n, mod: n, ...extra });
const veces = (k, detalle, pesos, extra) => Array.from({ length: k }, (_, i) => m(detalle, pesos, "2026-11-" + String(17 - i).padStart(2, "0"), extra));

test("aparece desde la tercera vez que se anota igual, con el mismo detalle y el mismo monto", () => {
  assert.equal(VECES_REPETIDO, 3);
  assert.deepEqual(repetidos(veces(2, "Café", 2500), HOY), [], "dos veces todavía no");
  const r = repetidos(veces(3, "Café", 2500), HOY);
  assert.deepEqual(r, [{ detalle: "Café", monto: 2500_00, categoria: "comida", medio: "", veces: 3 }]);
  // «café» y «Cafe» son lo mismo; otro monto es otra cosa.
  assert.equal(repetidos([m("café", 2500), m("Cafe", 2500), m("CAFÉ", 2500)], HOY).length, 1);
  assert.deepEqual(repetidos([m("Café", 2500), m("Café", 2600), m("Café", 2700)], HOY), [], "con montos distintos no es «lo de siempre»");
});

test("solo lo que anotó la persona, en pesos y del último mes y medio", () => {
  const no = [
    ...veces(3, "Alquiler", 300000, { fijo: "f1" }),
    ...veces(3, "Heladera · cuota 1/6", 10000, { cuota: { compra: "c", n: 1, de: 6 } }),
    ...veces(3, "Asado", 8000).map((x, i) => ({ ...x, id: "gx_g_" + i })),
    ...veces(3, "Ejemplo", 1000).map((x, i) => ({ ...x, id: "ej_" + i })),
    ...veces(3, "Sueldo", 500000, { tipo: "ingreso" }),
    ...veces(3, "Hotel", 100, { usd: { monto: 10000, valor: 150000 } }),
    ...veces(3, "", 500),
    m("Bondi", 700, "2026-09-01"), m("Bondi", 700, "2026-09-02"), m("Bondi", 700, "2026-09-03"),
  ];
  assert.deepEqual(repetidos(no, HOY), []);
});

test("como mucho tres, los más repetidos primero, y se anotan como la última vez", () => {
  assert.equal(CUANTOS_REPETIDOS, 3);
  const lista = [...veces(5, "Bondi", 700), ...veces(4, "Café", 2500), ...veces(3, "Diario", 1500), ...veces(3, "Alfajor", 1200)];
  lista.push(m("Bondi", 700, HOY, { medio: "debito", categoria: "transporte", ts: 999 }));
  const r = repetidos(lista, HOY);
  assert.deepEqual(r.map((x) => x.detalle), ["Bondi", "Café", r[2].detalle]);
  assert.equal(r.length, 3);
  assert.deepEqual([r[0].medio, r[0].categoria, r[0].veces], ["debito", "transporte", 6], "con el medio y la categoría de la última vez");
  // Si la última vez fue con crédito, la próxima también: así va a la tarjeta.
  const conCredito = [...veces(2, "Nafta", 30000), m("Nafta", 30000, HOY, { medio: "credito", enTarjeta: true, ts: 5000 })];
  assert.equal(repetidos(conCredito, HOY)[0].medio, "credito");
  // Lo del futuro (una juntada con fecha que viene) no entra.
  assert.deepEqual(repetidos(veces(3, "Pizza", 9000).map((x) => ({ ...x, fecha: "2026-11-30" })), HOY), []);
});
