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
  const evil = G.limpiar({ id: "g1", nombre: "<img src=x onerror=alert(1)>".repeat(10), miembros: [{ id: "a b", nombre: "x" }, { id: "m1", nombre: "ok", alias: "0000003100000000000001" }, { id: "m2", nombre: "con cbu", alias: "2850590940090418135201" }],
    gastos: [{ id: "x1", p: "m1", m: "1e400", t: "t", a: ["m1", "a b"], sp: "hack", w: JSON.parse('{"__proto__":5,"m1":1}') }], pagos: [{ id: "p1", de: "m1", a: "m1", m: -5 }] });
  assert.ok(evil.nombre.length <= 60);
  assert.equal(evil.miembros.length, 2);
  assert.equal(evil.miembros[0].alias, "", "un CBU mal copiado que viene en un código no se guarda");
  assert.equal(evil.miembros[1].alias, "2850590940090418135201", "uno bien escrito, sí");
  assert.equal(evil.gastos[0].sp, "eq");
  assert.equal(evil.gastos[0].m, 0);
  assert.deepEqual(Object.keys(evil.gastos[0].w), ["m1"]);
  assert.deepEqual(evil.gastos[0].a, ["m1"]);
  assert.equal(evil.pagos[0].m, 0);
  const muchos = G.limpiar({ id: "g", miembros: Array.from({ length: 80 }, (_, i) => ({ id: "m" + i })), gastos: Array.from({ length: 2000 }, (_, i) => ({ id: "x" + i, p: "m0" })) });
  assert.equal(muchos.miembros.length, 50);
  assert.equal(muchos.gastos.length, 1500);
});

// Decisión del usuario (2026-11-11): para cobrar se puede poner el alias o el CBU/CVU. Con eso solo se puede mandar plata.
test("para cobrar: alias, CBU o CVU, y un número mal copiado no pasa", () => {
  assert.deepEqual(G.validarAlias("Mi.Alias.MP"), { ok: true, alias: "mi.alias.mp" });
  assert.deepEqual(G.validarAlias("  "), { ok: true, alias: "" });
  // CBU de ejemplo conocido (285-0590-9 4009041813520-1): se acepta escrito de corrido, con espacios o con guiones, y queda solo con números.
  for (const cbu of ["2850590940090418135201", "2850 5909 4009 0418 1352 01", "285-0590-9-4009041813520-1"]) assert.deepEqual(G.validarAlias(cbu), { ok: true, alias: "2850590940090418135201" }, cbu);
  // Los dígitos verificadores atajan un número cambiado o dos dados vuelta.
  for (const mal of ["2850590940090418135202", "2850590940090418135210", "2850590840090418135201", "0000003100012345678901"]) assert.match(G.validarAlias(mal).error, /algún número mal/, mal);
  assert.match(G.validarAlias("28505909400904181352").error, /22 números y ahí hay 20/);
  assert.match(G.validarAlias("285059094009041813520199").error, /22 números y ahí hay 24/);
  for (const malo of ["corto", "con espacios ok", "a".repeat(21), "alias<script>"]) assert.equal(G.validarAlias(malo).ok, false, malo);
  // Un CVU (de una billetera) empieza con 000: se arma uno válido con la misma cuenta de los verificadores.
  const v = (d, w) => (10 - ([...d].reduce((a, x, i) => a + x * w[i], 0) % 10)) % 10;
  const cvu = "0000003" + v("0000003", [7, 1, 3, 9, 7, 1, 3]) + "1000123456789" + v("1000123456789", [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]);
  assert.equal(G.validarAlias(cvu).ok, true);
  assert.deepEqual([G.nombreDeCuenta(cvu), G.nombreDeCuenta("2850590940090418135201"), G.nombreDeCuenta("juan.mp"), G.nombreDeCuenta("")], ["CVU", "CBU", "alias", "alias"]);
});

