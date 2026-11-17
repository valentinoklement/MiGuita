// «Te queda» se tiene que poder creer. Acá se comprueba que el número coincida con lo que la persona hizo,
// venga por donde venga la plata: anotar, editar, borrar, deudas, grupos, cuotas, fijos, metas y cargar o corregir «Mi plata».
//
// Tres partes:
//   1. La regla, que es una sola y está en un solo lugar (cuenta() en src/logic/saldo.js).
//   2. Cada camino por separado: lo que la pantalla promete es lo que pasa.
//   3. Miles de usos al azar contra una cuenta hecha aparte, a mano. Si algún camino se sale de la regla, salta acá.
// Y al final, una alarma: si alguien agrega un camino nuevo que anota movimientos, esta prueba falla hasta que lo sumen acá.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { cuenta, porQueNoCuenta, tuPlata, podesUsar, saldoEfectivo, saldoDesde, plataNueva, anotadoAntes, desglose, enElMes, deCuanto,
  sumarAMeta, sacarDeMeta, gastoDeMetaAparte, efectoDeSacar, ahorrosAlDia, responderAhorro, ahorroSinPreguntar, apartado, hayQuePreguntar } from "../src/logic/saldo.js";
import { correrFijos, movimientoDeFijo, movimientoDePago, categoriaDePago, mesPendiente, fijosPorConfirmar, fechaAlConfirmar, posponer, conMesCerrado, horaDeAuto } from "../src/logic/plan.js";
import { correrCuotas, movimientoDeCuota } from "../src/logic/cuotas.js";
import { movimientosDeGrupo } from "../src/logic/grupos.js";
import { fechaLocal, sumarDias } from "../src/logic/mes.js";
import { categoriasIniciales } from "../src/logic/categorias.js";
import { esDeCredito, idsDeTarjeta, esPagoDeTarjeta, cuentaDeTarjeta, porPagar, sinCubrir, comprasPosibles, pagoParaElegir, pagoParaSaldar, restoSiEligen, paraGastos, tarjetaDelMes } from "../src/logic/tarjeta.js";

const hora = (fecha, h = "09:00") => Date.parse(fecha + "T" + h + ":00");
const mov = (id, tipo, pesos, fecha, ts, extra = {}) => ({ id, tipo, monto: pesos * 100, detalle: id, categoria: "otros", medio: "", fecha, ts, mod: ts, ...extra });
const HOY = "2026-11-10";
// La plata cargada el 10 a las 10 de la mañana: $100.000.
const saldo = { monto: 100000_00, ts: hora(HOY, "10:00"), fecha: HOY };

/* ---------- 1. la regla ---------- */
test("la regla: cuenta lo que pasó después de cargar la plata", () => {
  const casos = [
    ["hoy, anotado después", mov("a", "gasto", 1, HOY, hora(HOY, "11:00")), true],
    ["hoy, anotado antes de cargarla", mov("b", "gasto", 1, HOY, hora(HOY, "09:00")), false],
    ["anotado después, pero con fecha de ayer", mov("c", "gasto", 1, "2026-11-09", hora(HOY, "11:00")), false],
    ["mañana", mov("d", "gasto", 1, "2026-11-11", hora("2026-11-11")), true],
    // Lo que tiene fecha posterior cuenta siempre, aunque su hora sea rara (otro celu con el reloj corrido, algo que viene de un grupo).
    ["fecha posterior con una hora vieja", mov("e", "gasto", 1, "2026-11-12", 5), true],
    ["la persona dijo que ya estaba", mov("f", "gasto", 1, HOY, hora(HOY, "11:00"), { previo: true }), false],
    ["de ejemplo", mov("ej_1", "gasto", 1, HOY, hora(HOY, "11:00")), false],
  ];
  for (const [que, m, esperado] of casos) assert.equal(cuenta(saldo, m), esperado, que);
  assert.equal(cuenta(null, casos[0][1]), false, "sin plata no hay número que mover");
  assert.equal(tuPlata(saldo, casos.map((c) => c[1])), 100000_00 - 3 * 100);
});

test("sin plata cargada: desde el mes del primer ingreso, todo suma y resta", () => {
  const movs = [mov("s", "ingreso", 500000, "2026-11-05", 1), mov("g", "gasto", 20000, "2026-11-02", 2), mov("v", "gasto", 7000, "2026-10-30", 3), mov("ej_0", "ingreso", 9, "2026-09-01", 4)];
  const s = saldoEfectivo(null, movs);
  assert.deepEqual([s.implicito, s.fecha], [true, "2026-11-01"], "lo de ejemplo no arranca nada");
  assert.equal(tuPlata(s, movs), 480000_00, "lo de octubre no cuenta");
  assert.equal(saldoEfectivo(null, movs.filter((m) => m.tipo === "gasto")), null, "sin ingresos no hay «Te queda»");
  assert.equal(saldoEfectivo(saldo, movs), saldo, "con la plata cargada manda ese número");
});

test("cuando algo no cambia «Te queda», se puede decir por qué", () => {
  assert.equal(porQueNoCuenta(saldo, mov("a", "gasto", 1, HOY, hora(HOY, "11:00"))), "", "sí lo cambia");
  assert.match(porQueNoCuenta(saldo, mov("c", "gasto", 1, "2026-11-09", hora(HOY, "11:00"))), /antes de que cargaras tu plata/);
  assert.match(porQueNoCuenta(saldo, mov("f", "gasto", 1, HOY, hora(HOY, "11:00"), { previo: true })), /ya estaba contado/);
  assert.match(porQueNoCuenta({ monto: 0, ts: 0, fecha: "2026-11-01", implicito: true }, mov("v", "gasto", 1, "2026-10-30", 3)), /antes de tu primer ingreso/);
  assert.equal(porQueNoCuenta(null, mov("a", "gasto", 1, HOY, 1)), "", "sin número no hay nada que explicar");
  assert.equal(porQueNoCuenta(saldo, mov("ej_1", "gasto", 1, HOY, hora(HOY, "11:00"))), "");
});

/* ---------- 2. cada camino ---------- */
test("cargar la plata: lo ya anotado queda adentro, sin importar la hora que traiga", () => {
  const ahora = hora(HOY, "10:00");
  const viejos = [
    mov("temprano", "gasto", 5000, HOY, hora(HOY, "08:00")),
    mov("fx_alq_2026-11", "gasto", 300000, HOY, hora(HOY, "12:00"), { fijo: "alq" }),   // de una versión anterior: se anotó solo con la hora del mediodía
    mov("imp_x", "gasto", 900, HOY, hora(HOY, "12:00") + 1),                             // importado: también trae el mediodía
    mov("gx_g_1", "gasto", 4000, "2026-11-15", hora(HOY, "08:30"), { grupo: "g" }),      // una juntada con fecha futura
  ];
  const r = plataNueva(null, 100000_00, viejos, HOY, ahora);
  assert.deepEqual(r.previos.map((m) => m.id), ["fx_alq_2026-11", "imp_x", "gx_g_1"], "estos seguirían contando: se marcan como previos");
  const movs = viejos.map((m) => (r.previos.includes(m) ? { ...m, previo: true } : m));
  assert.equal(tuPlata(r.saldo, movs), 100000_00, "el número que puso es el que queda");
  assert.equal(tuPlata(r.saldo, [...movs, mov("despues", "gasto", 1000, HOY, ahora + 60000)]), 99000_00, "y lo que se anota después, se resta");
  // Corregir conserva lo que se contestó de los ahorros.
  const c = plataNueva({ ...r.saldo, vistas: 700, aparte: 300 }, 5, [], "2026-11-12", hora("2026-11-12"));
  assert.deepEqual([c.saldo.vistas, c.saldo.aparte, c.saldo.fecha], [700, 300, "2026-11-12"]);
});

test("«restalo»: el punto de partida nunca queda en el futuro", () => {
  // A la mañana, lo único anotado es un fijo que trae la hora del mediodía.
  const ahora = hora(HOY, "09:00"), lista = [mov("fx_alq_2026-11", "gasto", 300000, HOY, hora(HOY, "12:00"))];
  const s = saldoDesde(500000_00, lista, ahora);
  assert.equal(s.ts, ahora);
  assert.equal(tuPlata(s, lista), 200000_00, "lo anterior se resta, como pidió");
  assert.equal(tuPlata(s, [...lista, mov("cafe", "gasto", 1000, HOY, ahora + 60000)]), 199000_00, "y lo que anota enseguida también");
});

test("pagar o cobrar una deuda mueve la plata, y lo de una deuda de ejemplo no", () => {
  const ahora = hora(HOY, "15:00");
  const debo = { id: "d1", tipo: "debo", quien: "Juan", concepto: "", total: 30000_00, pagado: 0 };
  const pago = movimientoDePago(debo, 30000_00, { id: "x1", hoy: HOY, ahora });
  assert.deepEqual([pago.tipo, pago.monto, pago.categoria, pago.detalle, pago.fecha], ["gasto", 30000_00, "deudas", "Pago: Juan", HOY]);
  assert.equal(tuPlata(saldo, [pago]), 70000_00, "el reporte del usuario: pagué y se tiene que restar");
  const cobro = movimientoDePago({ ...debo, tipo: "meDeben", concepto: "Entradas" }, 10000_00, { id: "x2", hoy: HOY, ahora });
  assert.deepEqual([cobro.tipo, cobro.categoria, cobro.detalle], ["ingreso", "otros_in", "Cobro: Entradas"]);
  assert.equal(tuPlata(saldo, [pago, cobro]), 80000_00);
  // Pagar la tarjeta resta igual que cualquier deuda, pero queda en «Pago de tarjeta» (pedido del usuario).
  const cats = categoriasIniciales();
  const visa = movimientoDePago({ ...debo, quien: "Banco", concepto: "Tarjeta Visa" }, 20000_00, { id: "x5", hoy: HOY, ahora, cats });
  assert.deepEqual([visa.tipo, visa.categoria, visa.detalle], ["gasto", "tarjeta", "Pago: Tarjeta Visa"]);
  assert.equal(tuPlata(saldo, [visa]), 80000_00);
  assert.equal(categoriaDePago({ tipo: "debo", quien: "Mastercard", concepto: "" }, cats), "tarjeta");
  assert.equal(categoriaDePago({ tipo: "debo", quien: "Juan", concepto: "Asado" }, cats), "deudas", "una deuda con una persona sigue en Deudas");
  assert.equal(categoriaDePago({ tipo: "debo", quien: "Banco", concepto: "Préstamo" }, cats), "deudas");
  assert.equal(categoriaDePago({ tipo: "meDeben", quien: "Visa", concepto: "" }, cats), "otros_in", "lo que me deben es un ingreso");
  const oculta = categoriasIniciales(); oculta.gasto.find((c) => c.id === "tarjeta").oculta = true;
  assert.equal(categoriaDePago({ tipo: "debo", quien: "Visa", concepto: "" }, oculta), "deudas", "si ocultó la categoría, vuelve a Deudas");
  const ej = movimientoDePago({ ...debo, id: "ej_d1" }, 70000_00, { id: "x3", hoy: HOY, ahora });
  assert.ok(ej.id.startsWith("ej_"), "se va con «Quitar ejemplo» y no toca la plata de verdad");
  assert.equal(tuPlata(saldo, [ej]), 100000_00);
  // En dólares: se pasa a pesos con el dólar de hoy; sin dólar no se anota nada a medias.
  const usd = { ...debo, moneda: "USD" };
  assert.equal(movimientoDePago(usd, 100_00, { id: "x4", hoy: HOY, ahora }), null);
  const m = movimientoDePago(usd, 100_00, { id: "x4", hoy: HOY, ahora, cot: { valor: 1500_00, fecha: HOY, tipo: "blue", fuente: "manual" } });
  assert.deepEqual([m.monto, m.usd.monto], [150000_00, 100_00]);
});

