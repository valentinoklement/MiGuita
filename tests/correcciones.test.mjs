// Lo que se corrigió después de probar la app con gente: categorías argentinas y que aprendan de lo que corregís.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTexto, claveDe } from "../src/logic/anotar.js";
import { migrar } from "../src/logic/migraciones.js";

const cat = (t, ap) => leerTexto(t, undefined, ap).categoria;

test("verdulería: frutas y verduras tienen su categoría", () => {
  for (const t of ["verdu 8000", "verdulería 8000", "tomates 3000", "2 kilos de papas 4000", "manzanas 5000", "bananas 2000", "lechuga 1500", "palta 3000"]) assert.equal(cat(t), "verduleria", t);
});

test("panadería: con todos los nombres que tiene en Argentina", () => {
  for (const t of ["tortitas 3000", "masitas 4000", "facturas 5000", "medialunas 6000", "bizcochitos 2000", "tortitas negras 2500", "pan 3000", "panadería 4000", "churros 3500", "criollitos 2000", "vigilantes 3000", "cañoncitos 4000", "sanguches de miga 9000"]) assert.equal(cat(t), "panaderia", t);
  assert.equal(cat("factura de luz 30000"), "servicios", "una factura de luz no es de panadería");
});

test("salidas: escabio y papas fritas", () => {
  for (const t of ["birra 3000", "papas fritas 2500", "papitas 2000", "fernet 9000", "gin tonic 8000", "picada 15000", "malbec 7000", "porrones 6000", "speed 2500"]) assert.equal(cat(t), "salidas", t);
  assert.equal(cat("papas 3000"), "verduleria", "las papas solas son de verdulería");
});

test("el súper sigue siendo el súper", () => {
  for (const t of ["coto 30000", "yerba 4000", "fideos 2000", "leche 1500"]) assert.equal(cat(t), "super", t);
  assert.equal(cat("pago naranja x 20000"), "tarjeta", "la billetera no es una fruta");
});

test("aprende: lo que corregís queda, y lo podés volver a cambiar", () => {
  assert.equal(cat("papas fritas 2500"), "salidas");
  let ap = { [claveDe("Papas fritas")]: "super" };
  assert.equal(cat("papas fritas 2500", ap), "super");
  assert.equal(cat("3 papas fritas grandes 2500", ap), "super", "también dentro de una frase más larga");
  ap = { [claveDe("Papas fritas")]: "salidas" };
  assert.equal(cat("papas fritas 2500", ap), "salidas", "lo cambiás a mano y queda lo último");
});

test("aprende: lo más específico sigue ganando", () => {
  const ap = { papas: "super" };
  assert.equal(cat("papas 3000", ap), "super");
  assert.equal(cat("papas fritas 3000", ap), "salidas", "«papas fritas» es más largo que lo aprendido");
  assert.equal(cat("birra 3000", { pa: "super" }), "salidas", "las claves cortísimas no valen como frase");
});

test("aprende: una categoría oculta no se usa", () => {
  const d = migrar({});
  d.config.categorias.gasto.find((c) => c.id === "super").oculta = true;
  assert.notEqual(leerTexto("papas fritas 2500", d.config.categorias, { "papas fritas": "super" }).categoria, "super");
});

test("plata que entra: un bono o una comisión son ingresos, y no todo es sueldo", () => {
  for (const t of ["bono 50000", "comisión 80000", "honorarios 90000"]) { const r = leerTexto(t); assert.equal(r.tipo, "ingreso", t); assert.equal(r.categoria, "extra", t); }
  assert.equal(leerTexto("cobré el sueldo 500000").categoria, "sueldo");
});

test("migración 8 → 9: suma las categorías sin pisar lo de cada persona", () => {
  const vieja = () => { const d = migrar({ schemaVersion: 0 }); return JSON.parse(JSON.stringify(d)); };
  const v8 = vieja();
  v8.schemaVersion = 8;
  // Como estaba antes.
  const gasto = v8.config.categorias;
  gasto.gasto = gasto.gasto.filter((c) => !["verduleria", "panaderia"].includes(c.id));
  gasto.gasto.find((c) => c.id === "super").claves.push("verdu", "verduleria", "verdulería", "fruta", "mi palabra");
  gasto.gasto.find((c) => c.id === "super").nombre = "Mercadito";
  gasto.ingreso = [{ id: "sueldo", nombre: "Sueldo", claves: ["sueldo", "salario", "pago", "cobro"], oculta: false }, { id: "extra", nombre: "Extra/freelance", claves: ["freelance"], oculta: false }, { id: "regalo_in", nombre: "Regalo recibido", claves: [], oculta: false }, { id: "otros_in", nombre: "Otros ingresos", claves: [], oculta: false }];
  const d = migrar(v8), ids = d.config.categorias.gasto.map((c) => c.id), sup = d.config.categorias.gasto.find((c) => c.id === "super");
  assert.deepEqual(ids.slice(ids.indexOf("carne"), ids.indexOf("carne") + 3), ["carne", "verduleria", "panaderia"]);
  assert.equal(sup.nombre, "Mercadito", "se respeta lo renombrado");
  assert.ok(sup.claves.includes("mi palabra"), "se respetan sus palabras");
  assert.ok(!sup.claves.includes("verdu"), "«verdu» ya no gana en el súper");
  assert.deepEqual(d.config.categorias.ingreso.map((c) => c.id), ["extra", "sueldo", "regalo_in", "otros_in"]);
  assert.equal(d.config.categorias.ingreso[0].nombre, "Trabajo/changas");
  assert.ok(!d.config.categorias.ingreso[1].claves.includes("cobro"));
  assert.equal(leerTexto("verdu 8000", d.config.categorias).categoria, "verduleria", "ya migrada, «verdu» va a Verdulería");

  // La persona ya se había hecho su Verdulería: no se duplica y la suya aprende.
  const conSuya = JSON.parse(JSON.stringify(v8));
  conSuya.config.categorias.gasto.splice(2, 0, { id: "c_abc", nombre: "Verdulería", claves: [], oculta: false });
  const e = migrar(conSuya), nombres = e.config.categorias.gasto.map((c) => c.nombre);
  assert.equal(nombres.filter((n) => n === "Verdulería").length, 1);
  assert.equal(leerTexto("tomates 3000", e.config.categorias).categoria, "c_abc");
});
