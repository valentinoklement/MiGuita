// Plan: presupuestos, metas, deudas y gastos fijos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { estadoPresupuestos, estadoConPresupuestos, infoMeta, resumenDeudas, restante, mesDeInicio, correrFijos, movimientoDeFijo } from "../src/logic/plan.js";
import { leerMonto, montoEnCampo } from "../src/logic/dinero.js";
import { migrar, VERSION } from "../src/logic/migraciones.js";
import { planDeEjemplo } from "../src/ui/ejemplo.js";

const g = (fecha, categoria, monto) => ({ id: fecha + categoria + monto, tipo: "gasto", fecha, categoria, monto });

test("montos escritos en formularios", () => {
  assert.equal(leerMonto("70.000"), 7000000);
  assert.equal(leerMonto("$ 1.200.000,50"), 120000050);
  assert.equal(leerMonto("35000"), 3500000);
  assert.equal(leerMonto("0"), 0);
  for (const malo of ["", "abc", "-5", "1,234", "12.5.6,1,2", "1e5"]) assert.equal(leerMonto(malo), null, malo);
  assert.equal(montoEnCampo(7000000), "70.000");
  assert.equal(montoEnCampo(1250), "12,50");
  assert.equal(leerMonto(montoEnCampo(123456789)), 123456789, "ida y vuelta");
});

test("presupuestos: 80% cerca, 100% pasado, ordenados por uso", () => {
  const pres = [{ id: "a", categoria: "super", tope: 1000 }, { id: "b", categoria: "comida", tope: 1000 }, { id: "c", categoria: "salidas", tope: 1000 }, { id: "d", categoria: "ropa", tope: 0 }];
  const movs = [g("2026-10-02", "super", 799), g("2026-10-03", "comida", 800), g("2026-10-04", "salidas", 600), g("2026-10-05", "salidas", 500), g("2026-09-30", "super", 5000),
    { tipo: "ingreso", fecha: "2026-10-01", categoria: "super", monto: 9999 }];
  const e = estadoPresupuestos(pres, movs, "2026-10");
  assert.deepEqual(e.map((x) => [x.categoria, x.nivel, x.gastado, x.resto]), [["salidas", "pasado", 1100, -100], ["comida", "cerca", 800, 200], ["super", "ok", 799, 201]]);
  assert.equal(e[0].queda, 0);
  assert.ok(Math.abs(e[2].queda - 0.201) < 1e-9);
});

test("Miguita toma el peor entre ingresos y presupuestos", () => {
  assert.equal(estadoConPresupuestos("ok", []), "ok");
  assert.equal(estadoConPresupuestos("ok", [{ nivel: "cerca" }]), "mid");
  assert.equal(estadoConPresupuestos("ok", [{ nivel: "ok" }, { nivel: "pasado" }]), "bad");
  assert.equal(estadoConPresupuestos("bad", [{ nivel: "ok" }]), "bad");
  assert.equal(estadoConPresupuestos("mid", [{ nivel: "cerca" }]), "mid");
});

test("metas: falta, porcentaje, por mes y fecha pasada", () => {
  const hoy = "2026-10-31";
  assert.deepEqual(infoMeta({ objetivo: 610000, ahorrado: 380000, fecha: "" }, hoy), { falta: 230000, parte: 380000 / 610000, cumplida: false, vencida: false, porMes: null });
  // De octubre a abril: 7 meses contando el actual. 1.200.000 / 7 = 171.428,57 → se redondea para arriba a pesos.
  assert.equal(infoMeta({ objetivo: 120000000, ahorrado: 0, fecha: "2027-04-30" }, hoy).porMes, 17142900);
  assert.equal(infoMeta({ objetivo: 1000, ahorrado: 0, fecha: "2026-10-31" }, hoy).porMes, 1000, "vence este mes: todo ahora");
  assert.equal(infoMeta({ objetivo: 1000, ahorrado: 0, fecha: "2026-10-30" }, hoy).vencida, true);
  const ok = infoMeta({ objetivo: 1000, ahorrado: 1500, fecha: "2026-01-01" }, hoy);
  assert.equal(ok.cumplida, true);
  assert.equal(ok.parte, 1);
  assert.equal(ok.vencida, false, "cumplida no se marca vencida");
});

