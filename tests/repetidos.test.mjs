// «Lo de siempre»: lo que la persona anota igual una y otra vez, para anotarlo de nuevo con un toque desde Inicio.
// Regla (pedido del usuario, 2026-11-18): el mismo detalle y el mismo monto 5 veces, las 5 en los últimos 10 días.
import { test } from "node:test";
import assert from "node:assert/strict";
import { repetidos, VECES_REPETIDO, DIAS_REPETIDO, CUANTOS_REPETIDOS } from "../src/logic/repetidos.js";

const HOY = "2026-11-17";
let n = 0;
const m = (detalle, pesos, fecha = HOY, extra = {}) => ({ id: "m" + ++n, tipo: "gasto", monto: pesos * 100, detalle, categoria: "comida", medio: "", fecha, ts: ++n, mod: n, ...extra });
// k veces, una por día hacia atrás desde hoy.
const veces = (k, detalle, pesos, extra) => Array.from({ length: k }, (_, i) => m(detalle, pesos, "2026-11-" + String(17 - i).padStart(2, "0"), extra));

test("aparece desde la quinta vez que se anota igual, con el mismo detalle y el mismo monto", () => {
  assert.equal(VECES_REPETIDO, 5);
  assert.deepEqual(repetidos(veces(4, "Café", 2500), HOY), [], "cuatro veces todavía no");
  const r = repetidos(veces(5, "Café", 2500), HOY);
  assert.deepEqual(r, [{ detalle: "Café", monto: 2500_00, categoria: "comida", medio: "", veces: 5 }]);
  // Las cinco el mismo día también cuentan.
  assert.equal(repetidos(Array.from({ length: 5 }, () => m("Café", 2500)), HOY).length, 1);
  // «café» y «Cafe» son lo mismo; otro monto es otra cosa.
  assert.equal(repetidos([m("café", 2500), m("Cafe", 2500), m("CAFÉ", 2500), m("café ", 2500), m("Café", 2500)], HOY).length, 1);
  assert.deepEqual(repetidos([...veces(4, "Café", 2500), m("Café", 2600)], HOY), [], "con un monto distinto no es «lo de siempre»");
  assert.deepEqual(repetidos([...veces(3, "Café", 2500), ...veces(2, "Medialuna", 2500)], HOY), [], "otro detalle con la misma plata es otra cosa");
  assert.deepEqual(repetidos([...veces(5, "Café", 2500), ...veces(5, "Medialuna", 2500)], HOY).map((x) => x.detalle).sort(), ["Café", "Medialuna"]);
});

test("las cinco tienen que estar en los últimos diez días (hoy y los nueve de antes)", () => {
  assert.equal(DIAS_REPETIDO, 10);
  const cuatroCerca = ["2026-11-17", "2026-11-15", "2026-11-12", "2026-11-09"].map((f) => m("Bondi", 700, f));
  // La quinta, justo el primero de los diez días (el 8): cuenta.
  assert.equal(repetidos([...cuatroCerca, m("Bondi", 700, "2026-11-08")], HOY).length, 1, "el día 10 todavía entra");
  // La quinta, un día antes (el 7, hace once días): no cuenta, y con cuatro no aparece.
  assert.deepEqual(repetidos([...cuatroCerca, m("Bondi", 700, "2026-11-07")], HOY), [], "hace once días ya no entra");
  // Muchas veces el mes pasado no alcanzan si en los últimos diez días hay menos de cinco.
  const antes = Array.from({ length: 20 }, (_, i) => m("Bondi", 700, "2026-10-" + String(10 + i).padStart(2, "0")));
  assert.deepEqual(repetidos([...antes, ...cuatroCerca], HOY), []);
  // Si se deja de comprar, deja de aparecer solo: las mismas cinco, mirando desde unos días después.
  const cinco = [...cuatroCerca, m("Bondi", 700, "2026-11-08")];
  assert.equal(repetidos(cinco, "2026-11-17").length, 1);
  assert.deepEqual(repetidos(cinco, "2026-11-18"), [], "al día siguiente la del 8 ya quedó afuera");
});

test("solo lo que anotó la persona, en pesos", () => {
  const no = [
    ...veces(6, "Alquiler", 300000, { fijo: "f1" }),
    ...veces(6, "Heladera · cuota 1/6", 10000, { cuota: { compra: "c", n: 1, de: 6 } }),
    ...veces(6, "Asado", 8000).map((x, i) => ({ ...x, id: "gx_g_" + i })),
    ...veces(6, "Ejemplo", 1000).map((x, i) => ({ ...x, id: "ej_" + i })),
    ...veces(6, "Sueldo", 500000, { tipo: "ingreso" }),
    ...veces(6, "Hotel", 100, { usd: { monto: 10000, valor: 150000 } }),
    ...veces(6, "", 500),
  ];
  assert.deepEqual(repetidos(no, HOY), []);
  // Lo mismo, como gasto común, sí aparece: lo que lo saca es la marca, no otra cosa.
  assert.equal(repetidos(veces(6, "Alquiler", 300000), HOY).length, 1);
});

test("como mucho tres, los más repetidos primero, y se anotan como la última vez", () => {
  assert.equal(CUANTOS_REPETIDOS, 3);
  const lista = [...veces(7, "Bondi", 700), ...veces(6, "Café", 2500), ...veces(5, "Diario", 1500), ...veces(5, "Alfajor", 1200)];
  lista.push(m("Bondi", 700, HOY, { medio: "debito", categoria: "transporte", ts: 999 }));
  const r = repetidos(lista, HOY);
  // Diario y Alfajor empatan en cinco: gana el anotado más tarde (Alfajor va después en la lista, con ts mayor).
  assert.deepEqual(r.map((x) => x.detalle), ["Bondi", "Café", "Alfajor"]);
  assert.equal(r.length, 3);
  assert.deepEqual([r[0].medio, r[0].categoria, r[0].veces], ["debito", "transporte", 8], "con el medio y la categoría de la última vez");
  // Si la última vez fue con crédito, la próxima también: así va a la tarjeta.
  const conCredito = [...veces(4, "Nafta", 30000), m("Nafta", 30000, HOY, { medio: "credito", enTarjeta: true, ts: 5000 })];
  assert.equal(repetidos(conCredito, HOY)[0].medio, "credito");
  // Lo del futuro (una juntada con fecha que viene) no entra.
  assert.deepEqual(repetidos(veces(5, "Pizza", 9000).map((x) => ({ ...x, fecha: "2026-11-30" })), HOY), []);
});
