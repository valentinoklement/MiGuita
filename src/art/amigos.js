// Más amigos de la panadería para los grupos (hasta 25 o más sin repetir del todo).
// Mismo trazo que src/art/art.js (que se genera desde la muestra de diseño): relleno plano, línea crema temblorosa,
// cachetes, ojitos y zapatos rojos. Este archivo sí se edita a mano.
import { Art } from "./art.js";

const CRUST = "#E39A35", RED = "#E5483A", CHEEK = "#F08A6A", DARK = "#2A1608", MEMBRILLO = "#B8431F";
const L = (inner) => '<g class="ln" filter="url(#wob)" fill="none" stroke="#F8E9D2" stroke-linecap="round" stroke-linejoin="round">' + inner + "</g>";
const F = (inner) => '<g class="fl">' + inner + "</g>";

// Ojitos y sonrisa (igual que las facturas de art.js).
function cara(x1, x2, y) {
  const mid = (x1 + x2) / 2;
  return `<g fill="${DARK}" stroke="none"><ellipse cx="${x1}" cy="${y}" rx="3.2" ry="4.3"/><ellipse cx="${x2}" cy="${y}" rx="3.2" ry="4.3"/>` +
    `<circle cx="${x1 + 1}" cy="${y - 1.6}" r="1.2" fill="#F4E6C8"/><circle cx="${x2 + 1}" cy="${y - 1.6}" r="1.2" fill="#F4E6C8"/></g>` +
    `<path d="M${mid - 5} ${y + 9}q5 4.5 10 0" stroke="${DARK}" stroke-width="2.2"/>`;
}
const cachetes = (x1, x2, y) => `<circle cx="${x1}" cy="${y}" r="4.2" fill="${CHEEK}" opacity=".85"/><circle cx="${x2}" cy="${y}" r="4.2" fill="${CHEEK}" opacity=".85"/>`;
const pies = (y = 72) => ({
  fl: `<ellipse cx="30" cy="${y}" rx="9" ry="4.5" fill="${RED}"/><ellipse cx="50" cy="${y}" rx="9" ry="4.5" fill="${RED}"/>`,
  ln: `<path d="M30 ${y - 9}V${y - 4}M50 ${y - 9}V${y - 4}" stroke-width="2.6"/><ellipse cx="30" cy="${y}" rx="9" ry="4.5" stroke-width="2.2"/><ellipse cx="50" cy="${y}" rx="9" ry="4.5" stroke-width="2.2"/>`,
});
const puntos = (lista, color, r = 1.8) => `<g fill="${color}" stroke="none">` + lista.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join("") + "</g>";

