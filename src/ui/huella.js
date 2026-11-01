// Huella o cara con WebAuthn y la extensión PRF: el celu entrega un secreto de 32 bytes solo después de
// reconocer a la persona. Con ese secreto se envuelve la clave de datos, así la huella abre los datos cifrados
// de verdad (no es solo un portón). Si el celu no da el secreto (PRF), no se ofrece la huella.
import { aB64, deB64, azar } from "../logic/cifrado.js";

export async function hayHuella() {
  try { return !!globalThis.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); }
  catch { return false; }
}

const resultadoPRF = (cred) => cred?.getClientExtensionResults?.().prf;

async function secreto(credencial, sal) {
  const cred = await navigator.credentials.get({ publicKey: {
    challenge: azar(32), allowCredentials: [{ type: "public-key", id: credencial }], userVerification: "required", timeout: 60000,
    extensions: { prf: { eval: { first: sal } } },
  } });
  const r = resultadoPRF(cred)?.results?.first;
  if (!r) throw new Error("sin PRF");
  return new Uint8Array(r);
}

// Registra la huella. Devuelve { credencial, sal } (en base64) y el secreto, o lanza Error("sin PRF").
export async function registrarHuella() {
  const sal = azar(32);
  const cred = await navigator.credentials.create({ publicKey: {
    rp: { name: "MiGuita" }, user: { id: azar(16), name: "MiGuita", displayName: "MiGuita" }, challenge: azar(32),
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "preferred" },
    timeout: 60000, extensions: { prf: { eval: { first: sal } } },
  } });
  const prf = resultadoPRF(cred);
  if (!prf?.enabled && !prf?.results) throw new Error("sin PRF");
  const id = new Uint8Array(cred.rawId);
  const s = prf.results?.first ? new Uint8Array(prf.results.first) : await secreto(id, sal);
  return { credencial: aB64(id), sal: aB64(sal), secreto: s };
}

export const secretoDeHuella = (huella) => secreto(deB64(huella.credencial), deB64(huella.sal));