test("deudas: debés, te deben, vencidas y saldadas", () => {
  const ds = [
    { id: "1", tipo: "debo", total: 1000, pagado: 200, vence: "2026-11-15" },
    { id: "2", tipo: "debo", total: 500, pagado: 0, vence: "2026-10-01" },
    { id: "3", tipo: "meDeben", total: 750, pagado: 300, vence: "" },
    { id: "4", tipo: "debo", total: 400, pagado: 400, vence: "" },
  ];
  const r = resumenDeudas(ds, "2026-10-31");
  assert.equal(r.debo, 1300);
  assert.equal(r.meDeben, 450);
  assert.deepEqual(r.activas.map((d) => d.id), ["2", "1", "3"]);
  assert.deepEqual(r.saldadas.map((d) => d.id), ["4"]);
  assert.equal(r.vencida(ds[1]), true);
  assert.equal(r.vencida(ds[0]), false);
  assert.equal(restante({ total: 100, pagado: 150 }), 0);
});

test("fijos: si se crea después de su día, empieza el mes que viene", () => {
  assert.equal(mesDeInicio(10, "2026-10-15"), "2026-11");
  assert.equal(mesDeInicio(15, "2026-10-15"), "2026-10");
  assert.equal(mesDeInicio(20, "2026-10-15"), "2026-10");
  assert.equal(mesDeInicio(31, "2026-02-28"), "2026-02", "el 31 en febrero es el último día");
  assert.equal(mesDeInicio(5, "2026-12-20"), "2027-01");
});

const fijo = (extra) => ({ id: "f1", nombre: "Alquiler", monto: 35000000, categoria: "servicios", medio: "transferencia", dia: 5, activo: true, desde: "2026-10", hechos: [], ...extra });

test("fijos: se anotan con su fecha, una sola vez por mes", () => {
  let r = correrFijos([fijo()], [], "2026-10-04");
  assert.equal(r.nuevos.length, 0, "todavía no llegó el día");
  r = correrFijos([fijo()], [], "2026-10-05");
  assert.deepEqual(r.nuevos.map((x) => [x.id, x.fecha, x.monto, x.categoria, x.detalle]), [["fx_f1_2026-10", "2026-10-05", 35000000, "servicios", "Alquiler"]]);
  assert.deepEqual(r.cambiados[0].hechos, ["2026-10"]);
  const otra = correrFijos(r.cambiados, r.nuevos, "2026-10-20");
  assert.equal(otra.nuevos.length, 0, "abrir de nuevo no duplica");
  assert.equal(otra.cambiados.length, 0);
});

test("fijos: si no se abrió la app, se ponen al día al abrirla", () => {
  const r = correrFijos([fijo({ desde: "2026-08", dia: 31 })], [], "2026-10-31");
  assert.deepEqual(r.nuevos.map((x) => x.fecha), ["2026-08-31", "2026-09-30", "2026-10-31"]);
  const lejos = correrFijos([fijo({ desde: "2024-01" })], [], "2026-10-31");
  assert.equal(lejos.nuevos.length, 12, "como mucho 12 meses para atrás");
});

test("fijos: pausados, sin monto, borrados a mano y ya anotados", () => {
  assert.equal(correrFijos([fijo({ activo: false })], [], "2026-10-31").nuevos.length, 0);
  assert.equal(correrFijos([fijo({ monto: 0 })], [], "2026-10-31").nuevos.length, 0);
  assert.equal(correrFijos([fijo({ hechos: ["2026-10"] })], [], "2026-10-31").nuevos.length, 0, "si la persona lo borró, no vuelve");
  const r = correrFijos([fijo()], [{ id: "fx_f1_2026-10" }], "2026-10-31");
  assert.equal(r.nuevos.length, 0, "ya existía el movimiento");
  assert.deepEqual(r.cambiados[0].hechos, ["2026-10"]);
  assert.equal(correrFijos([fijo({ desde: "2026-11" })], [], "2026-10-31").nuevos.length, 0);
});

test("migración 1 → 2 agrega las listas de Plan sin tocar lo anterior", () => {
  const v1 = migrar({});
  v1.schemaVersion = 1;
  delete v1.presupuestos; delete v1.metas; delete v1.deudas; delete v1.fijos;
  v1.movs = [{ id: "a", tipo: "gasto", monto: 100, fecha: "2026-10-01" }];
  const v2 = migrar(structuredClone(v1));
  assert.equal(v2.schemaVersion, VERSION);
  assert.deepEqual(v2.movs, v1.movs);
  for (const k of ["presupuestos", "metas", "deudas", "fijos"]) assert.deepEqual(v2[k], []);
});

