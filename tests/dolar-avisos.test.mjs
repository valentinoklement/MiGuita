// Dólar con fallas de red y respuestas raras; reglas de los avisos.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as D from "../src/logic/dolar.js";
import { avisosDeHoy, enNoMolestar, presupuestosPorAvisar, NOTIF_INICIAL } from "../src/logic/avisos.js";

const DOLARAPI = [
  { casa: "oficial", compra: 1400, venta: 1450, fechaActualizacion: "2026-10-31T10:00:00.000Z" },
  { casa: "blue", compra: 1540, venta: 1565, fechaActualizacion: "2026-10-31T10:00:00.000Z" },
  { casa: "bolsa", compra: 1500, venta: 1512.5, fechaActualizacion: "2026-10-31T10:00:00.000Z" },
  { casa: "cripto", compra: 1635.79, venta: 1643.33, fechaActualizacion: "2026-10-31T10:00:00.000Z" },
  { casa: "tarjeta", compra: 1800, venta: 1885, fechaActualizacion: "2026-10-31T10:00:00.000Z" },
];
const BLUE = { oficial: { value_sell: 1451 }, blue: { value_sell: 1566 }, last_update: "2026-10-31T09:00:00" };
const respuesta = (json, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => json });
const falla = async () => { throw new Error("sin internet"); };
// Responde según la URL, para simular una fuente caída y la otra andando.
const porUrl = (mapa) => async (url, o) => mapa[url] ? mapa[url](url, o) : falla();

test("leer cada fuente y cada tipo (precio de venta, en centavos)", () => {
  assert.equal(D.leerDolarApi(DOLARAPI, "blue").valor, 156500);
  assert.equal(D.leerDolarApi(DOLARAPI, "mep").valor, 151250);
  assert.equal(D.leerDolarApi(DOLARAPI, "cripto").valor, 164333);
  assert.equal(D.leerBluelytics(BLUE, "cripto"), null, "Bluelytics no tiene cripto");
  assert.equal(D.leerDolarApi(DOLARAPI, "tarjeta").valor, 188500);
  assert.equal(D.leerBluelytics(BLUE, "oficial").valor, 145100);
  assert.equal(D.leerBluelytics(BLUE, "mep"), null, "Bluelytics no tiene MEP");
});

test("respuestas vacías o absurdas se descartan", () => {
  for (const malo of [null, {}, [], "texto", [{ casa: "blue", venta: "1565" }], [{ casa: "blue", venta: -3 }], [{ casa: "blue", venta: Infinity }], [{ casa: "blue", venta: 1e9 }], [{ casa: "blue" }]])
    assert.equal(D.leerDolarApi(malo, "blue"), null, JSON.stringify(malo));
  assert.equal(D.leerBluelytics({ blue: { value_sell: 0 } }, "blue"), null);
});

test("cadena de respaldo: la elegida, si falla la otra, si fallan las dos nada", async () => {
  assert.deepEqual(await D.buscarDolar("blue", "dolarapi", respuesta(DOLARAPI)), { valor: 156500, fechaFuente: "2026-10-31T10:00:00.000Z", fuente: "dolarapi" });
  const caida = porUrl({ [D.URLS.bluelytics]: respuesta(BLUE) });
  assert.equal((await D.buscarDolar("blue", "dolarapi", caida)).fuente, "bluelytics");
  assert.equal((await D.buscarDolar("blue", "dolarapi", porUrl({ [D.URLS.dolarapi]: respuesta({}, false), [D.URLS.bluelytics]: respuesta(BLUE) }))).fuente, "bluelytics", "error 500 pasa a la otra");
  assert.equal(await D.buscarDolar("blue", "dolarapi", falla), null);
  assert.equal(await D.buscarDolar("mep", "bluelytics", porUrl({ [D.URLS.dolarapi]: respuesta(DOLARAPI) })).then((r) => r.fuente), "dolarapi", "MEP solo está en DolarApi");
  assert.equal(await D.buscarDolar("fijo", "dolarapi", respuesta(DOLARAPI)), null);
  assert.equal(await D.buscarDolar("blue", "manual", respuesta(DOLARAPI)), null);
});

test("espera máxima: una fuente colgada se corta y pasa a la otra", async () => {
  const colgada = (url, o) => new Promise((_, mal) => o.signal.addEventListener("abort", () => mal(new Error("cortado"))));
  const r = await D.buscarDolar("blue", "dolarapi", porUrl({ [D.URLS.dolarapi]: colgada, [D.URLS.bluelytics]: respuesta(BLUE) }), 50);
  assert.equal(r.fuente, "bluelytics");
});

test("la consulta no manda datos personales", async () => {
  let pedido;
  await D.consultar("dolarapi", "blue", async (url, o) => { pedido = { url, o }; return { ok: true, json: async () => DOLARAPI }; });
  assert.equal(pedido.url, "https://dolarapi.com/v1/dolares");
  assert.equal(pedido.o.credentials, "omit");
  assert.equal(pedido.o.referrerPolicy, "no-referrer");
  assert.equal(pedido.o.body, undefined);
});

