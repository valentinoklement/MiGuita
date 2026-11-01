// Avisos con la app cerrada: las cuentas y el armado de cada aviso (Web Push), sin nada propio de Cloudflare.
// Lo que se guarda de cada dispositivo es lo mínimo: a dónde mandar el aviso, a qué hora y cuál fue el último día que anotó.
// Nunca montos ni movimientos. Como el contenido del aviso va cifrado, el servicio de avisos del celu tampoco lo puede leer.

const TEXTOS = { dia: "¿Anotaste tus gastos de hoy?", racha: "Tu racha se corta si hoy no anotás nada." };
const SERVICIOS = /^https:\/\/([a-z0-9.-]+\.)?(fcm\.googleapis\.com|push\.apple\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//;
export const DESCANSO = 30 * 864e5; // si hace un mes que no abre la app, se deja de molestar

/* ---------- qué se puede guardar ---------- */
// Revisa lo que manda la app y devuelve solo lo que hace falta, o null si no sirve.
export function validar(c) {
  const sub = c?.sub, b64 = /^[A-Za-z0-9_-]{16,200}$/;
  if (typeof sub?.endpoint !== "string" || sub.endpoint.length > 800 || !SERVICIOS.test(sub.endpoint)) return null;
  if (!b64.test(sub.keys?.p256dh || "") || !b64.test(sub.keys?.auth || "")) return null;
  let zona = "America/Argentina/Buenos_Aires";
  try { if (typeof c.zona === "string" && c.zona.length < 60) { new Intl.DateTimeFormat("es", { timeZone: c.zona }); zona = c.zona; } } catch { /* queda la de Argentina */ }
  const plan = (Array.isArray(c.plan) ? c.plan : []).filter((a) => /^([01]\d|2[0-3]):[0-5]\d$/.test(a?.h || "") && ["dia", "racha"].includes(a.t)).slice(0, 4).map((a) => ({ h: a.h, t: a.t }));
  const anoto = /^\d{4}-\d{2}-\d{2}$/.test(c.anoto || "") ? c.anoto : "";
  return { sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, zona, plan, anoto, silencio: !!c.silencio };
}

/* ---------- cuándo ---------- */
const dosDigitos = new Map();
function partes(zona, ms) {
  let f = dosDigitos.get(zona);
  if (!f) dosDigitos.set(zona, (f = new Intl.DateTimeFormat("en-CA", { timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })));
  const p = Object.fromEntries(f.formatToParts(ms).map((x) => [x.type, x.value]));
  return { fecha: p.year + "-" + p.month + "-" + p.day, hora: p.hour + ":" + p.minute };
}
const aMinutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const diaAnterior = (f) => new Date(Date.parse(f + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);

// El próximo momento en que toca revisar si hay que avisar. null si no hay ningún aviso.
export function proximoAviso(plan, zona, ahora) {
  if (!plan.length) return null;
  const { hora } = partes(zona, ahora), minutoAhora = aMinutos(hora);
  let falta = Infinity;
  for (const a of plan) {
    let d = aMinutos(a.h) - minutoAhora;
    if (d <= 0) d += 1440;
    falta = Math.min(falta, d);
  }
  return ahora - (ahora % 60000) + falta * 60000 + 2000;
}

// Qué avisos corresponden en este momento. Son pocos y cortos, sin ningún dato de la persona.
export function queAvisar(e, ahora) {
  if (ahora - (e.visto || 0) > DESCANSO) return null;
  const { fecha, hora } = partes(e.zona, ahora);
  if (e.anoto === fecha) return null; // ya anotó hoy
  // Hasta 5 minutos de tolerancia, por si la alarma se demoró.
  const toca = e.plan.filter((a) => (aMinutos(hora) - aMinutos(a.h) + 1440) % 1440 <= 5);
  const racha = toca.find((a) => a.t === "racha" && e.anoto === diaAnterior(fecha)); // la racha se puede cortar solo si ayer anotó
  const dia = toca.find((a) => a.t === "dia");
  return racha ? TEXTOS.racha : dia ? TEXTOS.dia : null;
}

/* ---------- Web Push: cifrado (RFC 8291) y firma (RFC 8292) ---------- */
const bytes = (t) => new TextEncoder().encode(t);
const desde64 = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(t.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const a64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unir = (...ps) => { const r = new Uint8Array(ps.reduce((a, p) => a + p.length, 0)); let i = 0; for (const p of ps) { r.set(p, i); i += p.length; } return r; };
async function hkdf(sal, ikm, info, largo) {
  const k = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: sal, info }, k, largo * 8));
}

// Cifra el aviso para que solo lo pueda leer ese celu. Devuelve el cuerpo listo para mandar.
export async function cifrar(texto, p256dh, auth, sal = crypto.getRandomValues(new Uint8Array(16))) {
  const suClave = desde64(p256dh);
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const miClave = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const suya = await crypto.subtle.importKey("raw", suClave, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secreto = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: suya }, par.privateKey, 256));
  const ikm = await hkdf(desde64(auth), secreto, unir(bytes("WebPush: info\0"), suClave, miClave), 32);
  const cek = await hkdf(sal, ikm, bytes("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(sal, ikm, bytes("Content-Encoding: nonce\0"), 12);
  const clave = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, clave, unir(bytes(texto), new Uint8Array([2]))));
  const cabecera = new Uint8Array(21);
  cabecera.set(sal); new DataView(cabecera.buffer).setUint32(16, 4096); cabecera[20] = 65;
  return unir(cabecera, miClave, cifrado);
}

// La firma que dice "este aviso lo manda MiGuita". privada: la clave en formato JWK; publica: en base64url.
export async function firmar(endpoint, privada, ahora = Date.now()) {
  const jwt = (o) => a64(bytes(JSON.stringify(o)));
  const cuerpo = jwt({ typ: "JWT", alg: "ES256" }) + "." + jwt({ aud: new URL(endpoint).origin, exp: Math.floor(ahora / 1000) + 3600, sub: "https://valentinoklement.github.io/MiGuita/" });
  const k = await crypto.subtle.importKey("jwk", privada, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  return cuerpo + "." + a64(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, bytes(cuerpo)));
}

// Manda un aviso. Devuelve el estado que contestó el servicio de avisos (404 o 410: ese celu ya no existe).
export async function mandar(e, texto, privada, publica, ir = fetch) {
  const cuerpo = await cifrar(JSON.stringify({ titulo: "MiGuita", texto, silencioso: !!e.silencio }), e.sub.keys.p256dh, e.sub.keys.auth);
  const r = await ir(e.sub.endpoint, { method: "POST", body: cuerpo, headers: {
    Authorization: "vapid t=" + await firmar(e.sub.endpoint, privada) + ", k=" + publica,
    "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: "14400", Urgency: "normal",
  } });
  return r.status;
}
