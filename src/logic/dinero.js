import { montoEnPalabras } from "./anotar.js";
// Dinero siempre en centavos enteros. Formato argentino: $184.300 o $13.733,34.

export function aCentavos(pesos) {
  return Math.round(pesos * 100);
}

export function formatear(centavos, { signo = false, oculto = false, moneda = "$" } = {}) {
  if (oculto) return moneda + "•••••";
  const neg = centavos < 0;
  const abs = Math.abs(Math.round(centavos));
  const enteros = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const resto = abs % 100;
  const texto = moneda + enteros + (resto ? "," + String(resto).padStart(2, "0") : "");
  if (neg) return "−" + texto;
  return signo && centavos > 0 ? "+" + texto : texto;
}

// Monto escrito en un formulario: "70.000", "$ 1.200.000,50", "35000". Devuelve centavos o null.
export function leerMonto(texto) {
  const s = String(texto ?? "").replace(/[$\s]/g, "");
  if (!/^\d[\d.]*(,\d{1,2})?$/.test(s)) return /^[\d.,]+$/.test(s) ? null : montoEnPalabras(texto); // "20 mil", "dos lucas"
  return Math.round(parseFloat(s.replace(/\./g, "").replace(",", ".")) * 100);
}

// Para mostrar un monto dentro de un campo: 7000000 → "70.000", 1250 → "12,50".
export function montoEnCampo(centavos) {
  if (centavos == null || centavos === "") return "";
  return formatear(centavos, { moneda: "" });
}

// Calculadora del teclado: solo números enteros de pesos con + y −. Nunca ejecuta texto.
export function evaluar(expr) {
  const partes = String(expr).replace(/−/g, "-").match(/[+-]?\d+/g);
  if (!partes) return 0;
  return partes.reduce((a, p) => a + aCentavos(parseInt(p, 10)), 0);
}
