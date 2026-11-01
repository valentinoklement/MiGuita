// Grupos. Las pruebas 1 a 5 son las de test_grp.js de la app anterior, con la misma semilla y cantidades.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as G from "../src/logic/grupos.js";
import { formatear } from "../src/logic/dinero.js";

// La lógica vieja, para comprobar que los códigos G1 y G2 que ya circulan se siguen leyendo.
const viejo = new Function(readFileSync(new URL("../../grp_logic.js", import.meta.url), "utf8") + "\nreturn {grpEncode, grpClean};")();

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick = (a) => a[ri(0, a.length - 1)];
const sub = (a, min) => { let r = a.filter(() => rnd() < .6); while (r.length < min) r = [...new Set([...r, pick(a)])]; return r; };
const mkGroup = () => {
  const n = ri(2, 8), miembros = Array.from({ length: n }, (_, i) => ({ id: "m" + i, nombre: "P" + i, ts: 1 })), gastos = [], pagos = [];
  for (let k = 0; k < ri(0, 25); k++) {
    const a = sub(miembros.map((m) => m.id), 1), tipo = pick(["eq", "sh", "pc", "ex"]), m = ri(1, 2000000) / 100, w = {};
    a.forEach((i) => (w[i] = tipo === "ex" ? m / a.length : tipo === "pc" ? 100 / a.length : ri(1, 4)));
    gastos.push({ id: "x" + k, t: "g", m, p: pick(miembros).id, a, sp: tipo, w, f: "2026-10-31", ts: ri(1, 1000), x: rnd() < .1 });
  }
  for (let k = 0; k < ri(0, 6); k++) { const de = pick(miembros).id; let a = pick(miembros).id; while (a === de) a = pick(miembros).id; pagos.push({ id: "p" + k, de, a, m: ri(1, 50000) / 100, f: "2026-10-31", ts: ri(1, 1000), x: rnd() < .1 }); }
  return { id: "g1", nombre: "G", moneda: "ARS", ts: 5, miembros, gastos, pagos };
};
// Cuenta todas las verificaciones y falla mostrando las primeras.
function verificador() {
  const v = { n: 0, fallas: [] };
  v.ok = (c, msg) => { v.n++; if (!c && v.fallas.length < 10) v.fallas.push(msg); };
  v.fin = () => assert.deepEqual(v.fallas, [], v.fallas.length + " fallas");
  return v;
}

test("1) reparto exacto en centavos (20.000 casos)", () => {
  const v = verificador();
  for (let t = 0; t < 20000; t++) {
    const n = ri(1, 12), ids = Array.from({ length: n }, (_, i) => "m" + i), T = rnd() < .1 ? 0 : ri(1, rnd() < .5 ? 100000 : 1e9);
    const tipo = pick(["eq", "sh", "pc", "ex"]), w = {}; ids.forEach((i) => (w[i] = tipo === "ex" ? ri(0, 3000) / 100 : tipo === "pc" ? ri(0, 100) : rnd() < .2 ? 0 : ri(1, 5)));
    const r = G.repartir(T, tipo, ids, w), vals = ids.map((i) => r[i]);
    v.ok(vals.every((x) => Number.isInteger(x) && x >= 0), "enteros no negativos " + JSON.stringify([T, tipo, w, r]));
    v.ok(vals.reduce((a, b) => a + b, 0) === T, "suma exacta " + JSON.stringify([T, tipo, w, r]));
    if (tipo === "eq") v.ok(Math.max(...vals) - Math.min(...vals) <= 1, "parejo difiere en a lo sumo 1 centavo");
  }
  { const r = G.repartir(G.centavos(100), "ex", ["a", "b", "c"], { a: 50, b: 30.5, c: 19.5 }); v.ok(r.a === 5000 && r.b === 3050 && r.c === 1950, "montos exactos respetados"); }
  { const r = G.repartir(1000, "pc", ["a", "b"], { a: 0, b: 0 }); v.ok(r.a === 500 && r.b === 500, "pesos en cero => parejo"); }
  v.fin();
});