test("lo que se anota solo (fijos y cuotas): no se resta dos veces ni se pierde", () => {
  const f = { id: "alq", tipo: "gasto", modo: "auto", nombre: "Alquiler", monto: 30000_00, categoria: "servicios", medio: "", dia: 10, activo: true, desde: "2026-11", hechos: [] };
  // El fijo ya existía: se anotó al abrir la app, antes de que la persona cargara la plata ese día.
  const deAntes = correrFijos([f], [], HOY).nuevos[0];
  assert.equal(deAntes.ts, hora(HOY, "00:00"), "trae la hora del comienzo del día: igual en todos los dispositivos");
  assert.equal(cuenta(saldo, deAntes), false, "ya estaba cuando cargó la plata: no se resta de nuevo");
  // Si la persona elige «restalo», sí.
  assert.equal(tuPlata(saldoDesde(100000_00, [deAntes], saldo.ts), [deAntes]), 70000_00);
  // El fijo se creó a la tarde, después de cargar la plata: avisa «se anotó solo» y se resta.
  const nuevo = correrFijos([{ ...f, ts: hora(HOY, "16:00") }], [], HOY).nuevos[0];
  assert.equal(cuenta(saldo, nuevo), true);
  // Y el del mes que viene, por supuesto.
  const diciembre = correrFijos([{ ...f, hechos: ["2026-11"] }], [], "2026-12-10").nuevos[0];
  assert.equal(cuenta(saldo, diciembre), true);
  // Cuotas: lo mismo.
  const compra = { id: "c1", tarjeta: "t", detalle: "Heladera", categoria: "casa", total: 60000_00, cuotas: 6, desde: "2026-11", dia: 10, previas: 0, hechas: 0, ts: hora("2026-11-03") };
  const cuota = correrCuotas([compra], [], HOY).nuevos[0];
  assert.equal(cuota.ts, hora(HOY, "00:00"));
  assert.equal(cuenta(saldo, cuota), false, "ya estaba anotada cuando cargó la plata");
  assert.equal(cuenta(saldo, correrCuotas([{ ...compra, ts: hora(HOY, "16:00") }], [], HOY).nuevos[0]), true, "comprado después de cargarla");
  assert.equal(horaDeAuto(HOY, undefined), hora(HOY, "00:00"));
  // Lo que sale de un fijo o de una compra de ejemplo es de ejemplo.
  assert.ok(correrFijos([{ ...f, id: "ej_f1" }], [], HOY).nuevos[0].id.startsWith("ej_"));
  assert.ok(movimientoDeFijo({ ...f, id: "ej_f1" }, "2026-11").id.startsWith("ej_"));
  assert.ok(movimientoDeCuota({ ...compra, id: "ej_c1" }, 1).id.startsWith("ej_"));
  assert.equal(correrFijos([{ ...f, id: "ej_f1" }], [{ id: "fx_ej_f1_2026-11" }], HOY).nuevos.length, 0, "y no duplica el que quedó de una versión anterior");
});

test("un ingreso que pregunta: «todavía no» a fin de mes no pierde el cobro", () => {
  const sueldo = { id: "s1", tipo: "ingreso", modo: "recordar", nombre: "Sueldo", monto: 500000_00, categoria: "sueldo", medio: "", dia: 28, activo: true, desde: "2026-10", hechos: ["2026-10"] };
  assert.equal(mesPendiente(sueldo, "2026-11-27"), "", "todavía no llegó el día");
  assert.equal(mesPendiente(sueldo, "2026-11-28"), "2026-11");
  // Dice «todavía no» el 30: se le pregunta al otro día, aunque ya sea diciembre.
  const pospuesto = { ...sueldo, pospuesto: "2026-12-01" };
  assert.equal(mesPendiente(pospuesto, "2026-11-30"), "", "hoy no se le pregunta más");
  assert.equal(mesPendiente(pospuesto, "2026-12-01"), "2026-11", "el 1.º de diciembre se le sigue preguntando por noviembre");
  assert.equal(mesPendiente(pospuesto, "2026-12-27"), "2026-11");
  assert.deepEqual(fijosPorConfirmar([pospuesto], "2026-12-05").map((f) => f.id), ["s1"]);
  // Cuando llega el día de diciembre, se pregunta por diciembre.
  assert.equal(mesPendiente(pospuesto, "2026-12-28"), "2026-12");
  assert.equal(mesPendiente({ ...sueldo, hechos: ["2026-10", "2026-11"] }, "2026-12-05"), "", "ya confirmado");
  assert.equal(mesPendiente({ ...sueldo, desde: "2026-12" }, "2026-12-05"), "", "antes de empezar no hay nada pendiente");
  assert.equal(mesPendiente({ ...sueldo, activo: false }, "2026-11-28"), "");
});

test("confirmar un cobro: con qué fecha queda y cuándo hay que preguntar", () => {
  const sueldo = { id: "s1", tipo: "ingreso", modo: "recordar", nombre: "Sueldo", monto: 500000_00, categoria: "sueldo", medio: "", dia: 5, activo: true, desde: "2026-11", hechos: [] };
  const confirmar = (f, hoy, s) => {
    const r = fechaAlConfirmar(f, mesPendiente(f, hoy), hoy, s);
    return { ...r, mov: movimientoDeFijo(f, mesPendiente(f, hoy), null, { fecha: r.fecha, ts: hora(hoy, "18:00") }) };
  };
  // Cargó la plata el 3 y cobra el 5, en fecha: va con la fecha prevista y suma.
  const temprano = { monto: 100000_00, ts: hora("2026-11-03"), fecha: "2026-11-03" };
  let r = confirmar(sueldo, "2026-11-07", temprano);
  assert.deepEqual([r.fecha, r.duda], ["2026-11-05", false]);
  assert.equal(tuPlata(temprano, [r.mov]), 600000_00);
  // El caso del encargo: dijo «todavía no» el 5, el 6 y el 7; el 8 corrigió su plata; el 9 cobra.
  // Antes quedaba con fecha 5 y no sumaba. Ahora va con la fecha de hoy y suma.
  const corregida = { monto: 80000_00, ts: hora("2026-11-08"), fecha: "2026-11-08" };
  r = confirmar({ ...sueldo, pospuesto: "2026-11-09" }, "2026-11-09", corregida);
  assert.equal(r.fecha, "2026-11-09");
  assert.equal(tuPlata(corregida, [r.mov]), 580000_00, "suma, aunque la plata se haya corregido en el medio");
  // Nunca dijo «todavía no» y cargó la plata después del día previsto: no se sabe si ese número ya lo tenía. Se suma y se pregunta.
  r = confirmar(sueldo, "2026-11-09", corregida);
  assert.deepEqual([r.fecha, r.duda], ["2026-11-09", true]);
  assert.equal(tuPlata(corregida, [r.mov]), 580000_00);
  assert.equal(tuPlata(corregida, [{ ...r.mov, previo: true }]), 80000_00, "si contesta «ya estaba», no se suma dos veces");
  // Dijo «todavía no» después de corregir la plata: seguro que no estaba en ese número. No hace falta preguntar.
  r = confirmar({ ...sueldo, pospuesto: "2026-11-10" }, "2026-11-10", corregida);
  assert.deepEqual([r.fecha, r.duda], ["2026-11-10", false]);
  // Ahora «todavía no» vuelve a preguntar a los 3 días. Lo dijo el 5; el 7 corrigió su plata; el 8 le pregunta de nuevo y cobra:
  // no se sabe si lo que cargó el 7 ya tenía el sueldo adentro, así que suma y pregunta.
  const tresDias = posponer(sueldo, "2026-11-05"), el7 = { monto: 80000_00, ts: hora("2026-11-07"), fecha: "2026-11-07" };
  assert.equal(mesPendiente(tresDias, "2026-11-07"), "", "todavía no le vuelve a preguntar");
  r = confirmar(tresDias, "2026-11-08", el7);
  assert.deepEqual([r.fecha, r.duda], ["2026-11-08", true]);
  assert.equal(tuPlata(el7, [r.mov]), 580000_00);
  // Si no tocó su plata en el medio, no hay nada que preguntar: suma con la fecha de hoy.
  r = confirmar(tresDias, "2026-11-08", temprano);
  assert.deepEqual([r.fecha, r.duda], ["2026-11-08", false]);
  assert.equal(tuPlata(temprano, [r.mov]), 600000_00);
  // «Este mes no»: no se anota nada, así que la plata no se mueve, y no queda nada pendiente por ese mes.
  assert.equal(mesPendiente(conMesCerrado(tresDias, "2026-11"), "2026-11-20"), "");
  // Sin plata cargada no hay nada que preguntar: va con su fecha.
  assert.deepEqual(fechaAlConfirmar(sueldo, "2026-11", "2026-11-09", null), { fecha: "2026-11-05", duda: false });
  assert.deepEqual(fechaAlConfirmar(sueldo, "2026-11", "2026-11-09", { monto: 0, ts: 0, fecha: "2026-11-01", implicito: true }), { fecha: "2026-11-05", duda: false });
  // El mismo movimiento, se confirme desde donde se confirme: nunca se duplica.
  assert.equal(r.mov.id, "fx_s1_2026-11");
});

