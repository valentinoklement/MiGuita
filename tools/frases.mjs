// La red de seguridad de la lectura de frases.
//   tests/frases.txt   una frase por línea, como las escribe o las dice la gente (las líneas con # son títulos).
//   tests/frases.json  cómo se entendía cada una la última vez que alguien lo miró y lo dio por bueno.
// `npm test` compara las dos cosas: si una palabra nueva del vocabulario cambia una frase que andaba, falla y muestra cuál.
// Si el cambio es el que se quería, `npm run frases` lo acepta (vuelve a escribir frases.json). Revisá el diff antes de hacer commit.
// Para sumar una frase: agregala a frases.txt y corré `npm run frases`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { leerTexto, leerVarios, leerSinMonto } from "../src/logic/anotar.js";
import { categoriasIniciales } from "../src/logic/categorias.js";
import { formatear } from "../src/logic/dinero.js";

const LISTA = fileURLToPath(new URL("../tests/frases.txt", import.meta.url));
const GUARDADO = fileURLToPath(new URL("../tests/frases.json", import.meta.url));
const cats = categoriasIniciales();

export const leerFrases = () => readFileSync(LISTA, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
export const leerGuardado = () => JSON.parse(readFileSync(GUARDADO, "utf8"));

const uno = (r) => [r.tipo, r.categoria, formatear(r.monto, { moneda: r.moneda === "USD" ? "US$ " : "$" }) + (r.opciones ? " (pregunta: " + r.opciones.map((c) => formatear(c)).join(" o ") + ")" : "") + (r.revisar ? " (a revisar)" : ""), "«" + r.detalle + "»"].join(" · ") + (r.medio ? " · con " + r.medio : "");
// Cómo entiende la app una frase, igual que cuando se escribe en Inicio: varios gastos, uno solo, o sin monto.
export function describir(frase) {
  const varios = leerVarios(frase, cats);
  if (varios.length > 1) return varios.map(uno).join("  +  ");
  const r = leerTexto(frase, cats);
  if (r) return uno(r);
  const s = leerSinMonto(frase, cats);
  return "sin monto · " + s.tipo + " · " + s.categoria + " · «" + s.detalle + "»" + (s.medio ? " · con " + s.medio : "");
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const frases = leerFrases();
  let antes = {};
  try { antes = leerGuardado(); } catch { /* primera vez */ }
  const ahora = Object.fromEntries(frases.map((f) => [f, describir(f)]));
  const cambios = frases.filter((f) => antes[f] !== undefined && antes[f] !== ahora[f]), nuevas = frases.filter((f) => antes[f] === undefined);
  for (const f of cambios) console.log("CAMBIÓ  " + f + "\n   antes: " + antes[f] + "\n   ahora: " + ahora[f]);
  for (const f of nuevas) console.log("NUEVA   " + f + "\n          " + ahora[f]);
  writeFileSync(GUARDADO, "{\n" + frases.map((f) => "  " + JSON.stringify(f) + ": " + JSON.stringify(ahora[f])).join(",\n") + "\n}\n");
  console.log("\n" + frases.length + " frases guardadas (" + cambios.length + " cambiaron, " + nuevas.length + " nuevas). Mirá el diff de tests/frases.json antes de hacer commit.");
}
