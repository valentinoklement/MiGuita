// El QR que dibuja la app se puede leer con el lector que usa la app, con códigos reales de grupos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matrizQR, MAX_QR } from "../src/ui/qr.js";
import { codificar, decodificar } from "../src/logic/grupos.js";

const cargarUMD = (archivo, nombre) => {
  const src = readFileSync(new URL("../src/vendor/" + archivo, import.meta.url), "utf8");
  const module = { exports: {} };
  new Function("module", "exports", "define", src)(module, module.exports, undefined);
  return module.exports.default || module.exports[nombre] || module.exports;
};
const qrcode = cargarUMD("qrcode.js", "qrcode");
const jsQR = cargarUMD("jsQR.js", "jsQR");

function leer(m) {
  const esc = 4, b = 4, n = m.length, lado = (n + 2 * b) * esc;
  const px = new Uint8ClampedArray(lado * lado * 4).fill(255);
  m.forEach((fila, y) => fila.forEach((on, x) => {
    if (!on) return;
    for (let dy = 0; dy < esc; dy++) for (let dx = 0; dx < esc; dx++) {
      const i = (((y + b) * esc + dy) * lado + (x + b) * esc + dx) * 4;
      px[i] = px[i + 1] = px[i + 2] = 0;
    }
  }));
  return jsQR(px, lado, lado)?.data;
}

test("un grupo real pasa por QR y vuelve igual", async () => {
  const g = { id: "g1", nombre: "Viaje «al sur» 🏔", moneda: "ARS", ts: 5,
    miembros: [{ id: "a", nombre: "Ana", alias: "ana.mp" }, { id: "b", nombre: "Leo" }, { id: "c", nombre: "Zoë" }],
    gastos: Array.from({ length: 12 }, (_, i) => ({ id: "x" + i, t: "Gasto " + i, m: 1000 + i * 37.5, p: "a", a: ["a", "b", "c"], sp: "eq", w: {}, f: "2026-10-31", ts: i })), pagos: [] };
  const code = await codificar(g);
  assert.ok(code.length <= MAX_QR, "un grupo chico entra en un QR (" + code.length + ")");
  const leido = leer(matrizQR(qrcode, code));
  assert.equal(leido, code);
  assert.deepEqual(await decodificar(leido), await decodificar(code));
});

test("el QR más largo permitido se puede leer; uno más largo no se dibuja", () => {
  const texto = "G3:" + "Ab3_-".repeat(MAX_QR).slice(0, MAX_QR - 3);
  assert.equal(leer(matrizQR(qrcode, texto)), texto);
  assert.equal(matrizQR(qrcode, texto + "x"), null);
});
