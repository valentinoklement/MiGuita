// Cifrado con WebCrypto (especificación, sección 3).
// - Los datos se cifran con AES-GCM usando una "clave de datos" aleatoria de 256 bits.
// - Esa clave se guarda cifrada ("envuelta") con una clave derivada del PIN (PBKDF2-SHA256, 600.000 vueltas).
//   Con el PIN correcto se abre; sin él, el contenido es ilegible. Cambiar el PIN solo re-envuelve la clave.
// - Las copias de seguridad se cifran igual, con la contraseña que elige la persona.
// AES-GCM detecta cualquier alteración: un archivo tocado no se abre.

export const VUELTAS = 600_000;
const sutil = globalThis.crypto.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();

export const aB64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
export const deB64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
export const azar = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

export async function derivar(secreto, sal, vueltas = VUELTAS) {
  const base = await sutil.importKey("raw", enc.encode(secreto.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return sutil.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: vueltas }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

const claveAES = (crudo) => sutil.importKey("raw", crudo, "AES-GCM", false, ["encrypt", "decrypt"]);

async function cifrarBytes(clave, u8) {
  const iv = azar(12);
  return { iv: aB64(iv), ct: aB64(new Uint8Array(await sutil.encrypt({ name: "AES-GCM", iv }, clave, u8))) };
}
async function descifrarBytes(clave, { iv, ct }) {
  return new Uint8Array(await sutil.decrypt({ name: "AES-GCM", iv: deB64(iv) }, clave, deB64(ct)));
}

export const cifrar = async (clave, obj) => cifrarBytes(clave, enc.encode(JSON.stringify(obj)));
export const descifrar = async (clave, caja) => JSON.parse(dec.decode(await descifrarBytes(clave, caja)));

/* ---------- cofre: la clave de datos envuelta con el PIN ---------- */
// Devuelve { cofre (se guarda sin cifrar), crudo (bytes de la clave de datos, solo en memoria), clave }.
export async function crearCofre(pin, vueltas = VUELTAS) {
  const crudo = azar(32), sal = azar(16);
  const envuelta = await cifrarBytes(await derivar(pin, sal, vueltas), crudo);
  return { cofre: { sal: aB64(sal), vueltas, ...envuelta }, crudo, clave: await claveAES(crudo) };
}

// Lanza un Error si el PIN no es el correcto.
export async function abrirCofre(cofre, pin) {
  let crudo;
  try { crudo = await descifrarBytes(await derivar(pin, deB64(cofre.sal), cofre.vueltas), cofre); }
  catch { throw new Error("PIN incorrecto"); }
  return { crudo, clave: await claveAES(crudo) };
}

export async function reenvolver(crudo, pinNuevo, vueltas = VUELTAS) {
  const sal = azar(16);
  return { sal: aB64(sal), vueltas, ...(await cifrarBytes(await derivar(pinNuevo, sal, vueltas), crudo)) };
}

// Envolver la clave de datos con un secreto de 32 bytes (lo que da la huella o la cara con WebAuthn PRF).
export async function envolverConSecreto(crudo, secreto) {
  const clave = await sutil.importKey("raw", secreto, "HKDF", false, ["deriveKey"]);
  const k = await sutil.deriveKey({ name: "HKDF", hash: "SHA-256", salt: enc.encode("MiGuita huella"), info: new Uint8Array() }, clave, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { envolver: () => cifrarBytes(k, crudo), k };
}
export async function abrirConSecreto(caja, secreto) {
  const { k } = await envolverConSecreto(new Uint8Array(), secreto);
  const crudo = await descifrarBytes(k, caja);
  return { crudo, clave: await claveAES(crudo) };
}

/* ---------- PIN ---------- */
// PIN de 4 a 6 números, o una contraseña larga (8 o más caracteres) para más protección.
export function validarPin(pin, modo = "pin") {
  if (modo === "pin") return /^\d{4,6}$/.test(pin) ? null : "El PIN tiene de 4 a 6 números.";
  return String(pin).length >= 8 ? null : "La contraseña tiene que tener 8 caracteres o más.";
}

// Después de 5 errores, espera creciente: 30 s, 1 min, 5 min, 15 min y después 1 hora.
export function esperaTrasErrores(errores) {
  if (errores < 5) return 0;
  return [30, 60, 300, 900][errores - 5] * 1000 || 3600_000;
}

/* ---------- copias de seguridad ---------- */
export async function armarCopia(datos, contrasena, vueltas = VUELTAS, ahora = new Date().toISOString()) {
  const sal = azar(16);
  const caja = await cifrar(await derivar(contrasena, sal, vueltas), datos);
  return JSON.stringify({ app: "MiGuita", tipo: "copia", formato: 1, creada: ahora, sal: aB64(sal), vueltas, ...caja });
}

// Lanza Error con un mensaje para la persona si el archivo no sirve o la contraseña no es.
export async function abrirCopia(texto, contrasena) {
  let o;
  try { o = JSON.parse(texto); } catch { throw new Error("Ese archivo no es una copia de MiGuita."); }
  if (!o || o.app !== "MiGuita" || o.tipo !== "copia" || typeof o.ct !== "string" || typeof o.iv !== "string" || typeof o.sal !== "string") throw new Error("Ese archivo no es una copia de MiGuita.");
  if (!(o.formato >= 1)) throw new Error("Ese archivo no es una copia de MiGuita.");
  if (o.formato > 1) throw new Error("La copia es de una versión más nueva de MiGuita. Actualizá la app.");
  if (!Number.isInteger(o.vueltas) || o.vueltas < 100_000 || o.vueltas > 10_000_000) throw new Error("Ese archivo no es una copia de MiGuita.");
  try { return { datos: await descifrar(await derivar(contrasena, deB64(o.sal), o.vueltas), o), creada: o.creada }; }
  catch { throw new Error("La contraseña no es correcta o el archivo está dañado."); }
}