// Cada personaje: relleno, líneas, dónde va la cara y dónde está la cabeza (para el gorro, los anteojos o el moño).
const NUEVOS = [
  { nombre: "alfajor", cabeza: 18, ojos: [33, 47, 31], cach: [24, 56, 34], fl: () =>
      `<rect x="10" y="18" width="60" height="18" rx="9" fill="#F3E3C3"/><rect x="12" y="35" width="56" height="8" fill="#9A5A26"/><rect x="10" y="42" width="60" height="18" rx="9" fill="#F3E3C3"/>` + puntos([[14, 39], [22, 41], [30, 38], [50, 41], [58, 38], [66, 40]], "#FFFFFF", 1.6),
    ln: () => `<rect x="10" y="18" width="60" height="18" rx="9" stroke-width="2.6"/><rect x="10" y="42" width="60" height="18" rx="9" stroke-width="2.6"/><path d="M12 39H68" stroke-width="1.8" opacity=".6"/>` },
  { nombre: "churro", cabeza: 6, ojos: [35, 45, 26], cach: [31, 49, 34], fl: () =>
      `<rect x="28" y="6" width="24" height="58" rx="11" fill="${CRUST}"/>` + puntos([[33, 14], [46, 20], [35, 46], [47, 52], [40, 58]], "#FFF4DC", 1.4),
    ln: () => `<rect x="28" y="6" width="24" height="58" rx="11" stroke-width="2.6"/><path d="M34 10V60M40 8V62M46 10V60" stroke-width="1.6" opacity=".55"/>` },
  { nombre: "pan dulce", cabeza: 14, ojos: [33, 47, 40], cach: [24, 56, 47], fl: () =>
      `<path d="M10 60Q10 14 40 14Q70 14 70 60Z" fill="#D98B3A"/>` + puntos([[24, 28], [52, 24], [60, 40], [18, 46]], RED, 2.6) + puntos([[38, 22], [30, 34], [64, 50]], "#79A874", 2.4),
    ln: () => `<path d="M10 60Q10 14 40 14Q70 14 70 60Z" stroke-width="2.6"/><path d="M8 60H72" stroke-width="2.6"/>` },
  { nombre: "bizcochito", cabeza: 16, ojos: [33, 47, 38], cach: [25, 55, 46], fl: () =>
      `<circle cx="40" cy="40" r="24" fill="#E9B865"/>`,
    ln: () => `<circle cx="40" cy="40" r="24" stroke-width="2.6"/><path d="M24 26L30 32M50 26L56 32M24 54L30 48M50 54L56 48" stroke-width="1.8" opacity=".6"/>` },
  { nombre: "palmerita", cabeza: 14, ojos: [33, 47, 42], cach: [24, 56, 50], fl: () =>
      `<path d="M40 64C18 50 8 38 12 26C16 14 32 12 40 24C48 12 64 14 68 26C72 38 62 50 40 64Z" fill="#E7A84B"/>`,
    ln: () => `<path d="M40 64C18 50 8 38 12 26C16 14 32 12 40 24C48 12 64 14 68 26C72 38 62 50 40 64Z" stroke-width="2.6"/><path d="M40 24Q34 20 30 24Q26 30 32 32M40 24Q46 20 50 24Q54 30 48 32" stroke-width="1.8" opacity=".6"/>` },
  { nombre: "chipá", cabeza: 14, ojos: [33, 47, 38], cach: [25, 55, 46], fl: () =>
      `<circle cx="40" cy="40" r="25" fill="#F1CF7E"/>` + puntos([[28, 24], [52, 22], [60, 46], [22, 50], [44, 58]], "#C98A3D", 2.6),
    ln: () => `<circle cx="40" cy="40" r="25" stroke-width="2.6"/>` },
  { nombre: "pastafrola", cabeza: 14, ojos: [33, 47, 38], cach: [24, 56, 46], fl: () =>
      `<rect x="12" y="14" width="56" height="48" rx="6" fill="${MEMBRILLO}"/><path d="M12 22H68M12 54H68" stroke="#E9B865" stroke-width="6"/><path d="M22 14V62M58 14V62" stroke="#E9B865" stroke-width="6"/>`,
    ln: () => `<rect x="12" y="14" width="56" height="48" rx="6" stroke-width="2.6"/>` },
  { nombre: "tortita negra", cabeza: 14, ojos: [33, 47, 44], cach: [24, 56, 51], fl: () =>
      `<circle cx="40" cy="40" r="25" fill="${CRUST}"/><path d="M17 32Q22 14 40 14Q58 14 63 32Q52 26 40 30Q28 26 17 32Z" fill="#5A341A"/>`,
    ln: () => `<circle cx="40" cy="40" r="25" stroke-width="2.6"/><path d="M17 32Q28 26 40 30Q52 26 63 32" stroke-width="2"/>` },
  { nombre: "pepa", cabeza: 14, ojos: [33, 47, 44], cach: [24, 56, 51], fl: () =>
      `<circle cx="40" cy="40" r="25" fill="#F0C27B"/><circle cx="40" cy="25" r="6.5" fill="${MEMBRILLO}"/>`,
    ln: () => `<circle cx="40" cy="40" r="25" stroke-width="2.6"/><circle cx="40" cy="25" r="6.5" stroke-width="2"/>` },
  { nombre: "budín", cabeza: 18, ojos: [33, 47, 44], cach: [23, 57, 51], fl: () =>
      `<path d="M10 30Q10 22 18 22H62Q70 22 70 30V60H10Z" fill="#C98A3D"/><path d="M14 26Q40 10 66 26Q40 20 14 26Z" fill="#E9B865"/>`,
    ln: () => `<path d="M10 30Q10 22 18 22H62Q70 22 70 30V60H10Z" stroke-width="2.6"/><path d="M14 26Q40 10 66 26" stroke-width="2"/><path d="M30 22Q40 28 50 22" stroke-width="1.8" opacity=".6"/>` },
  { nombre: "torta frita", cabeza: 16, ojos: [33, 47, 40], cach: [24, 56, 48], fl: () =>
      `<path d="M14 40Q12 22 28 18Q40 12 54 18Q70 22 66 40Q70 58 52 62Q40 66 28 62Q10 58 14 40Z" fill="#E0A04A"/>` + puntos([[26, 28], [52, 26], [60, 46], [22, 52], [40, 58]], "#FFF4DC", 1.5),
    ln: () => `<path d="M14 40Q12 22 28 18Q40 12 54 18Q70 22 66 40Q70 58 52 62Q40 66 28 62Q10 58 14 40Z" stroke-width="2.6"/><circle cx="40" cy="28" r="3" stroke-width="1.8" opacity=".6"/>` },
  { nombre: "rosquita", cabeza: 14, ojos: [33, 47, 46], cach: [23, 57, 52], fl: () =>
      `<path d="M15 40a25 25 0 1 0 50 0a25 25 0 1 0 -50 0ZM33 28a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z" fill="#F2D45C" fill-rule="evenodd"/>`,
    ln: () => `<circle cx="40" cy="40" r="25" stroke-width="2.6"/><circle cx="40" cy="28" r="7" stroke-width="2.2"/><path d="M22 34q3-3 6-1M52 33q3-2 6 1" stroke-width="1.6" opacity=".6"/>` },
];

