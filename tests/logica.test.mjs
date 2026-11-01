// Pruebas de la lógica. Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { formatear, evaluar, aCentavos } from "../src/logic/dinero.js";
import { leerTexto } from "../src/logic/anotar.js";
import { GASTO, INGRESO, MEDIOS, categoriasIniciales, paraAdivinar } from "../src/logic/categorias.js";
import { resumenMes, estadoMiguita, sumarDias, fechaLocal, referencia, gastosPor, gastosPorDia, porDiaAgrupado, cambiarMes } from "../src/logic/mes.js";
import { datosDeEjemplo } from "../src/ui/ejemplo.js";
import { Art } from "../src/art/art.js";

test("formato de plata argentino", () => {
  assert.equal(formatear(18430000), "$184.300");
  assert.equal(formatear(1373334), "$13.733,34");
  assert.equal(formatear(5), "$0,05");
  assert.equal(formatear(0), "$0");
  assert.equal(formatear(-2000000), "−$20.000");
  assert.equal(formatear(2000000, { signo: true }), "+$20.000");
  assert.equal(formatear(123456789, { oculto: true }), "$•••••");
  assert.equal(aCentavos(0.1 + 0.2), 30);
});

test("calculadora del teclado: solo suma y resta", () => {
  assert.equal(evaluar("1500+2300-200"), 360000);
  assert.equal(evaluar("1500+2300−200"), 360000);
  assert.equal(evaluar(""), 0);
  assert.equal(evaluar("alert(1)"), 100); // nunca ejecuta texto, solo toma números
});

const CASOS = [
  // [texto, tipo, pesos, detalle, id de categoría]
  ["nafta 20000", "gasto", 20000, "Nafta", "auto"],
  ["coto 38.500", "gasto", 38500, "Coto", "super"],
  ["verdulería $8500", "gasto", 8500, "Verdulería", "super"],
  ["café 3800", "gasto", 3800, "Café", "comida"],
  ["uber 4,5k", "gasto", 4500, "Uber", "transporte"],
  ["farmacia 12 lucas", "gasto", 12000, "Farmacia", "salud"],
  ["pizza 15 mil", "gasto", 15000, "Pizza", "comida"],
  ["sueldo 620000", "ingreso", 620000, "Sueldo", "sueldo"],
  ["me pagaron 50000", "ingreso", 50000, "Me pagaron", "otros_in"],
  ["cobré freelance 90000", "ingreso", 90000, "Cobré freelance", "extra"],
  ["2500 helado", "gasto", 2500, "Helado", "comida"],
  ["steam 7000", "gasto", 7000, "Steam", "hobbies"],
  ["expensas 85000", "gasto", 85000, "Expensas", "servicios"],
  ["algo raro 100", "gasto", 100, "Algo raro", "otros"],
  ["kiosco 2,50", "gasto", 2.5, "Kiosco", "comida"],
  ["1.5", "gasto", 15, "", "otros"], // el punto es de miles: documentado
];

test("anotar rápido por texto", () => {
  for (const [t, tipo, pesos, detalle, categoria] of CASOS) {
    assert.deepEqual(leerTexto(t), { tipo, monto: Math.round(pesos * 100), detalle, categoria }, t);
  }
  assert.equal(leerTexto("nafta"), null);
  assert.equal(leerTexto("nafta 0"), null);
  assert.equal(leerTexto(""), null);
});

test("anotar usa las categorías de la persona: palabras nuevas, ocultas y renombradas", () => {
  const cats = categoriasIniciales();
  cats.gasto.find((c) => c.id === "hobbies").claves.push("pádel");
  assert.equal(leerTexto("pádel 9000", cats).categoria, "hobbies");
  cats.gasto.find((c) => c.id === "auto").oculta = true;
  assert.equal(leerTexto("nafta 20000", cats).categoria, "otros");
  cats.gasto.find((c) => c.id === "super").nombre = "Mercado";
  assert.equal(leerTexto("coto 100", cats).categoria, "super");
  assert.equal(paraAdivinar(cats, "gasto").at(-1)[0], "otros");
});

test("categorías y medios generales, sin nada personal", () => {
  assert.equal(GASTO.length, 16);
  assert.equal(INGRESO.length, 4);
  const todo = [...GASTO, ...INGRESO].flatMap(([, n, k]) => [n, ...k]).concat(MEDIOS.map((m) => m[1])).map((x) => x.toLowerCase());
  for (const p of ["guitarra", "perfume", "papá", "banda", "claude"]) assert.ok(!todo.some((x) => x.includes(p) && !x.startsWith("perfumer")), p);
  const ids = [...GASTO, ...INGRESO].map((c) => c[0]);
  assert.equal(new Set(ids).size, ids.length, "ids únicos");
  for (const id of ids) if (id !== "otros") assert.notEqual(Art.catIcon(id), Art.catIcon("otros"), "ícono propio de " + id);
});