test("control de cordura: más de 30% pide confirmación", () => {
  assert.equal(D.necesitaConfirmar(130000, 100000), false);
  assert.equal(D.necesitaConfirmar(130100, 100000), true);
  assert.equal(D.necesitaConfirmar(69000, 100000), true);
  assert.equal(D.necesitaConfirmar(150000, 0), false, "sin valor anterior no hay con qué comparar");
});

test("valor para una fecha: del día, estimado, manual o nada", () => {
  const c = [{ fecha: "2026-10-28", tipo: "blue", valor: 150000, fuente: "dolarapi" }, { fecha: "2026-10-30", tipo: "blue", valor: 155000, fuente: "bluelytics" }, { fecha: "2026-10-30", tipo: "oficial", valor: 145000, fuente: "dolarapi" }];
  assert.deepEqual(D.valorPara("2026-10-30", "blue", c), { valor: 155000, fecha: "2026-10-30", fuente: "bluelytics", estimado: false });
  assert.deepEqual(D.valorPara("2026-10-29", "blue", c), { valor: 150000, fecha: "2026-10-28", fuente: "dolarapi", estimado: true });
  assert.equal(D.valorPara("2026-10-01", "blue", c).valor, 150000, "antes del primero: el primero, estimado");
  assert.deepEqual(D.valorPara("2026-10-30", "mep", c, 140000), { valor: 140000, fecha: "2026-10-30", fuente: "manual", estimado: false });
  assert.equal(D.valorPara("2026-10-30", "fijo", c, 0), null);
  assert.equal(D.valorPara("2026-10-30", "fijo", c, 120000).valor, 120000, "fijo usa siempre el manual");
});

test("pasar a pesos y cuándo toca actualizar", () => {
  assert.equal(D.aPesos(2000, 156500), 3130000, "US$ 20 a $1.565 = $31.300");
  assert.equal(D.aPesos(1, 156500), 1565);
  const cfg = { tipo: "blue", fuente: "dolarapi", hora: "10:00" };
  assert.equal(D.tocaActualizar(cfg, [], "2026-10-31", "09:59"), false);
  assert.equal(D.tocaActualizar(cfg, [], "2026-10-31", "10:00"), true);
  assert.equal(D.tocaActualizar(cfg, [{ fecha: "2026-10-31", tipo: "blue" }], "2026-10-31", "12:00"), false);
  assert.equal(D.tocaActualizar(cfg, [{ fecha: "2026-10-31", tipo: "oficial" }], "2026-10-31", "12:00"), true, "cambió de tipo");
  assert.equal(D.tocaActualizar({ ...cfg, fuente: "manual" }, [], "2026-10-31", "12:00"), false);
});

test("avisos: cantidad, racha, presupuesto, no molestar y máximo 3", () => {
  const n = { ...NOTIF_INICIAL, cantidad: 2, horas: ["13:00", "21:00", "18:00"] };
  assert.deepEqual(avisosDeHoy(n, { hoyHecho: false, racha: 1, presupuestos: [], ahora: "09:00" }).map((a) => a.hora), ["13:00", "21:00"]);
  assert.deepEqual(avisosDeHoy(n, { hoyHecho: true, racha: 5, presupuestos: [], ahora: "09:00" }), [], "si ya anotó, no avisa");
  const conRacha = avisosDeHoy({ ...n, cantidad: 1 }, { hoyHecho: false, racha: 4, presupuestos: [], ahora: "09:00" });
  assert.deepEqual(conRacha.map((a) => a.tipo), ["dia", "racha"]);
  const muchos = avisosDeHoy({ ...n, cantidad: 3 }, { hoyHecho: false, racha: 9, presupuestos: ["Súper", "Salidas"], ahora: "08:30" });
  assert.equal(muchos.length, 3, "nunca más de 3");
  const nm = { ...n, noMolestar: { activo: true, desde: "20:00", hasta: "08:00" } };
  assert.deepEqual(avisosDeHoy(nm, { hoyHecho: false, racha: 0, presupuestos: [], ahora: "09:00" }).map((a) => a.hora), ["13:00"]);
  assert.deepEqual(avisosDeHoy({ ...n, tipos: { dia: false, racha: false, presupuesto: true } }, { hoyHecho: false, racha: 9, presupuestos: ["Súper"], ahora: "15:00" }).map((a) => a.texto), ["Ya usaste el 90% del presupuesto de Súper."]);
});

test("no molestar cruzando la medianoche", () => {
  const nm = { activo: true, desde: "23:00", hasta: "08:00" };
  assert.deepEqual(["22:59", "23:00", "02:00", "07:59", "08:00"].map((h) => enNoMolestar(nm, h)), [false, true, true, true, false]);
  assert.equal(enNoMolestar({ ...nm, activo: false }, "02:00"), false);
});

test("presupuesto al 90%: una sola vez por mes y categoría", () => {
  const e = [{ categoria: "super", uso: 0.95 }, { categoria: "comida", uso: 0.5 }, { categoria: "salidas", uso: 1.2 }];
  assert.deepEqual(presupuestosPorAvisar(e, "2026-10", []), ["super", "salidas"]);
  assert.deepEqual(presupuestosPorAvisar(e, "2026-10", ["2026-10|super"]), ["salidas"]);
  assert.deepEqual(presupuestosPorAvisar(e, "2026-11", ["2026-10|super", "2026-10|salidas"]), ["super", "salidas"], "mes nuevo, se vuelve a avisar");
});
