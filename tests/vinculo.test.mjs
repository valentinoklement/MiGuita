// Mis dispositivos conectados: cómo se juntan los cambios del celu y la compu.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as Vn from "../src/logic/vinculo.js";
import { VERSION } from "../src/logic/migraciones.js";

function servidorFalso() {
  const cajas = new Map();
  const ir = async (url, op) => {
    const id = url.split("/g/")[1], token = op.headers.Authorization.slice(7), c = cajas.get(id);
    const resp = (estado, cuerpo) => ({ status: estado, json: async () => cuerpo });
    if (c && c.token !== token) return resp(403, {});
    if (op.method === "GET") return c ? resp(200, { v: c.v, datos: c.datos }) : resp(404, {});
    const b = JSON.parse(op.body), actual = c ? c.v : 0;
    if (b.v !== actual) return resp(409, { v: actual, datos: c?.datos ?? null });
    cajas.set(id, { token, v: actual + 1, datos: b.datos });
    return resp(200, { v: actual + 1 });
  };
  return { ir, cajas };
}

const mov = (id, monto, mod = 1) => ({ id, tipo: "gasto", monto, detalle: "x", categoria: "otros", medio: "", fecha: "2026-11-01", ts: 1, mod });
const estado = (movs, extra = {}) => ({ schemaVersion: VERSION, movs, dias: [], presupuestos: [], metas: [], deudas: [], fijos: [], grupos: [], cotizaciones: [], tarjetas: [], compras: [],
  config: { nombre: "Ana", categorias: { gasto: [], ingreso: [] }, medios: [], tema: "dark", ...extra } });
// Un "dispositivo": sus datos y lo que recuerda de la última vez.
const aparato = (movs) => ({ d: estado(movs), base: {} });
async function sincro(a, cl, ir) {
  const r = await Vn.sincronizarDatos(cl, a.d, a.base, ir);
  a.d = { ...Vn.armar(r.M), config: { ...a.d.config, ...Vn.armar(r.M).config } };
  a.base = r.base;
  return r;
}

test("el código de dispositivos: 16 letras y otra llave que la de los grupos", async () => {
  const c = Vn.nuevoCodigoVinculo();
  assert.match(c, /^([0-9A-Z]{4}-){3}[0-9A-Z]{4}$/);
  assert.equal(Vn.leerCodigoVinculo(c.toLowerCase().replace(/-/g, " ")), c);
  assert.equal(Vn.leerCodigoVinculo("https://x/MiGuita/#v=" + c), c);
  assert.equal(Vn.leerCodigoVinculo("ABCD-EFGH-JKMN"), null, "uno de grupo (12) no sirve");
  const { derivar } = await import("../src/logic/sincro.js");
  assert.notEqual((await Vn.derivarVinculo(c)).id, (await derivar(c)).id);
});

test("juntar de a tres: cada cambio de un solo lado gana, también borrar", () => {
  const B = Vn.huellas(new Map([["movs|a", mov("a", 1)], ["movs|b", mov("b", 2)], ["movs|c", mov("c", 3)]]));
  const L = new Map([["movs|a", mov("a", 10, 5)], ["movs|b", mov("b", 2)], ["movs|c", mov("c", 3)], ["movs|nuevoL", mov("nuevoL", 7)]]);
  const R = new Map([["movs|a", mov("a", 1)], ["movs|c", mov("c", 30, 6)], ["movs|nuevoR", mov("nuevoR", 8)]]); // R borró b
  const M = Vn.juntar(L, R, B);
  assert.deepEqual([...M.keys()].sort(), ["movs|a", "movs|c", "movs|nuevoL", "movs|nuevoR"]);
  assert.equal(M.get("movs|a").monto, 10);
  assert.equal(M.get("movs|c").monto, 30);
  // Los dos cambiaron lo mismo: gana el más nuevo.
  const M2 = Vn.juntar(new Map([["movs|a", mov("a", 5, 9)]]), new Map([["movs|a", mov("a", 6, 8)]]), B);
  assert.equal(M2.get("movs|a").monto, 5);
  // Uno lo borró y el otro lo cambió: queda el cambio.
  assert.equal(Vn.juntar(new Map(), new Map([["movs|a", mov("a", 99, 9)]]), B).get("movs|a").monto, 99);
});

test("celu y compu: se conectan, cada uno anota y los dos terminan iguales", async () => {
  const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
  const celu = aparato([mov("c1", 100), mov("ej_1", 5)]), compu = aparato([mov("p1", 200)]);
  compu.d.config.tema = "light";
  await sincro(celu, cl, srv.ir);
  await sincro(compu, cl, srv.ir); // la compu se suma con lo que ya tenía
  assert.deepEqual(compu.d.movs.map((x) => x.id).sort(), ["c1", "p1"], "lo de ejemplo no viaja");
  await sincro(celu, cl, srv.ir);
  assert.deepEqual(celu.d.movs.map((x) => x.id).sort(), ["c1", "p1"]);
  assert.equal(compu.d.config.tema, "light", "el tema es de cada aparato");
  // El celu borra uno y la compu cambia el nombre.
  celu.d.movs = celu.d.movs.filter((x) => x.id !== "p1");
  compu.d.config.nombre = "Ana María";
  await sincro(celu, cl, srv.ir); await sincro(compu, cl, srv.ir); await sincro(celu, cl, srv.ir);
  for (const a of [celu, compu]) {
    assert.deepEqual(a.d.movs.map((x) => x.id), ["c1"]);
    assert.equal(a.d.config.nombre, "Ana María");
  }
  const v = [...srv.cajas.values()][0].v;
  await sincro(celu, cl, srv.ir);
  assert.equal([...srv.cajas.values()][0].v, v, "si no hay nada nuevo no vuelve a guardar");
});

test("si otro guarda justo en el medio, no se pierde nada", async () => {
  const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
  const a = aparato([mov("a1", 1)]), b = aparato([]);
  await sincro(a, cl, srv.ir); await sincro(b, cl, srv.ir);
  let metido = false;
  const entrometido = async (url, op) => {
    if (op.method === "PUT" && !metido) { metido = true; b.d.movs.push(mov("b1", 2)); await sincro(b, cl, srv.ir); }
    return srv.ir(url, op);
  };
  a.d.movs.push(mov("a2", 3));
  await sincro(a, cl, entrometido);
  assert.deepEqual(a.d.movs.map((x) => x.id).sort(), ["a1", "a2", "b1"]);
});

test("los grupos viajan sin lo que cambia solo y se juntan registro por registro", () => {
  const g = (gastos, v) => ({ id: "g", nombre: "G", moneda: "ARS", ts: 1, yo: "m1", miembros: [{ id: "m1", nombre: "A", ts: 1 }], gastos, pagos: [], sync: { codigo: "K7QM-3XPA-9TRB", v } });
  const gasto = (id) => ({ id, t: id, m: 10, p: "m1", a: ["m1"], sp: "eq", w: {}, f: "", ts: 2 });
  const L = Vn.aplanar(estado([], {})), R = new Map();
  assert.equal(L.size, 3);
  const l = Vn.aplanar({ ...estado([]), grupos: [g([gasto("x")], 4)] }), r = Vn.aplanar({ ...estado([]), grupos: [g([gasto("y")], 9)] });
  assert.deepEqual(l.get("grupos|g").sync, { codigo: "K7QM-3XPA-9TRB" });
  const M = Vn.juntar(l, r, {});
  assert.deepEqual(M.get("grupos|g").gastos.map((x) => x.id), ["x", "y"]);
  assert.ok(R);
});