// Detalles para que no se repitan: gorro de panadero, anteojos o moño.
const EXTRAS = [
  null,
  (top) => ({ fl: `<path d="M28 ${top - 2}H52V${top - 9}Q60 ${top - 14} 56 ${top - 20}Q52 ${top - 26} 46 ${top - 22}Q40 ${top - 30} 34 ${top - 22}Q28 ${top - 26} 24 ${top - 20}Q20 ${top - 14} 28 ${top - 9}Z" fill="#FFFFFF"/>`,
    ln: `<path d="M28 ${top - 2}H52V${top - 9}Q60 ${top - 14} 56 ${top - 20}Q52 ${top - 26} 46 ${top - 22}Q40 ${top - 30} 34 ${top - 22}Q28 ${top - 26} 24 ${top - 20}Q20 ${top - 14} 28 ${top - 9}Z" stroke-width="2"/><path d="M28 ${top - 6}H52" stroke-width="1.6"/>` }),
  (top, ojos) => ({ fl: "", ln: `<circle cx="${ojos[0]}" cy="${ojos[2]}" r="6.5" stroke="${DARK}" stroke-width="2"/><circle cx="${ojos[1]}" cy="${ojos[2]}" r="6.5" stroke="${DARK}" stroke-width="2"/><path d="M${ojos[0] + 6.5} ${ojos[2]}H${ojos[1] - 6.5}" stroke="${DARK}" stroke-width="2"/>` }),
  (top) => ({ fl: `<path d="M40 ${top + 1}L30 ${top - 6}V${top + 8}ZM40 ${top + 1}L50 ${top - 6}V${top + 8}Z" fill="${RED}"/><circle cx="40" cy="${top + 1}" r="3" fill="${RED}"/>`,
    ln: `<path d="M40 ${top + 1}L30 ${top - 6}V${top + 8}ZM40 ${top + 1}L50 ${top - 6}V${top + 8}Z" stroke-width="1.8"/>` }),
];

const VIEJOS = ["canon", "bola", "fact", "luna"];
const CABEZA_VIEJOS = { canon: [22, [31, 45, 44]], bola: [13, [33, 47, 36]], fact: [10, [32, 48, 54]] };