test("un grupo mueve la plata cuando la plata se mueve de verdad", () => {
  const g = { id: "g1", nombre: "Asado", moneda: "ARS", yo: "yo", loc: true, miembros: [{ id: "yo", nombre: "Yo" }, { id: "ju", nombre: "Juan" }], gastos: [], pagos: [] };
  let movs = [];
  const aplicar = (grupo) => { const r = movimientosDeGrupo(grupo, movs, HOY); movs = movs.filter((m) => !r.quitar.includes(m.id) && !r.poner.some((p) => p.id === m.id)).concat(r.poner); return r.poner; };
  const tarde = hora(HOY, "15:00");
  // Juan pagó la carne: a mí todavía no me salió plata.
  g.gastos.push({ id: "carne", t: "Carne", m: 40000, p: "ju", a: ["yo", "ju"], sp: "eq", f: HOY, ts: tarde });
  aplicar(g);
  assert.equal(tuPlata(saldo, movs), 100000_00, "lo que pagó otro no me resta nada");
  // «Ya le pagué»: ahí sí. Es el caso que contó el usuario.
  g.pagos.push({ id: "p1", de: "yo", a: "ju", m: 20000, f: HOY, ts: tarde + 1 });
  aplicar(g);
  assert.equal(tuPlata(saldo, movs), 80000_00, "pagué y se restó");
  // Pagué el fernet entero y Juan me devuelve su mitad.
  g.gastos.push({ id: "fernet", t: "Fernet", m: 18000, p: "yo", a: ["yo", "ju"], sp: "eq", f: HOY, ts: tarde + 2 });
  aplicar(g);
  assert.equal(tuPlata(saldo, movs), 62000_00, "salió todo lo que puse, no solo mi parte");
  g.pagos.push({ id: "p2", de: "ju", a: "yo", m: 9000, f: HOY, ts: tarde + 3 });
  aplicar(g);
  assert.equal(tuPlata(saldo, movs), 71000_00, "«ya me pagó»: vuelve");
  // Al final gasté lo que me tocaba: la mitad de la carne y la mitad del fernet.
  assert.equal(100000_00 - tuPlata(saldo, movs), (20000 + 9000) * 100);
  // Una compra de la semana pasada que cargo recién hoy: mi plata ya la tenía en cuenta.
  g.gastos.push({ id: "viejo", t: "Carbón", m: 5000, p: "yo", a: ["yo", "ju"], sp: "eq", f: "2026-11-03", ts: tarde + 4 });
  const puestos = aplicar(g);
  assert.equal(tuPlata(saldo, movs), 71000_00);
  assert.match(porQueNoCuenta(saldo, puestos[0]), /antes de que cargaras tu plata/, "y la app lo puede decir");
  // Apagar «que este grupo mueva mi plata» saca todo; prenderlo de nuevo deja el mismo número.
  aplicar({ ...g, loc: false });
  assert.equal(tuPlata(saldo, movs), 100000_00);
  aplicar(g);
  assert.equal(tuPlata(saldo, movs), 71000_00);
  // Deshacer un pago (queda tachado) lo saca de mi plata.
  g.pagos[0] = { ...g.pagos[0], x: true };
  aplicar(g);
  assert.equal(tuPlata(saldo, movs), 91000_00);
  // Un grupo de ejemplo nunca toca la plata de verdad.
  movs = [];
  aplicar({ ...g, id: "ej_g1" });
  assert.equal(tuPlata(saldo, movs), 100000_00);
});

test("sacar de una meta: lo que la pantalla promete es lo que pasa", () => {
  const ahora = hora(HOY, "15:00");
  const queda = (s, movs, metas) => podesUsar(saldoEfectivo(s, movs), movs, metas);
  const viaje = { id: "m1", nombre: "Viaje", moneda: "ARS", objetivo: 900000_00, ahorrado: 40000_00, ts: 1 };
  const dolares = { id: "m2", nombre: "Fondo", moneda: "USD", objetivo: 1000_00, ahorrado: 300_00, ts: 2 };
  const ejemplo = { id: "ej_m1", nombre: "Viaje", moneda: "ARS", objetivo: 600000_00, ahorrado: 380000_00, ts: 3 };
  const ingreso = mov("s", "ingreso", 100000, "2026-11-02", 5);
  const situaciones = {
    "lo guardado está dentro de la plata": { saldo: { ...saldo, vistas: 40000_00, aparte: 0 }, movs: [] },
    "lo guardado está aparte": { saldo: { ...saldo, vistas: 40000_00, aparte: 40000_00 }, movs: [] },
    "mitad adentro, mitad aparte": { saldo: { ...saldo, vistas: 40000_00, aparte: 20000_00 }, movs: [] },
    "todavía no se preguntó": { saldo, movs: [] },
    "sin plata cargada, con ingresos": { saldo: null, movs: [ingreso] },
    "sin nada": { saldo: null, movs: [] },
  };
  const SACA = 30000_00;
  for (const [nombre, { saldo: s0, movs: m0 }] of Object.entries(situaciones)) for (const meta of [viaje, dolares, ejemplo]) for (const gasto of [false, true]) {
    const que = nombre + " · " + meta.nombre + (meta.moneda === "USD" ? " (dólares)" : meta.id.startsWith("ej_") ? " (de ejemplo)" : "") + (gasto ? " · ya la gasté" : " · sin gastar");
    const metas = [viaje, dolares, ejemplo], antes = queda(s0, m0, metas);
    const saca = meta.moneda === "USD" ? 100_00 : SACA, enPesos = meta.moneda === "USD" ? 150000_00 : saca;
    // Lo mismo que hace la app al tocar «Sacar».
    const r = sacarDeMeta(s0, metas, meta, saca);
    const metas2 = metas.map((m) => (m.id === meta.id ? r.meta : m));
    const s1 = ahorrosAlDia(r.saldo, metas2);
    const movs = gasto ? [...m0, { ...mov((meta.id.startsWith("ej_") ? "ej_" : "") + "g1", "gasto", enPesos / 100, HOY, ahora), ...(gastoDeMetaAparte(meta) && { previo: true }) }] : m0;
    const despues = queda(s1, movs, metas2), promesa = efectoDeSacar(saldoEfectivo(s0, m0), meta, gasto);
    assert.equal(r.meta.ahorrado, meta.ahorrado - saca, que + ": la meta baja");
    if (antes === null) { assert.equal(despues, null, que); assert.equal(promesa, "igual", que); continue; }
    const cambio = despues - antes;
    assert.equal(cambio, promesa === "vuelve" ? enPesos : promesa === "resta" ? -enPesos : 0, que + ": prometió «" + promesa + "» y cambió " + cambio / 100);
  }
  // Lo que denunció el encargo, dicho con todas las letras:
  const aparte = { ...saldo, vistas: 40000_00, aparte: 40000_00 };
  assert.equal(efectoDeSacar(aparte, viaje, true), "igual", "ahorros aparte + ya la gasté: «Te queda» no se toca");
  assert.equal(efectoDeSacar(saldo, dolares, true), "igual", "meta en dólares + ya la gasté: tampoco");
  assert.equal(efectoDeSacar(aparte, viaje, false), "vuelve", "sin gastar promete que vuelve…");
  assert.equal(sacarDeMeta(aparte, [viaje], viaje, SACA).saldo.monto, saldo.monto + SACA, "…y vuelve: esa plata entra a lo que te queda");
});

test("las metas y la plata: sumar aparta, y lo que se contesta una vez queda", () => {
  const meta = { id: "m1", nombre: "Viaje", moneda: "ARS", objetivo: 900000_00, ahorrado: 10000_00, ts: 1 };
  assert.equal(ahorroSinPreguntar(saldo, [meta]), 10000_00, "lo que ya tenía guardado: se pregunta si está adentro");
  const aparte = responderAhorro(saldo, [meta], true);
  assert.equal(podesUsar(aparte, [], [meta]), 100000_00, "aparte: no se descuenta");
  assert.equal(podesUsar(responderAhorro(saldo, [meta], false), [], [meta]), 90000_00, "adentro: se descuenta");
  const r = sumarAMeta(aparte, meta, 5000_00);
  assert.equal(podesUsar(r.saldo, [], [r.meta]), 95000_00, "lo que suma ahora sale de su plata");
  assert.equal(ahorroSinPreguntar(r.saldo, [r.meta]), 0, "y no hace falta preguntar nada");
  assert.equal(sumarAMeta(aparte, { ...meta, moneda: "USD" }, 5000).saldo, aparte, "una meta en dólares no toca los pesos");
  assert.equal(sumarAMeta(aparte, { ...meta, id: "ej_m1" }, 5000).saldo, aparte, "ni una de ejemplo");
  assert.equal(sumarAMeta(null, meta, 5000).saldo, null);
  // Se borra la meta: lo apartado no puede ser más que lo que hay.
  assert.deepEqual([ahorrosAlDia(r.saldo, []).vistas, ahorrosAlDia(r.saldo, []).aparte], [0, 0]);
  assert.equal(ahorrosAlDia(r.saldo, [r.meta]), r.saldo, "si no cambia nada, devuelve la misma");
});

test("al cargar la plata por primera vez, el orden en que se anotó no importa", () => {
  const ahora = hora(HOY, "10:00");
  const movs = [mov("nafta", "gasto", 20000, HOY, hora(HOY, "09:00")), mov("ayer", "gasto", 5000, "2026-11-09", hora("2026-11-09")), mov("ej_1", "gasto", 1, HOY, 1)];
  const antes = anotadoAntes(movs, "2026-11");
  assert.deepEqual([antes.lista.length, antes.gastos], [2, 25000_00]);
  // «Ya está restado: tengo 100.000»
  const ya = plataNueva(null, 100000_00, movs, HOY, ahora);
  assert.equal(tuPlata(ya.saldo, movs), 100000_00);
  // «Restalo: me queda 75.000»
  assert.equal(tuPlata(saldoDesde(100000_00, antes.lista, ahora), movs), 75000_00);
});

