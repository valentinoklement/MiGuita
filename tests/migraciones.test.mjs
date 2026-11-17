// Migraciones de los datos guardados.
import { test } from "node:test";
import assert from "node:assert/strict";
import { migrar, VERSION } from "../src/logic/migraciones.js";

test("una base vacía queda en la versión actual con categorías y medios", () => {
  for (const vacia of [undefined, null, {}]) {
    const d = migrar(vacia);
    assert.equal(d.schemaVersion, VERSION);
    assert.deepEqual(d.movs, []);
    assert.deepEqual(d.dias, []);
    assert.equal(d.config.categorias.gasto.length, 23);
    assert.equal(d.config.categorias.ingreso.length, 4);
    assert.equal(d.config.medios.length, 6);
    assert.equal(d.config.tema, "dark");
  }
});

test("migrar dos veces no cambia nada y respeta lo que la persona editó", () => {
  const una = migrar({});
  una.config.categorias.gasto[0].nombre = "Mercado";
  una.config.tema = "light";
  una.movs.push({ id: "a", tipo: "gasto", monto: 100, fecha: "2026-10-01" });
  const dos = migrar(structuredClone(una));
  assert.deepEqual(dos, una);
});

test("datos de una versión más nueva se rechazan con un mensaje claro", () => {
  assert.throws(() => migrar({ schemaVersion: VERSION + 1 }), /versión más nueva/);
});

test("Mercado Pago pasa a Billetera virtual, salvo que la persona lo haya renombrado", () => {
  const medios = (nombre) => migrar({ schemaVersion: 5, config: { medios: [{ id: "mp", nombre, oculto: false }, { id: "efectivo", nombre: "Efectivo", oculto: false }] } }).config.medios;
  assert.deepEqual(medios("Mercado Pago").map((m) => m.nombre), ["Billetera virtual", "Efectivo"]);
  assert.equal(medios("Ualá")[0].nombre, "Ualá");
});

test("9 → 10: «Viajes» llega a quien ya usaba la app, y no se duplica si ya tenía una «Vacaciones»", () => {
  const v9 = () => { const d = migrar({}); d.schemaVersion = 9; d.config.categorias.gasto = d.config.categorias.gasto.filter((c) => c.id !== "viajes"); return d; };
  let d = migrar(v9()), ids = d.config.categorias.gasto.map((c) => c.id);
  assert.ok(ids.includes("viajes"));
  assert.equal(ids.at(-1), "otros", "«Otros» sigue siendo la última");
  const con = v9();
  con.config.categorias.gasto.splice(4, 0, { id: "c_vac", nombre: "Vacaciones", claves: ["mar del plata"], oculta: false });
  d = migrar(con); ids = d.config.categorias.gasto.map((c) => c.id);
  assert.ok(!ids.includes("viajes"), "no duplica");
  const suya = d.config.categorias.gasto.find((c) => c.id === "c_vac").claves;
  assert.ok(suya.includes("mar del plata") && suya.includes("hotel"), "la suya aprende las palabras");
});

test("9 → 10: «Pago de tarjeta» llega a quien ya usaba la app, salvo que ya se hubiera armado la suya", () => {
  const v9 = () => { const d = migrar({}); d.schemaVersion = 9; d.config.categorias.gasto = d.config.categorias.gasto.filter((c) => c.id !== "tarjeta"); return d; };
  let d = migrar(v9()), ids = d.config.categorias.gasto.map((c) => c.id);
  assert.ok(ids.includes("tarjeta") && ids.includes("deudas"), "llega la nueva y Deudas sigue estando");
  assert.equal(d.config.categorias.gasto.find((c) => c.id === "tarjeta").nombre, "Pago de tarjeta");
  assert.equal(ids.at(-1), "otros");
  // Ya tenía una propia que se llamaba «Tarjetas»: no se le suma otra, y la suya aprende las palabras.
  const con = v9();
  con.config.categorias.gasto.splice(2, 0, { id: "c_mia", nombre: "Tarjetas", claves: ["galicia"], oculta: false });
  d = migrar(con); ids = d.config.categorias.gasto.map((c) => c.id);
  assert.ok(!ids.includes("tarjeta"), "no duplica");
  const mia = d.config.categorias.gasto.find((c) => c.id === "c_mia").claves;
  assert.ok(mia.includes("galicia") && mia.includes("visa") && mia.includes("resumen de la tarjeta"));
});

test("9 → 10: llegan Trabajo, Mascotas y Casa sin pisar lo que cada uno armó, y la prioridad de las metas sale de las metas", () => {
  const v9 = migrar({}); v9.schemaVersion = 9;
  const g = v9.config.categorias.gasto;
  v9.config.categorias.gasto = g.filter((c) => !["trabajo", "mascotas", "casa"].includes(c.id))
    .map((c) => (c.id === "servicios" ? { ...c, claves: [...c.claves, "ferreteria", "ferretería", "mi clave"] } : c.id === "super" ? { ...c, nombre: "Mercado" } : c));
  // Esta persona ya se había hecho su propia categoría «Mascotas».
  v9.config.categorias.gasto.splice(3, 0, { id: "c_propia", nombre: "Mascotas", claves: ["firulais"], oculta: false });
  v9.metas = [{ id: "a", nombre: "A", ahorrado: 5, ts: 1, orden: 1 }, { id: "b", nombre: "B", ahorrado: 7, ts: 2, orden: 0 }, { id: "c", nombre: "C", ahorrado: 0, ts: 3 }];
  const d = migrar(structuredClone(v9)), ids = d.config.categorias.gasto.map((c) => c.id);
  assert.equal(d.schemaVersion, VERSION);
  assert.ok(ids.includes("trabajo") && ids.includes("casa"), "llegan las nuevas");
  assert.ok(!ids.includes("mascotas"), "no duplica la que la persona ya tenía con ese nombre");
  assert.ok(d.config.categorias.gasto.find((c) => c.id === "c_propia").claves.includes("veterinaria"), "la suya aprende las palabras");
  assert.equal(ids.at(-1), "otros", "«Otros» sigue siendo la última");
  assert.equal(d.config.categorias.gasto.find((c) => c.id === "super").nombre, "Mercado", "respeta lo renombrado");
  const servicios = d.config.categorias.gasto.find((c) => c.id === "servicios").claves;
  assert.ok(!servicios.includes("ferreteria") && servicios.includes("mi clave"), "la ferretería pasa a Casa y lo propio queda");
  assert.deepEqual(d.config.metasOrden.ids, ["b", "a", "c"]);
  assert.ok(d.metas.every((m) => !("orden" in m)), "las metas ya no llevan el orden adentro");
  assert.deepEqual(d.metas.map((m) => m.ahorrado), [5, 7, 0], "la plata de cada meta no se toca");
  assert.deepEqual(migrar(structuredClone(d)), d, "migrar de nuevo no cambia nada");
});