test("plan de ejemplo: ids ej_ y nada se anota solo este mes", () => {
  const p = planDeEjemplo("2026-10-31");
  for (const l of Object.values(p)) assert.ok(l.every((x) => x.id.startsWith("ej_")));
  assert.equal(correrFijos(p.fijos, [], "2026-10-31").nuevos.length, 0);
});

test("fijos de ingreso y fijos que preguntan antes de anotarse", async () => {
  const { fijosPorConfirmar, movimientoDeFijo } = await import("../src/logic/plan.js");
  const sueldo = fijo({ id: "s1", tipo: "ingreso", modo: "recordar", nombre: "Sueldo", categoria: "sueldo", dia: 1, monto: 62000000 });
  assert.equal(correrFijos([sueldo], [], "2026-10-31").nuevos.length, 0, "el que pregunta no se anota solo");
  assert.deepEqual(fijosPorConfirmar([sueldo], "2026-10-31").map((f) => f.id), ["s1"]);
  assert.deepEqual(fijosPorConfirmar([{ ...sueldo, hechos: ["2026-10"] }], "2026-10-31"), [], "ya confirmado o descartado");
  assert.deepEqual(fijosPorConfirmar([{ ...sueldo, dia: 31 }], "2026-10-30"), [], "todavía no llegó el día");
  assert.deepEqual(fijosPorConfirmar([{ ...sueldo, activo: false }], "2026-10-31"), []);
  assert.deepEqual(fijosPorConfirmar([{ ...sueldo, desde: "2026-11" }], "2026-10-31"), []);
  const mov = movimientoDeFijo(sueldo, "2026-10");
  assert.deepEqual([mov.id, mov.tipo, mov.fecha, mov.monto, mov.categoria], ["fx_s1_2026-10", "ingreso", "2026-10-01", 62000000, "sueldo"]);
  const auto = correrFijos([{ ...sueldo, modo: "auto" }], [], "2026-10-31").nuevos;
  assert.equal(auto[0].tipo, "ingreso", "un ingreso fijo automático se anota como ingreso");
  const v4 = migrar({}); v4.schemaVersion = 4; v4.fijos = [{ id: "a", nombre: "Alquiler", dia: 5, monto: 1, activo: true }];
  assert.deepEqual(migrar(v4).fijos.map((f) => [f.tipo, f.modo]), [["gasto", "auto"]], "los fijos viejos siguen siendo gastos automáticos");
});

test("fijos y deudas en dólares", () => {
  const f = { id: "net", tipo: "gasto", modo: "auto", nombre: "Streaming", moneda: "USD", monto: 1000, categoria: "servicios", medio: "", dia: 5, activo: true, desde: "2026-10", hechos: [] };
  const cot = (fecha) => (fecha >= "2026-11-01" ? { valor: 150000, fecha, fuente: "dolarapi", estimado: false, tipo: "cripto" } : null);
  // Octubre no tiene dólar guardado: no se anota (ni se marca hecho) hasta que lo haya.
  const r = correrFijos([f], [], "2026-11-10", cot);
  assert.deepEqual(r.nuevos.map((m) => [m.fecha, m.monto, m.usd.monto, m.usd.tipo]), [["2026-11-05", 1500000, 1000, "cripto"]]);
  assert.deepEqual(r.cambiados[0].hechos, ["2026-11"]);
  assert.equal(movimientoDeFijo(f, "2026-10", cot), null);
  assert.equal(movimientoDeFijo({ ...f, moneda: "ARS" }, "2026-10", cot).monto, 1000, "en pesos no cambia nada");
  const d = resumenDeudas([{ tipo: "debo", moneda: "USD", total: 2000, pagado: 0 }, { tipo: "debo", total: 50000, pagado: 0 }, { tipo: "meDeben", moneda: "USD", total: 500, pagado: 100 }], "2026-11-01");
  assert.deepEqual([d.debo, d.deboUsd, d.meDeben, d.meDebenUsd], [50000, 2000, 0, 400]);
});