/* ---------- 3. miles de usos al azar contra una cuenta hecha aparte ---------- */
// Un generador con semilla: si algo falla, falla siempre igual y se puede mirar.
function azar(semilla) {
  let a = semilla >>> 0;
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { r, entre: (min, max) => min + Math.floor(r() * (max - min + 1)), uno: (lista) => lista[Math.floor(r() * lista.length)] };
}

// Una persona usando la app: el mismo estado que guarda la app y las mismas funciones que usa la app para cada cosa.
// Al lado, «la cuenta de almacenero»: se lleva a mano qué entró y qué salió desde que se cargó la plata.
function simular(semilla, pasos) {
  const z = azar(semilla);
  let reloj = hora(HOY, "08:00"), n = 0;
  const hoy = () => fechaLocal(new Date(reloj));
  const S = { saldo: null, movs: [], metas: [], fijos: [], grupo: { id: "g1", nombre: "Asado", moneda: "ARS", yo: "yo", loc: true, miembros: [{ id: "yo", nombre: "Yo" }, { id: "ju", nombre: "Juan" }], gastos: [], pagos: [] } };
  // La cuenta aparte. hechos: cada cosa que movió plata { monto con signo, fecha, ts, fuera (ya estaba o no toca), grupo }.
  const O = { plata: null, fecha: "", ts: 0, hechos: new Map(), total: 0, aparte: 0, vistas: 0, debe: 0, cubierto: 0, pagos: [] };
  const historia = [];
  const poner = (m) => { S.movs = S.movs.filter((x) => x.id !== m.id).concat(m); };
  const quitar = (id) => { S.movs = S.movs.filter((x) => x.id !== id); };
  const ponerMetas = (lista) => { S.metas = lista; S.saldo = ahorrosAlDia(S.saldo, S.metas); };
  const alGrupo = () => { const r = movimientosDeGrupo(S.grupo, S.movs, hoy()); r.quitar.forEach(quitar); r.poner.forEach(poner); };
  const correr = () => { const r = correrFijos(S.fijos, S.movs, hoy()); r.nuevos.forEach((m) => { poner(m); const f = S.fijos.find((x) => x.id === m.fijo); O.hechos.set(m.id, { monto: -m.monto, fecha: m.fecha, ts: Math.max(hora(m.fecha, "00:00"), f.ts) }); }); S.fijos = S.fijos.map((f) => r.cambiados.find((c) => c.id === f.id) || f); };
  const esperado = () => {
    if (O.plata === null) return null;
    let p = O.plata;
    for (const h of O.hechos.values()) if (!h.fuera && !(h.grupo && !S.grupo.loc) && (h.fecha > O.fecha || (h.fecha === O.fecha && h.ts >= O.ts))) p += h.monto;
    return p - Math.max(0, O.total - O.aparte);
  };
  const cargar = (monto) => {
    const r = plataNueva(S.saldo, monto, S.movs, hoy(), reloj);
    r.previos.forEach((m) => poner({ ...m, previo: true }));
    S.saldo = r.saldo;
    O.plata = monto; O.fecha = hoy(); O.ts = reloj;
    for (const h of O.hechos.values()) h.fuera = true; // lo ya anotado queda adentro de ese número
  };
  const acciones = {
    anotar() { const tipo = z.r() < 0.2 ? "ingreso" : "gasto", m = mov("a" + ++n, tipo, z.entre(1, 50) * 100, hoy(), reloj); poner(m); O.hechos.set(m.id, { monto: tipo === "ingreso" ? m.monto : -m.monto, fecha: m.fecha, ts: reloj }); },
    anotarConFechaVieja() { const m = mov("v" + ++n, "gasto", z.entre(1, 50) * 100, sumarDias(hoy(), -z.entre(1, 5)), reloj); poner(m); O.hechos.set(m.id, { monto: -m.monto, fecha: m.fecha, ts: reloj }); },
    editar() { const ms = S.movs.filter((m) => /^[av]\d/.test(m.id) && m.medio !== "credito"); if (!ms.length) return; const m = z.uno(ms), monto = z.entre(1, 50) * 10000; poner({ ...m, monto }); O.hechos.get(m.id).monto = m.tipo === "ingreso" ? monto : -monto; },
    borrar() { const ms = S.movs.filter((m) => /^[av]\d/.test(m.id) && m.medio !== "credito"); if (!ms.length) return; const m = z.uno(ms); quitar(m.id); O.hechos.delete(m.id); },
    yaEstaba() { const ms = S.movs.filter((m) => /^a\d/.test(m.id) && !m.previo && m.medio !== "credito"); if (!ms.length) return; const m = z.uno(ms); poner({ ...m, previo: true }); O.hechos.get(m.id).fuera = true; },
    pagarDeuda() { const cobro = z.r() < 0.3, c = z.entre(1, 30) * 100000; const m = movimientoDePago({ id: "d" + n, tipo: cobro ? "meDeben" : "debo", quien: "Ana", concepto: "" }, c, { id: "p" + ++n, hoy: hoy(), ahora: reloj }); poner(m); O.hechos.set(m.id, { monto: cobro ? c : -c, fecha: hoy(), ts: reloj }); },
    corregirPlata() { cargar(z.entre(50, 500) * 100000); },
    // Tarjeta de crédito: lo comprado con crédito no toca la plata hasta pagar la tarjeta; a mano se lleva lo que se debe.
    compraConCredito() { const m = mov("c" + ++n, "gasto", z.entre(1, 80) * 100, hoy(), reloj, { medio: "credito", enTarjeta: true, categoria: "ropa" }); poner(m); O.debe += m.monto; },
    // Lo anotado con crédito antes de esta versión (sin la marca) sigue restando como siempre.
    compraConCreditoVieja() { const m = mov("w" + ++n, "gasto", z.entre(1, 80) * 100, hoy(), reloj, { medio: "credito", categoria: "ropa" }); poner(m); O.hechos.set(m.id, { monto: -m.monto, fecha: m.fecha, ts: reloj }); },
    // Lo devuelto a la tarjeta baja lo que se debe y puede dejar saldo a favor (lo descuenta el próximo resumen).
    devolucionALaTarjeta() { const m = mov("r" + ++n, "ingreso", z.entre(1, 20) * 100, hoy(), reloj, { medio: "credito", enTarjeta: true, categoria: "otros_in" }); poner(m); O.debe -= m.monto; },
    pagarTarjeta() {
      const monto = z.r() < 0.5 && O.debe > 0 ? O.debe : z.entre(1, 120) * 10000, m = mov("t" + ++n, "gasto", monto / 100, hoy(), reloj, { categoria: "tarjeta" });
      poner(m); O.hechos.set(m.id, { monto: -monto, fecha: m.fecha, ts: reloj });
      // Un pago nunca cubre más de lo que se debe (ni algo, si hay saldo a favor).
      const antes = O.debe, c = antes > 0 ? Math.min(antes, monto) : 0;
      O.debe = antes - c; O.cubierto += c;
      O.pagos.push({ id: m.id, monto, antes, c, salda: false });
    },
    // «Sí, elegirlas»: gastos anotados sin decir crédito, de entre el pago anterior y el último, pasan a ser compras con crédito.
    elegirComprasDelPago() {
      const u = O.pagos.at(-1), previo = O.pagos.at(-2);
      if (!u) return;
      const P = S.movs.find((m) => m.id === u.id), A = previo && S.movs.find((m) => m.id === previo.id);
      const entre = (m) => (m.fecha > (A?.fecha ?? "") || (A && m.fecha === A.fecha && m.ts > A.ts)) && (m.fecha < P.fecha || (m.fecha === P.fecha && m.ts < P.ts));
      const ms = S.movs.filter((m) => /^a\d/.test(m.id) && m.tipo === "gasto" && m.medio !== "credito" && (!A || entre(m)) && (A || m.fecha < P.fecha || (m.fecha === P.fecha && m.ts < P.ts)));
      if (!ms.length) return;
      const x = z.uno(ms);
      poner({ ...x, medio: "credito", enTarjeta: true }); O.hechos.delete(x.id);
      // A mano: lo que se debía antes de ese pago sube; el pago cubre más (hasta su monto); lo que sobra se sigue debiendo, salvo que con ese pago haya quedado paga.
      const despuesViejo = u.salda ? 0 : u.antes - u.c;
      u.antes += x.monto;
      const nc = u.antes > 0 ? Math.min(u.antes, u.monto) : 0;
      O.cubierto += nc - u.c; u.c = nc;
      O.debe += (u.salda ? 0 : u.antes - u.c) - despuesViejo;
    },
    // Compras anotadas sin decir crédito, después del último pago: también pueden pasar a ser con crédito.
    marcarComoCredito() {
      const u = O.pagos.at(-1), P = u && S.movs.find((m) => m.id === u.id);
      const ms = S.movs.filter((m) => /^a\d/.test(m.id) && m.tipo === "gasto" && m.medio !== "credito" && (!P || m.fecha > P.fecha || (m.fecha === P.fecha && m.ts > P.ts)));
      if (!ms.length) return;
      const x = z.uno(ms);
      poner({ ...x, medio: "credito", enTarjeta: true }); O.hechos.delete(x.id); O.debe += x.monto;
    },
    // «Ya la pagué toda»: con el último pago quedó en cero, si después no se compró nada con crédito.
    saldarTarjeta() {
      const u = O.pagos.at(-1), P = u && S.movs.find((m) => m.id === u.id);
      if (!P || P.salda) return;
      const despues = S.movs.some((m) => esDeCredito(m) && (m.fecha > P.fecha || (m.fecha === P.fecha && m.ts > P.ts)));
      if (despues) return;
      poner({ ...P, salda: true }); u.salda = true; O.debe = 0;
    },
    otroDia() { reloj = hora(sumarDias(hoy(), 1), "08:00"); correr(); },
    fijoNuevo() { const dia = Number(sumarDias(hoy(), z.entre(0, 3)).slice(8, 10)); if (dia < Number(hoy().slice(8, 10))) return; S.fijos.push({ id: "f" + ++n, tipo: "gasto", modo: "auto", nombre: "Fijo", monto: z.entre(1, 20) * 100000, categoria: "servicios", medio: "", dia, activo: true, desde: hoy().slice(0, 7), hechos: [], ts: reloj }); correr(); },
    compraDelGrupo() {
      const total = z.entre(2, 40) * 1000, quien = z.uno(["yo", "ju", "dos"]), f = z.r() < 0.25 ? sumarDias(hoy(), -z.entre(1, 4)) : hoy(), id = "x" + ++n;
      const puse = quien === "yo" ? total : quien === "dos" ? total / 2 : 0;
      S.grupo.gastos.push({ id, t: "Compra", m: total, p: quien === "ju" ? "ju" : "yo", a: ["yo", "ju"], sp: "eq", f, ts: reloj, ...(quien === "dos" && { pp: { yo: total / 2, ju: total / 2 } }) });
      alGrupo();
      if (puse) O.hechos.set("gx" + id, { monto: -puse * 100, fecha: f, ts: reloj, grupo: true });
    },
    pagoDelGrupo() {
      const m = z.entre(1, 20) * 1000, yoPago = z.r() < 0.5, id = "y" + ++n;
      S.grupo.pagos.push({ id, de: yoPago ? "yo" : "ju", a: yoPago ? "ju" : "yo", m, f: hoy(), ts: reloj });
      alGrupo();
      O.hechos.set("gp" + id, { monto: (yoPago ? -m : m) * 100, fecha: hoy(), ts: reloj, grupo: true });
    },
    deshacerDelGrupo() {
      const lista = z.r() < 0.5 ? "gastos" : "pagos", vivos = S.grupo[lista].filter((x) => !x.x);
      if (!vivos.length) return;
      const x = z.uno(vivos);
      S.grupo[lista] = S.grupo[lista].map((y) => (y === x ? { ...y, x: true } : y));
      alGrupo();
      O.hechos.delete((lista === "gastos" ? "gx" : "gp") + x.id);
    },
    prenderOApagarElGrupo() { S.grupo = { ...S.grupo, loc: !S.grupo.loc }; alGrupo(); },
    metaNueva() { const ya = z.entre(0, 20) * 100000, usd = z.r() < 0.25; ponerMetas([...S.metas, { id: "m" + ++n, nombre: "Meta", moneda: usd ? "USD" : "ARS", objetivo: 900000_00, ahorrado: ya, ts: reloj }]); if (!usd) O.total += ya; },
    contestarAhorros() { if (!S.saldo || !ahorroSinPreguntar(S.saldo, S.metas)) return; const aparte = z.r() < 0.5; S.saldo = responderAhorro(S.saldo, S.metas, aparte); if (aparte) O.aparte += Math.max(0, O.total - O.vistas); O.vistas = O.total; },
    sumarAMeta() {
      if (!S.metas.length) return;
      const meta = z.uno(S.metas), x = z.entre(1, 10) * 100000, r = sumarAMeta(S.saldo, meta, x);
      S.saldo = r.saldo; ponerMetas(S.metas.map((m) => (m.id === meta.id ? r.meta : m)));
      if (meta.moneda === "ARS") { O.total += x; O.vistas += x; }
    },
    sacarDeMeta() {
      const con = S.metas.filter((m) => m.ahorrado > 0);
      if (!con.length) return;
      const meta = z.uno(con), x = Math.min(meta.ahorrado, z.entre(1, 10) * 100000), gasto = z.r() < 0.5, r = sacarDeMeta(S.saldo, S.metas, meta, x);
      S.saldo = r.saldo; ponerMetas(S.metas.map((m) => (m.id === meta.id ? r.meta : m)));
      if (meta.moneda === "ARS") {
        // A mano: primero sale lo que estaba adentro; lo que estaba aparte entra a la plata.
        const deAparte = x - Math.min(x, O.total - O.aparte);
        O.total -= x; O.aparte -= deAparte; O.plata += deAparte; O.vistas = Math.min(O.vistas, O.total);
      }
      if (gasto) {
        const pesos = meta.moneda === "USD" ? x * 1500 : x, m = { ...mov("s" + ++n, "gasto", pesos / 100, hoy(), reloj), ...(gastoDeMetaAparte(meta) && { previo: true }) };
        poner(m); O.hechos.set(m.id, { monto: -pesos, fecha: hoy(), ts: reloj, fuera: meta.moneda === "USD" });
      }
    },
  };
  const nombres = Object.keys(acciones);
  cargar(z.entre(50, 500) * 100000); // se empieza cargando la plata
  for (let i = 0; i < pasos; i++) {
    reloj += z.entre(1, 90) * 60000;
    const cual = z.uno(nombres);
    acciones[cual]();
    historia.push(cual);
    const real = podesUsar(S.saldo, S.movs, S.metas), cuentaAparte = esperado();
    if (real !== cuentaAparte) return { ok: false, donde: "semilla " + semilla + ", paso " + i + " (" + historia.slice(-6).join(" → ") + "): la app dice " + real / 100 + " y a mano da " + cuentaAparte / 100 };
    // Y la cuenta que se muestra en Resumen tiene que cerrar con ese mismo número.
    const d = desglose(S.saldo, S.movs, S.metas, hoy().slice(0, 7)), e = enElMes(S.saldo, S.movs, hoy().slice(0, 7), S.metas);
    if (d.tenias + d.entro - d.gasto + d.tarjeta - d.metas !== real || d.queda !== real || d.metas !== apartado(S.saldo, S.metas) || e.usar !== real)
      return { ok: false, donde: "semilla " + semilla + ", paso " + i + ": el detalle de Resumen no cierra con «Te queda»" };
    // La frase de Inicio: si dice «gastaste X de Y», Y − X tiene que ser lo que te queda.
    if (deCuanto(e) !== null && deCuanto(e) - e.gastado !== e.usar)
      return { ok: false, donde: "semilla " + semilla + ", paso " + i + ": la frase de Inicio dice «de " + deCuanto(e) / 100 + "» y no cierra" };
    // La tarjeta: lo que se debe da lo mismo que a mano, y lo gastado no cuenta dos veces lo que se pagó de la tarjeta.
    const ids = idsDeTarjeta(), gastos = (l) => l.filter((m) => m.tipo === "gasto" && !m.id.startsWith("ej_")).reduce((a, m) => a + m.monto, 0);
    if (cuentaDeTarjeta(S.movs, ids).debe !== O.debe || d.debeTarjeta !== Math.max(0, O.debe))
      return { ok: false, donde: "semilla " + semilla + ", paso " + i + ": la tarjeta dice que se deben " + cuentaDeTarjeta(S.movs, ids).debe / 100 + " y a mano da " + O.debe / 100 };
    if (gastos(paraGastos(S.movs, ids)) !== gastos(S.movs) - O.cubierto)
      return { ok: false, donde: "semilla " + semilla + ", paso " + i + ": lo gastado cuenta dos veces un pago de la tarjeta" };
  }
  return { ok: true };
}

