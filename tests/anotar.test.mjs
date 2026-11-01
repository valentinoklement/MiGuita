import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTexto, leerSinMonto, quedoSinCategoria, claveDe } from "../src/logic/anotar.js";
import { leerMonto } from "../src/logic/dinero.js";
import { primeraCuota } from "../src/logic/cuotas.js";
import { aparato, mandarComentario } from "../src/logic/buzon.js";

const monto = (t) => leerTexto(t).monto / 100;

test("lunfardo y formas de decir la plata", () => {
  const casos = { "10 lucas": 10000, "una luca pan": 1000, "dos lucas nafta": 2000, "media luca kiosco": 500, "luca y media cafe": 1500, "2 lucas y media taxi": 2500,
    "un palo alquiler": 1e6, "medio palo auto": 5e5, "palo y medio": 15e5, "dos palos alquiler": 2e6, "1,5 palos auto": 15e5, "1.5 lucas": 1500, "3 gambas chicle": 300,
    "500 mangos pan": 500, "quinientos pesos pan": 500, "dos mil quinientos cafe": 2500, "veinte mil super": 20000, "treinta y cinco mil gas": 35000, "2 mil 500 pan": 2500,
    "nafta 20k": 20000, "nafta 20mil": 20000, "alquiler 350 mil": 350000, "15,500 super": 15500, "$500 pan": 500, "3x2000 birra": 6000 };
  for (const [t, v] of Object.entries(casos)) assert.equal(monto(t), v, t);
});

test("no confunde palabras ni cantidades con el monto", () => {
  const r = leerTexto("1500 kiosco");
  assert.deepEqual([r.monto, r.detalle], [150000, "Kiosco"]);
  for (const [t, v, d] of [["2 pizzas 18000", 18000, "2 pizzas"], ["3 kg de pan 6000", 6000, "3 kg de pan"], ["24 cuotas tele 500000", 500000, "24 cuotas tele"], ["un alfajor 1500", 1500, "Un alfajor"], ["cuota 3/12 5000", 5000, "Cuota 3/12"], ["gasté 3000 en pizza", 3000, "Pizza"]]) {
    const x = leerTexto(t);
    assert.deepEqual([x.monto / 100, x.detalle, x.opciones], [v, d, undefined], t);
  }
});

test("dólares", () => {
  for (const t of ["US$ 100 hotel", "100 dolares hotel", "hotel 100 usd", "100 verdes hotel"]) {
    const r = leerTexto(t);
    assert.deepEqual([r.monto, r.moneda, r.detalle], [10000, "USD", "Hotel"], t);
  }
});

test("si de verdad no se puede saber, pregunta", () => {
  assert.deepEqual(leerTexto("nafta 20").opciones, [2000, 2000000]);
  assert.deepEqual(leerTexto("super 1500 verdu 2000").opciones, [150000, 200000, 350000]);
  assert.equal(leerTexto("taxi"), null);
  assert.deepEqual(leerSinMonto("taxi"), { tipo: "gasto", detalle: "Taxi", categoria: "transporte" });
});

test("categorías: palabra completa, lo más específico y vocabulario nuevo aunque la persona tenga las viejas", () => {
  const cat = (t) => leerTexto(t).categoria;
  const casos = { "barbería 12000": "ropa", "barrio 5000": "otros", "bar 5000": "comida", "uber eats 8000": "comida", "uber 5000": "transporte", "agua mineral 1500": "super", "agua 9000": "servicios", "pan 500": "super", "asado 30000": "carne", "colectivo 700": "transporte", "edenor 25000": "servicios", "veterinaria 8000": "salud", "facu 40000": "edu" };
  for (const [t, c] of Object.entries(casos)) assert.equal(cat(t), c, t);
  for (const [t, c] of Object.entries({ "aguinaldo 400 lucas": "sueldo", "changa 50000": "extra", "me regalaron 10000": "regalo_in" })) {
    assert.equal(leerTexto(t).tipo, "ingreso", t);
    assert.equal(cat(t), c, t);
  }
});

test("aprende lo que la persona corrige", () => {
  const r = leerTexto("Carnaval 5000");
  assert.ok(quedoSinCategoria(r));
  const a = { [claveDe("carnaval")]: "salidas" };
  const r2 = leerTexto("carnaval 8000", undefined, a);
  assert.equal(r2.categoria, "salidas");
  assert.ok(!quedoSinCategoria(r2));
});

test("los formularios también entienden palabras, sin romper lo de siempre", () => {
  assert.equal(leerMonto("20 mil"), 2000000);
  assert.equal(leerMonto("dos lucas"), 200000);
  assert.equal(leerMonto("70.000"), 7000000);
  assert.equal(leerMonto("abc"), null);
  assert.equal(leerMonto("nafta 200"), null);
});

test("primera cuota según el cierre y el vencimiento", () => {
  const t = { cierre: 25, vence: 5 };
  assert.deepEqual(primeraCuota("2026-11-10", t), { desde: "2026-12", dia: 5 });
  assert.deepEqual(primeraCuota("2026-11-28", t), { desde: "2027-01", dia: 5 });
  assert.deepEqual(primeraCuota("2026-11-10", { cierre: 5, vence: 20 }), { desde: "2026-12", dia: 20 });
  assert.equal(primeraCuota("2026-11-10", {}), null);
});

test("buzón: manda solo lo que hace falta", async () => {
  assert.equal(aparato("Mozilla (iPhone; CPU)"), "iPhone");
  let cuerpo;
  await mandarComentario({ tipo: "idea", texto: "  buena app ", nombre: "Ana", version: "datos 7", ua: "Android 14" }, async (u, o) => { cuerpo = JSON.parse(o.body); return { ok: true }; });
  assert.deepEqual(cuerpo, { tipo: "idea", texto: "buena app", nombre: "Ana", version: "datos 7", aparato: "Android" });
  await assert.rejects(mandarComentario({ texto: " " }, async () => ({ ok: true })));
  await assert.rejects(mandarComentario({ texto: "hola" }, async () => ({ ok: false, status: 429 })), /muchos/);
});
