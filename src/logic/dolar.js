// Dólar (especificación, sección 5). Valores en centavos de peso por dólar; se usa el precio de venta.
// Cadena de respaldo: fuente elegida → la otra fuente → último valor guardado → valor manual.

export const TIPOS = [["oficial", "Oficial"], ["blue", "Blue"], ["mep", "MEP"], ["cripto", "Cripto"], ["tarjeta", "Tarjeta"], ["fijo", "Fijo"]];
export const FUENTES = [["dolarapi", "DolarApi"], ["bluelytics", "Bluelytics"], ["manual", "Lo cargo yo"]];
export const URLS = { dolarapi: "https://dolarapi.com/v1/dolares", bluelytics: "https://api.bluelytics.com.ar/v2/latest" };
const CASA = { oficial: "oficial", blue: "blue", mep: "bolsa", cripto: "cripto", tarjeta: "tarjeta" };
export const nombreTipo = (t) => (TIPOS.find((x) => x[0] === t) || [, t])[1];

const valido = (v) => typeof v === "number" && isFinite(v) && v >= 1 && v <= 10_000_000;

// Qué fuentes tienen cada tipo.
export const tiene = (fuente, tipo) => fuente === "dolarapi" ? tipo in CASA : fuente === "bluelytics" ? tipo === "oficial" || tipo === "blue" : false;

export function leerDolarApi(json, tipo) {
  if (!Array.isArray(json)) return null;
  const c = json.find((x) => x && x.casa === CASA[tipo]);
  return c && valido(c.venta) ? { valor: Math.round(c.venta * 100), fechaFuente: String(c.fechaActualizacion || "").slice(0, 30) } : null;
}

export function leerBluelytics(json, tipo) {
  const c = json && (tipo === "oficial" ? json.oficial : tipo === "blue" ? json.blue : null);
  return c && valido(c.value_sell) ? { valor: Math.round(c.value_sell * 100), fechaFuente: String(json.last_update || "").slice(0, 30) } : null;
}

// Consulta una fuente con 8 segundos de espera máxima. No manda ningún dato personal.
export async function consultar(fuente, tipo, fetchFn = fetch, ms = 8000) {
  const corte = new AbortController();
  const t = setTimeout(() => corte.abort(), ms);
  try {
    const r = await fetchFn(URLS[fuente], { signal: corte.signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
    if (!r.ok) throw new Error("respuesta " + r.status);
    const v = (fuente === "dolarapi" ? leerDolarApi : leerBluelytics)(await r.json(), tipo);
    if (!v) throw new Error("sin el dato");
    return { ...v, fuente };
  } finally { clearTimeout(t); }
}

// Prueba la fuente elegida y después la otra. Devuelve { valor, fuente, fechaFuente } o null.
export async function buscarDolar(tipo, fuente, fetchFn = fetch, ms = 8000) {
  if (tipo === "fijo" || fuente === "manual") return null;
  const orden = [fuente, fuente === "dolarapi" ? "bluelytics" : "dolarapi"].filter((f) => tiene(f, tipo));
  for (const f of orden) {
    try { return await consultar(f, tipo, fetchFn, ms); } catch { /* sigue con la otra */ }
  }
  return null;
}

// Control de cordura: si el valor nuevo difiere más de 30% del anterior, se pide confirmación.
export const necesitaConfirmar = (nuevo, anterior) => !!anterior && Math.abs(nuevo - anterior) * 10 > anterior * 3;

// Valor del dólar para una fecha: el guardado ese día; si no, el más cercano (marcado estimado); si no, el manual.
// cotizaciones: [{ fecha, tipo, valor, fuente }]
export function valorPara(fecha, tipo, cotizaciones, manual = 0) {
  if (tipo !== "fijo") {
    const delTipo = cotizaciones.filter((c) => c.tipo === tipo).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const exacta = delTipo.find((c) => c.fecha === fecha);
    if (exacta) return { valor: exacta.valor, fecha, fuente: exacta.fuente, estimado: false };
    const antes = delTipo.filter((c) => c.fecha < fecha).pop(), despues = delTipo.find((c) => c.fecha > fecha);
    const c = antes || despues;
    if (c) return { valor: c.valor, fecha: c.fecha, fuente: c.fuente, estimado: true };
  }
  return manual > 0 ? { valor: manual, fecha, fuente: "manual", estimado: false } : null;
}

// Dólares (centavos) a pesos (centavos).
export const aPesos = (usd, valor) => Math.round(usd * valor / 100);

// Toca buscar el dólar de hoy: no es fijo ni manual, todavía no hay valor de hoy y ya pasó la hora elegida.
export function tocaActualizar(cfg, cotizaciones, hoy, hora) {
  if (cfg.tipo === "fijo" || cfg.fuente === "manual") return false;
  if (cotizaciones.some((c) => c.fecha === hoy && c.tipo === cfg.tipo)) return false;
  return hora >= (cfg.hora || "00:00");
}
