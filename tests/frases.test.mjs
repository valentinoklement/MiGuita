// La lectura de frases no se puede romper sin que alguien se entere.
// Cada palabra nueva del vocabulario puede cambiar frases que antes andaban. Acá hay tres redes:
//   1. Las decisiones: frases que tienen que leerse de una forma y no se negocian (salen de lo que reportó la gente).
//   2. La lista larga (tests/frases.txt): cada frase se tiene que seguir leyendo igual que la última vez que se revisó (tests/frases.json).
//      Si cambió a propósito, se acepta con `npm run frases` y se mira el diff.
//   3. El vocabulario entero: cada palabra tiene que caer en su categoría y no puede confundirse con un monto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTexto, leerVarios, leerSinMonto } from "../src/logic/anotar.js";
import { categoriasIniciales } from "../src/logic/categorias.js";
import { LEXICO_GASTO, LEXICO_INGRESO, DEBILES, quitarAcentos } from "../src/logic/lexico.js";
import { leerFrases, leerGuardado, describir } from "../tools/frases.mjs";

const cats = categoriasIniciales();
const leer = (t, aprendidas = {}) => { const r = leerTexto(t, cats, aprendidas); return r && [r.tipo, r.categoria, r.monto / 100, r.moneda || "ARS"]; };

/* ---------- 1. las decisiones ---------- */
test("gastos que se leían como plata que entró (y hacían subir «Te queda»)", () => {
  assert.deepEqual(leer("comisión del banco 3000"), ["gasto", "servicios", 3000, "ARS"]);
  assert.deepEqual(leer("honorarios del contador 50000"), ["gasto", "servicios", 50000, "ARS"]);
  assert.deepEqual(leer("bono de consulta 8000"), ["gasto", "salud", 8000, "ARS"]);
  // Las mismas palabras, cuando sí es plata que entra.
  for (const t of ["bono 50000", "comisión por ventas 80000", "honorarios 200000", "cobré honorarios 150000", "me pagaron el bono 80000"]) assert.equal(leer(t)[0], "ingreso", t);
});

test("plata que entró y se leía como gasto", () => {
  assert.deepEqual(leer("me llegó plata de papá 20000"), ["ingreso", "otros_in", 20000, "ARS"]);
  assert.deepEqual(leer("sumame 15 lucas de papá"), ["ingreso", "otros_in", 15000, "ARS"]);
  // Lo que ya estaba decidido sigue igual: «sumame» algo en lo que se gasta es un gasto más.
  assert.deepEqual(leer("sumame 10 lucas de nafta"), ["gasto", "auto", 10000, "ARS"]);
  assert.deepEqual(leer("me llegó la luz 20 mil"), ["gasto", "servicios", 20000, "ARS"]);
  for (const t of ["auh 60000", "beca 40000", "jornal 25000", "asignación familiar 55000"]) assert.equal(leer(t)[0], "ingreso", t);
});

test("categorías: papá no es una papa, un apellido no es una cerveza y la tarjeta Naranja no es una fruta", () => {
  const cat = (t) => leer(t)[1];
  assert.equal(cat("papá 5000"), "otros");
  assert.equal(cat("regalo para papá 20000"), "regalos");
  assert.equal(cat("papas 3000"), "verduleria");
  assert.equal(cat("2 kg de papa 2400"), "verduleria", "sin tilde y sin más pistas, sigue siendo la verdura");
  assert.equal(cat("expensas fernandez 90000"), "servicios");
  assert.equal(cat("expensas Fernández 90000"), "servicios");
  assert.equal(cat("Fernández 20000"), "otros", "un apellido solo: mejor preguntar que mandarlo a Salidas");
  assert.equal(cat("farmacia patagonia 12000"), "salud");
  assert.equal(cat("birra patagonia 4000"), "salidas");
  assert.equal(cat("patagonia 5000"), "salidas", "sola, la marca sigue valiendo");
  assert.equal(cat("tarjeta naranja 80000"), "tarjeta");
  assert.equal(cat("cuota naranja 30000"), "tarjeta");
  assert.equal(cat("naranjas 2000"), "verduleria");
  assert.equal(cat("carne picada 9000"), "carne");
  assert.equal(cat("picada 15000"), "salidas");
});

