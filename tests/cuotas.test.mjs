import { test } from "node:test";
import assert from "node:assert/strict";
import { montoCuota, fechaCuota, correrCuotas, infoCompra, resumenCuotas, movsDeCompra } from "../src/logic/cuotas.js";
import { ponerBilletera, mediosIniciales } from "../src/logic/categorias.js";
import { infoRacha } from "../src/logic/racha.js";
import { migrar } from "../src/logic/migraciones.js";
import { aplanar } from "../src/logic/vinculo.js";

const compra = (o = {}) => ({ id: "c1", tarjeta: "t1", detalle: "Heladera", categoria: "otros", total: 100000, cuotas: 3, desde: "2026-11", dia: 31, previas: 0, hechas: 0, ts: 1, mod: 1, ...o });

test("las cuotas suman exactamente el total", () => {
  const c = compra({ total: 100001, cuotas: 3 });
  assert.deepEqual([1, 2, 3].map((n) => montoCuota(c, n)), [33334, 33334, 33333]);
});

test("el día se ajusta a meses más cortos", () => {
  assert.equal(fechaCuota(compra(), 2), "2026-12-31");
  assert.equal(fechaCuota(compra({ desde: "2027-01" }), 2), "2027-02-28");
});

test("una cuota futura no se anota antes de su fecha", () => {
  const { nuevos, cambiadas } = correrCuotas([compra({ dia: 10 })], [], "2026-11-09");
  assert.equal(nuevos.length, 0);
  assert.equal(cambiadas.length, 0);
});

test("se anotan las que llegaron, aunque la app no se haya abierto, y una sola vez", () => {
  const r = correrCuotas([compra({ dia: 10 })], [], "2027-01-15");
  assert.deepEqual(r.nuevos.map((x) => x.fecha), ["2026-11-10", "2026-12-10", "2027-01-10"]);
  assert.equal(r.nuevos[1].id, "cq_c1_2");
  assert.equal(r.nuevos[1].detalle, "Heladera · cuota 2/3");
  assert.deepEqual(r.nuevos[1].cuota, { compra: "c1", n: 2, de: 3 });
  assert.equal(r.nuevos[0].medio, "credito");
  assert.equal(r.cambiadas[0].hechas, 3);
  const otraVez = correrCuotas(r.cambiadas, r.nuevos, "2027-06-01");
  assert.equal(otraVez.nuevos.length, 0);
  assert.equal(otraVez.cambiadas.length, 0);
});

test("otro dispositivo ya anotó la cuota: no se duplica", () => {
  const { nuevos } = correrCuotas([compra({ dia: 1 })], [{ id: "cq_c1_1", fecha: "2026-11-01" }], "2026-11-05");
  assert.equal(nuevos.length, 0);
});

test("las que ya estaban pagas no se anotan", () => {
  const c = compra({ cuotas: 6, desde: "2026-09", dia: 1, previas: 2, hechas: 2 });
  const { nuevos } = correrCuotas([c], [], "2026-11-05");
  assert.deepEqual(nuevos.map((x) => x.cuota.n), [3]);
});

test("en dólares se anota en pesos con el dólar de ese día, y espera si no hay dólar", () => {
  const c = compra({ moneda: "USD", total: 30000, dia: 1 });
  assert.equal(correrCuotas([c], [], "2026-11-05").nuevos.length, 0);
  const { nuevos } = correrCuotas([c], [], "2026-11-05", () => ({ valor: 100000, fecha: "2026-11-01", tipo: "blue", fuente: "x" }));
  assert.equal(nuevos[0].monto, 10000000);
  assert.equal(nuevos[0].usd.monto, 10000);
});

test("seguimiento: cuánto falta, por tarjeta y mes a mes", () => {
  const compras = [
    compra({ id: "a", total: 90000, cuotas: 3, dia: 1, desde: "2026-11", hechas: 1, tarjeta: "t1" }),
    compra({ id: "b", total: 20000, cuotas: 2, dia: 20, desde: "2026-12", tarjeta: "t2" }),
    compra({ id: "c", total: 10000, cuotas: 1, dia: 1, desde: "2026-10", hechas: 1, tarjeta: "borrada" }),
    compra({ id: "d", moneda: "USD", total: 4000, cuotas: 2, dia: 20, desde: "2026-11", tarjeta: "t1" }),
  ];
  const r = resumenCuotas(compras, [{ id: "t1", nombre: "Visa" }, { id: "t2", nombre: "Master" }], "2026-11-05", 4);
  assert.equal(r.total.pesos, 60000 + 20000);
  assert.equal(r.total.usd, 4000);
  assert.deepEqual(r.meses.map((m) => m.pesos), [30000, 40000, 40000, 0]);
  assert.deepEqual(r.meses.map((m) => m.usd), [2000, 2000, 0, 0]);
  const visa = r.tarjetas.find((t) => t.id === "t1");
  assert.equal(visa.debe.pesos, 60000);
  assert.equal(visa.compras[0].info.faltan, 2);
  const sin = r.tarjetas.find((t) => t.id === "");
  assert.equal(sin.nombre, "Sin tarjeta");
  assert.equal(sin.terminadas.length, 1);
  assert.equal(r.terminadas, 1);
});

test("info de una compra terminada y movimientos de una compra", () => {
  const i = infoCompra(compra({ hechas: 3 }));
  assert.equal(i.terminada, true);
  assert.equal(i.debe, 0);
  assert.equal(movsDeCompra([{ id: "x", cuota: { compra: "c1" } }, { id: "y" }], "c1").length, 1);
});

test("una cuota que se anota sola no cuenta para la racha", () => {
  assert.equal(infoRacha([{ id: "x", fecha: "2026-11-05", cuota: { compra: "c" } }], [], "2026-11-05").hoyHecho, false);
});

test("migrar agrega tarjetas y compras sin tocar lo demás", () => {
  const d = migrar({ schemaVersion: 6, movs: [{ id: "a" }], config: { medios: [] } });
  assert.deepEqual(d.tarjetas, []);
  assert.deepEqual(d.compras, []);
  assert.equal(d.movs.length, 1);
});

test("tarjetas y compras viajan entre dispositivos, lo de ejemplo no", () => {
  const m = aplanar({ tarjetas: [{ id: "t1", nombre: "Visa" }, { id: "ej_t1", nombre: "Visa" }], compras: [compra()], movs: [{ id: "ej_cq_ej_c1_3" }] });
  assert.ok(m.has("tarjetas|t1"));
  assert.ok(m.has("compras|c1"));
  assert.ok(!m.has("tarjetas|ej_t1"));
  assert.ok(!m.has("movs|ej_cq_ej_c1_3"));
});

test("elegir billetera cambia el nombre del medio; sin elegir vuelve a la general", () => {
  const nombre = (ms) => ms.find((m) => m.id === "mp").nombre;
  let ms = ponerBilletera(mediosIniciales(), "Ualá");
  assert.equal(nombre(ms), "Ualá");
  assert.equal(ms.length, mediosIniciales().length);
  ms = ponerBilletera(ms, "  ");
  assert.equal(nombre(ms), "Billetera virtual");
  assert.equal(ponerBilletera([{ id: "mp", nombre: "x", oculto: true }], "MODO")[0].oculto, false);
});