test("mil personas usando la app al azar: «Te queda» siempre coincide con la cuenta hecha a mano", () => {
  for (let semilla = 1; semilla <= 1000; semilla++) {
    const r = simular(semilla, 60);
    assert.ok(r.ok, r.donde);
  }
});

/* ---------- la alarma: un camino nuevo tiene que pasar por acá ---------- */
const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");

test("la regla está en un solo lugar: nadie más decide si algo cuenta", () => {
  // Solo saldo.js compara un movimiento contra el momento en que se cargó la plata.
  // La única excepción conocida: plan.js mira la fecha de la plata para saber si hay que preguntar (fechaAlConfirmar), no para sumar.
  const PERMITIDOS = { "logic/plan.js": 1, "ui/app.js": 1 };
  for (const carpeta of ["logic", "ui", "data"]) for (const archivo of readdirSync(new URL("../src/" + carpeta, import.meta.url))) {
    const ruta = carpeta + "/" + archivo;
    if (ruta === "logic/saldo.js" || !archivo.endsWith(".js")) continue;
    const lineas = leer("../src/" + ruta).split("\n").filter((l) => /saldo\??\.(ts|fecha)\b/.test(l));
    assert.equal(lineas.length, PERMITIDOS[ruta] || 0, ruta + " compara contra la plata cargada por su cuenta. Eso se decide en cuenta() (src/logic/saldo.js):\n" + lineas.join("\n"));
  }
});

