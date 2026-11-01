// Exportar a Excel.
import { test } from "node:test";
import assert from "node:assert/strict";
import { movimientosCSV } from "../src/logic/exportar.js";

test("CSV para Excel en castellano: punto y coma, coma decimal, signos y dólares", () => {
  const movs = [
    { fecha: "2026-10-31", ts: 2, tipo: "gasto", monto: 3130000, detalle: "Suscripción", categoria: "subs", medio: "credito", usd: { monto: 2000, valor: 156500 } },
    { fecha: "2026-10-01", ts: 1, tipo: "ingreso", monto: 62000000, detalle: "Sueldo", categoria: "sueldo", medio: "" },
    { fecha: "2026-10-15", ts: 3, tipo: "gasto", monto: 250, detalle: 'Kiosco; "el de la esquina"', categoria: "comida", medio: "efectivo" },
    { fecha: "2026-10-16", ts: 4, tipo: "gasto", monto: 100, detalle: "=HYPERLINK(\"x\")", categoria: "otros", medio: "" },
  ];
  const csv = movimientosCSV(movs, (c) => ({ subs: "Suscripciones", sueldo: "Sueldo", comida: "Comer afuera", otros: "Otros" })[c], (m) => ({ credito: "Crédito", efectivo: "Efectivo" })[m] || "");
  assert.ok(csv.startsWith("﻿Fecha;Tipo;Detalle;Categoría;Medio de pago;Monto en pesos;Monto en dólares;Dólar usado\r\n"));
  const filas = csv.slice(1).trim().split("\r\n");
  assert.equal(filas[1], "01/10/2026;Ingreso;Sueldo;Sueldo;;620000,00;;", "ordenado por fecha, ingreso en positivo");
  assert.equal(filas[2], '15/10/2026;Gasto;"Kiosco; ""el de la esquina""";Comer afuera;Efectivo;-2,50;;', "comillas y punto y coma escapados");
  assert.equal(filas[3], `16/10/2026;Gasto;"'=HYPERLINK(""x"")";Otros;;-1,00;;`, "una fórmula queda como texto");
  assert.equal(filas[4], "31/10/2026;Gasto;Suscripción;Suscripciones;Crédito;-31300,00;-20,00;1565,00");
});