test("la cosa manda sobre el sabor, el lugar o para qué es", () => {
  const cat = (t) => leer(t)[1];
  assert.equal(cat("helado de frutilla 4000"), "comida");
  assert.equal(cat("gin con pepino 9000"), "salidas");
  assert.equal(cat("torta de limón 12000"), "panaderia");
  assert.equal(cat("remis a la farmacia 4000"), "transporte");
  assert.equal(cat("frutillas 3000"), "verduleria", "sola, la frutilla es de la verdulería");
  assert.equal(cat("puré de papa 3000"), "verduleria", "si adelante no hay otra cosa, vale lo que viene después de «de»");
  // Las palabras de pago acompañan a cualquier cosa: gana la cosa.
  assert.equal(cat("cuota del gym 20000"), "gym");
  assert.equal(cat("tarjeta sube 3000"), "transporte");
  assert.equal(cat("compras farmacia 9000"), "salud");
  assert.equal(cat("cuota 30000"), "deudas");
  // El alcohol va a Salidas (pedido del usuario), se compre donde se compre.
  assert.equal(cat("birra en el super 5000"), "salidas");
  assert.equal(cat("super fernet 9000"), "salidas");
});

test("montos: «verdes» puede ser un color y «palitos», algo que se come", () => {
  assert.deepEqual(leer("manzanas verdes 3000"), ["gasto", "verduleria", 3000, "ARS"]);
  assert.deepEqual(leer("100 verdes hotel"), ["gasto", "viajes", 100, "USD"], "después del número siguen siendo dólares (y el hotel ya tiene su categoría)");
  assert.deepEqual(leer("2 palitos salados 3000"), ["gasto", "salidas", 3000, "ARS"]);
  assert.deepEqual(leer("dos palitos salados 3000"), ["gasto", "salidas", 3000, "ARS"]);
  assert.equal(leerTexto("2 palitos salados", cats), null, "sin precio no se inventan dos millones");
  assert.deepEqual(leer("2 palitos el auto"), ["gasto", "auto", 2000000, "ARS"], "y dos palitos siguen siendo dos millones");
  assert.deepEqual(leer("dos palos alquiler"), ["gasto", "servicios", 2000000, "ARS"]);
  assert.equal(leerVarios("3 gambas al ajillo 12000", cats).length, 1, "no se parte en dos gastos");
});

test("lo que enseña la persona vale, pero no pisa una palabra más clara", () => {
  // «Pago» es justo lo que la app pide enseñar cuando no entiende. No puede romper «pago luz».
  const aprendidas = { pago: "deudas" };
  assert.equal(leer("pago 5000", aprendidas)[1], "deudas", "tal cual la enseñó");
  assert.equal(leer("pago juan 5000", aprendidas)[1], "deudas", "adentro de una frase sin otra pista, también");
  assert.equal(leer("pago luz 30000", aprendidas)[1], "servicios", "con una palabra clara al lado, gana la palabra clara");
  assert.equal(leer("2 papas fritas grandes 5000", { "papas fritas": "comida" })[1], "comida", "lo corregido le gana al vocabulario en las mismas palabras");
  // Enseñar la categoría también enseña si entra o sale: pasó «Juan» a un ingreso.
  assert.deepEqual(leer("juan 5000", { juan: "extra" }).slice(0, 2), ["ingreso", "extra"]);
  // Pero si el texto lo dice, manda el texto.
  assert.equal(leer("le pagué a juan 5000", { juan: "extra" })[0], "gasto");
  assert.equal(leer("cobré juan 5000", { juan: "deudas" })[0], "ingreso");
  // Lo olvidado (queda como "") no molesta.
  assert.equal(leer("pago luz 30000", { pago: "" })[1], "servicios");
  assert.equal(leer("pago 5000", { pago: "" })[1], "otros");
});

