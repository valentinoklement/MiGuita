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
    assert.equal(d.config.categorias.gasto.length, 16);
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