// La plata se mueve cuando se mueve de verdad: lo que pagué sale, lo que me devuelven entra y lo que pagó otro no me resta nada todavía.
test("el grupo en mi plata: lo que puse, lo que pasé y lo que me pasaron", () => {
  const g = { id: "g7", nombre: "Viaje", moneda: "ARS", yo: "yo", loc: true, ts: 1, miembros: [{ id: "yo", nombre: "Yo" }, { id: "b", nombre: "Beto" }],
    gastos: [{ id: "1", t: "Nafta", m: 100, p: "b", a: ["yo", "b"], sp: "eq", f: "2026-10-30", ts: 3 }, { id: "2", t: "Hotel", m: 300, p: "yo", a: ["b"], sp: "eq", f: "2026-10-30", ts: 4 },
      { id: "3", t: "Borrado", m: 50, p: "yo", a: ["yo"], f: "2026-10-30", ts: 5, x: true }, { id: "4", t: "Cena", m: 200, p: "b", pp: { yo: 50, b: 150 }, a: ["yo", "b"], sp: "eq", f: "2026-10-31", ts: 6 }],
    pagos: [{ id: "p1", de: "yo", a: "b", m: 20, f: "2026-11-01", ts: 7 }, { id: "p2", de: "b", a: "yo", m: 70, f: "2026-11-02", ts: 8 }, { id: "p3", de: "b", a: "b", m: 5, f: "2026-11-02", ts: 9 }, { id: "p4", de: "yo", a: "b", m: 9, f: "2026-11-02", ts: 9, x: true }] };
  assert.equal(G.miParte(g), 15000);
  assert.deepEqual(G.miCaja(g), { puse: 35000, pase: 2000, mePasaron: 7000 });
  let r = G.movimientosDeGrupo(g, []);
  assert.deepEqual(r.poner.map((x) => [x.id, x.tipo, x.monto, x.detalle, x.fecha, x.categoria]), [
    ["gx_g7_2", "gasto", 30000, "Viaje: Hotel", "2026-10-30", "otros"],          // lo pagué entero, aunque no era para mí
    ["gx_g7_4", "gasto", 5000, "Viaje: Cena", "2026-10-31", "otros"],            // pagamos entre dos: sale lo que puse
    ["gp_g7_p1", "gasto", 2000, "Viaje: le pasé a Beto", "2026-11-01", "otros"],
    ["gp_g7_p2", "ingreso", 7000, "Viaje: me pasó Beto", "2026-11-02", "otros_in"],
  ], "la nafta la pagó Beto: no me resta nada hasta que se la paso");
  assert.deepEqual(r.quitar, []);
  // Lo que salió menos lo que entró es lo que mi plata se movió de verdad.
  const neto = (ms) => ms.reduce((a, x) => a + (x.tipo === "ingreso" ? x.monto : -x.monto), 0);
  assert.equal(neto(r.poner), -(35000 + 2000 - 7000));
  const movs = r.poner.map((x) => (x.id === "gx_g7_2" ? { ...x, categoria: "auto", previo: true } : x)); // la persona le cambió la categoría y dijo que ya estaba en su plata
  assert.deepEqual(G.movimientosDeGrupo(g, movs).poner, [], "sin cambios no reescribe");
  g.gastos[1].m = 400;
  r = G.movimientosDeGrupo(g, movs);
  assert.deepEqual([r.poner[0].monto, r.poner[0].categoria, r.poner[0].previo, r.poner[0].ts], [40000, "auto", true, 4], "respeta la categoría, el «ya estaba» y la hora");
  g.gastos[1].x = true;
  assert.deepEqual(G.movimientosDeGrupo(g, movs).quitar, ["gx_g7_2"], "si se borra la compra, se quita");
  g.gastos[1].x = false; g.gastos[1].m = 300;
  // Un pago que se da vuelta pasa de salir a entrar, con la categoría que corresponde.
  r = G.movimientosDeGrupo({ ...g, pagos: [{ ...g.pagos[0], de: "b", a: "yo" }] }, movs);
  assert.deepEqual(r.poner.map((x) => [x.id, x.tipo, x.categoria]), [["gp_g7_p1", "ingreso", "otros_in"]]);
  const todos = movs.map((x) => x.id);
  assert.deepEqual(G.movimientosDeGrupo({ ...g, loc: false }, movs).quitar, todos, "apagado: se quita todo");
  assert.deepEqual(G.movimientosDeGrupo({ ...g, moneda: "USD" }, movs).quitar, todos, "grupos en dólares no tocan los pesos");
  assert.deepEqual(G.movimientosDeGrupo({ ...g, yo: undefined }, movs).quitar, todos, "sin saber quién soy, nada");
  assert.deepEqual(G.movimientosDeGrupo(g, [{ id: "gx_g70_1" }, { id: "gp_g70_1" }, { id: "otro" }]).quitar, [], "no toca movimientos de otro grupo");
  // Lo que había de la versión anterior («mi parte» de una compra que pagó otro) sale: ya no es plata que se movió.
  assert.deepEqual(G.movimientosDeGrupo(g, [{ id: "gx_g7_1", tipo: "gasto", monto: 5000 }]).quitar, ["gx_g7_1"]);
  // Lo de un grupo de ejemplo es de ejemplo: no viaja, no cuenta y se va con «Quitar ejemplo».
  const ej = G.movimientosDeGrupo({ ...g, id: "ej_g1" }, [{ id: "gx_ej_g1_2", tipo: "gasto", monto: 1 }]);
  assert.ok(ej.poner.every((x) => x.id.startsWith("ej_")));
  assert.deepEqual(ej.quitar, ["gx_ej_g1_2"], "y limpia lo que antes quedaba con nombre de verdad");
});

