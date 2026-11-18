// El ícono de cada categoría: los de la lista, el dibujo de la persona, y que nada de lo que llega de afuera se dibuje como HTML.
import { test } from "node:test";
import assert from "node:assert/strict";
import { limpiarDibujo, caminoDe, sumarPunto, conTrazo, puntosDe, MAX_TRAZOS, MAX_PUNTOS, MAX_POR_TRAZO, COLORES_DIBUJO } from "../src/logic/iconos.js";
import { Art } from "../src/art/art.js";
import "../src/art/extra.js";
import { categoriasIniciales } from "../src/logic/categorias.js";

test("dibujo: solo números, dentro del cuadro, con un decimal", () => {
  for (const malo of [null, undefined, "M0 0", 5, {}, { t: "M0 0L9 9" }, { t: [] }, { t: [["a", "b"]] }, { t: [[1]] }, { t: [[NaN, 1, Infinity, 2]] }])
    assert.equal(limpiarDibujo(malo), null, JSON.stringify(malo));
  assert.deepEqual(limpiarDibujo({ c: 2, t: [[1.234, 2.25, "3", 4, 5, 6]] }), { c: 2, t: [[1.2, 2.3, 5, 6]] }, "lo que no es número se saltea");
  assert.deepEqual(limpiarDibujo({ t: [[-5, 99, 50, -1]] }), { c: 0, t: [[0, 36, 40, 0]] }, "lo de afuera queda en el borde");
  for (const c of [99, -1, 1.5, "3", '"><img src=x>', null]) assert.equal(limpiarDibujo({ c, t: [[1, 1]] }).c, 0, "color raro: " + c);
  assert.equal(limpiarDibujo({ c: COLORES_DIBUJO.length - 1, t: [[1, 1]] }).c, COLORES_DIBUJO.length - 1);
  assert.deepEqual(limpiarDibujo({ t: [null, "x", [1, 1]] }).t, [[1, 1]], "los trazos que no son lista se saltean");
});

test("dibujo: con topes, para que no pese en cada sincronización", () => {
  const muchos = limpiarDibujo({ t: Array.from({ length: 100 }, () => [1, 1, 2, 2]) });
  assert.equal(muchos.t.length, MAX_TRAZOS);
  const largo = limpiarDibujo({ t: [Array.from({ length: 5000 }, (_, i) => i % 40)] });
  assert.equal(largo.t[0].length, MAX_POR_TRAZO * 2);
  const enorme = limpiarDibujo({ t: Array.from({ length: 40 }, () => Array.from({ length: 1000 }, (_, i) => i % 36)) });
  assert.ok(puntosDe(enorme.t) <= MAX_PUNTOS);
  assert.ok(JSON.stringify(enorme).length < 12000, "unos 10 KB como mucho");
});

test("dibujo: el camino sale de números y nada más", () => {
  assert.equal(caminoDe([3, 4]), "M3 4h.01", "un toque es un puntito");
  assert.equal(caminoDe([0, 0, 10, 0]), "M0 0L10 0");
  assert.equal(caminoDe([0, 0, 10, 0, 10, 10]), "M0 0L10 0L10 10", "rectas de punto a punto: pasa por cada punto guardado");
  const d = limpiarDibujo({ t: [[1, 2, 3, 4, 5, 6, 7, 8], [9, 9]] });
  for (const tr of d.t) assert.match(caminoDe(tr), /^[MQLh0-9. ]+$/);
});

