// Dibujos que no están en la muestra de diseño: categorías nuevas y las monedas de «Mis platas».
// Mismo trazo que src/art/art.js (que se genera solo y no se edita): relleno plano y línea temblorosa. Este archivo sí se edita a mano.
import { Art } from "./art.js";

const L = (inner) => '<g class="ln" filter="url(#wob)" fill="none" stroke="#F8E9D2" stroke-linecap="round" stroke-linejoin="round">' + inner + "</g>";
const F = (inner) => '<g class="fl">' + inner + "</g>";
const icono = (fill, line) => `<svg viewBox="0 0 40 36" aria-hidden="true">${F(fill)}${L(line)}</svg>`;

const HOJAS = "M20 10C16 4 10 5 8 8c4 0 8 1 12 2zM20 10c3-6 9-6 12-3-4 0-8 1-12 3z";
const PAN = "M5 25Q5 10 20 10Q35 10 35 25Q35 30 30 30H10Q5 30 5 25Z";
const CAJA = "M6 16H34V30Q34 32 32 32H8Q6 32 6 30Z";
const HUELLA = "M20 19c-5 0-8 4-8 8 0 3 2.5 4 4.5 4 1.5 0 2.2-.6 3.5-.6s2 .6 3.5.6c2 0 4.5-1 4.5-4 0-4-3-8-8-8z";
const RESPALDO = "M10 18V13Q10 9 14 9H26Q30 9 30 13V18Z";
const PLASTICO = '<rect x="5" y="8" width="30" height="21" rx="3.5"';
const VALIJA = "M7 14Q7 12 9 12H31Q33 12 33 14V29Q33 31 31 31H9Q7 31 7 29Z";
const CATEGORIAS = {
  viajes: icono(`<path d="${VALIJA}" fill="#2FA4A0"/><rect x="12" y="12" width="3.5" height="19" fill="#F2C94C"/><rect x="24.5" y="12" width="3.5" height="19" fill="#F2C94C"/>`, `<path d="${VALIJA}" stroke-width="2.4"/><path d="M15 12V8.5Q15 7 16.5 7H23.5Q25 7 25 8.5V12" stroke-width="2.4"/><path d="M13.7 12V31M26.3 12V31" stroke-width="2"/><path d="M11 31v2M29 31v2" stroke-width="2.4"/>`),
  tarjeta: icono(`${PLASTICO} fill="#8E6BD8"/><rect x="5" y="13" width="30" height="5" fill="#2A1608" opacity=".6"/><rect x="9" y="21.5" width="8" height="4" rx="1" fill="#F2C94C"/>`, `${PLASTICO} stroke-width="2.4"/><path d="M5 13H35M5 18H35" stroke-width="2"/><path d="M22 24H30" stroke-width="2"/>`),
  trabajo: icono(`<path d="${CAJA}" fill="#D9603B"/><rect x="6" y="16" width="28" height="6" fill="#F2A65A"/><rect x="17" y="19" width="6" height="6" rx="1" fill="#F4E6C8"/>`, `<path d="${CAJA}" stroke-width="2.4"/><path d="M14 16V11Q14 9 16 9H24Q26 9 26 11V16" stroke-width="2.4"/><path d="M6 22H17M23 22H34" stroke-width="2"/><rect x="17" y="19" width="6" height="6" rx="1" stroke-width="2"/>`),
  mascotas: icono(`<path d="${HUELLA}" fill="#B9794A"/><ellipse cx="9.5" cy="17" rx="3" ry="4" fill="#B9794A"/><ellipse cx="16" cy="10.5" rx="3" ry="4" fill="#B9794A"/><ellipse cx="24" cy="10.5" rx="3" ry="4" fill="#B9794A"/><ellipse cx="30.5" cy="17" rx="3" ry="4" fill="#B9794A"/>`, `<path d="${HUELLA}" stroke-width="2.4"/><ellipse cx="9.5" cy="17" rx="3" ry="4" stroke-width="2"/><ellipse cx="16" cy="10.5" rx="3" ry="4" stroke-width="2"/><ellipse cx="24" cy="10.5" rx="3" ry="4" stroke-width="2"/><ellipse cx="30.5" cy="17" rx="3" ry="4" stroke-width="2"/>`),
  casa: icono(`<path d="${RESPALDO}" fill="#4F8FCB"/><rect x="5" y="17" width="30" height="11" rx="4" fill="#7FB3E6"/>`, `<path d="${RESPALDO}" stroke-width="2.4"/><rect x="5" y="17" width="30" height="11" rx="4" stroke-width="2.4"/><path d="M10 28v4M30 28v4M20 10v7" stroke-width="2"/>`),
  verduleria: icono(`<circle cx="20" cy="22" r="12" fill="#E5483A"/><path d="${HOJAS}" fill="#8DBB6A"/>`, `<circle cx="20" cy="22" r="12" stroke-width="2.4"/><path d="${HOJAS}" stroke-width="2"/>`),
  panaderia: icono(`<path d="${PAN}" fill="#E39A35"/><path d="M12 15q3-3 7-3" stroke="#F4E6C8" stroke-width="3" fill="none" opacity=".55" stroke-linecap="round"/>`, `<path d="${PAN}" stroke-width="2.4"/><path d="M13 14l-2 7M20 13v8M27 14l2 7" stroke-width="2"/>`),
};
const catOriginal = Art.catIcon;
Art.catIcon = (id) => CATEGORIAS[id] || catOriginal(id);

// El color de cada plata, igual que su puntito en Inicio (estilos: .pd-0 a .pd-5).
export const COLORES_PLATA = ["#3FA66B", "#20A8A0", "#3A7BD5", "#8E6BD8", "#E5603A", "#D63F8C"];
const moneda = (cx, cy, r, color, letra) => ({
  f: `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="#F8E9D2" stroke-width="1.8" opacity=".55"/>` +
    (letra ? `<text x="${cx}" y="${cy + r * 0.32}" text-anchor="middle" font-family="Bricolage Grotesque,sans-serif" font-weight="800" font-size="${r * (letra.length > 1 ? 0.72 : 0.95)}" fill="#2A1608">${letra}</text>` : ""),
  l: `<circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="2.4"/>`,
});
function monedas(lista) {
  const ms = lista.map(([cx, cy, r, color, letra]) => moneda(cx, cy, r, color, letra));
  return `<svg class="lf" viewBox="0 0 108 66" aria-hidden="true">${ms.map((m) => F(m.f) + L(m.l)).join("")}</svg>`;
}
// Tres monedas del color de esa plata. letra: lo que se lee en la de adelante («US$», «₮»…).
Art.platas = (color, letra) => monedas([[30, 40, 20, color, ""], [78, 40, 20, color, ""], [54, 33, 27, color, letra]]);
// Todo junto: una moneda de cada color.
Art.platasTodo = () => monedas([[30, 40, 20, "#5BB5E6", "$"], [78, 40, 20, COLORES_PLATA[1], "₮"], [54, 33, 27, COLORES_PLATA[0], "US$"]]);
