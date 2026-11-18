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

/* ---------- lo que se vio en la revisión (2026-11-11) ---------- */
const meta = (id, ahorrado, mod) => ({ id, nombre: "Viaje", moneda: "ARS", objetivo: 900, ahorrado, ts: 1, mod });
const juntos = (L, R, base) => Vn.juntar(new Map(Object.entries(L)), new Map(Object.entries(R)), Vn.huellas(new Map(Object.entries(base))));

test("cambiar la prioridad de una meta sin internet no pisa la plata que el otro dispositivo le sumó", () => {
  // Los dos arrancan igual. La compu le suma plata a la meta; el celu, sin internet, toca la flechita de prioridad.
  const base = { "metas|m1": meta("m1", 100, 1), "metas|m2": meta("m2", 0, 1), "config|metasOrden": { ids: ["m1", "m2"], mod: 1 } };
  const compu = { ...base, "metas|m1": meta("m1", 500, 50) };
  const celu = { ...base, "config|metasOrden": { ids: ["m2", "m1"], mod: 90 } };
  const M = juntos(celu, compu, base);
  assert.equal(M.get("metas|m1").ahorrado, 500, "la plata que se sumó sigue ahí");
  assert.deepEqual(M.get("config|metasOrden").ids, ["m2", "m1"], "y la prioridad nueva también");
  // La prioridad es una lista aparte: mover una meta no la reescribe.
  assert.ok(Vn.CONFIG_COMPARTIDA.includes("metasOrden"));
});

test("si los dos cambiaron la misma meta, gana el cambio más nuevo y no el último que se conecta", () => {
  const base = { "metas|m1": meta("m1", 100, 1) };
  const viejo = { "metas|m1": meta("m1", 150, 20) }, nuevo = { "metas|m1": meta("m1", 300, 80) };
  assert.equal(juntos(viejo, nuevo, base).get("metas|m1").ahorrado, 300);
  assert.equal(juntos(nuevo, viejo, base).get("metas|m1").ahorrado, 300, "da lo mismo quién sincroniza primero");
  // Lo mismo para todo lo que lleva la hora del cambio: deudas, fijos, topes, tarjetas, compras y la plata cargada.
  const s = (monto, mod) => ({ monto, ts: 5, fecha: "2026-11-01", mod });
  assert.equal(juntos({ "config|saldo": s(10, 99) }, { "config|saldo": s(20, 7) }, { "config|saldo": s(1, 1) }).get("config|saldo").monto, 10);
});

test("«Borrar todo» y volver a conectar ese dispositivo no les vacía nada a los demás", () => {
  const platas = { items: [{ id: "p_1", tipo: "usd", nombre: "Dólares", moneda: "USD", monto: 50000, color: 0 }], orden: ["total", "pesos", "p_1"], ocultas: [], mod: 10 };
  const servidor = { "movs|a": mov("a", 1), "config|platas": platas, "config|saldo": { monto: 9, ts: 5, fecha: "2026-11-01", mod: 5 }, "config|aprendidas": { nafta: "auto" } };
  // El dispositivo borró todo (sus platas, su plata cargada y lo aprendido se quitan, no se guardan vacíos) y se vuelve a conectar de cero.
  const M = juntos({}, servidor, {});
  assert.deepEqual(M.get("config|platas"), platas, "las platas de los otros dispositivos siguen ahí");
  assert.equal(M.get("config|saldo").monto, 9);
  assert.deepEqual(M.get("config|aprendidas"), { nafta: "auto" });
  assert.equal(M.get("movs|a").monto, 1);
  // Lo que pasaba antes: una lista vacía con la hora de ahora les ganaba a todos.
  const vacia = { items: [], orden: ["total", "pesos"], ocultas: [], mod: 999 };
  assert.deepEqual(juntos({ "config|platas": vacia }, servidor, {}).get("config|platas").items, [], "por eso «Borrar todo» ya no deja una lista vacía");
});