test("2 y 3) saldos suman cero y saldar deja todo en cero con a lo sumo n−1 pagos (5.000 grupos)", () => {
  const v = verificador();
  for (let t = 0; t < 5000; t++) {
    const g = mkGroup(), b = G.saldos(g), sum = Object.values(b).reduce((a, c) => a + c, 0);
    v.ok(sum === 0, "los saldos suman 0 (dio " + sum + ")");
    const tr = G.saldar(b), after = { ...b }; tr.forEach((x) => { after[x.de] += x.m; after[x.a] -= x.m; });
    v.ok(Object.values(after).every((x) => x === 0), "saldar deja todo en cero");
    v.ok(tr.length <= Math.max(0, g.miembros.length - 1), "a lo sumo n-1 transferencias");
    v.ok(tr.every((x) => x.m > 0 && x.de !== x.a), "transferencias válidas");
    const pagan = new Set(tr.map((x) => x.de)), cobran = new Set(tr.map((x) => x.a)); v.ok([...pagan].every((i) => !cobran.has(i)), "nadie paga y cobra a la vez");
  }
  v.fin();
});

test("4) fusión idempotente, conmutativa y asociativa; las lápidas se propagan (3.000 casos)", () => {
  const v = verificador();
  const strip = (g) => JSON.stringify({ ...g, yo: undefined });
  const mutate = (g, tag) => {
    const c = JSON.parse(JSON.stringify(g));
    c.gastos.forEach((x) => { if (rnd() < .3) { x.t = "ed" + tag; x.ts = ri(1, 2000); } if (rnd() < .1) { x.x = true; x.ts = ri(1, 2000); } });
    for (let k = 0; k < ri(0, 3); k++) c.gastos.push({ id: "n" + tag + k, t: "nuevo", m: ri(1, 5000), p: c.miembros[0].id, a: [c.miembros[0].id], sp: "eq", w: {}, f: "", ts: ri(1, 2000), x: false });
    if (rnd() < .3) { c.nombre = "N" + tag; c.ts = ri(1, 2000); } return c;
  };
  for (let t = 0; t < 3000; t++) {
    const g = mkGroup(), a = mutate(g, "a"), b = mutate(g, "b"), c = mutate(g, "c");
    v.ok(strip(G.fusionar(a, a)) === strip(G.fusionar(a, { ...a, gastos: [] })), "idempotente");
    v.ok(strip(G.fusionar(a, b)) === strip(G.fusionar(b, a)), "conmutativa");
    v.ok(strip(G.fusionar(G.fusionar(a, b), c)) === strip(G.fusionar(a, G.fusionar(b, c))), "asociativa");
    const m = G.fusionar(a, b); v.ok(strip(G.fusionar(m, a)) === strip(m) && strip(G.fusionar(m, b)) === strip(m), "re-fusionar no cambia nada");
    const ids = new Set(m.gastos.map((x) => x.id)); v.ok([...a.gastos, ...b.gastos].every((x) => ids.has(x.id)), "no se pierde ningún gasto");
  }
  const a = { id: "g", nombre: "A", moneda: "ARS", ts: 1, miembros: [{ id: "m1", nombre: "u", ts: 1 }], gastos: [{ id: "x1", t: "a", m: 10, p: "m1", a: ["m1"], sp: "eq", w: {}, ts: 5 }], pagos: [] };
  const b = JSON.parse(JSON.stringify(a)); b.gastos[0].x = true; b.gastos[0].ts = 9;
  v.ok(G.fusionar(a, b).gastos[0].x === true, "un borrado más nuevo gana");
  const c = JSON.parse(JSON.stringify(a)); c.gastos[0].t = "editado"; c.gastos[0].ts = 12;
  v.ok(G.fusionar(G.fusionar(a, b), c).gastos[0].t === "editado" && !G.fusionar(G.fusionar(a, b), c).gastos[0].x, "una edición más nueva que el borrado gana");
  v.fin();
});

test("5) código: ida y vuelta con texto alrededor, G3 con verificación, y lectura de G1/G2 viejos (300 grupos)", async () => {
  const v = verificador();
  for (let t = 0; t < 300; t++) {
    const g = mkGroup(); g.nombre = "Asado «año» ñandú 🥩 " + t; g.miembros[0].nombre = "Zoë <b>x</b>"; g.yo = "m0"; g.loc = true;
    const clean = G.limpiar(JSON.parse(JSON.stringify(g)));
    const code = await G.codificar(g); v.ok(/^G3:[A-Za-z0-9_-]+\.[0-9a-f]{8}$/.test(code), "formato G3");
    const back = await G.decodificar("Mirá este grupo!!\n" + code + "\nGracias, avisame cuando lo veas");
    v.ok(JSON.stringify(back) === JSON.stringify(clean), "ida y vuelta con texto alrededor");
    v.ok(!("yo" in back) && !("loc" in back), "el código no lleva quién sos ni tus preferencias");
    // Códigos hechos por la app anterior.
    const g2 = await viejo.grpEncode(g); v.ok(/^G2:/.test(g2), "la app vieja hace G2");
    v.ok(JSON.stringify(await G.decodificar(g2)) === JSON.stringify(clean), "G2 viejo se lee igual");
    const cs = globalThis.CompressionStream; globalThis.CompressionStream = undefined;
    const g1 = await viejo.grpEncode(g), g1nuevo = await G.codificar(g); globalThis.CompressionStream = cs;
    v.ok(/^G1:/.test(g1) && /^G1:/.test(g1nuevo), "sin compresión: G1");
    v.ok(JSON.stringify(await G.decodificar(g1)) === JSON.stringify(clean), "G1 viejo se lee igual");
    v.ok(JSON.stringify(await G.decodificar(g1nuevo)) === JSON.stringify(clean), "G1 nuevo ida y vuelta");
  }
  v.fin();
});

