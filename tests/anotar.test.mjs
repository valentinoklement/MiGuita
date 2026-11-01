import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTexto, leerSinMonto, leerVarios, quedoSinCategoria, claveDe } from "../src/logic/anotar.js";
import { categoriasIniciales } from "../src/logic/categorias.js";
import { migrar, VERSION } from "../src/logic/migraciones.js";
import { leerMonto } from "../src/logic/dinero.js";
import { primeraCuota } from "../src/logic/cuotas.js";
import { aparato, mandarComentario } from "../src/logic/buzon.js";
import { queNavegador, linkAChrome } from "../src/logic/instalar.js";
import { pasarATexto, formatoDeAudio } from "../src/logic/voz.js";

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
  const casos = { "barbería 12000": "ropa", "barrio 5000": "otros", "bar 5000": "salidas", "uber eats 8000": "comida", "uber 5000": "transporte", "agua mineral 1500": "super", "agua 9000": "servicios", "pan 500": "super", "asado 30000": "carne", "colectivo 700": "transporte", "edenor 25000": "servicios", "veterinaria 8000": "salud", "facu 40000": "edu" };
  for (const [t, c] of Object.entries(casos)) assert.equal(cat(t), c, t);
  for (const [t, c] of Object.entries({ "aguinaldo 400 lucas": "sueldo", "changa 50000": "extra", "me regalaron 10000": "regalo_in" })) {
    assert.equal(leerTexto(t).tipo, "ingreso", t);
    assert.equal(cat(t), c, t);
  }
});

test("sin aclarar moneda, siempre son pesos", () => {
  for (const t of ["10 lucas birra", "10lucas birra", "15mil nafta", "15 mil nafta", "nafta 15000", "$500 pan"]) assert.equal(leerTexto(t).moneda, undefined, t);
  assert.equal(leerTexto("10lucas birra").monto, 1000000);
  assert.equal(leerTexto("15mil nafta").monto, 1500000);
  assert.equal(leerTexto("nafta 20 dolares").moneda, "USD");
});

test("tomar alcohol va a Salidas", () => {
  for (const t of ["10 lucas birra", "cerveza 8000", "un vino 12000", "fernet 15000", "whisky 30000", "tragos 20000", "bar 5000", "porron 3000", "gin tonic 9000"]) assert.equal(leerTexto(t).categoria, "salidas", t);
  assert.equal(leerTexto("pizza 15000").categoria, "comida");
});

test("quien ya usaba la app también pasa la birra a Salidas", () => {
  const cats = categoriasIniciales();
  cats.gasto.find((c) => c.id === "comida").claves.push("birra", "bar", "cerveza");
  cats.gasto.find((c) => c.id === "comida").claves.push("mi bodegon");
  cats.gasto.find((c) => c.id === "salidas").claves = cats.gasto.find((c) => c.id === "salidas").claves.filter((k) => !["birra", "bar", "cerveza"].includes(k));
  const d = migrar({ schemaVersion: 7, config: { categorias: cats }, movs: [] });
  assert.equal(d.schemaVersion, VERSION);
  const comida = d.config.categorias.gasto.find((c) => c.id === "comida").claves;
  assert.ok(!comida.includes("birra") && comida.includes("mi bodegon"));
  assert.equal(leerTexto("10 lucas birra", d.config.categorias).categoria, "salidas");
});

test("varios gastos de corrido se separan solos", () => {
  const ver = (t) => leerVarios(t).map((r) => [r.detalle, r.monto / 100, r.categoria]);
  const tres = [["Nafta", 15000, "auto"], ["Birra", 10000, "salidas"], ["Súper", 8000, "super"]];
  assert.deepEqual(ver("15 mil de nafta, 10 lucas de birra y 8 mil en el súper"), tres);
  assert.deepEqual(ver("Gasté 15.000 pesos de nafta. 10.000 pesos de birra. Y 8.000 pesos en el súper."), tres);
  assert.deepEqual(ver("nafta 15 mil, birra 10 lucas, súper 8 mil"), tres);
  assert.deepEqual(ver("Nafta 15 mil birra 10 lucas súper 8 mil"), tres);
  assert.deepEqual(ver("15 mil nafta 10 lucas birra 8 mil súper"), tres);
  assert.deepEqual(ver("quince mil de nafta, después diez lucas de birra y también ocho mil en el súper"), tres);
});