test("te queda, por día, promedio y proyección", () => {
  const movs = [
    { tipo: "ingreso", monto: 100000_00, fecha: "2026-10-01" },
    { tipo: "gasto", monto: 33000_00, fecha: "2026-10-10" },
    { tipo: "gasto", monto: 999_00, fecha: "2026-09-30" }, // otro mes, no cuenta
  ];
  const r = resumenMes(movs, "2026-10-22");
  assert.equal(r.teQueda, 67000_00);
  assert.equal(r.faltan, 10); // del 22 al 31, contando hoy
  assert.equal(r.porDia, 6700_00);
  assert.ok(Math.abs(r.queda - 0.67) < 1e-9);
  assert.equal(r.promedio, 1500_00);
  assert.equal(r.proyeccion, 46500_00);
  const sin = resumenMes([{ tipo: "gasto", monto: 500, fecha: "2026-10-02" }], "2026-10-05");
  assert.equal(sin.porDia, 0);
  assert.equal(sin.queda, 1);
  assert.equal(resumenMes([], "2026-02-28").faltan, 1);
});

test("mes de referencia y cambio de mes", () => {
  assert.equal(referencia("2026-10", "2026-10-15"), "2026-10-15");
  assert.equal(referencia("2026-09", "2026-10-15"), "2026-09-30");
  assert.equal(referencia("2026-02", "2026-10-15"), "2026-02-28");
  assert.equal(referencia("2026-11", "2026-10-15"), "2026-11-01");
  assert.equal(cambiarMes("2026-01", -1), "2025-12");
  assert.equal(cambiarMes("2026-12", 1), "2027-01");
});

test("resumen por categoría, medio y día", () => {
  const movs = [
    { tipo: "gasto", monto: 300, categoria: "super", medio: "debito", fecha: "2026-10-01", ts: 2 },
    { tipo: "gasto", monto: 100, categoria: "auto", medio: "", fecha: "2026-10-01", ts: 1 },
    { tipo: "gasto", monto: 600, categoria: "super", medio: "mp", fecha: "2026-10-31", ts: 3 },
    { tipo: "ingreso", monto: 5000, categoria: "sueldo", medio: "transferencia", fecha: "2026-10-02", ts: 4 },
  ];
  assert.deepEqual(gastosPor(movs, "2026-10", "categoria"), [{ id: "super", monto: 900, parte: 0.9 }, { id: "auto", monto: 100, parte: 0.1 }]);
  assert.deepEqual(gastosPor(movs, "2026-10", "medio").map((x) => x.id), ["mp", "debito", ""]);
  const d = gastosPorDia(movs, "2026-10");
  assert.equal(d.length, 31);
  assert.equal(d[0], 400);
  assert.equal(d[30], 600);
  const g = porDiaAgrupado(movs);
  assert.deepEqual(g.map((x) => [x.fecha, x.gastado, x.movs.length]), [["2026-10-31", 600, 1], ["2026-10-02", 0, 1], ["2026-10-01", 400, 2]]);
  assert.equal(g[2].movs[0].monto, 300, "dentro del día, lo último anotado primero");
});

test("estados de Miguita: 70% pasada, 90% podrida", () => {
  assert.equal(estadoMiguita(0, 5000), "ok");
  assert.equal(estadoMiguita(1000, 699), "ok");
  assert.equal(estadoMiguita(1000, 700), "mid");
  assert.equal(estadoMiguita(1000, 899), "mid");
  assert.equal(estadoMiguita(1000, 900), "bad");
  assert.equal(estadoMiguita(1000, 1500), "bad");
});

test("fechas locales", () => {
  assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.match(fechaLocal(), /^\d{4}-\d{2}-\d{2}$/);
});

test("datos de ejemplo: ids ej_, en centavos, nada en el futuro", () => {
  const ids = categoriasIniciales();
  for (const hoy of ["2026-10-31", "2026-11-01", "2026-11-03", "2027-01-02"]) {
    const movs = datosDeEjemplo(hoy);
    assert.ok(movs.every((x) => x.id.startsWith("ej_") && x.fecha <= hoy && Number.isInteger(x.monto)));
    assert.ok(movs.some((x) => x.fecha.slice(0, 7) === cambiarMes(hoy.slice(0, 7), -1)));
    assert.ok(movs.every((x) => ids[x.tipo].some((c) => c.id === x.categoria)));
  }
});

test("dibujos: estados, barra, premios y gráfico", () => {
  for (const e of ["ok", "mid", "bad"]) assert.match(Art.miguita(e), /^<svg[\s\S]*<\/svg>$/);
  for (const k of ["inicio", "grupos", "plan", "mas"]) assert.match(Art.navIcon(k), /^<svg/);
  for (const q of [0, 0.3, 1]) assert.match(Art.pan(q), /^<svg/);
  for (let i = 0; i < Art.PREMIOS.length; i++) assert.match(Art.premio(i), /^<svg/);
  assert.match(Art.barrasDias([0, 0, 0], -1), /^<svg/);
  assert.match(Art.salvavidas, /^<svg/);
});

test("la app guarda para usar sin internet todos sus archivos", () => {
  const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
  const listar = (dir) => readdirSync(new URL(dir, import.meta.url)).flatMap((f) =>
    statSync(new URL(dir + f, import.meta.url)).isDirectory() ? listar(dir + f + "/") : [dir + f]);
  // pdf.js pesa casi 2 MB: se baja solo la primera vez que se importa un PDF, no se guarda para usar sin internet.
  for (const f of [...listar("../src/"), ...listar("../fonts/")].filter((f) => !f.includes("/vendor/pdfjs/"))) assert.ok(sw.includes('"./' + f.slice(3) + '"'), "falta en sw.js: " + f);
});