test("lo que la persona enseñó en cada dispositivo se suma, y lo olvidado no vuelve", () => {
  const base = { "config|aprendidas": { nafta: "auto" } };
  const celu = { "config|aprendidas": { nafta: "auto", juan: "extra", pago: "" } };       // en el celu enseñó «juan» y olvidó «pago»
  const compu = { "config|aprendidas": { nafta: "auto", pago: "deudas", ana: "regalos" } }; // en la compu había enseñado «pago» y «ana»
  assert.deepEqual(juntos(celu, compu, base).get("config|aprendidas"), { nafta: "auto", pago: "", ana: "regalos", juan: "extra" });
});

test("conectar un dispositivo nuevo no pisa las categorías, los íconos, los medios ni el dólar del que ya se usaba", async () => {
  const { migrar } = await import("../src/logic/migraciones.js");
  const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
  const usado = migrar({}), g = usado.config.categorias.gasto;
  // Lo de antes de esta versión no tiene hora (mod); lo nuevo, sí.
  g.find((c) => c.id === "salud").nombre = "Médico";
  g.find((c) => c.id === "super").icono = "cafe";
  g.splice(g.length - 1, 0, { id: "c_bebe", nombre: "Bebé", claves: ["pañales"], oculta: false, dibujo: { c: 2, t: [[1, 1, 30, 30]] }, mod: 5 });
  usado.config.medios.find((m) => m.id === "mp").nombre = "Ualá";
  usado.config.dolar = { ...usado.config.dolar, tipo: "oficial" };
  const A = { d: usado, base: {} }, B = { d: migrar({}), base: {} };
  await sincro(A, cl, srv.ir);
  await sincro(B, cl, srv.ir); // el nuevo se conecta con todo de fábrica
  await sincro(A, cl, srv.ir);
  for (const [quien, x] of [["el nuevo", B], ["el de siempre", A]]) {
    const gx = x.d.config.categorias.gasto;
    assert.equal(gx.find((c) => c.id === "salud").nombre, "Médico", quien);
    assert.equal(gx.find((c) => c.id === "super").icono, "cafe", quien);
    assert.deepEqual(gx.find((c) => c.id === "c_bebe")?.dibujo, { c: 2, t: [[1, 1, 30, 30]] }, quien);
    assert.equal(gx.at(-1).id, "otros", quien + ": Otros sigue última");
    assert.equal(gx.length, g.length, quien + ": sin repetidas");
    assert.equal(x.d.config.medios.find((m) => m.id === "mp").nombre, "Ualá", quien);
    assert.equal(x.d.config.dolar.tipo, "oficial", quien);
  }
});

test("si los dos dispositivos cambiaron categorías, se juntan una por una: no se pierde ninguna y en la misma gana la más nueva", async () => {
  const { categoriasIniciales } = await import("../src/logic/categorias.js");
  const base = categoriasIniciales(), B = Vn.huellas(new Map([["config|categorias", base], ["config|medios", [{ id: "efectivo", nombre: "Efectivo" }]]]));
  const l = structuredClone(base), r = structuredClone(base), de = (x, id) => x.gasto.find((c) => c.id === id);
  Object.assign(de(l, "super"), { icono: "mate", mod: 10 });                 // en el celu: ícono del súper
  Object.assign(de(r, "salud"), { nombre: "Médico", mod: 20 });              // en la compu: otro nombre a Salud
  Object.assign(de(l, "ropa"), { nombre: "Ropa del celu", mod: 30 });
  Object.assign(de(r, "ropa"), { nombre: "Ropa de la compu", mod: 40 });     // la misma en los dos: gana la más nueva
  l.gasto.splice(-1, 0, { id: "c_l", nombre: "Del celu", claves: [], mod: 1 });
  r.gasto.splice(-1, 0, { id: "c_r", nombre: "De la compu", claves: [], mod: 1 });
  const M = Vn.juntar(new Map([["config|categorias", l], ["config|medios", [{ id: "efectivo", nombre: "Plata", mod: 3 }]]]),
    new Map([["config|categorias", r], ["config|medios", [{ id: "efectivo", nombre: "Efectivo" }, { id: "c_m", nombre: "Cripto 2", mod: 2 }]]]), B);
  const c = M.get("config|categorias");
  assert.equal(de(c, "super").icono, "mate");
  assert.equal(de(c, "salud").nombre, "Médico");
  assert.equal(de(c, "ropa").nombre, "Ropa de la compu");
  assert.ok(de(c, "c_l") && de(c, "c_r"), "las nuevas de los dos lados");
  assert.equal(c.gasto.at(-1).id, "otros");
  assert.deepEqual(M.get("config|medios").map((m) => m.nombre), ["Plata", "Cripto 2"]);
  // Basura en la lista no rompe nada.
  const raro = Vn.juntar(new Map([["config|categorias", { gasto: [null, 5, { id: 3 }], ingreso: "x" }]]), new Map([["config|categorias", r]]), B).get("config|categorias");
  assert.ok(Array.isArray(raro.gasto) && Array.isArray(raro.ingreso) && raro.gasto.every((x) => typeof x.id === "string"));
});