test("varios: lo que devolvió el audio de prueba", () => {
  const ver = (t) => leerVarios(t).map((r) => [r.detalle, r.monto / 100, r.categoria]);
  assert.deepEqual(ver("Gasté 20 lucas en el chino, después 5 mil de café y un palo de alquiler."), [["Chino", 20000, "super"], ["Café", 5000, "comida"], ["Alquiler", 1000000, "servicios"]]);
  assert.deepEqual(ver("Hoy pague 30 mil de luz. También 3 mil 500 en el kiosco."), [["Luz", 30000, "servicios"], ["Kiosco", 3500, "comida"]]);
});

test("varios: no corta lo que es un solo gasto", () => {
  const ver = (t) => leerVarios(t).map((r) => [r.detalle, r.monto / 100]);
  assert.deepEqual(ver("nafta 15 mil"), [["Nafta", 15000]]);
  assert.deepEqual(ver("treinta y cinco mil gas"), [["Gas", 35000]]);
  assert.deepEqual(ver("luca y media cafe"), [["Cafe", 1500]]);
  assert.deepEqual(ver("2 pizzas 18000"), [["2 pizzas", 18000]]);
  assert.deepEqual(ver("pan y leche 5000"), [["Pan y leche", 5000]]);
  assert.deepEqual(ver("2 cafes y una medialuna 5000"), [["2 cafes y una medialuna", 5000]]);
  assert.deepEqual(ver("15 mil nafta y aceite"), [["Nafta y aceite", 15000]]);
  assert.deepEqual(ver("15,500 super"), [["Super", 15500]]);
  assert.deepEqual(leerVarios("taxi"), []);
  assert.deepEqual(leerVarios("nafta 20"), []);
});

test("varios: moneda e ingresos en cada uno", () => {
  const r = leerVarios("hotel 100 dolares y 20 mil de nafta");
  assert.deepEqual(r.map((x) => [x.detalle, x.moneda]), [["Hotel", "USD"], ["Nafta", undefined]]);
  assert.deepEqual(leerVarios("cobré el sueldo 500 mil y 20 mil de nafta").map((x) => x.tipo), ["ingreso", "gasto"]);
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

test("qué navegador es, para mostrar cómo instalar", () => {
  const A = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) ";
  assert.deepEqual(queNavegador(A + "Chrome/130.0 Mobile Safari/537.36"), { so: "android", interno: false, chrome: true, safari: false });
  assert.equal(queNavegador(A + "SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36").chrome, false);
  assert.equal(queNavegador(A + "Chrome/130.0 Mobile Safari/537.36", 5, true).chrome, false); // Brave se hace pasar por Chrome
  assert.equal(queNavegador("Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0").chrome, false);
  assert.equal(queNavegador(A + "Chrome/130.0 Mobile Safari/537.36 Instagram 300").interno, true);
  const I = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) ";
  assert.deepEqual(queNavegador(I + "Version/18.0 Mobile/15E148 Safari/604.1"), { so: "iphone", interno: false, chrome: false, safari: true });
  assert.equal(queNavegador(I + "CriOS/130.0 Mobile/15E148 Safari/604.1").safari, false);
  assert.equal(queNavegador("Mozilla/5.0 (Windows NT 10.0) Chrome/130.0").so, "compu");
  assert.ok(linkAChrome().startsWith("intent://valentinoklement.github.io/MiGuita/#Intent;scheme=https;package=com.android.chrome;"));
});

test("el audio se manda una sola vez y los errores se explican", async () => {
  assert.equal(formatoDeAudio((f) => f === "audio/mp4"), "audio/mp4");
  assert.equal(formatoDeAudio(() => false), "");
  const audio = new Blob(["x"], { type: "audio/webm" });
  let llamadas = 0;
  assert.equal(await pasarATexto(audio, async (u, o) => { llamadas++; assert.ok(u.endsWith("/voz")); assert.equal(o.headers["Content-Type"], "audio/webm"); return { ok: true, status: 200, json: async () => ({ texto: " 15 mil nafta " }) }; }), "15 mil nafta");
  assert.equal(llamadas, 1);
  await assert.rejects(pasarATexto(audio, async () => ({ ok: false, status: 429 })), /muchos audios/);
  await assert.rejects(pasarATexto(audio, async () => ({ ok: false, status: 503 })), /No pude escuchar/);
  await assert.rejects(pasarATexto(audio, async () => { throw new Error("red"); }), /internet/);
});
