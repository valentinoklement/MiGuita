// Dibuja las pantallas de grupos y Plan con textos maliciosos: nada de lo que escriba otra persona puede convertirse en HTML.
import { test } from "node:test";
import assert from "node:assert/strict";
import { migrar } from "../src/logic/migraciones.js";

globalThis.matchMedia ??= () => ({ matches: false });
if (!globalThis.navigator) globalThis.navigator = { userAgent: "" };
const { crearVistas } = await import("../src/ui/pantallas.js");
const { crearVistasGrupos } = await import("../src/ui/grupos.js");
const { crearVistasPlan } = await import("../src/ui/plan.js");

const X = '<img src=x id=xss>';
const hoy = "2026-11-15";
const miembros = [{ id: "a", nombre: "Yo", ts: 1 }, { id: "b", nombre: X, alias: "", ts: 1 }];
const g = { id: "g", nombre: X, moneda: "ARS", ts: 1, yo: "a", miembros, pagos: [{ id: "p", de: "a", a: "b", m: 5, f: hoy, ts: 1, j: "j" }],
  juntadas: [{ id: "j", nombre: X, f: hoy, gente: ["a", "b"], ts: 1 }], gastos: [{ id: "x", t: X, m: 100, p: "b", a: ["a", "b"], sp: "eq", w: {}, f: hoy, ts: 1, j: "j" }],
  hist: [{ id: "h", ts: 1, por: "b", q: "a", k: "g", o: "x", t: X, j: "j", m: 100 }] };

function estado() {
  const d = migrar({});
  return { ...d, cfg: { ...d.config, primeraVez: hoy }, grupos: [g], grupoId: "g", juntadaId: "j", vistoAntes: 0, persistente: true, filtro: { texto: "", tipo: "todos", cat: "" }, mes: hoy.slice(0, 7), planTab: "cuotas",
    tarjetas: [{ id: "t", nombre: X, ts: 1 }], compras: [{ id: "c", tarjeta: "t", detalle: X, categoria: "otros", total: 1000, cuotas: 2, desde: "2026-11", dia: 1, previas: 0, hechas: 1, ts: 1, mod: 1 }],
    movs: [{ id: "m", tipo: "gasto", monto: 100, detalle: X, categoria: "otros", medio: "", fecha: hoy, ts: 1, mod: 1 }], dias: [], presupuestos: [], metas: [], deudas: [], fijos: [], cotizaciones: [],
    histJ: "j", pendiente: g, nombreNuevo: "", aliasQuien: "", yoElegido: "" };
}

test("ningún nombre ajeno se dibuja como HTML", () => {
  const st = estado(), V = crearVistas(st, hoy), VG = crearVistasGrupos(st, hoy, V), VP = crearVistasPlan(st, hoy, V);
  const limpio = (n, h) => { assert.ok(!h.includes("<img"), n); };
  limpio("lista", VG.lista());
  limpio("grupo", VG.unGrupo());
  limpio("juntada", VG.juntada());
  limpio("historial", VG.historial());
  limpio("quién", VG.quien());
  st.gform = { tipo: "gasto", id: null, error: "", vals: { j: "j", t: X, m: "", pagan: ["a"], pp: {}, a: ["a"], f: hoy } };
  limpio("compra", VG.formulario());
  st.gform = { tipo: "juntada", id: "j", error: "", vals: { nombre: X, f: hoy, gente: ["a"], otro: X } };
  limpio("form juntada", VG.formulario());
  st.gform = { tipo: "pago", id: null, error: "", vals: { de: "a", a: "b", m: "", f: hoy } };
  limpio("pago", VG.formulario());
  st.gform = { tipo: "persona", id: "b", error: "", vals: { nombre: X, alias: "", soyYo: false, pj: null, cam: 0 } };
  limpio("persona", VG.formulario());
  limpio("cuotas", VP.plan());
  st.planTab = "analisis"; st.cfg.categorias.gasto.find((c) => c.id === "otros").nombre = X;
  st.metas = [{ id: "a", nombre: X, moneda: "ARS", objetivo: 1e7, ahorrado: 0, ts: 1 }];
  st.fijos = [{ id: "f", nombre: X, tipo: "gasto", activo: true, monto: 5000, moneda: "ARS", dia: 1 }];
  for (let i = 0; i < 6; i++) st.movs.push({ id: "h" + i, tipo: "gasto", monto: 100, detalle: X, categoria: "otros", medio: "", fecha: "2026-11-0" + (i + 1), ts: 1, mod: 1 }, { id: "o" + i, tipo: "gasto", monto: 900, detalle: "x", categoria: "otros", medio: "", fecha: "2026-10-1" + i, ts: 1, mod: 1 }, { id: "s" + i, tipo: "gasto", monto: 900, detalle: "x", categoria: "otros", medio: "", fecha: "2026-09-1" + i, ts: 1, mod: 1 });
  limpio("análisis", VP.plan());
  assert.ok(VP.plan().includes("Mes a mes"));
  st.cfg.saldo = { monto: 100, ts: 0, fecha: hoy }; st.fijos = [{ id: "s", nombre: X, tipo: "ingreso", categoria: "sueldo", activo: true, monto: 100, moneda: "ARS", dia: 1 }];
  limpio("cargar plata", V.cargarPlata());
  st.dudaSaldo = { ids: ["m"] };
  limpio("inicio", V.inicio());
  assert.ok(V.inicio().includes("Podés usar"));
  limpio("movimientos", V.movimientos());
  st.dudaMonto = { texto: X, p: { opciones: [100, 200] } }; st.dudaCat = { id: "m", detalle: X, tipo: "gasto" };
  limpio("dudas", V.inicio());
});