test("pagar la tarjeta tiene su lugar, y no es lo mismo que una deuda ni que pagar algo con tarjeta", () => {
  const cat = (t) => leer(t)[1];
  for (const t of ["tarjeta 200000", "pago de la tarjeta 250000", "pagué la tarjeta 180000", "resumen de la tarjeta 300000", "visa 150000", "pagué la visa 150000", "mastercard 90000", "la master 90000", "resumen visa 210000", "amex 60000", "tarjeta de crédito 120000", "pago mínimo 40000", "tarjeta naranja 80000"])
    assert.deepEqual(leer(t).slice(0, 2), ["gasto", "tarjeta"], t);
  // Las deudas siguen siendo deudas.
  for (const t of ["cuota 30000", "préstamo 50000", "cuota del préstamo 50000", "le devolví a juan 10000", "deuda con ana 20000"]) assert.equal(cat(t), "deudas", t);
  // Nombrar la tarjeta al lado de una cosa es decir con qué se pagó: gana la cosa.
  assert.equal(cat("zapatillas visa 80000"), "ropa");
  assert.equal(cat("zapatillas con la visa 80000"), "ropa");
  assert.equal(cat("super con tarjeta 45000"), "super");
  assert.equal(cat("nafta con tarjeta de crédito 30000"), "auto");
  assert.equal(cat("tarjeta sube 3000"), "transporte");
  assert.equal(cat("curso master 50000"), "edu");
  // Personalizar: si alguien se arma «Tarjeta Visa» con la palabra «visa», gana la suya; las demás siguen en la general.
  const cats = categoriasIniciales();
  cats.gasto.splice(-1, 0, { id: "c_visa", nombre: "Tarjeta Visa", claves: ["visa"], oculta: false });
  assert.equal(leerTexto("visa 150000", cats).categoria, "c_visa");
  assert.equal(leerTexto("pagué la visa 150000", cats).categoria, "c_visa");
  assert.equal(leerTexto("mastercard 90000", cats).categoria, "tarjeta");
  // Si la oculta, no se usa más.
  const sin = categoriasIniciales();
  sin.gasto.find((c) => c.id === "tarjeta").oculta = true;
  assert.equal(leerTexto("visa 150000", sin).categoria, "otros");
});

test("viajes: el hotel y el vuelo tienen lugar, pero el viaje en uber sigue siendo transporte", () => {
  const cat = (t) => leer(t)[1];
  for (const t of ["hotel 80000", "viaje a la costa 80000", "pasaje de avión 250000", "airbnb 120000", "vacaciones 300000", "excursión 25000", "seguro de viaje 20000", "valija 60000"]) assert.equal(cat(t), "viajes", t);
  for (const t of ["viaje en uber 5000", "viaje en colectivo 700", "pasaje a córdoba 40000", "taxi al aeropuerto 15000"]) assert.equal(cat(t), "transporte", t);
  assert.equal(cat("nafta para el viaje 30000"), "auto");
  assert.equal(cat("vacaciones nafta 30000"), "auto", "«vacaciones» no le gana a una palabra clara");
  assert.equal(cat("super vacaciones 40000"), "super");
});

