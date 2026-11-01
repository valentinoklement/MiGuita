// Importar resúmenes de billeteras y bancos (CSV y Excel).
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerCSV, leerXLSX, leerFecha, leerImporte, encontrarColumnas, armarMovimientos } from "../src/logic/importar.js";
import { categoriasIniciales } from "../src/logic/categorias.js";

const cats = categoriasIniciales();

test("fechas en distintos formatos", () => {
  assert.equal(leerFecha("31/10/2026"), "2026-10-31");
  assert.equal(leerFecha("1/9/26"), "2026-09-01");
  assert.equal(leerFecha("2026-10-31T14:22:10.000-03:00"), "2026-10-31");
  assert.equal(leerFecha("31-10-2026 14:22"), "2026-10-31");
  assert.equal(leerFecha("46326"), "2026-10-31", "número de serie de Excel");
  for (const malo of ["", "hola", "45/13/2026", "Supermercado"]) assert.equal(leerFecha(malo), null, malo);
});

test("montos escritos de mil maneras", () => {
  const casos = { "-$ 1.234,56": -123456, "1234.56": 123456, "-1,234.56": -123456, "(1.234,56)": -123456, "$ 20.000": 2000000, "20.000,00": 2000000,
    "1.234.567": 123456700, "-38500": -3850000, "2,5": 250, "1500-": -150000, "+ 620.000,00": 62000000, "ARS -9.800,00": -980000 };
  for (const [t, c] of Object.entries(casos)) assert.equal(leerImporte(t), c, t);
  for (const malo of ["", "abc", "12a", "Supermercado"]) assert.equal(leerImporte(malo), null, malo);
});

test("CSV con punto y coma, comillas y encabezado de Mercado Pago o banco", () => {
  const csv = '﻿Fecha;Descripción;Monto\r\n31/10/2026;"Pago en Coto; sucursal 12";-38.500,00\r\n30/10/2026;Transferencia recibida;620.000,00\r\n30/10/2026;YPF;-20.000,00\r\n';
  const filas = leerCSV(csv);
  assert.deepEqual(filas[1], ["31/10/2026", "Pago en Coto; sucursal 12", "-38.500,00"]);
  const movs = armarMovimientos(filas, cats);
  assert.deepEqual(movs.map((m) => [m.fecha, m.tipo, m.monto, m.categoria, m.detalle]), [
    ["2026-10-31", "gasto", 3850000, "super", "Pago en Coto; sucursal 12"],
    ["2026-10-30", "ingreso", 62000000, "otros_in", "Transferencia recibida"],
    ["2026-10-30", "gasto", 2000000, "auto", "YPF"],
  ]);
});

test("encabezados con otros nombres, filas de título arriba y valor neto", () => {
  const filas = [["Reporte de actividad"], ["Período: octubre"], ["FECHA DE ORIGEN", "TIPO DE OPERACIÓN", "VALOR BRUTO", "VALOR NETO"], ["2026-10-29", "Pago Rappi", "-9.000", "-8.500"]];
  const c = encontrarColumnas(filas);
  assert.deepEqual([c.encabezado, c.fecha, c.detalle, c.monto], [2, 0, 1, 3]);
  assert.deepEqual(armarMovimientos(filas, cats).map((m) => [m.monto, m.categoria]), [[850000, "comida"]]);
});

test("sin encabezado: se adivina por el contenido", () => {
  const filas = [["31/10/2026", "Farmacia", "-12900"], ["30/10/2026", "Cine", "-15000"]];
  assert.deepEqual(armarMovimientos(filas, cats).map((m) => [m.categoria, m.monto]), [["salud", 1290000], ["salidas", 1500000]]);
});

test("no se repite lo ya importado, pero dos compras iguales el mismo día son dos", () => {
  const filas = [["Fecha", "Detalle", "Monto"], ["31/10/2026", "Café", "-3800"], ["31/10/2026", "Café", "-3800"]];
  const primera = armarMovimientos(filas, cats);
  assert.equal(primera.length, 2);
  assert.notEqual(primera[0].id, primera[1].id);
  assert.equal(armarMovimientos(filas, cats, primera).length, 0, "importar el mismo archivo otra vez no duplica");
  assert.equal(armarMovimientos([["Fecha", "Detalle", "Monto"], ["31/10/2026", "Café", "-3800"]], cats, primera).length, 0);
});

test("basura no rompe nada", () => {
  assert.deepEqual(armarMovimientos(leerCSV("hola\nchau\n"), cats), []);
  assert.deepEqual(armarMovimientos([], cats), []);
  const raro = armarMovimientos([["Fecha", "Detalle", "Monto"], ["31/10/2026", "<script>alert(1)</script>", "-100"]], cats);
  assert.equal(raro[0].detalle, "<script>alert(1)</script>", "queda como texto; la pantalla siempre lo escapa");
});

// Arma un .xlsx mínimo (zip sin comprimir y con compresión) para probar el lector de Excel.
async function xlsx(filas, comprimir) {
  const enc = new TextEncoder(), textos = [];
  const celda = (v, c, r) => typeof v === "number" ? `<c r="${c}${r}"><v>${v}</v></c>` : `<c r="${c}${r}" t="s"><v>${textos.push(v) - 1}</v></c>`;
  const hoja = `<worksheet><sheetData>${filas.map((f, i) => `<row r="${i + 1}">${f.map((v, j) => celda(v, String.fromCharCode(65 + j), i + 1)).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const ss = `<sst>${textos.map((t) => `<si><t>${t.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></si>`).join("")}</sst>`;
  const archivos = [["xl/worksheets/sheet1.xml", hoja], ["xl/sharedStrings.xml", ss]];
  const partes = [], centrales = []; let off = 0;
  for (const [nombre, contenido] of archivos) {
    const datos = enc.encode(contenido), n = enc.encode(nombre);
    const z = comprimir ? new Uint8Array(await new Response(new Blob([datos]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer()) : datos;
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(8, comprimir ? 8 : 0, true); loc.setUint32(18, z.length, true); loc.setUint32(22, datos.length, true); loc.setUint16(26, n.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(10, comprimir ? 8 : 0, true); cen.setUint32(20, z.length, true); cen.setUint32(24, datos.length, true); cen.setUint16(28, n.length, true); cen.setUint32(42, off, true);
    partes.push(new Uint8Array(loc.buffer), n, z); centrales.push(new Uint8Array(cen.buffer), n);
    off += 30 + n.length + z.length;
  }
  const largoCentral = centrales.reduce((a, b) => a + b.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(10, archivos.length, true); fin.setUint32(12, largoCentral, true); fin.setUint32(16, off, true);
  return new Uint8Array(await new Blob([...partes, ...centrales, new Uint8Array(fin.buffer)]).arrayBuffer());
}

test("Excel (.xlsx), con y sin compresión, con fechas como número", async () => {
  const filas = [["Fecha", "Descripción", "Monto"], [46326, "Pago en Carrefour", -45210.5], ["30/10/2026", "Uber & Cabify", "-4500"]];
  for (const comprimir of [false, true]) {
    const leidas = await leerXLSX(await xlsx(filas, comprimir));
    assert.deepEqual(leidas[2], ["30/10/2026", "Uber & Cabify", "-4500"]);
    const movs = armarMovimientos(leidas, cats);
    assert.deepEqual(movs.map((m) => [m.fecha, m.monto, m.categoria]), [["2026-10-31", 4521050, "super"], ["2026-10-30", 450000, "transporte"]]);
  }
  await assert.rejects(leerXLSX(new TextEncoder().encode("no soy un excel")));
});
