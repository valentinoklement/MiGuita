// Dibujos que no están en la muestra de diseño: categorías nuevas y las monedas de «Mis platas».
// Mismo trazo que src/art/art.js (que se genera solo y no se edita): relleno plano y línea temblorosa. Este archivo sí se edita a mano.
import { Art } from "./art.js";
import { limpiarDibujo, caminoDe, COLORES_DIBUJO, ANCHO, ALTO, ANCHO_COLOR, ANCHO_LINEA } from "../logic/iconos.js";

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
// Solo ids propios de la lista: un id como «constructor» no puede traer otra cosa que un ícono.
const deLista = (obj, id) => (typeof id === "string" && Object.hasOwn(obj, id) ? obj[id] : null);
Art.catIcon = (id) => {
  const propio = deLista(CATEGORIAS, id), viejo = propio || catOriginal(id);
  return typeof viejo === "string" ? viejo : catOriginal("otros");
};

/* ---------- íconos para elegir (pedido del usuario, 2026-11-17) ---------- */
// Dibujos nuevos, que ninguna categoría usa de entrada: para las categorías que arma cada uno.
const ESTRELLA = "M20 3.5L23.8 13.2L34.3 13.9L26.2 20.5L28.8 30.6L20 25L11.2 30.6L13.8 20.5L5.7 13.9L16.2 13.2Z";
const NUEVOS = {
  cafe: icono(`<path d="M8 13H28V24Q28 31 21 31H15Q8 31 8 24Z" fill="#E39A35"/><rect x="9.2" y="13" width="17.6" height="3" fill="#7A4A2A"/>`,
    `<path d="M8 13H28V24Q28 31 21 31H15Q8 31 8 24Z" stroke-width="2.4"/><path d="M28 16H31Q35 16 35 20Q35 24 31 24H28" stroke-width="2.2"/><path d="M14 9Q12 6.5 14 4M20 9Q18 6.5 20 4" stroke-width="1.8"/><path d="M4 33.5H32" stroke-width="2.4"/>`),
  mate: icono(`<path d="M11 14Q7 20 9.5 26Q12 33 19 33Q26 33 28.5 26Q31 20 27 14Z" fill="#B9794A"/><ellipse cx="19" cy="13" rx="8.5" ry="2.6" fill="#79A874"/><path d="M21 12L28 2.5" stroke="#C9C2B6" stroke-width="3.2" stroke-linecap="round"/>`,
    `<path d="M11 14Q7 20 9.5 26Q12 33 19 33Q26 33 28.5 26Q31 20 27 14" stroke-width="2.4"/><ellipse cx="19" cy="13" rx="8.5" ry="2.6" stroke-width="2.2"/><path d="M21 12L28 2.5" stroke-width="2"/><path d="M12 22Q19 25 26 22" stroke-width="1.6" opacity=".6"/>`),
  bebe: icono(`<path d="M17 9Q17 3 20 3Q23 3 23 9Z" fill="#F2A65A"/><rect x="13.5" y="9" width="13" height="4.5" rx="1.5" fill="#7FB3E6"/><rect x="12.5" y="13.5" width="15" height="19" rx="3.5" fill="#F4E6C8"/><rect x="12.5" y="22" width="15" height="10.5" rx="3" fill="#F7D9A0"/>`,
    `<path d="M17 9Q17 3 20 3Q23 3 23 9" stroke-width="2"/><rect x="13.5" y="9" width="13" height="4.5" rx="1.5" stroke-width="2.2"/><rect x="12.5" y="13.5" width="15" height="19" rx="3.5" stroke-width="2.4"/><path d="M12.5 18H17M12.5 22H19M12.5 26H17" stroke-width="1.6"/>`),
  planta: icono(`<path d="M12 22H28L26 33H14Z" fill="#D9603B"/><rect x="10" y="19" width="20" height="4" rx="1" fill="#F2A65A"/><path d="M20 19Q18 9 10 7Q10 16 20 19ZM20 19Q22 7 31 5Q31 15 20 19Z" fill="#79A874"/>`,
    `<path d="M12 23L14 33H26L28 23" stroke-width="2.4"/><rect x="10" y="19" width="20" height="4" rx="1" stroke-width="2.2"/><path d="M20 19Q18 9 10 7Q10 16 20 19ZM20 19Q22 7 31 5Q31 15 20 19Z" stroke-width="2"/><path d="M20 19Q19.5 14 16.5 11M20 19Q22 13 26 10" stroke-width="1.4" opacity=".6"/>`),
  celu: icono(`<rect x="12" y="3" width="16" height="30" rx="3.5" fill="#3A2A22"/><rect x="14.5" y="7" width="11" height="20" rx="1" fill="#7FB3E6"/><path d="M16.5 11H23.5M16.5 15H21.5" stroke="#F4E6C8" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>`,
    `<rect x="12" y="3" width="16" height="30" rx="3.5" stroke-width="2.4"/><rect x="14.5" y="7" width="11" height="20" rx="1" stroke-width="1.6"/><path d="M18.5 30H21.5" stroke-width="2"/>`),
  juegos: icono(`<path d="M10 11H30Q37 11 37 20Q37 30 31 30Q28 30 26 26H14Q12 30 9 30Q3 30 3 20Q3 11 10 11Z" fill="#8E6BD8"/><circle cx="27" cy="18" r="2.2" fill="#E5483A"/><circle cx="31" cy="22" r="2.2" fill="#F2D45C"/>`,
    `<path d="M10 11H30Q37 11 37 20Q37 30 31 30Q28 30 26 26H14Q12 30 9 30Q3 30 3 20Q3 11 10 11Z" stroke-width="2.4"/><path d="M11 16.5V23.5M7.5 20H14.5" stroke-width="2.4"/><circle cx="27" cy="18" r="2.2" stroke-width="1.6"/><circle cx="31" cy="22" r="2.2" stroke-width="1.6"/>`),
  libros: icono(`<path d="M20 9Q13 5 4 7V29Q13 27 20 31Z" fill="#F4E6C8"/><path d="M20 9Q27 5 36 7V29Q27 27 20 31Z" fill="#F7D9A0"/>`,
    `<path d="M20 9Q13 5 4 7V29Q13 27 20 31Q27 27 36 29V7Q27 5 20 9V31" stroke-width="2.4"/><path d="M8 13Q12 12 16 13.5M8 18Q12 17 16 18.5M8 23Q12 22 16 23.5M24 13.5Q28 12 32 13M24 18.5Q28 17 32 18" stroke-width="1.5" opacity=".6"/>`),
  pelota: icono(`<circle cx="20" cy="18" r="14" fill="#F4E6C8"/><path d="M20 12L25.7 16.1L23.5 22.9H16.5L14.3 16.1Z" fill="#3A2A22"/>`,
    `<circle cx="20" cy="18" r="14" stroke-width="2.4"/><path d="M20 12L25.7 16.1L23.5 22.9H16.5L14.3 16.1Z" stroke-width="1.8"/><path d="M20 12V4.5M25.7 16.1L33 13.5M23.5 22.9L28 29.5M16.5 22.9L12 29.5M14.3 16.1L7 13.5" stroke-width="1.8"/>`),
  peluqueria: icono(`<path d="M15.5 22.5L28 4M24.5 22.5L12 4" stroke="#C9C2B6" stroke-width="4.5" stroke-linecap="round"/><circle cx="12" cy="27" r="5" fill="#E5483A"/><circle cx="28" cy="27" r="5" fill="#E5483A"/>`,
    `<path d="M15.5 22.5L28 4M24.5 22.5L12 4" stroke-width="2.2"/><circle cx="12" cy="27" r="5" stroke-width="2.4"/><circle cx="28" cy="27" r="5" stroke-width="2.4"/><circle cx="20" cy="15.5" r=".8" stroke-width="1.6"/>`),
  vino: icono(`<path d="M12.5 4H27.5Q28.5 17 20 18.5Q11.5 17 12.5 4Z" fill="#F4E6C8" opacity=".55"/><path d="M12.8 9H27.2Q27.5 17 20 18.5Q12.5 17 12.8 9Z" fill="#B23A5A"/>`,
    `<path d="M12.5 4H27.5Q28.5 17 20 18.5Q11.5 17 12.5 4Z" stroke-width="2.4"/><path d="M20 18.5V30.5M13 31.5H27" stroke-width="2.4"/><path d="M13 9H27" stroke-width="1.6" opacity=".6"/>`),
  chancho: icono(`<circle cx="20" cy="5" r="3.5" fill="#F2D45C"/><ellipse cx="19" cy="20" rx="13" ry="9.5" fill="#F29BAA"/><path d="M11 13L12 7L17 11Z" fill="#F29BAA"/><ellipse cx="32.5" cy="20" rx="3" ry="3.6" fill="#E77A8E"/><rect x="11" y="27" width="4" height="5" fill="#F29BAA"/><rect x="22" y="27" width="4" height="5" fill="#F29BAA"/>`,
    `<ellipse cx="19" cy="20" rx="13" ry="9.5" stroke-width="2.4"/><path d="M11 13L12 7L17 11" stroke-width="2"/><ellipse cx="32.5" cy="20" rx="3" ry="3.6" stroke-width="2"/><path d="M11 28.5V32H15V29.3M22 29.3V32H26V28.5" stroke-width="2"/><path d="M16 11.5H23" stroke-width="2.4"/><circle cx="20" cy="5" r="3.5" stroke-width="1.8"/><path d="M6.2 18Q2.5 17.5 3.5 14.5" stroke-width="1.8"/><circle cx="25" cy="17" r=".6" stroke-width="2"/>`),
  nafta: icono(`<rect x="7" y="5" width="16" height="27" rx="2" fill="#E5483A"/><rect x="10" y="8.5" width="10" height="7" rx="1" fill="#F7D9A0"/>`,
    `<rect x="7" y="5" width="16" height="27" rx="2" stroke-width="2.4"/><rect x="10" y="8.5" width="10" height="7" rx="1" stroke-width="1.8"/><path d="M23 13H26.5Q29.5 13 29.5 16V26Q29.5 29 32 29Q34.5 29 34.5 26V13L31.5 9.5" stroke-width="2.2"/><path d="M4.5 32.5H25.5" stroke-width="2.4"/>`),
  bici: icono(`<circle cx="10" cy="24" r="6.5" fill="#F7D9A0"/><circle cx="30" cy="24" r="6.5" fill="#F7D9A0"/><path d="M10 24L16 13H27L30 24M16 13L20 24H10M20 24L27 13" stroke="#2FA4A0" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`,
    `<circle cx="10" cy="24" r="6.5" stroke-width="2.4"/><circle cx="30" cy="24" r="6.5" stroke-width="2.4"/><path d="M10 24L16 13H27L30 24M16 13L20 24H10M20 24L27 13" stroke-width="1.8"/><path d="M13 10H19M16 10V13M27 13L26 9H30" stroke-width="2.2"/>`),
  pizza: icono(`<path d="M6 8Q20 1 34 8L20 33Z" fill="#F2D45C"/><path d="M6 8Q20 1 34 8L32.3 11.5Q20 5 7.7 11.5Z" fill="#E39A35"/><circle cx="16" cy="15" r="2.6" fill="#E5483A"/><circle cx="24" cy="17" r="2.4" fill="#E5483A"/><circle cx="20" cy="24" r="2.2" fill="#E5483A"/>`,
    `<path d="M6 8Q20 1 34 8L20 33Z" stroke-width="2.4"/><path d="M7.7 11.5Q20 5 32.3 11.5" stroke-width="1.8"/><circle cx="16" cy="15" r="2.6" stroke-width="1.6"/><circle cx="24" cy="17" r="2.4" stroke-width="1.6"/><circle cx="20" cy="24" r="2.2" stroke-width="1.6"/>`),
  musica: icono(`<ellipse cx="11" cy="28" rx="4.8" ry="3.6" fill="#8E6BD8"/><ellipse cx="29" cy="25" rx="4.8" ry="3.6" fill="#8E6BD8"/><path d="M15.5 8L33.5 5V9.5L15.5 12.5Z" fill="#8E6BD8"/>`,
    `<ellipse cx="11" cy="28" rx="4.8" ry="3.6" stroke-width="2.2"/><ellipse cx="29" cy="25" rx="4.8" ry="3.6" stroke-width="2.2"/><path d="M15.5 27V8L33.5 5V24" stroke-width="2.4"/><path d="M15.5 12.5L33.5 9.5" stroke-width="2"/>`),
  remedio: icono(`<g transform="rotate(-35 18 17)"><path d="M6 17A6 6 0 0 1 12 11H18V23H12A6 6 0 0 1 6 17Z" fill="#E5483A"/><path d="M18 11H24A6 6 0 0 1 24 23H18Z" fill="#F4E6C8"/></g><circle cx="31" cy="28" r="4" fill="#7FB3E6"/>`,
    `<g transform="rotate(-35 18 17)"><path d="M12 11H24A6 6 0 0 1 24 23H12A6 6 0 0 1 12 11Z" stroke-width="2.4"/><path d="M18 11V23" stroke-width="2"/></g><circle cx="31" cy="28" r="4" stroke-width="2"/><path d="M28.5 30.5L33.5 25.5" stroke-width="1.6"/>`),
  estrella: icono(`<path d="${ESTRELLA}" fill="#F2D45C"/>`, `<path d="${ESTRELLA}" stroke-width="2.4"/><path d="M15 16.5Q17 15.5 18.5 16" stroke-width="1.5" opacity=".6"/>`),
  impuestos: icono(`<path d="M9 3H25L32 10V33H9Z" fill="#F4E6C8"/><path d="M25 3V10H32Z" fill="#D9C7A4"/><circle cx="16" cy="17" r="2.6" fill="#E5483A"/><circle cx="25" cy="26" r="2.6" fill="#E5483A"/>`,
    `<path d="M9 3H25L32 10V33H9Z" stroke-width="2.4"/><path d="M25 3V10H32" stroke-width="2"/><circle cx="16" cy="17" r="2.6" stroke-width="1.8"/><circle cx="25" cy="26" r="2.6" stroke-width="1.8"/><path d="M26.5 14.5L14.5 28.5" stroke-width="2.2"/>`),
  luz: icono(`<path d="M20 3Q30 3 30 13Q30 18 25 22V26H15V22Q10 18 10 13Q10 3 20 3Z" fill="#F2D45C"/><path d="M15 26H25V29Q25 31 23 31H17Q15 31 15 29Z" fill="#B9B3A8"/>`,
    `<path d="M20 3Q30 3 30 13Q30 18 25 22V26H15V22Q10 18 10 13Q10 3 20 3Z" stroke-width="2.4"/><path d="M15 26H25V29Q25 31 23 31H17Q15 31 15 29ZM15 28.5H25" stroke-width="2"/><path d="M17 19L20 14L23 19" stroke-width="1.8"/><path d="M18 33.5H22" stroke-width="2.2"/>`),
  golosinas: icono(`<ellipse cx="20" cy="18" rx="9" ry="7" fill="#D63F8C"/><path d="M11.5 18L4 12V24ZM28.5 18L36 12V24Z" fill="#F29BAA"/>`,
    `<ellipse cx="20" cy="18" rx="9" ry="7" stroke-width="2.4"/><path d="M11.5 18L4 12V24ZM28.5 18L36 12V24Z" stroke-width="2.2"/><path d="M16 12.5Q19 18 16 23.5M22 12.5Q25 18 22 23.5" stroke-width="1.5" opacity=".6"/>`),
  llave: icono(`<circle cx="12" cy="18" r="7" fill="#F2D45C"/><rect x="18" y="16" width="17" height="4" fill="#F2D45C"/><path d="M28.5 20H31.5V25H28.5ZM24 20H27V23H24Z" fill="#F2D45C"/>`,
    `<circle cx="12" cy="18" r="7" stroke-width="2.4"/><circle cx="12" cy="18" r="2.4" stroke-width="1.8"/><path d="M19 16H35V20H19M28.5 20V25H31.5V20M24 20V23H27V20" stroke-width="2"/>`),
};
// La lista que se ofrece al elegir: primero los de las categorías que vienen con la app (con el id de esa categoría), después otros
// dibujos de la app y al final los nuevos. El nombre dice qué se ve, no la categoría (la persona puede haberla renombrado).
const LISTA = [
  ["super", "Changuito"], ["carne", "Carne"], ["verduleria", "Tomate"], ["panaderia", "Pan"], ["comida", "Hamburguesa"], ["auto", "Auto"],
  ["transporte", "Colectivo"], ["gym", "Pesas"], ["subs", "Series"], ["hobbies", "Guitarra"], ["salidas", "Birra"], ["viajes", "Valija"],
  ["ropa", "Remera"], ["salud", "Corazón"], ["regalos", "Regalo"], ["servicios", "Casa"], ["deudas", "Deuda"], ["tarjeta", "Tarjeta"],
  ["edu", "Estudio"], ["trabajo", "Maletín"], ["mascotas", "Huella"], ["casa", "Sillón"], ["otros", "Otros"],
  ["extra", "Changas"], ["sueldo", "Sueldo"], ["regalo_in", "Sobre"], ["otros_in", "Plata"],
].map(([id, nombre]) => ({ id, nombre, svg: Art.catIcon(id) }))
  .concat([["avion", "Avión", "viaje"], ["meta", "Diana", "meta"], ["salvavidas", "Salvavidas", "emergencia"], ["compu", "Compu", "compu"]]
    .map(([id, nombre, meta]) => ({ id, nombre, svg: Art.metaIcon(meta) })))
  .concat([["cafe", "Café"], ["mate", "Mate"], ["bebe", "Bebé"], ["planta", "Planta"], ["celu", "Celular"], ["juegos", "Juegos"], ["libros", "Libros"],
    ["pelota", "Pelota"], ["peluqueria", "Tijera"], ["vino", "Vino"], ["chancho", "Alcancía"], ["nafta", "Nafta"], ["bici", "Bici"], ["pizza", "Pizza"],
    ["musica", "Música"], ["remedio", "Remedios"], ["estrella", "Estrella"], ["impuestos", "Impuestos"], ["luz", "Luz"], ["golosinas", "Golosinas"], ["llave", "Llave"]]
    .map(([id, nombre]) => ({ id, nombre, svg: NUEVOS[id] })));
