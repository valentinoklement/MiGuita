import { test } from "node:test";
import assert from "node:assert/strict";
import { validar, proximoAviso, queAvisar, cifrar, firmar, mandar } from "../../servidor/avisos.js";
import { planDeAvisos, CLAVE_AVISOS } from "../src/logic/avisos.js";
import { unb64Claves } from "../src/logic/sincro.js";

const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) } };
const a64 = (b) => Buffer.from(b).toString("base64url");
const de64 = (t) => new Uint8Array(Buffer.from(t, "base64url"));
const Z = "America/Argentina/Buenos_Aires";
const ms = (t) => Date.parse(t + ":00-03:00");

test("solo se guarda lo necesario y solo hacia servicios de avisos conocidos", () => {
  const v = validar({ sub: { ...sub, extra: 1 }, zona: Z, plan: [{ h: "21:00", t: "dia", monto: 5 }, { h: "99:00", t: "dia" }, { h: "13:00", t: "otro" }], anoto: "2026-11-01", gastos: 5000 });
  assert.deepEqual(Object.keys(v).sort(), ["anoto", "plan", "silencio", "sub", "zona"]);
  assert.deepEqual(v.plan, [{ h: "21:00", t: "dia" }]);
  assert.deepEqual(Object.keys(v.sub), ["endpoint", "keys"]);
  assert.equal(validar({ sub: { ...sub, endpoint: "https://malo.example.com/x" } }), null);
  assert.equal(validar({ sub: { ...sub, endpoint: "https://fcm.googleapis.com.malo.com/x" } }), null);
  assert.equal(validar({ sub: { ...sub, endpoint: "http://fcm.googleapis.com/x" } }), null);
  assert.ok(validar({ sub: { ...sub, endpoint: "https://web.push.apple.com/x" } }));
  assert.ok(validar({ sub: { ...sub, endpoint: "https://updates.push.services.mozilla.com/x" } }));
  assert.equal(validar({ sub, zona: "Marte/Olimpo" }).zona, Z);
});

test("el próximo aviso respeta la zona horaria y pasa al día siguiente", () => {
  const plan = [{ h: "21:00", t: "dia" }, { h: "13:00", t: "dia" }];
  assert.equal(new Date(proximoAviso(plan, Z, ms("2026-11-01T10:00"))).getTime() - ms("2026-11-01T13:00"), 2000);
  assert.equal(proximoAviso(plan, Z, ms("2026-11-01T14:00")) - ms("2026-11-01T21:00"), 2000);
  assert.equal(proximoAviso(plan, Z, ms("2026-11-01T22:00")) - ms("2026-11-02T13:00"), 2000);
  assert.equal(proximoAviso(plan, Z, ms("2026-11-01T21:00")) - ms("2026-11-02T13:00"), 2000); // el de ahora ya se atendió
  assert.equal(proximoAviso([], Z, 0), null);
});

test("avisa solo si todavía no anotó, a la hora justa", () => {
  const ahora = ms("2026-11-01T21:00"), e = { zona: Z, plan: [{ h: "21:00", t: "dia" }], anoto: "2026-10-30", visto: ahora };
  assert.equal(queAvisar(e, ahora), "¿Anotaste tus gastos de hoy?");
  assert.equal(queAvisar({ ...e, anoto: "2026-11-01" }, ahora), null);
  assert.ok(queAvisar(e, ms("2026-11-01T21:04")));
  assert.equal(queAvisar(e, ms("2026-11-01T21:10")), null);
});

test("la racha se avisa solo si todavía se puede salvar", () => {
  const ahora = ms("2026-11-01T21:00"), e = { zona: Z, plan: [{ h: "21:00", t: "racha" }], visto: ahora };
  assert.equal(queAvisar({ ...e, anoto: "2026-10-31" }, ahora), "Tu racha se corta si hoy no anotás nada.");
  assert.equal(queAvisar({ ...e, anoto: "2026-10-20" }, ahora), null);
});

test("si hace un mes que no abre la app, deja de molestar", () => {
  const ahora = ms("2026-11-01T21:00"), e = { zona: Z, plan: [{ h: "21:00", t: "dia" }], anoto: "" };
  assert.ok(queAvisar({ ...e, visto: ahora - 29 * 864e5 }, ahora));
  assert.equal(queAvisar({ ...e, visto: ahora - 31 * 864e5 }, ahora), null);
});

