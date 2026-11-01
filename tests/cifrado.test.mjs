// Seguridad: cofre con PIN, copias con contraseña, intentos y validaciones (especificación, sección 3).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as C from "../src/logic/cifrado.js";

const RAPIDO = 1000; // vueltas bajas para que las pruebas del cofre no tarden; la copia usa las reales

test("el cofre se abre solo con el PIN correcto y los datos quedan ilegibles", async () => {
  const { cofre, clave } = await C.crearCofre("4821", RAPIDO);
  const caja = await C.cifrar(clave, { movs: [{ detalle: "Supermercado", monto: 3850000 }] });
  assert.ok(!JSON.stringify({ cofre, caja }).includes("Supermercado"), "nada en claro");
  const abierto = await C.abrirCofre(cofre, "4821");
  assert.deepEqual(await C.descifrar(abierto.clave, caja), { movs: [{ detalle: "Supermercado", monto: 3850000 }] });
  await assert.rejects(C.abrirCofre(cofre, "4822"), /PIN incorrecto/);
  await assert.rejects(C.abrirCofre(cofre, ""), /PIN incorrecto/);
});

test("cambiar el PIN no cambia los datos ni la clave", async () => {
  const { cofre, crudo, clave } = await C.crearCofre("1234", RAPIDO);
  const caja = await C.cifrar(clave, { a: 1 });
  const nuevo = await C.reenvolver(crudo, "987654", RAPIDO);
  await assert.rejects(C.abrirCofre(nuevo, "1234"));
  assert.deepEqual(await C.descifrar((await C.abrirCofre(nuevo, "987654")).clave, caja), { a: 1 });
  assert.notEqual(nuevo.sal, cofre.sal, "sal nueva");
});

test("un dato cifrado alterado no se abre", async () => {
  const { clave } = await C.crearCofre("1234", RAPIDO);
  const caja = await C.cifrar(clave, { monto: 100 });
  const bytes = C.deB64(caja.ct); bytes[3] ^= 1;
  await assert.rejects(C.descifrar(clave, { iv: caja.iv, ct: C.aB64(bytes) }));
});

test("huella o cara: la clave envuelta con el secreto del celu", async () => {
  const { crudo, clave } = await C.crearCofre("1234", RAPIDO);
  const secreto = C.azar(32);
  const caja = await (await C.envolverConSecreto(crudo, secreto)).envolver();
  const abierto = await C.abrirConSecreto(caja, secreto);
  const datos = await C.cifrar(clave, { ok: true });
  assert.deepEqual(await C.descifrar(abierto.clave, datos), { ok: true });
  await assert.rejects(C.abrirConSecreto(caja, C.azar(32)));
});

test("vueltas reales: 600.000 por defecto", async () => {
  const { cofre } = await C.crearCofre("1234");
  assert.equal(cofre.vueltas, 600_000);
});

test("PIN y contraseña: qué se acepta", () => {
  for (const ok of ["1234", "12345", "123456"]) assert.equal(C.validarPin(ok), null, ok);
  for (const mal of ["123", "1234567", "12a4", "", " 1234"]) assert.ok(C.validarPin(mal), mal);
  assert.equal(C.validarPin("una frase larga", "clave"), null);
  assert.ok(C.validarPin("corta", "clave"));
});

test("espera creciente después de 5 errores", () => {
  assert.deepEqual([0, 4, 5, 6, 7, 8, 9, 20].map(C.esperaTrasErrores), [0, 0, 30000, 60000, 300000, 900000, 3600000, 3600000]);
});

test("copia: se abre con la contraseña correcta; incorrecta, alterada o basura no", async () => {
  const datos = { schemaVersion: 4, movs: [{ id: "a", detalle: "Café «con» ñ 🍰", monto: 380000 }], config: { tema: "light" } };
  const archivo = await C.armarCopia(datos, "una contraseña larga");
  assert.ok(!archivo.includes("Café"), "el archivo no tiene nada en claro");
  assert.deepEqual((await C.abrirCopia(archivo, "una contraseña larga")).datos, datos);
  await assert.rejects(C.abrirCopia(archivo, "otra contraseña"), /contraseña no es correcta/);
  const o = JSON.parse(archivo); const b = C.deB64(o.ct); b[10] ^= 255;
  await assert.rejects(C.abrirCopia(JSON.stringify({ ...o, ct: C.aB64(b) }), "una contraseña larga"), /dañado/);
  for (const basura of ["", "hola", "{}", '{"app":"MiGuita","tipo":"copia"}', JSON.stringify({ ...o, vueltas: 1 }), JSON.stringify({ ...o, app: "<script>" })])
    await assert.rejects(C.abrirCopia(basura, "una contraseña larga"), /no es una copia/, basura.slice(0, 30));
  await assert.rejects(C.abrirCopia(JSON.stringify({ ...o, formato: 2 }), "x"), /más nueva/);
});