test("al juntar no aparecen repetidas las de fábrica que la persona ya tenía con su nombre, ni se pisa lo que cambió el que se conecta", async () => {
  const { migrar } = await import("../src/logic/migraciones.js");
  const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
  // A: se armó su «Mascotas» antes de que existiera la de fábrica, así que la migración no le sumó la otra.
  const a = migrar({}), ga = a.config.categorias.gasto;
  ga.splice(ga.findIndex((c) => c.id === "mascotas"), 1);
  ga.splice(ga.length - 1, 0, { id: "c_perro", nombre: "Mascotas", claves: ["veterinaria"], oculta: false });
  // B: se usó por separado y se le cambiaron cosas antes de esta versión (sin hora).
  const b = migrar({}), gb = b.config.categorias.gasto;
  gb.find((c) => c.id === "salud").nombre = "Médico";
  gb.find((c) => c.id === "super").claves.push("don pepe");
  gb.find((c) => c.id === "gym").oculta = true;
  b.config.medios.find((m) => m.id === "mp").nombre = "Ualá";
  b.config.dolar = { ...b.config.dolar, tipo: "oficial" };
  const A = { d: a, base: {} }, B = { d: b, base: {} };
  await sincro(A, cl, srv.ir);
  await sincro(B, cl, srv.ir);
  await sincro(A, cl, srv.ir);
  for (const [quien, x] of [["B", B], ["A", A]]) {
    const g = x.d.config.categorias.gasto, de = (id) => g.find((c) => c.id === id);
    assert.equal(g.filter((c) => /mascotas/i.test(c.nombre) && !c.oculta).length, 1, quien + ": una sola Mascotas a la vista");
    assert.equal(de("mascotas")?.oculta, true, quien + ": la de fábrica queda, oculta (lo anotado en ella conserva su nombre)");
    assert.equal(de("salud").nombre, "Médico", quien);
    assert.ok(de("super").claves.includes("don pepe"), quien);
    assert.equal(de("gym").oculta, true, quien);
    assert.equal(x.d.config.medios.find((m) => m.id === "mp").nombre, "Ualá", quien);
    assert.equal(x.d.config.dolar.tipo, "oficial", quien);
    assert.equal(g.at(-1).id, "otros", quien);
  }
  // Y queda igual en las dos, sin idas y vueltas.
  const r1 = await sincro(B, cl, srv.ir), r2 = await sincro(A, cl, srv.ir);
  assert.deepEqual(A.d.config.categorias, B.d.config.categorias);
  assert.equal(r1.v, r2.v, "nadie volvió a subir nada");
});

test("desconectar, cambiar cosas y volver a conectar: lo cambiado acá se queda", async () => {
  const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
  const A = aparato([mov("a1", 100)]), B = aparato([]);
  await sincro(A, cl, srv.ir); await sincro(B, cl, srv.ir);
  // B se desconecta (pierde sus huellas), cambia el nombre y marca un día con salvavidas; después se vuelve a conectar.
  B.base = {};
  B.d.config.nombre = "Ana María";
  B.d.dias = [{ fecha: "2026-11-12", sinGasto: true, salvavidas: true }];
  A.d.dias = [{ fecha: "2026-11-12", sinGasto: true }];
  await sincro(A, cl, srv.ir); await sincro(B, cl, srv.ir); await sincro(A, cl, srv.ir);
  for (const x of [A, B]) {
    assert.equal(x.d.config.nombre, "Ana María");
    assert.equal(x.d.dias.find((d) => d.fecha === "2026-11-12").salvavidas, true);
  }
});