test("dibujar: puntos muy juntos no suman, y un trazo nuevo respeta los topes", () => {
  const t = [];
  assert.equal(sumarPunto(t, 10, 10), true);
  assert.equal(sumarPunto(t, 10.2, 10.1), false, "demasiado cerca");
  assert.equal(sumarPunto(t, 12, 10), true);
  sumarPunto(t, 500, -3);
  assert.deepEqual(t, [10, 10, 12, 10, 40, 0]);
  let d = { c: 1, t: [] };
  d = conTrazo(d, [1, 1, 5, 5]);
  assert.deepEqual(d, { c: 1, t: [[1, 1, 5, 5]] });
  const lleno = { c: 0, t: Array.from({ length: MAX_TRAZOS }, () => [1, 1]) };
  assert.equal(conTrazo(lleno, [2, 2]).t.length, MAX_TRAZOS, "lleno: no entra otro");
  const trazo = (n) => Array.from({ length: n * 2 }, () => 1);
  const casi = { c: 0, t: [trazo(MAX_POR_TRAZO), trazo(MAX_POR_TRAZO), trazo(MAX_PUNTOS - 2 * MAX_POR_TRAZO - 2)] };
  assert.equal(puntosDe(casi.t), MAX_PUNTOS - 2);
  assert.equal(puntosDe(conTrazo(casi, [1, 1, 2, 2, 3, 3, 4, 4]).t), MAX_PUNTOS, "se recorta lo que no entra");
});

test("la lista de íconos: cada uno una vez, todos dibujan, y están los de las categorías de siempre", () => {
  const ids = Art.ICONOS_CAT.map((i) => i.id), svgs = ids.map(Art.iconoDeLista);
  assert.equal(new Set(ids).size, ids.length, "ids repetidos");
  assert.equal(new Set(svgs).size, svgs.length, "el mismo dibujo dos veces");
  for (const s of svgs) assert.match(s, /^<svg viewBox="0 0 40 36"/);
  const cats = categoriasIniciales();
  for (const c of [...cats.gasto, ...cats.ingreso]) {
    assert.equal(Art.claveDeIcono(c), c.id, "la de siempre: " + c.id);
    assert.equal(Art.iconoDeCategoria(c), Art.catIcon(c.id), "se ve igual que antes: " + c.id);
  }
  assert.ok(ids.length >= cats.gasto.length + cats.ingreso.length + 15, "hay íconos nuevos sin usar");
});

test("el ícono de una categoría: el elegido, el dibujo, o el de siempre; lo raro no se dibuja", () => {
  assert.equal(Art.claveDeIcono({ id: "c_1" }), "otros", "una nueva arranca con el de Otros");
  assert.equal(Art.claveDeIcono({ id: "c_1", icono: "mate" }), "mate");
  assert.equal(Art.claveDeIcono({ id: "super", icono: "nada" }), "super", "un id que no existe: el de siempre");
  assert.equal(Art.claveDeIcono({ id: "c_1", icono: "mate", dibujo: { c: 1, t: [[1, 1, 9, 9]] } }), "dibujo", "el dibujo gana");
  assert.equal(Art.claveDeIcono({ id: "c_1", icono: "mate", dibujo: { t: "<script>" } }), "mate", "un dibujo que no sirve no cuenta");
  const X = '"><img src=x onerror=alert(1)>';
  for (const c of [{ id: X }, { id: "constructor" }, { id: "__proto__" }, { id: "c", icono: "constructor" }, { id: "c", icono: "__proto__" }, { id: "c", icono: X },
    { id: "c", dibujo: { c: X, t: [[1, 1, X, 2]] } }, { id: "c", dibujo: { c: 1, t: [[1, 1, 2, 2]], extra: X } }, { id: "c", dibujo: { t: [["1e400", 1]] } }]) {
    const h = Art.iconoDeCategoria(c);
    assert.match(h, /^<svg /, JSON.stringify(c));
    assert.ok(!h.includes("<img") && !h.includes("function") && !h.includes("onerror"), JSON.stringify(c));
  }
  for (const id of ["constructor", "__proto__", "toString", X]) assert.match(Art.catIcon(id), /^<svg /, id);
  const dib = Art.iconoDeCategoria({ id: "c", dibujo: { c: 3, t: [[5, 5, 30, 30]] } });
  assert.ok(dib.includes(COLORES_DIBUJO[3]) && dib.includes('class="ln"') && dib.includes('class="fl"'), "color debajo y línea temblorosa arriba, como los demás");
});

