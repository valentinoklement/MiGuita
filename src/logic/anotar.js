// Anotar rápido por texto: "nafta 20000" → gasto de $20.000 en Nafta/auto.
// Portado de parseQuick() de la app anterior; mismo comportamiento, ahora en centavos.
// Ojo, documentado y probado: "1.5" se lee como 15 (el punto siempre es de miles); para decimales va la coma.
import { categoriasIniciales, paraAdivinar } from "./categorias.js";

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const POR_DEFECTO = categoriasIniciales();

export function adivinarCategoria(texto, lista) {
  const t = texto.toLowerCase();
  for (const [id, claves] of lista) {
    if (claves.some((k) => k && new RegExp("(^|\\s)" + escapar(k), "i").test(t))) return id;
  }
  return lista[lista.length - 1][0];
}

export function leerTexto(texto, cats = POR_DEFECTO) {
  const s = String(texto).replace(/\$/g, "");
  const m = s.match(/(\d[\d.,]*)\s*(k|lucas|luca|mil)?/i);
  if (!m) return null;
  let n = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
  if (!n) return null;
  if (m[2]) n *= 1000;
  const resto = (s.slice(0, m.index) + " " + s.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
  const tipo = /\b(sueldo|cobr|ingreso|me pagaron|salario)/i.test(resto) ? "ingreso" : "gasto";
  return {
    tipo,
    monto: Math.round(n * 100),
    detalle: resto ? resto[0].toUpperCase() + resto.slice(1) : "",
    categoria: adivinarCategoria(resto, paraAdivinar(cats, tipo)),
  };
}
