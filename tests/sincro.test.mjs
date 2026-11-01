// Grupos conectados: código corto, cifrado y sincronización contra un servidor de mentira que se porta como el real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { nuevoCodigo, leerCodigo, buscarCodigo, derivar, cerrar, abrir, sincronizar, bajar } from "../src/logic/sincro.js";

// Igual que servidor/grupos.js: guarda la huella del token, versión y caja; 409 si la versión no coincide.
function servidorFalso() {
  const grupos = new Map();
  const llamadas = [];
  const ir = async (url, op) => {
    const id = url.split("/g/")[1], token = op.headers.Authorization.slice(7);
    llamadas.push(op.method);
    const g = grupos.get(id);
    const resp = (estado, cuerpo) => ({ status: estado, json: async () => cuerpo });
    if (g && g.token !== token) return resp(403, { error: "código incorrecto" });
    if (op.method === "GET") return g ? resp(200, { v: g.v, datos: g.datos }) : resp(404, {});
    const c = JSON.parse(op.body), actual = g ? g.v : 0;
    if (c.v !== actual) return resp(409, { v: actual, datos: g?.datos ?? null });
    grupos.set(id, { token, v: actual + 1, datos: c.datos });
    return resp(200, { v: actual + 1 });
  };
  return { ir, grupos, llamadas };
}

const base = () => ({ id: "g1", nombre: "Viaje", moneda: "ARS", ts: 1,
  miembros: [{ id: "a", nombre: "Ana", ts: 1 }, { id: "b", nombre: "Beto", ts: 1 }], gastos: [], pagos: [] });
const gasto = (id, ts, m = 100) => ({ id, t: "Gasto " + id, m, p: "a", a: ["a", "b"], sp: "eq", w: {}, f: "2026-11-01", ts });

test("código corto: 12 letras fáciles de dictar, se lee aunque lo escriban mal", () => {
  const c = nuevoCodigo();
  assert.match(c, /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.notEqual(nuevoCodigo(), c);
  assert.equal(leerCodigo("k7qm 3xpa 9trb"), "K7QM-3XPA-9TRB");
  assert.equal(leerCodigo("K7QM-3XPA-9TRO"), "K7QM-3XPA-9TR0");
  assert.equal(leerCodigo("K7QM-3XPA-9TR"), null);
  assert.equal(leerCodigo("G3:abc"), null);
  assert.equal(buscarCodigo("Sumate al grupo: https://x.io/MiGuita/#u=K7QM-3XPA-9TRB"), "K7QM-3XPA-9TRB");
  assert.equal(buscarCodigo("código k7qm3xpa9trb"), "K7QM-3XPA-9TRB");
});

test("del mismo código sale lo mismo; de otro código, otra cosa", async () => {
  const a = await derivar("K7QM-3XPA-9TRB"), b = await derivar("k7qm3xpa9trb"), c = await derivar("K7QM-3XPA-9TRC");
  assert.equal(a.id, b.id); assert.equal(a.token, b.token);
  assert.notEqual(a.id, c.id); assert.notEqual(a.token, a.id);
  assert.match(a.id, /^[0-9a-f]{32}$/); assert.match(a.token, /^[0-9a-f]{32}$/);
});

test("la caja cifrada solo se abre con el código correcto y no deja ver nada", async () => {
  const d = await derivar("K7QM-3XPA-9TRB"), otro = await derivar("ZZZZ-ZZZZ-ZZZZ");
  const g = { ...base(), gastos: [gasto("x1", 2)] };
  const caja = await cerrar(g, d.clave);
  assert.ok(!caja.includes("Viaje") && !atob(caja.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(caja.length / 4) * 4, "=")).includes("Ana"));
  assert.equal((await abrir(caja, d.clave)).gastos[0].t, "Gasto x1");
  await assert.rejects(abrir(caja, otro.clave));
});

test("dos celus anotan a la vez y los dos terminan viendo todo", async () => {
  const srv = servidorFalso(), d = await derivar("K7QM-3XPA-9TRB");
  const yo = await sincronizar(d, { ...base(), yo: "a", sync: { codigo: "K7QM-3XPA-9TRB" } }, srv.ir);
  assert.equal(yo.v, 1);
  assert.equal(yo.g.yo, "a", "lo propio de este celu no se pierde");
  assert.equal(yo.g.sync.codigo, "K7QM-3XPA-9TRB");
  const vos = await sincronizar(d, { ...(await bajar(d, srv.ir)).g, yo: "b" }, srv.ir);
  // Cada uno anota algo sin enterarse del otro.
  const r1 = await sincronizar(d, { ...yo.g, gastos: [gasto("de_a", 5)] }, srv.ir);
  const r2 = await sincronizar(d, { ...vos.g, gastos: [gasto("de_b", 6)] }, srv.ir);
  assert.deepEqual(r2.g.gastos.map((x) => x.id), ["de_a", "de_b"]);
  assert.ok(r2.cambio, "a Beto le llegó lo de Ana");
  const r3 = await sincronizar(d, r1.g, srv.ir);
  assert.deepEqual(r3.g.gastos.map((x) => x.id), ["de_a", "de_b"]);
  assert.equal(r3.v, r2.v, "si ya está igual no vuelve a guardar");
  // Borrar (marca x) y editar también viajan.
  const r4 = await sincronizar(d, { ...r3.g, gastos: [{ ...r3.g.gastos[0], x: true, ts: 9 }, r3.g.gastos[1]] }, srv.ir);
  const r5 = await sincronizar(d, r2.g, srv.ir);
  assert.equal(r5.g.gastos.find((x) => x.id === "de_a").x, true);
  assert.equal(r5.v, r4.v);
});

test("si otro guarda justo en el medio, se vuelve a juntar y no se pierde nada", async () => {
  const srv = servidorFalso(), d = await derivar("K7QM-3XPA-9TRB");
  await sincronizar(d, base(), srv.ir);
  const ir = srv.ir;
  let metido = false;
  // Entre que bajo y guardo, otro celu guarda un gasto.
  const entrometido = async (url, op) => {
    if (op.method === "PUT" && !metido) {
      metido = true;
      const ahora = srv.grupos.values().next().value;
      await sincronizar(d, { ...(await abrir(ahora.datos, d.clave)), gastos: [gasto("del_otro", 7)] }, ir);
    }
    return ir(url, op);
  };
  const r = await sincronizar(d, { ...base(), gastos: [gasto("mio", 8)] }, entrometido);
  assert.deepEqual(r.g.gastos.map((x) => x.id).sort(), ["del_otro", "mio"]);
  assert.equal((await bajar(d, ir)).g.gastos.length, 2);
});

test("con otro código no se puede leer ni pisar el grupo", async () => {
  const srv = servidorFalso(), d = await derivar("K7QM-3XPA-9TRB");
  await sincronizar(d, base(), srv.ir);
  const trucho = { ...(await derivar("ZZZZ-ZZZZ-ZZZZ")), id: d.id };
  await assert.rejects(bajar(trucho, srv.ir), /403/);
  await assert.rejects(sincronizar(trucho, base(), srv.ir), /403/);
});