test("al soltar el dedo el trazo se simplifica: una recta queda en dos puntos y una vuelta en pocos", async () => {
  const { simplificar, trazoListo, TOLERANCIA } = await import("../src/logic/iconos.js");
  const recta = [];
  for (let i = 0; i <= 80; i++) sumarPunto(recta, i * 0.5, 18 + (i % 2) * 0.05);
  assert.deepEqual(simplificar(recta), [0, 18, 40, 18.1].slice(0, 2).concat(recta.slice(-2)));
  const vuelta = [];
  for (let i = 0; i <= 400; i++) sumarPunto(vuelta, 20 + 12 * Math.cos(i / 400 * 2 * Math.PI), 18 + 12 * Math.sin(i / 400 * 2 * Math.PI));
  const s = simplificar(vuelta);
  assert.ok(s.length / 2 < 40, "una vuelta: " + s.length / 2 + " puntos");
  // Ningún punto que se sacó queda lejos del camino que quedó.
  const lejos = (x, y) => { let m = Infinity; for (let i = 0; i + 3 < s.length; i += 2) { const [ax, ay, bx, by] = s.slice(i, i + 4), dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return m; };
  for (let i = 0; i < vuelta.length; i += 2) assert.ok(lejos(vuelta[i], vuelta[i + 1]) <= TOLERANCIA + 1e-9);
  assert.deepEqual(simplificar([5, 5]), [5, 5], "un toque queda");
  // Un garabato larguísimo entra en el tope de un trazo.
  const garabato = [];
  for (let i = 0; i < 3000; i++) garabato.push((i * 7.3) % 40, (i * 3.1) % 36);
  assert.ok(trazoListo(garabato).length <= MAX_POR_TRAZO * 2);
  // Muchas rectas simplificadas entran todas: el tope de trazos llega antes que el de puntos.
  let d = { c: 0, t: [] };
  for (let k = 0; k < 40; k++) { const t = []; for (let i = 0; i <= 80; i++) sumarPunto(t, i * 0.5, k * 0.9); d = conTrazo(d, trazoListo(t)); }
  assert.equal(d.t.length, MAX_TRAZOS);
});

test("lo que se ve después de soltar es lo que se dibujó: esquinas, vueltas atrás y ganchos no se pierden", async () => {
  const { trazoListo, TOLERANCIA } = await import("../src/logic/iconos.js");
  // Un trazo que pasa por estos vértices, con puntos cada 0,5 (como el dedo o el mouse).
  const trazo = (...v) => { const t = []; for (let i = 0; i + 3 < v.length; i += 2) { const [ax, ay, bx, by] = v.slice(i, i + 4), n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5); for (let k = 0; k <= n; k++) sumarPunto(t, ax + (bx - ax) * k / n, ay + (by - ay) * k / n); } return t; };
  // Los puntos del camino que se dibuja de verdad (caminoDe), y la distancia de un punto a ese camino.
  const puntos = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);
  const lejos = (s, x, y) => { let m = Infinity; for (let i = 0; i + 3 < s.length; i += 2) { const [ax, ay, bx, by] = s.slice(i, i + 4), dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0; m = Math.min(m, Math.hypot(x - ax - t * dx, y - ay - t * dy)); } return m; };
  const formas = { V: [5, 5, 20, 30, 35, 5], N: [5, 30, 5, 5, 35, 30, 35, 5], cuadrado: [8, 6, 32, 6, 32, 30, 8, 30, 8, 6],
    zigzag: [3, 25, 10, 8, 17, 25, 24, 8, 31, 25, 38, 8], vueltaAtras: [5, 18, 35, 18, 15, 18], gancho: [5, 18, 35, 18, 32.5, 18] };
  for (const [nombre, v] of Object.entries(formas)) {
    const crudo = trazo(...v), s = puntos(caminoDe(trazoListo(crudo)));
    let peor = 0;
    for (let i = 0; i < crudo.length; i += 2) peor = Math.max(peor, lejos(s, crudo[i], crudo[i + 1]));
    assert.ok(peor <= TOLERANCIA + 1e-9, `${nombre}: un punto dibujado quedó a ${peor.toFixed(2)} de lo que se ve`);
    assert.ok(s.length < crudo.length / 3, `${nombre}: y quedó más liviano (${s.length / 2} de ${crudo.length / 2} puntos)`);
  }
});
