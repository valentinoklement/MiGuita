// Grupos conectados: todos ven lo mismo al instante a través del servidor de grupos.
// El código corto (12 letras y números) es la única llave: de él salen la dirección del grupo en el servidor,
// el permiso para leer/guardar y la clave de cifrado. El servidor guarda solo una caja cifrada que no puede abrir.
import { limpiar, fusionar, b64, unb64, transformar } from "./grupos.js";

export const SERVIDOR = "https://miguita-grupos.valentinoklement.workers.dev";
const LETRAS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // sin I, L, O ni U para no confundirse
const MAX_DESCOMPRIMIDO = 2_000_000;

/* ---------- código corto ---------- */
// largo 12 para grupos; 16 para conectar mis dispositivos (ahí viajan todos mis datos).
export function nuevoCodigo(largo = 12) {
  const r = crypto.getRandomValues(new Uint8Array(largo));
  return [...r].map((b) => LETRAS[b & 31]).join("").replace(/(.{4})(?=.)/g, "$1-");
}
// Acepta el código con guiones, espacios, minúsculas o con O/I/L en vez de 0/1. null si no es un código.
export function leerCodigo(texto) {
  const s = String(texto ?? "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^([0-9A-HJKMNP-TV-Z]{12}|[0-9A-HJKMNP-TV-Z]{16})$/.test(s)) return null;
  return s.replace(/(.{4})(?=.)/g, "$1-");
}
// Busca un código corto dentro de un texto (un mensaje de WhatsApp, un link #u=...).
export function buscarCodigo(texto) {
  const m = /(?:#u=)?\b([0-9A-Za-z]{4})[-\s]?([0-9A-Za-z]{4})[-\s]?([0-9A-Za-z]{4})\b/.exec(String(texto ?? ""));
  return m ? leerCodigo(m[1] + m[2] + m[3]) : null;
}

const hex = (u8) => [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
// Del código salen: id (dónde está), token (permiso) y clave (para cifrar). Lento a propósito, para que adivinar cueste.
export async function derivar(codigo, sal = "MiGuita-grupo-v1") {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(leerCodigo(codigo)), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(sal), iterations: 100000 }, base, 512));
  const clave = await crypto.subtle.importKey("raw", bits.slice(32), "AES-GCM", false, ["encrypt", "decrypt"]);
  return { id: hex(bits.slice(0, 16)), token: hex(bits.slice(16, 32)), clave };
}

/* ---------- caja cifrada ---------- */
export const cerrar = (g, clave) => cerrarObjeto(limpiar(g), clave);
export async function cerrarObjeto(obj, clave) {
  const u8 = new TextEncoder().encode(JSON.stringify(obj));
  const z = await transformar(u8, new CompressionStream("deflate-raw"), Infinity);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, clave, z));
  const out = new Uint8Array(12 + c.length); out.set(iv); out.set(c, 12);
  return b64(out);
}
export async function abrirObjeto(datos, clave, max = MAX_DESCOMPRIMIDO) {
  const u8 = unb64(datos);
  const z = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u8.slice(0, 12) }, clave, u8.slice(12)));
  return JSON.parse(new TextDecoder().decode(await transformar(z, new DecompressionStream("deflate-raw"), max)));
}
export async function abrir(datos, clave) {
  const g = limpiar(await abrirObjeto(datos, clave));
  if (!g) throw new Error("grupo inválido");
  return g;
}

/* ---------- servidor ---------- */
export async function pedir(d, metodo, cuerpo, ir = fetch) {
  const r = await ir(SERVIDOR + "/g/" + d.id, { method: metodo, headers: { Authorization: "Bearer " + d.token, ...(cuerpo && { "Content-Type": "application/json" }) }, body: cuerpo && JSON.stringify(cuerpo), cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return { estado: r.status, ...j };
}

// Trae el grupo del servidor. null si todavía no existe.
export async function bajar(d, ir) {
  const r = await pedir(d, "GET", null, ir);
  if (r.estado === 404) return null;
  if (r.estado !== 200) throw new Error("servidor " + r.estado);
  return { v: r.v, g: await abrir(r.datos, d.clave) };
}

// Mismo contenido, sin importar el orden en que estén guardadas las cosas.
const igual = (a, b) => JSON.stringify(limpiar(fusionar(a, a))) === JSON.stringify(limpiar(fusionar(b, b)));

// Junta lo de este celu con lo del servidor y deja los dos iguales. Devuelve { g, v, cambio } (cambio: si llegó algo nuevo).
// Si otro guardó en el medio (409), vuelve a juntar con lo nuevo y prueba de nuevo.
export async function sincronizar(d, local, ir) {
  let remoto = await bajar(d, ir);
  for (let i = 0; i < 5; i++) {
    const g = remoto ? fusionar(local, remoto.g) : local;
    const cambio = !!remoto && !igual(g, local);
    if (remoto && igual(g, remoto.g)) return { g, v: remoto.v, cambio };
    const r = await pedir(d, "PUT", { v: remoto ? remoto.v : 0, datos: await cerrar(g, d.clave) }, ir);
    if (r.estado === 200) return { g, v: r.v, cambio };
    if (r.estado !== 409) throw new Error("servidor " + r.estado);
    remoto = r.datos ? { v: r.v, g: await abrir(r.datos, d.clave) } : null;
    local = g;
  }
  throw new Error("demasiados cambios a la vez");
}

// Escucha los cambios de un grupo: llama a avisar(v) cada vez que alguien guarda. Devuelve una función para cortar.
export function escuchar(d, avisar) {
  let ws, cortado = false, espera = 1000, latido;
  const conectar = () => {
    if (cortado) return;
    ws = new WebSocket(SERVIDOR.replace(/^http/, "ws") + "/g/" + d.id + "/ws");
    ws.onopen = () => { espera = 1000; latido = setInterval(() => { try { ws.send("ping"); } catch { /* cerrado */ } }, 30000); };
    ws.onmessage = (e) => { try { const m = JSON.parse(e.data); if (Number.isInteger(m.v)) avisar(m.v); } catch { /* "pong" */ } };
    ws.onclose = () => { clearInterval(latido); if (!cortado) { setTimeout(conectar, espera); espera = Math.min(espera * 2, 60000); } };
  };
  conectar();
  return () => { cortado = true; clearInterval(latido); try { ws.close(); } catch { /* ya cerrado */ } };
}