test("con qué se pagó: solo cuando se dice sin dudas, y pagar la tarjeta nunca es «con crédito»", () => {
  const medio = (t) => (leerTexto(t, cats) || leerSinMonto(t, cats)).medio || "";
  assert.equal(medio("zapatillas con crédito 80000"), "credito");
  assert.equal(medio("nafta con tarjeta de crédito 30000"), "credito");
  assert.equal(medio("zapatillas con crédito"), "credito", "también sin monto: la hoja se abre con Crédito elegido");
  assert.equal(medio("super con débito 45000"), "debito");
  assert.equal(medio("super en efectivo 9000"), "efectivo");
  assert.equal(medio("tarjeta de crédito 120000"), "", "es pagar la tarjeta");
  assert.equal(medio("pagué la tarjeta de crédito con débito 50000"), "debito");
  assert.equal(medio("cena con la visa 30000"), "", "la Visa puede ser de débito: no se adivina");
  assert.equal(medio("zapatillas 80000"), "");
  assert.equal(leerVarios("zapatillas con crédito 80000 y nafta 20000", cats)[0].medio, "credito", "en una lista de varios, cada uno con lo suyo");
  assert.equal(leerVarios("zapatillas con crédito 80000 y nafta 20000", cats)[1].medio, undefined);
  // Con la puntuación pegada, como escribe la voz.
  for (const t of ["zapatillas 80000 con crédito.", "zapatillas con crédito, 80 lucas", "nafta con crédito."]) assert.equal(medio(t), "credito", t);
  // Formas habladas.
  for (const t of ["zapatillas con la de crédito 80000", "nafta con mi tarjeta de crédito 30000", "cena con la visa de crédito 30000"]) assert.equal(medio(t), "credito", t);
  assert.equal(medio("30 lucas de nafta con la de débito"), "debito");
  // «Crédito» como préstamo, o crédito del celu: no es la tarjeta.
  for (const t of ["cuota por el crédito 50000", "pagué 50000 por el crédito del auto", "heladera con el crédito de mercado pago 500000", "heladera con crédito de mercado pago 500000", "cargué 2000 en crédito para el celu", "me depositaron 200000 por el crédito"])
    assert.equal(medio(t), "", t);
  // Decir solo con qué se pagó no es pagar la tarjeta: va a Otros (la app pregunta en qué) y queda con crédito.
  assert.deepEqual([leer("pagué con tarjeta de crédito 30000")[1], medio("pagué con tarjeta de crédito 30000")], ["otros", "credito"]);
  assert.deepEqual([leer("pagué la visa con crédito 10000")[1], medio("pagué la visa con crédito 10000")], ["tarjeta", ""], "pagar la tarjeta con crédito no existe");
  // Una devolución a la tarjeta de crédito es plata que vuelve a la tarjeta.
  assert.deepEqual([leer("devolución en la tarjeta de crédito 5000")[0], medio("devolución en la tarjeta de crédito 5000")], ["ingreso", "credito"]);
});

test("los gastos que no tenían lugar: herramientas del laburo, mascotas y la casa", () => {
  const cat = (t) => leer(t)[1];
  for (const t of ["herramientas 45000", "taladro 80000", "insumos para el laburo 30000", "ropa de trabajo 40000"]) assert.equal(cat(t), "trabajo", t);
  for (const t of ["veterinaria 18000", "alimento del perro 25000", "comida del gato 18000", "vacuna del perro 15000"]) assert.equal(cat(t), "mascotas", t);
  for (const t of ["ferretería 7000", "plomero 40000", "colchón 300000", "juego de sábanas 30000"]) assert.equal(cat(t), "casa", t);
  assert.equal(cat("seguro de hogar 12000"), "servicios");
  assert.equal(cat("obra social 40000"), "salud");
});

