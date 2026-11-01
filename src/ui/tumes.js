// "Tu mes en MiGuita": una tarjeta linda para compartir por WhatsApp o Instagram. Se dibuja en un canvas, sin salir del celu.
import { Art } from "../art/art.js";
import { formatear } from "../logic/dinero.js";
import { esc } from "./pantallas.js";

const ANCHO = 1080, ALTO = 1350;
const CAFE = "#33211A", CREMA = "#E2C9A0", TINTA = "#2A1608", ORO = "#F4AE3D", PAPEL = "#F8E9D2";
const TITULO = '"Bricolage Grotesque", sans-serif', TEXTO = '"Manrope", sans-serif', MANO = '"Caveat Brush", "Bricolage Grotesque", sans-serif';

function caja(c, x, y, w, h, r, relleno, borde) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r);
  c.closePath();
  if (relleno) { c.fillStyle = relleno; c.fill(); }
  if (borde) { c.strokeStyle = borde; c.lineWidth = 6; c.stroke(); }
}
function renglones(c, texto, ancho) {
  const salida = []; let linea = "";
  for (const p of texto.split(" ")) {
    const prueba = linea ? linea + " " + p : p;
    if (c.measureText(prueba).width > ancho && linea) { salida.push(linea); linea = p; } else linea = prueba;
  }
  if (linea) salida.push(linea);
  return salida;
}
// Corta un texto largo para que entre en una sola línea.
function entra(c, texto, ancho) {
  if (c.measureText(texto).width <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && c.measureText(t + "…").width > ancho) t = t.slice(0, -1);
  return t + "…";
}
// Los dibujos de la app usan estilos de la página: como imagen suelta necesitan todo adentro.
function imagen(svg) {
  const suelto = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="592" ').replace(/ filter="url\(#wob\)"/g, "")
    .replace(/(<svg[^>]*>)/, `$1<style>.ln{stroke:${TINTA}}</style>`);
  return new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i); i.onerror = mal;
    i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(suelto);
  });
}

function dibujar(c, d, o, sanguche) {
  c.fillStyle = CAFE; c.fillRect(0, 0, ANCHO, ALTO);
  c.textBaseline = "alphabetic"; c.textAlign = "left";
  c.fillStyle = ORO; c.font = `800 38px ${TEXTO}`; c.fillText("TU MES EN MIGUITA", 72, 104);
  c.fillStyle = PAPEL; c.font = `800 92px ${TITULO}`; c.fillText(o.titulo, 72, 200);
  if (o.hastaHoy) { c.font = `600 34px ${TEXTO}`; c.fillText("hasta hoy", 72, 250); }

  // Lo gastado y en qué.
  const alto = (o.montos ? 288 : 108) + d.top.length * 96 + 34, y0 = 280;
  caja(c, 60, y0, ANCHO - 120, alto, 40, CREMA, TINTA);
  let y = y0 + 76;
  c.fillStyle = TINTA; c.font = `800 36px ${TEXTO}`;
  if (o.montos) {
    c.fillText("Gastaste", 104, y);
    y += 112;
    c.font = `400 124px ${MANO}`; c.lineJoin = "round"; c.lineWidth = 8; c.strokeStyle = TINTA; c.fillStyle = ORO;
    const total = entra(c, formatear(d.gastos, { moneda: "$" }), ANCHO - 208);
    c.strokeText(total, 104, y); c.fillText(total, 104, y);
    y += 74;
  } else y += 6;
  c.fillStyle = TINTA; c.font = `800 36px ${TEXTO}`; c.fillText("En lo que más se te fue", 104, y);
  y += 26;
  const max = d.top[0]?.monto || 1;
  d.top.forEach((t, i) => {
    y += 58;
    c.fillStyle = TINTA; c.font = `${i ? 700 : 800} 38px ${TEXTO}`;
    const pc = Math.round(t.parte * 100) + "%", der = o.montos ? formatear(t.monto, { moneda: "$" }).replace(/,\d\d$/, "") : pc;
    c.textAlign = "right"; c.fillText(der, ANCHO - 104, y); c.textAlign = "left";
    c.fillText(entra(c, o.nombreCat(t.id) + (o.montos ? " · " + pc : ""), ANCHO - 260 - c.measureText(der).width), 104, y);
    y += 16;
    caja(c, 104, y, ANCHO - 208, 22, 11, "rgba(42,22,8,.18)");
    caja(c, 104, y, Math.max(22, (ANCHO - 208) * t.monto / max), 22, 11, ORO);
    y += 22;
  });

  // La racha.
  let yr = y0 + alto + 28;
  const mitad = (ANCHO - 120 - 24) / 2;
  [[String(d.mejorRacha), d.mejorRacha === 1 ? "día de racha" : "días de racha"], [d.diasAnotados + " de " + d.totalDias, "días anotados"]].forEach(([n, t], i) => {
    const x = 60 + i * (mitad + 24);
    caja(c, x, yr, mitad, 150, 32, "#4A3226", PAPEL);
    c.fillStyle = ORO; c.font = `800 60px ${TITULO}`; c.fillText(n, x + 32, yr + 72);
    c.fillStyle = PAPEL; c.font = `700 32px ${TEXTO}`; c.fillText(t, x + 32, yr + 118);
  });
  yr += 150 + 28;

  // Miguita y su chiste.
  // Miguita ocupa lo que quede de lugar.
  const lado = Math.max(200, Math.min(380, (ALTO - 76 - yr) * 640 / 592)), xm = 44, altoM = lado * 592 / 640;
  if (sanguche) c.drawImage(sanguche, xm, yr, lado, altoM);
  const xg = xm + lado + 8, wg = ANCHO - xg - 60;
  c.font = `700 35px ${TEXTO}`;
  const ls = renglones(c, o.chiste, wg - 64).slice(0, 5), hg = ls.length * 46 + 44, yg = yr + Math.max(0, (altoM - hg) / 2);
  caja(c, xg, yg, wg, hg, 30, PAPEL, TINTA);
  c.fillStyle = TINTA;
  ls.forEach((l, i) => c.fillText(l, xg + 32, yg + 56 + i * 46));

  c.fillStyle = PAPEL; c.font = `600 28px ${TEXTO}`; c.textAlign = "center";
  c.fillText("MiGuita · anotá lo que gastás en 10 segundos", ANCHO / 2, ALTO - 34);
  c.textAlign = "left";
}