// Descifra como lo haría el celu (RFC 8291), para comprobar que el aviso se puede leer con sus claves y con nada más.
async function descifrar(cuerpo, par, auth) {
  const miPublica = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  const sal = cuerpo.slice(0, 16), largoId = cuerpo[20], suya = cuerpo.slice(21, 21 + largoId), datos = cuerpo.slice(21 + largoId);
  const k = await crypto.subtle.importKey("raw", suya, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const secreto = await crypto.subtle.deriveBits({ name: "ECDH", public: k }, par.privateKey, 256);
  const hkdf = async (s, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: s, info }, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), n * 8));
  const t = (x) => new TextEncoder().encode(x);
  const ikm = await hkdf(auth, secreto, new Uint8Array([...t("WebPush: info\0"), ...miPublica, ...suya]), 32);
  const cek = await hkdf(sal, ikm, t("Content-Encoding: aes128gcm\0"), 16), nonce = await hkdf(sal, ikm, t("Content-Encoding: nonce\0"), 12);
  const claro = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]), datos));
  assert.equal(claro[claro.length - 1], 2);
  return new TextDecoder().decode(claro.slice(0, -1));
}

test("el aviso va cifrado: solo ese celu lo puede leer", async () => {
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const publica = a64(await crypto.subtle.exportKey("raw", par.publicKey));
  const cuerpo = await cifrar("¿Anotaste tus gastos de hoy?", publica, a64(auth));
  assert.equal(await descifrar(cuerpo, par, auth), "¿Anotaste tus gastos de hoy?");
  assert.ok(!Buffer.from(cuerpo).toString().includes("Anotaste"));
  const otro = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  await assert.rejects(descifrar(cuerpo, otro, auth));
});

test("la firma se puede comprobar con la clave pública", async () => {
  const par = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const jwt = await firmar("https://fcm.googleapis.com/fcm/send/abc", await crypto.subtle.exportKey("jwk", par.privateKey), 1000_000);
  const [c, p, f] = jwt.split(".");
  assert.ok(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, par.publicKey, de64(f), new TextEncoder().encode(c + "." + p)));
  const datos = JSON.parse(Buffer.from(p, "base64url"));
  assert.equal(datos.aud, "https://fcm.googleapis.com");
  assert.equal(datos.exp, 1000 + 3600);
  assert.ok(!jwt.includes("@") && !JSON.stringify(datos).includes("gmail"));
});

test("mandar arma el pedido como lo espera el servicio de avisos", async () => {
  const par = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const firma = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const e = { silencio: true, sub: { endpoint: sub.endpoint, keys: { p256dh: a64(await crypto.subtle.exportKey("raw", par.publicKey)), auth: a64(auth) } } };
  let pedido;
  const estado = await mandar(e, "Hola", await crypto.subtle.exportKey("jwk", firma.privateKey), "CLAVE", async (u, o) => { pedido = { u, ...o }; return { status: 201 }; });
  assert.equal(estado, 201);
  assert.equal(pedido.u, sub.endpoint);
  assert.equal(pedido.headers["Content-Encoding"], "aes128gcm");
  assert.match(pedido.headers.Authorization, /^vapid t=.+\..+\..+, k=CLAVE$/);
  assert.deepEqual(JSON.parse(await descifrar(pedido.body, par, auth)), { titulo: "MiGuita", texto: "Hola", silencioso: true });
});

test("el plan de la app: horas elegidas, racha y no molestar", () => {
  const base = { cantidad: 2, horas: ["13:00", "20:00", "18:00"], forma: "sonido", tipos: { dia: true, racha: true, presupuesto: true }, noMolestar: { activo: false, desde: "23:00", hasta: "08:00" } };
  assert.deepEqual(planDeAvisos(base), [{ h: "13:00", t: "dia" }, { h: "20:00", t: "dia" }, { h: "21:00", t: "racha" }]);
  assert.deepEqual(planDeAvisos({ ...base, horas: ["21:00", "13:00"], cantidad: 1 }), [{ h: "21:00", t: "racha" }, { h: "21:00", t: "dia" }]);
  assert.deepEqual(planDeAvisos({ ...base, cantidad: 0, tipos: { dia: true, racha: false } }), []);
  assert.deepEqual(planDeAvisos({ ...base, tipos: { dia: false, racha: true } }), [{ h: "21:00", t: "racha" }]);
  assert.deepEqual(planDeAvisos({ ...base, noMolestar: { activo: true, desde: "19:00", hasta: "08:00" } }), [{ h: "13:00", t: "dia" }]);
});

test("la clave pública de la app tiene la forma que pide el navegador", () => {
  const k = unb64Claves(CLAVE_AVISOS);
  assert.equal(k.length, 65);
  assert.equal(k[0], 4);
});
