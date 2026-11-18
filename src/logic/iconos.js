// El ícono que la persona eligió para una categoría: uno de la lista (art/extra.js) o un dibujo suyo.
//   categoría: { ..., icono?: <id de la lista>, dibujo?: { c, t } }
//   dibujo.t: los trazos, cada uno [x, y, x, y, …] en el mismo espacio que los demás íconos (40 de ancho por 36 de alto, con un decimal).
//   dibujo.c: el color del trazo (índice de COLORES_DIBUJO).
// El dibujo viaja con las categorías a los otros dispositivos, a las copias y en el link de «Usar en otro dispositivo», y termina
// dentro de la pantalla: por eso son solo números, se limpian cada vez que se leen (limpiarDibujo) y el camino se arma acá (caminoDe).
// Nunca se guarda ni se pega texto para dibujar.

export const ANCHO = 40, ALTO = 36;
// Topes: las categorías viajan enteras en cada sincronización, así que un dibujo no puede ser enorme (unos 10 KB como mucho).
export const MAX_TRAZOS = 40, MAX_PUNTOS = 900, MAX_POR_TRAZO = 300;
// Entre dos puntos seguidos de un trazo, al menos esto (lo más chico no se nota en un ícono de 34 píxeles).
export const PASO_MINIMO = 0.5;
// Mientras se dibuja se juntan hasta MAX_CRUDO puntos; al soltar el dedo el trazo se simplifica (trazoListo) y recién ahí cuentan los topes.
export const MAX_CRUDO = 2000, TOLERANCIA = 0.15;
// El trazo de color va siempre debajo de la línea oscura, como en los demás íconos: sin color, la línea sola no se vería sobre
// los botones oscuros. Son colores de la paleta de los dibujos de la app.
export const COLORES_DIBUJO = ["#E39A35", "#E5483A", "#F2D45C", "#79A874", "#4F8FCB", "#8E6BD8", "#D63F8C"];
export const NOMBRES_COLOR = ["Naranja", "Rojo", "Amarillo", "Verde", "Azul", "Violeta", "Rosa"];
// El grosor del trazo de color y de la línea, en el espacio del ícono (iguales en el lienzo y en el ícono chico).
export const ANCHO_COLOR = 6, ANCHO_LINEA = 2.4;

const redondear = (n) => Math.round(n * 10) / 10 + 0; // + 0: sin «-0»
const entre = (n, max) => Math.min(max, Math.max(0, n));

// Un dibujo como se puede guardar y mostrar, o null si no hay nada que dibujar. Lo que no sea un número va afuera.
export function limpiarDibujo(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.t)) return null;
  const c = Number.isInteger(d.c) && d.c >= 0 && d.c < COLORES_DIBUJO.length ? d.c : 0;
  const t = [];
  let total = 0;
  for (const tr of d.t.slice(0, MAX_TRAZOS)) {
    if (!Array.isArray(tr)) continue;
    const p = [];
    for (let i = 0; i + 1 < tr.length && p.length < MAX_POR_TRAZO * 2 && total < MAX_PUNTOS; i += 2) {
      const x = tr[i], y = tr[i + 1];
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) continue;
      p.push(redondear(entre(x, ANCHO)), redondear(entre(y, ALTO)));
      total++;
    }
    if (p.length) t.push(p);
  }
  return t.length ? { c, t } : null;
}

// El camino SVG de un trazo: rectas de punto a punto. Así lo que se ve es justo lo que se guardó (simplificar asegura que ningún
// punto que sacó quede a más de TOLERANCIA de este camino) y no salta al soltar el dedo; con los puntos tan juntos, igual se ve
// suave, y la línea tiembla como en los demás íconos. Recibe números ya limpios.
export function caminoDe(p) {
  const n = (v) => String(redondear(v));
  if (p.length < 4) return `M${n(p[0])} ${n(p[1])}h.01`; // un toque: un puntito
  let d = `M${n(p[0])} ${n(p[1])}`;
  for (let i = 2; i + 1 < p.length; i += 2) d += `L${n(p[i])} ${n(p[i + 1])}`;
  return d;
}

// Suma un punto a un trazo que se está dibujando, si está lo bastante lejos del anterior. Devuelve si lo sumó.
export function sumarPunto(trazo, x, y) {
  const px = redondear(entre(x, ANCHO)), py = redondear(entre(y, ALTO)), n = trazo.length;
  if (n >= MAX_CRUDO * 2) return false;
  if (n >= 2 && Math.hypot(px - trazo[n - 2], py - trazo[n - 1]) < PASO_MINIMO) return false;
  trazo.push(px, py);
  return true;
}

// Saca los puntos que no cambian la forma del trazo (Ramer-Douglas-Peucker): los que quedan a menos de tol del camino que queda.
// La distancia es al segmento (no a la recta entera): así no se pierde una línea que vuelve sobre sí misma.
// Una línea recta queda en dos puntos y una vuelta entera en unos veinte: así entran muchos trazos en los topes.
export function simplificar(p, tol = TOLERANCIA) {
  const n = p.length >> 1;
  if (n <= 2) return p.slice(0, n * 2);
  const queda = new Uint8Array(n), pila = [[0, n - 1]];
  queda[0] = queda[n - 1] = 1;
  while (pila.length) {
    const [a, b] = pila.pop(), ax = p[2 * a], ay = p[2 * a + 1], bx = p[2 * b], by = p[2 * b + 1];
    const dx = bx - ax, dy = by - ay, largo = Math.hypot(dx, dy);
    let lejos = -1, cual = -1;
    for (let i = a + 1; i < b; i++) {
      const x = p[2 * i], y = p[2 * i + 1];
      const t = largo ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (largo * largo))) : 0;
      const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
      if (d > lejos) { lejos = d; cual = i; }
    }
    if (lejos > tol) { queda[cual] = 1; pila.push([a, cual], [cual, b]); }
  }
  const r = [];
  for (let i = 0; i < n; i++) if (queda[i]) r.push(p[2 * i], p[2 * i + 1]);
  return r;
}
// El trazo como se guarda: simplificado; si igual es muy largo, más simplificado, y como último recurso, cortado.
export function trazoListo(p) {
  let tol = TOLERANCIA, t = simplificar(p, tol);
  while (t.length > MAX_POR_TRAZO * 2 && tol < 2) { tol *= 2; t = simplificar(p, tol); }
  return t.slice(0, MAX_POR_TRAZO * 2);
}

// Cuántos puntos tiene un dibujo (para el tope).
export const puntosDe = (t) => t.reduce((a, tr) => a + tr.length / 2, 0);
// El dibujo con un trazo más, recortado para que entre en los topes. Si ya no entra nada, queda igual.
export function conTrazo(d, trazo) {
  const t = d?.t || [], libres = Math.min(MAX_PUNTOS - puntosDe(t), MAX_POR_TRAZO);
  if (t.length >= MAX_TRAZOS || libres <= 0 || trazo.length < 2) return { c: d?.c || 0, t };
  return limpiarDibujo({ c: d?.c || 0, t: [...t, trazo.slice(0, libres * 2)] });
}