// Devuelve { url, blob } con la imagen de la tarjeta.
export async function armarTarjeta(d, o) {
  await Promise.all([`800 92px ${TITULO}`, `700 36px ${TEXTO}`, `800 36px ${TEXTO}`, `400 124px ${MANO}`].map((f) => document.fonts?.load(f).catch(() => {})));
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO; lienzo.height = ALTO;
  const pintar = (dibujo) => {
    dibujar(lienzo.getContext("2d"), d, o, dibujo);
    return lienzo.toDataURL("image/png");
  };
  let url;
  // Algún navegador puede no dejar leer un canvas con un dibujo adentro: entonces la tarjeta sale sin Miguita.
  try { url = pintar(await imagen(Art.miguita(o.estado))); } catch { url = pintar(null); }
  const blob = await new Promise((ok) => lienzo.toBlob(ok, "image/png"));
  return { url, blob };
}

export function crearVistaTuMes(st, V) {
  const { back, hdr, lbl, chips } = V.ayudas;
  return function tuMes() {
    const t = st.tuMes;
    return back("Volver") + hdr("Para compartir", "Tu mes en MiGuita") +
      (t.url ? `<img class="tarjeta-mes" src="${t.url}" alt="Tarjeta de tu mes en MiGuita">` : `<div class="sub" role="status">Horneando tu tarjeta…</div>`) +
      lbl("¿Mostramos los montos?") + chips("tuMesMontos", [["no", "Sin montos"], ["si", "Con montos"]], t.montos ? "si" : "no", "Montos en la tarjeta") +
      `<div class="hint">${t.montos ? "Quien la reciba va a ver cuánto gastaste." : "Se ven solo los porcentajes: nadie sabe cuánto gastaste."}</div>` +
      (t.url ? (t.compartible ? `<button class="btn pp w" data-act="compartirTuMes">Compartir</button>` : "") +
        `<a class="btn pp w${t.compartible ? " alt" : ""}" href="${esc(t.descarga)}" download="${esc(t.nombre)}">Descargar la imagen</a>` : "");
  };
}
