// Código QR: dibujarlo (qrcode-generator) y leerlo con la cámara (jsQR). Las dos librerías están en src/vendor
// y se cargan recién cuando hacen falta, porque pesan.

export const MAX_QR = 1500; // más largo que esto, el QR queda tan denso que cuesta leerlo con el celu

const cargadas = {};
function cargar(archivo, global) {
  if (globalThis[global]) return Promise.resolve(globalThis[global]);
  cargadas[archivo] ||= new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = new URL("../vendor/" + archivo, import.meta.url).href;
    s.onload = () => (globalThis[global] ? ok(globalThis[global]) : mal(new Error("no cargó " + archivo)));
    s.onerror = () => mal(new Error("no cargó " + archivo));
    document.head.appendChild(s);
  });
  return cargadas[archivo];
}

// Matriz de módulos del QR (true = negro), o null si el texto es muy largo.
export function matrizQR(qrcode, texto) {
  if (texto.length > MAX_QR) return null;
  const q = qrcode(0, "L");
  q.addData(texto, "Byte");
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
}

// SVG del QR con borde blanco, para mostrar en pantalla.
export async function svgQR(texto) {
  const m = matrizQR(await cargar("qrcode.js", "qrcode"), texto);
  if (!m) return null;
  const n = m.length, b = 4;
  let d = "";
  m.forEach((fila, y) => fila.forEach((on, x) => { if (on) d += `M${x + b} ${y + b}h1v1h-1z`; }));
  return `<svg class="qr" viewBox="0 0 ${n + 2 * b} ${n + 2 * b}" role="img" aria-label="Código QR del grupo" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

// Abre la cámara trasera dentro de video y llama a alEncontrar(texto) cuando lee un QR con un código de grupo.
// Devuelve una función para apagar la cámara.
export async function escanear(video, alEncontrar) {
  const jsQR = await cargar("jsQR.js", "jsQR");
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  video.srcObject = stream;
  video.setAttribute("playsinline", "");
  await video.play();
  const lienzo = document.createElement("canvas"), ctx = lienzo.getContext("2d", { willReadFrequently: true });
  let activo = true;
  const apagar = () => { activo = false; stream.getTracks().forEach((t) => t.stop()); video.srcObject = null; };
  const mirar = () => {
    if (!activo) return;
    if (video.readyState >= 2 && video.videoWidth) {
      const esc = Math.min(1, 640 / video.videoWidth);
      lienzo.width = Math.round(video.videoWidth * esc); lienzo.height = Math.round(video.videoHeight * esc);
      ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
      const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
      const r = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
      if (r && /G[123]:/.test(r.data)) { apagar(); alEncontrar(r.data); return; }
    }
    requestAnimationFrame(mirar);
  };
  requestAnimationFrame(mirar);
  return apagar;
}