test("alarma: si aparece un camino nuevo que anota movimientos, hay que sumarlo a estas pruebas", () => {
  // Cada lugar de la app que guarda un movimiento. Si este número cambia, hay un camino nuevo (o uno menos):
  // antes de cambiarlo acá, agregá ese camino a simular() o a su prueba de arriba, para que «Te queda» siga cerrando.
  const CAMINOS = 27;
  const usos = (leer("../src/ui/app.js").match(/\bguardarMov\b/g) || []).length - 1; // sin contar donde se define
  assert.equal(usos, CAMINOS, "cambió la cantidad de lugares que guardan movimientos en app.js (había " + CAMINOS + ", hay " + usos + ")");
  // Y ninguna otra pantalla guarda movimientos por su cuenta: todo pasa por app.js.
  for (const archivo of readdirSync(new URL("../src/ui", import.meta.url))) {
    if (archivo === "app.js" || !archivo.endsWith(".js")) continue;
    assert.doesNotMatch(leer("../src/ui/" + archivo), /base\.poner\(\s*["']movs["']/, archivo + " guarda movimientos sin pasar por app.js");
  }
});

/* ---------- 4. la tarjeta de crédito: nada se cuenta dos veces ---------- */
const credito = (id, pesos, fecha, ts, extra = {}) => mov(id, "gasto", pesos, fecha, ts, { medio: "credito", enTarjeta: true, categoria: "ropa", ...extra });
const pagoTarjeta = (id, pesos, fecha, ts, extra = {}) => mov(id, "gasto", pesos, fecha, ts, { categoria: "tarjeta", detalle: "Visa", ...extra });
const gastado = (movs, mes) => paraGastos(movs, idsDeTarjeta()).filter((m) => m.tipo === "gasto" && m.fecha.startsWith(mes)).reduce((a, m) => a + m.monto, 0);
const cierra = (d) => d.tenias + d.entro - d.gasto + d.tarjeta - d.metas === d.queda;
// «Sí, elegirlas»: lo que la persona elige pasa a ser compra con crédito (app.js, tarjetaListo).
const comoCredito = (m) => ({ ...m, medio: "credito", enTarjeta: true });

test("tarjeta: lo comprado con crédito no resta hasta pagar la tarjeta, y el pago resta una sola vez", () => {
  const zapas = credito("z", 80000, HOY, hora(HOY, "11:00"));
  assert.ok(esDeCredito(zapas));
  assert.equal(tuPlata(saldo, [zapas]), 100000_00, "comprar con crédito no baja lo que te queda");
  assert.equal(porQueNoCuenta(saldo, zapas), "es con tarjeta de crédito, así que sale de tu plata cuando pagues la tarjeta");
  assert.equal(gastado([zapas], "2026-11"), 80000_00, "pero es un gasto del mes");
  assert.equal(porPagar([zapas], idsDeTarjeta()), 80000_00);
  const pago = pagoTarjeta("p", 80000, HOY, hora(HOY, "18:00"));
  assert.ok(esPagoDeTarjeta(pago, idsDeTarjeta()));
  assert.equal(tuPlata(saldo, [zapas, pago]), 20000_00, "al pagar la tarjeta, la plata baja una vez");
  assert.equal(gastado([zapas, pago], "2026-11"), 80000_00, "y lo gastado sigue siendo 80.000, no 160.000");
  assert.equal(porPagar([zapas, pago], idsDeTarjeta()), 0);
  assert.equal(sinCubrir([zapas, pago], idsDeTarjeta(), pago), 0, "el pago está cubierto: no hay nada que preguntar");
  // Compra y pago en el mismo mes: en Resumen la tarjeta no agrega nada, solo «Gastaste».
  const d = desglose(saldo, [zapas, pago], [], "2026-11");
  assert.deepEqual([d.gasto, d.tarjeta, d.debeTarjeta, d.queda], [80000_00, 0, 0, 20000_00]);
  assert.ok(cierra(d));
  // Lo anotado con crédito antes de esta versión no tiene la marca: sigue restando como siempre (el número no salta al actualizar).
  const vieja = mov("v", "gasto", 30000, HOY, hora(HOY, "12:00"), { medio: "credito", categoria: "ropa" });
  assert.ok(!esDeCredito(vieja));
  assert.equal(tuPlata(saldo, [vieja]), 70000_00);
  // Un pago de la tarjeta con medio crédito no existe; si llegara así, igual es un pago y resta.
  assert.equal(tuPlata(saldo, [pagoTarjeta("p2", 1000, HOY, hora(HOY, "19:00"), { medio: "credito" })]), 99000_00);
});

test("tarjeta: comprás un mes y pagás el siguiente, y la frase de Inicio siempre cierra", () => {
  const nov = credito("z", 80000, "2026-11-12", hora("2026-11-12")), dic = pagoTarjeta("p", 80000, "2026-12-10", hora("2026-12-10"));
  const movs = [nov, dic];
  assert.equal(gastado(movs, "2026-11"), 80000_00, "noviembre: el gasto es del mes en que compraste");
  assert.equal(gastado(movs, "2026-12"), 0, "diciembre: pagar la tarjeta no es otro gasto");
  assert.equal(tuPlata(saldo, [nov]), 100000_00);
  assert.equal(tuPlata(saldo, movs), 20000_00, "la plata baja en diciembre, cuando pagás");
  const n = enElMes(saldo, [nov], "2026-11");
  assert.deepEqual([n.usar, n.gastado, n.hubo, n.tarjeta.debe], [100000_00, 80000_00, 100000_00, 80000_00], "lo que hubo para usar no se infla con lo comprado con crédito");
  assert.equal(deCuanto(n), null, "«gastaste 80.000 de 100.000» no cerraría: no se dice «de»");
  const dn = desglose(saldo, movs, [], "2026-11"), dd = desglose(saldo, movs, [], "2026-12");
  assert.deepEqual([dn.gasto, dn.tarjeta], [80000_00, 80000_00], "noviembre: «con crédito, todavía no salió de tu plata»");
  assert.deepEqual([dd.gasto, dd.tarjeta, dd.queda], [0, -80000_00, 20000_00], "diciembre: «pagaste la tarjeta (compras de antes)»");
  for (const x of [dn, dd]) assert.ok(cierra(x));
  // El caso de la revisión: en el mes se gasta un café y se paga la tarjeta del mes anterior. Antes decía «gastaste 5.000 de 100.000» con 65.000.
  const s = { monto: 100000_00, ts: hora("2026-10-01"), fecha: "2026-10-01" };
  const ciclo = [credito("z", 30000, "2026-10-15", hora("2026-10-15")), mov("cafe", "gasto", 5000, "2026-11-05", hora("2026-11-05")), pagoTarjeta("p", 30000, "2026-11-10", hora("2026-11-10"))];
  const e = enElMes(s, ciclo, "2026-11");
  assert.deepEqual([e.usar, e.gastado, e.tarjeta.pagos], [65000_00, 5000_00, 30000_00]);
  assert.equal(deCuanto(e), null, "la frase dice «gastaste $5.000 · pagaste la tarjeta: $30.000», sin «de»");
  // Sin tarjeta en el medio, sigue diciendo «de» y cierra.
  const simple = enElMes(saldo, [mov("a", "gasto", 20000, HOY, hora(HOY, "11:00"))], "2026-11");
  assert.equal(deCuanto(simple) - simple.gastado, simple.usar);
});

test("tarjeta: si solo anotás el pago, ese pago es tu gasto; si pagás de más, lo que sobra también", () => {
  const solo = pagoTarjeta("p", 150000, HOY, hora(HOY, "18:00"));
  assert.equal(gastado([solo], "2026-11"), 150000_00, "nadie anotó las compras: el pago es el gasto (en «Pago de tarjeta»)");
  assert.equal(tuPlata(saldo, [solo]), -50000_00);
  const parte = credito("z", 50000, HOY, hora(HOY, "10:00")), pago = pagoTarjeta("p", 80000, HOY, hora(HOY, "18:00"));
  assert.equal(gastado([parte, pago], "2026-11"), 80000_00, "50.000 de compras anotadas + 30.000 que no estaban");
  assert.equal(sinCubrir([parte, pago], idsDeTarjeta(), pago), 30000_00, "esos 30.000 son los que la app pregunta");
  const d = desglose(saldo, [parte, pago], [], "2026-11");
  assert.deepEqual([d.gasto, d.tarjeta], [80000_00, 0], "Resumen: «Gastaste $80.000», que es lo que pagaste");
  assert.ok(cierra(d));
});

test("tarjeta: lo devuelto a la tarjeta baja lo que se debe, y si ya estaba paga queda a favor", () => {
  const ids = idsDeTarjeta();
  const parte = credito("z", 50000, HOY, hora(HOY, "10:00")), vuelta = mov("d", "ingreso", 20000, HOY, hora(HOY, "12:00"), { medio: "credito", enTarjeta: true, categoria: "otros_in" });
  assert.equal(tuPlata(saldo, [parte, vuelta]), 100000_00, "no entra a la plata: vuelve a la tarjeta");
  assert.equal(porPagar([parte, vuelta], ids), 30000_00);
  const d = desglose(saldo, [parte, vuelta], [], "2026-11");
  assert.equal(d.entro, 0, "no figura en «Te entró»");
  assert.ok(cierra(d));
  // El caso de la revisión: compra, pago, devolución; el mes siguiente el banco cobra la compra nueva menos lo devuelto.
  const movs = [credito("a", 10000, "2026-10-05", hora("2026-10-05")), pagoTarjeta("p1", 10000, "2026-10-10", hora("2026-10-10")),
    mov("r", "ingreso", 3000, "2026-10-20", hora("2026-10-20"), { medio: "credito", enTarjeta: true, categoria: "otros_in" })];
  assert.equal(cuentaDeTarjeta(movs, ids).debe, -3000_00, "queda saldo a favor");
  assert.equal(porPagar(movs, ids), 0, "y no se muestra como deuda");
  movs.push(credito("b", 20000, "2026-11-03", hora("2026-11-03")), pagoTarjeta("p2", 17000, "2026-11-10", hora("2026-11-10")));
  assert.equal(porPagar(movs, ids), 0, "pagó lo que cobró el banco y quedó en cero");
  // Nada que ajustar: la misma lista, tal cual.
  const nada = [mov("a", "gasto", 100, HOY, 1)];
  assert.equal(paraGastos(nada, ids), nada);
});

test("tarjeta: «ya la pagué toda» deja la tarjeta en cero aunque los pesos no coincidan (el dólar bajó)", () => {
  const ids = idsDeTarjeta();
  const enDolares = credito("u", 100000, "2026-10-05", hora("2026-10-05"), { usd: { monto: 10000, valor: 100000 } }), pago = pagoTarjeta("p", 90000, "2026-11-10", hora("2026-11-10"));
  assert.equal(porPagar([enDolares, pago], ids), 10000_00, "quedaría una deuda que no existe");
  assert.equal(porPagar([enDolares, { ...pago, salda: true }], ids), 0);
  assert.equal(tuPlata(saldo, [enDolares, { ...pago, salda: true }]), tuPlata(saldo, [enDolares, pago]), "no mueve la plata");
  // Lo que se compra después vuelve a deberse.
  assert.equal(porPagar([enDolares, { ...pago, salda: true }, credito("z", 5000, "2026-11-12", hora("2026-11-12"))], ids), 5000_00);
});

test("tarjeta: compras anotadas sin decir «crédito» y después el pago: la persona elige cuáles eran, y cuenta una sola vez", () => {
  const ids = idsDeTarjeta();
  // «zapatillas 80000» y después «pagué la visa 80000»: sin contestar, resta dos veces (es lo que pasaba antes).
  const zapas = mov("z", "gasto", 80000, HOY, hora(HOY, "11:00"), { categoria: "ropa" }), pago = pagoTarjeta("p", 80000, HOY, hora(HOY, "18:00"));
  assert.equal(sinCubrir([zapas, pago], ids, pago), 80000_00);
  assert.deepEqual(comprasPosibles([zapas, pago], ids, pago).map((m) => m.id), ["z"], "la app las muestra para elegir");
  assert.equal(tuPlata(saldo, [zapas, pago]), -60000_00);
  const elegido = [comoCredito(zapas), pago];
  assert.equal(tuPlata(saldo, elegido), 20000_00, "elegidas: resta una sola vez");
  assert.equal(gastado(elegido, "2026-11"), 80000_00, "y es un solo gasto");
  assert.equal(sinCubrir(elegido, ids, pago), 0, "la pregunta se va sola");
});

test("tarjeta: los casos de la revisión, con la plata cargada antes o después de las compras", () => {
  const ids = idsDeTarjeta(), cargada = { monto: 100000_00, ts: hora("2026-11-01"), fecha: "2026-11-01" };
  // Compras de la tarjeta anotadas en octubre (antes de cargar la plata, con la tarjeta sin pagar), un café en noviembre y el pago.
  const oct1 = mov("o1", "gasto", 20000, "2026-10-05", hora("2026-10-05")), oct2 = mov("o2", "gasto", 10000, "2026-10-12", hora("2026-10-12"));
  const cafe = mov("c", "gasto", 2000, "2026-11-03", hora("2026-11-03")), pago = pagoTarjeta("p", 30000, "2026-11-05", hora("2026-11-05"));
  assert.deepEqual(comprasPosibles([oct1, oct2, cafe, pago], ids, pago).map((m) => m.id), ["c", "o2", "o1"], "del más nuevo al más viejo");
  assert.equal(tuPlata(cargada, [comoCredito(oct1), comoCredito(oct2), cafe, pago]), 68000_00, "la plata real: 100.000 − 2.000 − 30.000");
  // Las mismas compras marcadas «ya estaban» al cargar la plata, un súper después y el pago.
  const s2 = { monto: 500000_00, ts: hora("2026-11-10"), fecha: "2026-11-10" };
  const a = mov("a", "gasto", 50000, "2026-11-03", hora("2026-11-03"), { previo: true }), b = mov("b", "gasto", 30000, "2026-11-05", hora("2026-11-05"), { previo: true });
  const super_ = mov("s", "gasto", 20000, "2026-11-12", hora("2026-11-12")), p2 = pagoTarjeta("p2", 80000, "2026-11-20", hora("2026-11-20"));
  assert.equal(tuPlata(s2, [comoCredito(a), comoCredito(b), super_, p2]), 400000_00);
  // Una cuota y un fijo con crédito de antes de actualizar (sin la marca), una remera con crédito nueva y el pago del resumen.
  const cuotaVieja = mov("cq", "gasto", 10000, "2026-11-20", hora("2026-11-20"), { medio: "credito", cuota: { compra: "h", n: 2, de: 6 } });
  const netflix = mov("fx", "gasto", 5000, "2026-11-21", hora("2026-11-21"), { medio: "credito", fijo: "f" });
  const remera = credito("r", 20000, "2026-11-22", hora("2026-11-22")), p3 = pagoTarjeta("p3", 35000, "2026-12-05", hora("2026-12-05"));
  const todo = [cuotaVieja, netflix, remera, p3];
  assert.equal(sinCubrir(todo, ids, p3), 15000_00, "cubierto solo en parte: igual se pregunta");
  const posibles = comprasPosibles(todo, ids, p3);
  assert.deepEqual(posibles.map((m) => m.id), ["fx", "cq"]);
  assert.ok(posibles.every((m) => m.medio === "credito"), "las de crédito de antes vienen marcadas");
  assert.equal(tuPlata(cargada, [comoCredito(cuotaVieja), comoCredito(netflix), remera, p3]), 65000_00);
  assert.equal(gastado([comoCredito(cuotaVieja), comoCredito(netflix), remera, p3], "2026-11") + gastado([comoCredito(cuotaVieja), comoCredito(netflix), remera, p3], "2026-12"), 35000_00);
});

test("tarjeta: para elegir, lo de antes de un pago con una parte sin cubrir no se ofrece, y nada de grupos, ejemplo, pagos ni lo ya marcado", () => {
  const ids = idsDeTarjeta();
  const viejo = mov("v", "gasto", 1000, "2026-10-01", hora("2026-10-01")), p1 = pagoTarjeta("p1", 5000, "2026-10-10", hora("2026-10-10"));
  const nuevo = mov("n", "gasto", 1000, "2026-10-20", hora("2026-10-20")), grupo = mov("gx_g_1", "gasto", 1000, "2026-10-21", hora("2026-10-21"));
  const ejemplo = mov("ej_1", "gasto", 1000, "2026-10-22", hora("2026-10-22")), marcado = credito("c", 1000, "2026-10-23", hora("2026-10-23"));
  const ingreso = mov("i", "ingreso", 1000, "2026-10-24", hora("2026-10-24")), despues = mov("d", "gasto", 1000, "2026-11-20", hora("2026-11-20"));
  const p2 = pagoTarjeta("p2", 9000, "2026-11-10", hora("2026-11-10"));
  // p1 no cubre nada (no había compras con crédito): lo de antes de p1 se lo llevaría p1, así que no se ofrece para p2.
  assert.deepEqual(comprasPosibles([viejo, p1, nuevo, grupo, ejemplo, marcado, ingreso, despues, p2], ids, p2).map((m) => m.id), ["n"]);
  // Más de 60 días atrás, tampoco.
  assert.deepEqual(comprasPosibles([mov("x", "gasto", 1000, "2026-09-01", hora("2026-09-01")), p2], ids, p2), []);
});

test("tarjeta: dos tarjetas pagadas una atrás de la otra: cada pago deja elegir sus compras", () => {
  const ids = idsDeTarjeta(), s = { monto: 500000_00, ts: hora("2026-11-01"), fecha: "2026-11-01" };
  const super_ = mov("s", "gasto", 50000, "2026-11-02", hora("2026-11-02")), ropa = mov("r", "gasto", 30000, "2026-11-03", hora("2026-11-03"));
  const visa = pagoTarjeta("pv", 50000, "2026-11-10", hora("2026-11-10")), master = pagoTarjeta("pm", 30000, "2026-11-12", hora("2026-11-12"));
  // Paga la Visa y elige el súper: ese pago queda cubierto del todo.
  const tras = [comoCredito(super_), ropa, visa, master];
  assert.equal(sinCubrir(tras, ids, visa), 0);
  assert.deepEqual(comprasPosibles(tras, ids, master).map((m) => m.id), ["r"], "el pago de la Visa cubierto no corta: la ropa se puede elegir");
  assert.equal(pagoParaElegir(tras, ids, "2026-11-12")?.id, "pm", "Inicio pregunta por el de la Master");
  const fin = [comoCredito(super_), comoCredito(ropa), visa, master];
  assert.equal(tuPlata(s, fin), 420000_00);
  assert.equal(gastado(fin, "2026-11"), 80000_00);
  assert.equal(pagoParaElegir(fin, ids, "2026-11-12"), null, "y ya no pregunta");
});

test("tarjeta: pago mínimo y saldo a favor: se eligen todas las compras del resumen, y lo que el pago no cubre queda por pagar", () => {
  const ids = idsDeTarjeta(), s = { monto: 400000_00, ts: hora("2026-10-01"), fecha: "2026-10-01" };
  // Pago mínimo: heladera y súper con la tarjeta, paga 30.000. Elige las dos: quedan 70.000 por pagar, y en diciembre los paga.
  const heladera = mov("h", "gasto", 70000, "2026-10-15", hora("2026-10-15")), super_ = mov("s", "gasto", 30000, "2026-10-20", hora("2026-10-20"));
  const minimo = pagoTarjeta("p1", 30000, "2026-11-10", hora("2026-11-10"));
  const nov = [comoCredito(heladera), comoCredito(super_), minimo];
  assert.equal(porPagar(nov, ids), 70000_00);
  assert.equal(tuPlata(s, nov), 370000_00, "lo que hay en el banco");
  const dic = [...nov, pagoTarjeta("p2", 70000, "2026-12-10", hora("2026-12-10"))];
  assert.equal(tuPlata(s, dic), 300000_00);
  assert.equal(porPagar(dic, ids), 0);
  assert.equal(pagoParaElegir(dic, ids, "2026-12-10"), null, "cubierto: no pregunta");
  // Saldo a favor: una devolución dejó 30.000 a favor; el banco cobra 20.000 por súper y farmacia (50.000).
  const s2 = { monto: 400000_00, ts: hora("2026-09-01"), fecha: "2026-09-01" };
  const base = [credito("c", 30000, "2026-10-01", hora("2026-10-01")), pagoTarjeta("p0", 30000, "2026-10-05", hora("2026-10-05")),
    mov("d", "ingreso", 30000, "2026-10-08", hora("2026-10-08"), { medio: "credito", enTarjeta: true, categoria: "otros_in" })];
  const sp = mov("s", "gasto", 30000, "2026-10-12", hora("2026-10-12")), fa = mov("f", "gasto", 20000, "2026-10-14", hora("2026-10-14"));
  const p = pagoTarjeta("p", 20000, "2026-11-10", hora("2026-11-10"));
  const soloUna = [...base, sp, comoCredito(fa), p];
  assert.equal(sinCubrir(soloUna, ids, p), 20000_00, "elegir solo la farmacia no alcanza: se la come el saldo a favor");
  assert.equal(pagoParaElegir(soloUna, ids, "2026-11-10")?.id, "p", "y la pregunta sigue");
  const lasDos = [...base, comoCredito(sp), comoCredito(fa), p];
  assert.equal(tuPlata(s2, lasDos), 350000_00);
  assert.equal(pagoParaElegir(lasDos, ids, "2026-11-10"), null);
});

test("tarjeta: la pregunta sale de los datos: «es un gasto nuevo», fuera de fecha, o nada para elegir, no pregunta", () => {
  const ids = idsDeTarjeta();
  const z = mov("z", "gasto", 80000, "2026-11-05", hora("2026-11-05")), p = pagoTarjeta("p", 80000, "2026-11-10", hora("2026-11-10"));
  assert.equal(pagoParaElegir([z, p], ids, "2026-11-10")?.id, "p");
  assert.equal(pagoParaElegir([z, { ...p, sinElegir: 80000_00 }], ids, "2026-11-10"), null, "dijo «es un gasto nuevo»");
  assert.equal(pagoParaElegir([z, p], ids, "2027-02-01"), null, "pasaron más de 60 días");
  assert.equal(pagoParaElegir([p], ids, "2026-11-10"), null, "no hay compras para elegir");
  assert.equal(pagoParaElegir([{ ...z, id: "ej_z" }, { ...p, id: "ej_p" }], ids, "2026-11-10"), null, "lo de ejemplo no");
});

test("tarjeta: «ya la pagué toda» solo con el último pago, si después no se compró nada con crédito", () => {
  const ids = idsDeTarjeta();
  const a = credito("a", 100000, "2026-11-02", hora("2026-11-02")), p = pagoTarjeta("p", 98000, "2026-11-05", hora("2026-11-05"));
  assert.equal(pagoParaSaldar([a, p], ids)?.id, "p", "quedaron 2.000 de diferencia");
  assert.equal(pagoParaSaldar([a, { ...p, salda: true }], ids), null, "ya está paga");
  assert.equal(pagoParaSaldar([a, p, credito("b", 30000, "2026-11-10", hora("2026-11-10"))], ids), null, "lo que se debe es de una compra nueva: primero hay que pagarla");
  assert.equal(pagoParaSaldar([a, pagoTarjeta("p", 100000, "2026-11-05", hora("2026-11-05"))], ids), null, "no hay diferencia");
  assert.equal(pagoParaSaldar([a], ids), null, "sin pagos no hay qué marcar");
});

test("tarjeta: lo devuelto a la tarjeta no es plata que entró, en ninguna pantalla", () => {
  const ids = idsDeTarjeta();
  const sueldo = mov("s", "ingreso", 500000, "2026-11-01", hora("2026-11-01"), { categoria: "sueldo" });
  const compra = credito("c", 50000, "2026-11-03", hora("2026-11-03")), vuelta = mov("d", "ingreso", 20000, "2026-11-05", hora("2026-11-05"), { medio: "credito", enTarjeta: true, categoria: "otros_in" });
  const lista = paraGastos([sueldo, compra, vuelta], ids);
  assert.equal(lista.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0), 500000_00, "Resumen, Análisis y Tu mes dicen lo mismo que el detalle");
  assert.equal(desglose(saldo, [sueldo, compra, vuelta], [], "2026-11").entro, 500000_00);
});


test("tarjeta: las cuotas también esperan al pago, y la tarjeta puede tener el nombre que quieras", () => {
  const compra = { id: "c1", tarjeta: "t", detalle: "Heladera", categoria: "casa", total: 60000_00, cuotas: 6, desde: "2026-11", dia: 10, previas: 0, hechas: 0, ts: hora("2026-11-03") };
  const cuota = { ...movimientoDeCuota(compra, 1), enTarjeta: true };
  assert.equal(cuota.medio, "credito");
  assert.equal(tuPlata(saldo, [cuota]), 100000_00, "la cuota va al resumen de la tarjeta");
  assert.equal(tuPlata(saldo, [cuota, pagoTarjeta("p", 10000, HOY, hora(HOY, "18:00"))]), 90000_00);
  assert.equal(gastado([cuota, pagoTarjeta("p", 10000, HOY, hora(HOY, "18:00"))], "2026-11"), 10000_00);
  // Categorías propias con nombre de tarjeta también son pagar la tarjeta; la SUBE no.
  const cats = categoriasIniciales();
  cats.gasto.push({ id: "c_visa", nombre: "Tarjeta Visa", claves: ["visa"], oculta: false }, { id: "c_master", nombre: "Master", claves: [], oculta: false }, { id: "c_sube", nombre: "Tarjeta SUBE", claves: [], oculta: false });
  const ids = idsDeTarjeta(cats);
  assert.deepEqual([ids.has("tarjeta"), ids.has("c_visa"), ids.has("c_master"), ids.has("c_sube"), ids.has("ropa")], [true, true, true, false, false]);
  const z = credito("z", 40000, HOY, hora(HOY, "10:00")), pv = mov("pv", "gasto", 40000, HOY, hora(HOY, "18:00"), { categoria: "c_visa" });
  assert.equal(paraGastos([z, pv], ids).filter((m) => m.tipo === "gasto").reduce((a, m) => a + m.monto, 0), 40000_00);
  assert.deepEqual(tarjetaDelMes([z, pv], "2026-11", ids), { compras: 40000_00, devuelto: 0, pagado: 40000_00, pagos: 40000_00, debe: 0 });
});

test("tarjeta: lo comprado con crédito no se pregunta ni se marca al cargar la plata", () => {
  const z = credito("z", 80000, HOY, hora(HOY, "09:00"));
  const nuevo = { monto: 50000_00, ts: hora(HOY, "08:00"), fecha: HOY };
  assert.equal(hayQuePreguntar(nuevo, z, HOY), false, "no tocó la plata: no hay nada que preguntar");
  assert.equal(anotadoAntes([z], "2026-11").lista.length, 0);
  assert.deepEqual(plataNueva(null, 50000_00, [z], HOY, hora(HOY, "10:00")).previos, [], "sigue debiéndose aunque cargues la plata");
  assert.equal(porPagar([z], idsDeTarjeta()), 80000_00);
});

test("tarjeta: el resumen trae impuestos: se eligen las compras, lo que sobra es un gasto nuevo y la pregunta no vuelve", () => {
  const ids = idsDeTarjeta(), s = { monto: 500000_00, ts: hora("2026-11-01"), fecha: "2026-11-01" };
  const zapas = mov("z", "gasto", 80000, "2026-11-03", hora("2026-11-03")), cafe = mov("c", "gasto", 2500, "2026-11-04", hora("2026-11-04"));
  const pago = pagoTarjeta("p", 85000, "2026-11-10", hora("2026-11-10"));
  const elegidas = new Set(["z"]);
  assert.equal(restoSiEligen([zapas, cafe, pago], ids, pago, elegidas), 5000_00, "la pantalla avisa: esos 5.000 van como gasto nuevo");
  // «Listo» (app.js, tarjetaListo): las zapatillas pasan a crédito y, como sobra algo, el pago queda sin elegir.
  const despues = [comoCredito(zapas), cafe, { ...pago, sinElegir: 5000_00 }];
  assert.equal(pagoParaElegir(despues, ids, "2026-11-10"), null, "no vuelve a preguntar por los impuestos");
  assert.equal(tuPlata(s, despues), 412500_00, "500.000 − 2.500 del café − 85.000 del resumen");
  assert.equal(gastado(despues, "2026-11"), 87500_00, "zapatillas + café + 5.000 de impuestos");
  // Sin marcar el pago, la pregunta volvería enseguida (hay un café en la ventana): por eso «Listo» lo marca.
  assert.equal(pagoParaElegir([comoCredito(zapas), cafe, pago], ids, "2026-11-10")?.id, "p");
  // Con saldo a favor, lo que falta se calcula con todo en cuenta: elegir de menos se ve en la pantalla.
  const base = [credito("c0", 30000, "2026-10-01", hora("2026-10-01")), pagoTarjeta("p0", 30000, "2026-10-05", hora("2026-10-05")),
    mov("d", "ingreso", 30000, "2026-10-08", hora("2026-10-08"), { medio: "credito", enTarjeta: true, categoria: "otros_in" })];
  const sp = mov("s", "gasto", 30000, "2026-10-12", hora("2026-10-12")), fa = mov("f", "gasto", 20000, "2026-10-14", hora("2026-10-14")), p2 = pagoTarjeta("p2", 20000, "2026-11-10", hora("2026-11-10"));
  assert.equal(restoSiEligen([...base, sp, fa, p2], ids, p2, new Set(["f"])), 20000_00, "solo la farmacia no alcanza");
  assert.equal(restoSiEligen([...base, sp, fa, p2], ids, p2, new Set(["f", "s"])), 0, "con las dos, sí");
});

test("tarjeta: un pago anterior con impuestos no se lleva las compras del resumen siguiente", () => {
  const ids = idsDeTarjeta(), s = { monto: 1000000_00, ts: hora("2026-10-01"), fecha: "2026-10-01" };
  // Resumen 1: a y b, pagado el 5/11 con 5.000 de impuestos (la persona eligió a y b; esos 5.000 quedaron como gasto nuevo).
  const a = mov("a", "gasto", 40000, "2026-10-10", hora("2026-10-10")), b = mov("b", "gasto", 30000, "2026-10-20", hora("2026-10-20"));
  const p1 = { ...pagoTarjeta("p1", 75000, "2026-11-05", hora("2026-11-05")), sinElegir: 5000_00 };
  // Resumen 2: c y d de antes de ese pago (después del cierre), e y f de después; pagado el 5/12 con 2.000 de impuestos.
  const c = mov("c", "gasto", 20000, "2026-10-28", hora("2026-10-28")), d = mov("d", "gasto", 10000, "2026-11-02", hora("2026-11-02"));
  const e = mov("e", "gasto", 15000, "2026-11-15", hora("2026-11-15")), f = mov("f", "gasto", 5000, "2026-11-25", hora("2026-11-25"));
  const p2 = pagoTarjeta("p2", 52000, "2026-12-05", hora("2026-12-05"));
  const todo = [comoCredito(a), comoCredito(b), p1, c, d, e, f, p2];
  assert.deepEqual(comprasPosibles(todo, ids, p2).map((m) => m.id), ["f", "e", "d", "c"], "c y d se ofrecen aunque sean de antes del pago anterior");
  assert.equal(restoSiEligen(todo, ids, p2, new Set(["c", "d", "e", "f"])), 2000_00, "y quedan solo los impuestos de ese resumen");
  const fin = [comoCredito(a), comoCredito(b), p1, comoCredito(c), comoCredito(d), comoCredito(e), comoCredito(f), { ...p2, sinElegir: 2000_00 }];
  assert.equal(tuPlata(s, fin), 873000_00, "1.000.000 − 75.000 − 52.000");
  assert.equal(pagoParaElegir(fin, ids, "2026-12-05"), null);
  // Dos tarjetas: la Visa trae impuestos y se contestó «Intereses o impuestos»; la ropa de la Master sigue pudiéndose elegir.
  const s2 = { monto: 500000_00, ts: hora("2026-11-01"), fecha: "2026-11-01" };
  const sup = credito("s", 45000, "2026-11-02", hora("2026-11-02")), ropa = mov("r", "gasto", 30000, "2026-11-03", hora("2026-11-03"));
  const visa = { ...pagoTarjeta("pv", 50000, "2026-11-10", hora("2026-11-10")), sinElegir: 5000_00 }, master = pagoTarjeta("pm", 30000, "2026-11-12", hora("2026-11-12"));
  assert.deepEqual(comprasPosibles([sup, ropa, visa, master], ids, master).map((m) => m.id), ["r"]);
  assert.equal(tuPlata(s2, [sup, comoCredito(ropa), visa, master]), 420000_00);
});