const POR_ID = new Map(LISTA.map((x) => [x.id, x]));
// Para la pantalla de elegir: id y nombre de cada uno, en orden.
Art.ICONOS_CAT = LISTA.map(({ id, nombre }) => ({ id, nombre }));
Art.iconoDeLista = (id) => POR_ID.get(id)?.svg || null;

// Un dibujo de la persona, con el mismo trazo que los demás: relleno de color corrido y línea temblorosa encima.
// Recibe un dibujo ya limpio (limpiarDibujo): todo lo que va adentro sale de números.
Art.dibujoPropio = (d, clase = "") => {
  const camino = d.t.map(caminoDe).join("");
  return `<svg viewBox="0 0 ${ANCHO} ${ALTO}"${clase ? ` class="${clase}"` : ""} aria-hidden="true">` +
    F(`<path d="${camino}" stroke="${COLORES_DIBUJO[d.c]}" stroke-width="${ANCHO_COLOR}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`) +
    L(`<path d="${camino}" stroke-width="${ANCHO_LINEA}"/>`) + "</svg>";
};

// Qué ícono lleva una categoría: su dibujo, el que eligió de la lista o el suyo de siempre (las nuevas, el de Otros).
// La clave sirve para saber cuáles están en uso: "dibujo" o el id de la lista.
Art.claveDeIcono = (c) => {
  if (!c) return "otros";
  if (limpiarDibujo(c.dibujo)) return "dibujo";
  if (POR_ID.has(c.icono)) return c.icono;
  return POR_ID.has(c.id) ? c.id : "otros";
};
Art.iconoDeCategoria = (c) => {
  const d = c && limpiarDibujo(c.dibujo);
  return d ? Art.dibujoPropio(d) : POR_ID.get(Art.claveDeIcono(c)).svg;
};

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
