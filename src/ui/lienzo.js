// Dibujar un ícono con el dedo (pantalla dibujoCat). Mientras dura el trazo se dibuja directo sobre el SVG, sin redibujar la
// pantalla (eso pisaría el trazo a medio hacer); al levantar el dedo se entrega el trazo y recién ahí se redibuja.
// La posición se saca como proporción del lienzo en pantalla: así anda igual con la letra Grande o Muy grande (zoom).
import { ANCHO, ALTO, ANCHO_COLOR, ANCHO_LINEA, COLORES_DIBUJO, sumarPunto, caminoDe } from "../logic/iconos.js";

const NS = "http://www.w3.org/2000/svg";
const camino = (atributos) => {
  const p = document.createElementNS(NS, "path");
  for (const [k, v] of Object.entries(atributos)) p.setAttribute(k, v);
  return p;
};

// alTerminar(trazo): el trazo nuevo, [x, y, x, y, …] en el espacio del ícono.
export function prepararLienzo(raiz, alTerminar) {
  let vivo = null; // { id, trazo, caminos: [color, línea], svg }
  const punto = (e) => {
    const r = vivo.svg.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * ANCHO, (e.clientY - r.top) / r.height * ALTO];
  };
  // El color va debajo de las líneas de los trazos anteriores y la línea, arriba de todo: igual que cuando se guarda.
  const poner = (svg) => {
    const [fondo, linea] = vivo.caminos, lineas = svg.querySelector(":scope > g.ln");
    if (lineas) svg.insertBefore(fondo, lineas); else svg.append(fondo);
    svg.append(linea);
    vivo.svg = svg;
  };
  const pintar = () => {
    // Si algo redibujó la pantalla en el medio (se fue un cartelito, llegó un cambio de otro dispositivo), el trazo vuelve al lienzo.
    if (!vivo.caminos.every((p) => p.isConnected)) {
      vivo.caminos.forEach((p) => p.remove());
      const svg = raiz.querySelector("[data-lienzo] svg");
      if (svg) poner(svg);
    }
    const d = caminoDe(vivo.trazo);
    vivo.caminos.forEach((p) => p.setAttribute("d", d));
  };

  raiz.addEventListener("pointerdown", (e) => {
    const lz = e.target.closest?.("[data-lienzo]");
    if (!lz || vivo || e.button > 0) return;
    const svg = lz.querySelector("svg");
    if (!svg) return;
    e.preventDefault();
    try { lz.setPointerCapture(e.pointerId); } catch { /* sin captura, igual sigue el dedo dentro del lienzo */ }
    const color = COLORES_DIBUJO[Number(lz.dataset.c)] || COLORES_DIBUJO[0];
    const fondo = camino({ class: "fl", stroke: color, "stroke-width": ANCHO_COLOR, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
    const linea = camino({ class: "ln", "stroke-width": ANCHO_LINEA, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" });
    vivo = { id: e.pointerId, trazo: [], caminos: [fondo, linea], svg };
    poner(svg);
    sumarPunto(vivo.trazo, ...punto(e));
    pintar();
  });

  raiz.addEventListener("pointermove", (e) => {
    if (!vivo || e.pointerId !== vivo.id) return;
    e.preventDefault();
    const juntos = e.getCoalescedEvents?.() || [];
    for (const x of juntos.length ? juntos : [e]) sumarPunto(vivo.trazo, ...punto(x));
    pintar();
  });

  const terminar = (e) => {
    if (!vivo || e.pointerId !== vivo.id) return;
    const { trazo, caminos } = vivo;
    vivo = null;
    caminos.forEach((p) => p.remove());
    if (trazo.length) alTerminar(trazo);
  };
  raiz.addEventListener("pointerup", terminar);
  raiz.addEventListener("pointercancel", terminar);
}