test("asado a mano: saldos y pagos", () => {
  const g = { id: "g", nombre: "Asado", moneda: "ARS", ts: 1, miembros: [{ id: "yo", nombre: "Yo" }, { id: "ju", nombre: "Juan" }, { id: "pe", nombre: "Pedro" }],
    gastos: [{ id: "1", t: "Carne", m: 9000, p: "yo", a: ["yo", "ju", "pe"], sp: "eq", w: {}, ts: 1 }, { id: "2", t: "Birra", m: 3000, p: "ju", a: ["ju", "pe"], sp: "sh", w: { ju: 2, pe: 1 }, ts: 2 }], pagos: [] };
  assert.deepEqual(G.saldos(g), { yo: 600000, ju: -200000, pe: -400000 });
  assert.deepEqual(G.saldar(G.saldos(g)), [{ de: "pe", a: "yo", m: 400000 }, { de: "ju", a: "yo", m: 200000 }]);
});

test("códigos rotos, basura y ataques se rechazan", async () => {
  const code = await G.codificar(mkGroup());
  const [cuerpo, suma] = code.slice(3).split(".");
  const roto = "G3:" + cuerpo.slice(0, 20) + (cuerpo[20] === "A" ? "B" : "A") + cuerpo.slice(21) + "." + suma;
  const malos = ["", "hola", "G2:????", "G2:AAAA", "G1:e30", "G3:" + cuerpo + ".00000000", roto, code.slice(0, code.length / 2), "G3:" + "A".repeat(400_001)];
  for (const m of malos) {
    let r = "no lanzó"; try { r = await G.decodificar(m); } catch { r = "lanzó"; }
    assert.ok(r === "lanzó" || (r && Array.isArray(r.gastos) && r.gastos.length === 0), "rechazado: " + m.slice(0, 30));
  }
  // Una bomba de compresión (mucho texto repetido) no se descomprime entera.
  const enorme = new TextEncoder().encode('{"id":"g","nombre":"' + "a".repeat(3_000_000) + '"}');
  const z = new Uint8Array(await new Response(new Blob([enorme]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer());
  let s = ""; for (const b of z) s += String.fromCharCode(b);
  await assert.rejects(G.decodificar("G2:" + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")));
  const evil = G.limpiar({ id: "g1", nombre: "<img src=x onerror=alert(1)>".repeat(10), miembros: [{ id: "a b", nombre: "x" }, { id: "m1", nombre: "ok", alias: "0000003100000000000001" }],
    gastos: [{ id: "x1", p: "m1", m: "1e400", t: "t", a: ["m1", "a b"], sp: "hack", w: JSON.parse('{"__proto__":5,"m1":1}') }], pagos: [{ id: "p1", de: "m1", a: "m1", m: -5 }] });
  assert.ok(evil.nombre.length <= 60);
  assert.equal(evil.miembros.length, 1);
  assert.equal(evil.miembros[0].alias, "", "un CBU que viene en un código no se guarda");
  assert.equal(evil.gastos[0].sp, "eq");
  assert.equal(evil.gastos[0].m, 0);
  assert.deepEqual(Object.keys(evil.gastos[0].w), ["m1"]);
  assert.deepEqual(evil.gastos[0].a, ["m1"]);
  assert.equal(evil.pagos[0].m, 0);
  const muchos = G.limpiar({ id: "g", miembros: Array.from({ length: 80 }, (_, i) => ({ id: "m" + i })), gastos: Array.from({ length: 2000 }, (_, i) => ({ id: "x" + i, p: "m0" })) });
  assert.equal(muchos.miembros.length, 50);
  assert.equal(muchos.gastos.length, 1500);
});

test("alias: solo alias, nunca CBU o CVU", () => {
  assert.deepEqual(G.validarAlias("Mi.Alias.MP"), { ok: true, alias: "mi.alias.mp" });
  assert.deepEqual(G.validarAlias("  "), { ok: true, alias: "" });
  for (const cbu of ["0000003100012345678901", "0000 0031 0001 2345 6789 01", "285-0590-9400-9041-8135-2"]) assert.match(G.validarAlias(cbu).error, /CBU/, cbu);
  for (const malo of ["corto", "con espacios ok", "a".repeat(21), "alias<script>"]) assert.equal(G.validarAlias(malo).ok, false, malo);
});

test("mi parte: suma y movimientos personales gx_ que se sincronizan", () => {
  const g = { id: "g7", nombre: "Viaje", moneda: "ARS", yo: "yo", loc: true, ts: 1, miembros: [{ id: "yo" }, { id: "b" }],
    gastos: [{ id: "1", t: "Nafta", m: 100, p: "b", a: ["yo", "b"], sp: "eq", f: "2026-10-30", ts: 3 }, { id: "2", t: "Hotel", m: 300, p: "yo", a: ["b"], sp: "eq", f: "2026-10-30", ts: 4 },
      { id: "3", t: "Borrado", m: 50, p: "yo", a: ["yo"], f: "2026-10-30", ts: 5, x: true }], pagos: [] };
  assert.equal(G.miParte(g), 5000);
  let r = G.sincronizarMiParte(g, []);
  assert.deepEqual(r.poner.map((x) => [x.id, x.monto, x.detalle, x.fecha, x.categoria]), [["gx_g7_1", 5000, "Viaje: Nafta", "2026-10-30", "otros"]]);
  assert.deepEqual(r.quitar, []);
  const movs = r.poner.map((x) => ({ ...x, categoria: "auto" })); // la persona le cambió la categoría
  assert.deepEqual(G.sincronizarMiParte(g, movs).poner, [], "sin cambios no reescribe");
  g.gastos[0].m = 300;
  r = G.sincronizarMiParte(g, movs);
  assert.equal(r.poner[0].monto, 15000);
  assert.equal(r.poner[0].categoria, "auto", "respeta la categoría que eligió");
  g.gastos[0].x = true;
  assert.deepEqual(G.sincronizarMiParte(g, movs).quitar, ["gx_g7_1"], "si se borra el gasto, se quita");
  g.gastos[0].x = false;
  assert.deepEqual(G.sincronizarMiParte({ ...g, loc: false }, movs).quitar, ["gx_g7_1"], "apagado: se quita todo");
  assert.deepEqual(G.sincronizarMiParte({ ...g, moneda: "USD" }, movs).quitar, ["gx_g7_1"], "grupos en dólares no se suman a pesos");
  assert.deepEqual(G.sincronizarMiParte(g, [{ id: "gx_g70_1" }, { id: "otro" }]).quitar, [], "no toca movimientos de otro grupo");
});

test("resumen para WhatsApp con el alias de quien cobra", () => {
  const g = { id: "g", nombre: "Asado", moneda: "ARS", miembros: [{ id: "yo", nombre: "Yo", alias: "yo.cobra" }, { id: "ju", nombre: "Juan" }, { id: "pe", nombre: "Pedro", alias: "pedro.mp" }],
    gastos: [{ id: "1", t: "Carne", m: 9000, p: "yo", a: ["yo", "ju", "pe"], sp: "eq", w: {} }], pagos: [] };
  assert.equal(G.textoWhatsApp(g, (c) => formatear(c)), "*Asado*\nTotal $9.000 · $3.000 por persona\n\nJuan le paga a Yo $3.000\nalias: yo.cobra\n\nPedro le paga a Yo $3.000\nalias: yo.cobra");
  g.pagos = [{ id: "p", de: "ju", a: "yo", m: 3000 }, { id: "q", de: "pe", a: "yo", m: 3000 }];
  assert.match(G.textoWhatsApp(g, (c) => formatear(c)), /Todos están al día\.$/);
});

test("novedades al unir un código", () => {
  const a = { gastos: [{ id: "1", t: "a" }, { id: "2", t: "b" }], pagos: [], miembros: [{ id: "m" }] };
  const b = { gastos: [{ id: "1", t: "a" }, { id: "2", t: "B" }, { id: "3" }], pagos: [{ id: "p" }], miembros: [{ id: "m" }] };
  assert.deepEqual(G.novedades(a, b), { gastos: { nuevos: 1, cambiados: 1 }, pagos: { nuevos: 1, cambiados: 0 }, miembros: { nuevos: 0, cambiados: 0 }, juntadas: { nuevos: 0, cambiados: 0 } });
});