test("resumen para WhatsApp con el alias de quien cobra", () => {
  const g = { id: "g", nombre: "Asado", moneda: "ARS", miembros: [{ id: "yo", nombre: "Yo", alias: "yo.cobra" }, { id: "ju", nombre: "Juan" }, { id: "pe", nombre: "Pedro", alias: "pedro.mp" }],
    gastos: [{ id: "1", t: "Carne", m: 9000, p: "yo", a: ["yo", "ju", "pe"], sp: "eq", w: {} }], pagos: [] };
  assert.equal(G.textoWhatsApp(g, (c) => formatear(c)), "*Asado*\nTotal $9.000 · $3.000 por persona\n\nJuan le paga a Yo $3.000\nalias: yo.cobra\n\nPedro le paga a Yo $3.000\nalias: yo.cobra");
  // Con CBU o CVU dice cuál es, así quien paga sabe qué está copiando.
  g.miembros[0].alias = "2850590940090418135201";
  assert.match(G.textoWhatsApp(g, (c) => formatear(c)), /Juan le paga a Yo \$3\.000\nCBU: 2850590940090418135201/);
  g.pagos = [{ id: "p", de: "ju", a: "yo", m: 3000 }, { id: "q", de: "pe", a: "yo", m: 3000 }];
  assert.match(G.textoWhatsApp(g, (c) => formatear(c)), /Todos están al día\.$/);
});

test("novedades al unir un código", () => {
  const a = { gastos: [{ id: "1", t: "a" }, { id: "2", t: "b" }], pagos: [], miembros: [{ id: "m" }] };
  const b = { gastos: [{ id: "1", t: "a" }, { id: "2", t: "B" }, { id: "3" }], pagos: [{ id: "p" }], miembros: [{ id: "m" }] };
  assert.deepEqual(G.novedades(a, b), { gastos: { nuevos: 1, cambiados: 1 }, pagos: { nuevos: 1, cambiados: 0 }, miembros: { nuevos: 0, cambiados: 0 }, juntadas: { nuevos: 0, cambiados: 0 } });
});