/* ---------- 2. la lista larga ---------- */
test("ninguna frase de la lista cambió de lectura sin que alguien lo revise", () => {
  const frases = leerFrases(), guardado = leerGuardado();
  assert.ok(frases.length >= 350, "la lista tiene que ser larga para servir de algo");
  const cambios = frases.filter((f) => guardado[f] !== undefined && guardado[f] !== describir(f)).map((f) => "«" + f + "»\n     antes: " + guardado[f] + "\n     ahora: " + describir(f));
  const sinGuardar = frases.filter((f) => guardado[f] === undefined), sobran = Object.keys(guardado).filter((f) => !frases.includes(f));
  assert.equal(cambios.length, 0, cambios.length + " frases se leen distinto que antes:\n\n   " + cambios.join("\n\n   ") +
    "\n\nSi es lo que querías, aceptalo con `npm run frases` y revisá el diff de tests/frases.json. Si no, la palabra que agregaste rompió algo.");
  assert.deepEqual(sinGuardar, [], "hay frases nuevas en tests/frases.txt: corré `npm run frases` para guardar cómo se leen");
  assert.deepEqual(sobran, [], "tests/frases.json tiene frases que ya no están en la lista: corré `npm run frases`");
});

/* ---------- 3. el vocabulario entero ---------- */
test("cada palabra del vocabulario cae en su categoría y no se confunde con un monto", () => {
  // Palabras de plata que entra que, solas, no alcanzan para saber si entró o salió («trabajo 5000» puede ser un gasto del trabajo).
  // Sirven para elegir la categoría cuando el resto de la frase ya dice que entró («cobré un trabajo»). Si agregás una acá, que sea a propósito.
  const SOLAS_NO_ALCANZAN = new Set(["recibo", "trabajo", "trabaje", "freelance", "extra", "venta", "factura", "laburo", "cliente", "devolucion"]);
  const problemas = [];
  for (const [lexico, tipo] of [[LEXICO_GASTO, "gasto"], [LEXICO_INGRESO, "ingreso"]]) for (const [cat, claves] of Object.entries(lexico)) for (const k of claves) {
    const sola = leerTexto(k + " 3000", cats), conCantidad = leerTexto("2 " + k + " 3000", cats);
    if (!sola || sola.monto !== 300000 || sola.moneda || sola.opciones) { problemas.push("«" + k + " 3000» no se lee como $3.000"); continue; }
    if (!conCantidad || conCantidad.monto !== 300000 || conCantidad.moneda || conCantidad.opciones) problemas.push("«2 " + k + " 3000» no se lee como $3.000 (¿«" + k + "» se confunde con plata?)");
    if (tipo === "ingreso" && SOLAS_NO_ALCANZAN.has(quitarAcentos(k))) continue;
    if (sola.tipo !== tipo) problemas.push("«" + k + " 3000» se lee como " + sola.tipo + " y está en el vocabulario de " + tipo + "s");
    else if (sola.categoria !== cat) problemas.push("«" + k + " 3000» va a " + sola.categoria + " y está anotada en " + cat);
  }
  assert.deepEqual(problemas, []);
});

test("ninguna palabra está en dos categorías, y las «débiles» existen", () => {
  const donde = new Map();
  for (const [cat, claves] of Object.entries(LEXICO_GASTO)) for (const k of claves) donde.set(quitarAcentos(k), [...(donde.get(quitarAcentos(k)) || []), cat]);
  assert.deepEqual([...donde].filter(([, c]) => new Set(c).size > 1).map(([k, c]) => k + ": " + c.join(" y ")), [], "una palabra en dos categorías gana una u otra según el orden: hay que elegir");
  const todas = new Set([...Object.values(LEXICO_GASTO), ...Object.values(LEXICO_INGRESO), ...cats.gasto.map((c) => c.claves), ...cats.ingreso.map((c) => c.claves)].flat().map(quitarAcentos));
  assert.deepEqual([...DEBILES].filter((d) => !todas.has(d)), [], "en DEBILES quedó una palabra que ya no está en el vocabulario");
  // Las categorías nuevas tienen vocabulario, y todo el vocabulario es de una categoría que existe.
  const ids = new Set([...cats.gasto, ...cats.ingreso].map((c) => c.id));
  assert.deepEqual([...Object.keys(LEXICO_GASTO), ...Object.keys(LEXICO_INGRESO)].filter((id) => !ids.has(id)), []);
});