test("si la caja del servidor ya no está (venció), el dispositivo no borra lo suyo: lo vuelve a subir", async () => {
  const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
  const A = aparato([mov("a1", 100), mov("a2", 200)]);
  await sincro(A, cl, srv.ir);
  srv.cajas.clear(); // 400 días sin cambios: el servidor la borró
  A.d.movs.push(mov("a3", 300));
  const r = await sincro(A, cl, srv.ir);
  assert.deepEqual([...r.M.keys()].filter((k) => k.startsWith("movs|")).sort(), ["movs|a1", "movs|a2", "movs|a3"]);
  assert.equal(A.d.config.nombre, "Ana");
  assert.ok(A.d.config.categorias, "la configuración sigue");
  // Otro dispositivo que se conecta después encuentra todo.
  const B = aparato([]);
  await sincro(B, cl, srv.ir);
  assert.equal(B.d.movs.length, 3);
});

test("una categoría de una versión vieja con menos palabras sigue siendo «sin tocar»: no le gana a la que se renombró en el otro", async () => {
  const { migrar } = await import("../src/logic/migraciones.js");
  for (const primero of ["renombrada", "vieja"]) {
    const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
    const vieja = migrar({}), ren = migrar({});
    const s = vieja.config.categorias.gasto.find((c) => c.id === "salidas");
    s.claves = s.claves.filter((k) => k !== "trago"); // así venía antes
    Object.assign(ren.config.categorias.gasto.find((c) => c.id === "salidas"), { nombre: "Salidas y birras" });
    const A = { d: vieja, base: {} }, B = { d: ren, base: {} };
    const orden = primero === "vieja" ? [A, B, A] : [B, A, B];
    for (const x of orden) await sincro(x, cl, srv.ir);
    for (const x of [A, B]) assert.equal(x.d.config.categorias.gasto.find((c) => c.id === "salidas").nombre, "Salidas y birras", "conectando primero la " + primero);
  }
});

test("si la caja venció y la volvió a crear un dispositivo atrasado, el otro no pierde lo suyo", async () => {
  const srv = servidorFalso(), cl = await Vn.derivarVinculo(Vn.nuevoCodigoVinculo());
  const celu = aparato([mov("viejo", 1)]), tablet = aparato([]);
  const sinc = async (x) => { const r = await Vn.sincronizarDatos(cl, x.d, x.base, srv.ir, x.v || 0); x.d = { ...Vn.armar(r.M), config: { ...x.d.config, ...Vn.armar(r.M).config } }; x.base = r.base; x.v = r.v; };
  await sinc(celu); await sinc(tablet);
  // El celu sigue anotando y subiendo; la tablet queda atrás.
  celu.d.movs.push(mov("a1", 10), mov("a2", 20)); await sinc(celu);
  celu.d.movs.push(mov("a3", 30)); await sinc(celu);
  srv.cajas.clear();          // 400 días sin cambios
  await sinc(tablet);         // la tablet la vuelve a crear con lo suyo (más viejo)
  await sinc(celu);
  await sinc(tablet);
  for (const x of [celu, tablet]) assert.deepEqual(x.d.movs.map((m) => m.id).sort(), ["a1", "a2", "a3", "viejo"]);
});

test("un medio de fábrica que está en un solo lado queda oculto con la marca de los medios", async () => {
  const { mediosIniciales } = await import("../src/logic/categorias.js");
  const fab = mediosIniciales(), sinCripto = fab.filter((m) => m.id !== "cripto");
  const M = Vn.juntar(new Map([["config|medios", sinCripto]]), new Map([["config|medios", fab]]), Vn.huellas(new Map([["config|medios", []]])));
  const cripto = M.get("config|medios").find((m) => m.id === "cripto");
  assert.equal(cripto.oculto, true);
  assert.equal("oculta" in cripto, false);
});