// El amigo número i del grupo. Los primeros 16 son todos distintos; después se repiten con gorro, anteojos o moño.
export function amigo(i, cam = 0) {
  const n = Math.max(0, i), base = n % (VIEJOS.length + NUEVOS.length), extra = EXTRAS[Math.floor(n / (VIEJOS.length + NUEVOS.length)) % EXTRAS.length];
  if (base < VIEJOS.length) {
    const k = VIEJOS[base];
    let svg = Art.factura(k);
    if (!CABEZA_VIEJOS[k]) return svg;
    const e = extra && extra(CABEZA_VIEJOS[k][0], CABEZA_VIEJOS[k][1]), c = camiseta(cam, CABEZA_VIEJOS[k][1][2] + 13);
    if (!e && !c) return svg;
    svg = svg.replace(/<\/svg>$/, (c ? c : "") + (e ? F(e.fl) + L(e.ln) : "") + "</svg>");
    return e ? svg.replace('viewBox="0 0 80 8', 'viewBox="0 -24 80 10') : svg;
  }
  const p = NUEVOS[base - VIEJOS.length], pp = pies(), e = extra && extra(p.cabeza, p.ojos);
  const fl = pp.fl + p.fl() + cachetes(p.cach[0], p.cach[1], p.cach[2]) + (e ? e.fl : "");
  const ln = pp.ln + p.ln() + cara(p.ojos[0], p.ojos[1], p.ojos[2]) + (e ? e.ln : "");
  return `<svg class="fr" viewBox="${e ? "0 -24 80 104" : "0 0 80 80"}" aria-hidden="true">${F(fl)}${L(ln)}${camiseta(cam, p.ojos[2] + 13)}</svg>`;
}

/* ---------- camisetas de fútbol (solo los colores, sin escudos) ---------- */
export const CAMISETAS = ["Ninguna", "Boca", "River", "San Lorenzo", "Racing", "Independiente", "Estudiantes", "Selección"];
const AZUL = "#1B3E8C", ROJO = "#C8102E", CELESTE = "#75AADB", BLANCO = "#FFFFFF", ORO = "#F2C230";
let camN = 0;
// Camiseta chiquita debajo de la sonrisa (y = donde empieza el cuello). k: índice de CAMISETAS (0 = ninguna).
function camiseta(k, y) {
  if (!k || !CAMISETAS[k]) return "";
  const forma = `M30 ${y}L35 ${y - 1}Q40 ${y + 3} 45 ${y - 1}L50 ${y}L54 ${y + 5}L50 ${y + 8}L49 ${y + 15}H31L30 ${y + 8}L26 ${y + 5}Z`;
  const rayas = (a, b, ancho) => { let s = `<rect x="24" y="${y - 2}" width="32" height="19" fill="${a}"/>`; for (let x = 26 + ancho; x < 56; x += ancho * 2) s += `<rect x="${x}" y="${y - 2}" width="${ancho}" height="19" fill="${b}"/>`; return s; };
  const dibujo = {
    1: `<rect x="24" y="${y - 2}" width="32" height="19" fill="${AZUL}"/><rect x="24" y="${y + 5}" width="32" height="4.5" fill="${ORO}"/>`,
    2: `<rect x="24" y="${y - 2}" width="32" height="19" fill="${BLANCO}"/><path d="M29 ${y + 1}L33 ${y - 2}L52 ${y + 14}L48 ${y + 17}Z" fill="${ROJO}"/>`,
    3: rayas(AZUL, ROJO, 4),
    4: rayas(CELESTE, BLANCO, 5),
    5: `<rect x="24" y="${y - 2}" width="32" height="19" fill="${ROJO}"/><path d="M36 ${y}L40 ${y + 4}L44 ${y}" stroke="${BLANCO}" stroke-width="1.6" fill="none"/>`,
    6: rayas(ROJO, BLANCO, 4),
    7: rayas(CELESTE, BLANCO, 4) + `<circle cx="40" cy="${y + 6}" r="2.2" fill="${ORO}"/>`,
  }[k];
  const id = "cam" + (++camN);
  // Un poco más grande que el dibujo base, para que se reconozca el club aunque el personaje se vea chiquito.
  return `<g transform="translate(40 ${y}) scale(1.3) translate(-40 ${-y})"><defs><clipPath id="${id}"><path d="${forma}"/></clipPath></defs>` +
    `<g clip-path="url(#${id})">${dibujo}</g>` + L(`<path d="${forma}" stroke-width="1.6"/>`) + "</g>";
}
export const CANTIDAD_DISTINTOS = (VIEJOS.length + NUEVOS.length) * EXTRAS.length;
// Para elegir personaje: los 16 de base (el número es el que va a amigo()) y los detalles que se le pueden sumar.
export const BASES = ["Cañoncito", "Bola de fraile", "Factura", "Medialuna", ...NUEVOS.map((p) => p.nombre[0].toUpperCase() + p.nombre.slice(1))];
export const DETALLES = ["Nada", "Gorro", "Anteojos", "Moño"];
export const MIGUITA = -1; // el sanguchito también se puede elegir
