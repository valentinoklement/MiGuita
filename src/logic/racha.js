// Racha de días anotados. Portado de streakInfo(), apretado() y maybeLifeline() de la app anterior.
//
// Reglas (iguales a la app anterior, salvo los premios):
// - Un día cuenta si tiene al menos un movimiento, o se marcó "No gasté hoy", o lo cubrió un salvavidas.
// - La racha cuenta hacia atrás desde hoy; si hoy todavía no se anotó, desde ayer (todavía se puede salvar).
// - Salvavidas: si ayer quedó sin anotar, antes de ayer había una racha de 2 días o más,
//   la persona está "apretada" y no se regaló otro en los últimos 30 días, ayer se cubre solo.
// - Salvavidas de regalo: quienes prueban la app reciben uno, la primera vez que se les corta una racha de 2 días o más.
//   Tapa todos los días que faltaron, hasta una semana, y no le quita lugar al salvavidas de cada 30 días.
// - Lo que se anota solo (cuotas y gastos fijos) no cuenta: no es que anotaste vos.
// - Apretada = gastó el 90% o más de lo cobrado en el mes, o pasó o está llegando (80%) al tope
//   de un presupuesto, o debe más de lo que cobra en el mes.
import { sumarDias, delMes } from "./mes.js";

export const PREMIOS = [7, 14, 21, 30, 60, 100];
export const FESTEJOS = [...PREMIOS, 200, 365];

function diferencia(a, b) {
  const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}

export function diasAnotados(movs, dias, extra = []) {
  const s = new Set();
  movs.forEach((x) => x.fecha && !x.cuota && !x.fijo && s.add(x.fecha));
  dias.forEach((x) => x.fecha && s.add(x.fecha));
  extra.forEach((f) => s.add(f));
  return s;
}

export function infoRacha(movs, dias, hoy, extra) {
  const set = diasAnotados(movs, dias, extra);
  let actual = 0, d = set.has(hoy) ? hoy : sumarDias(hoy, -1);
  while (set.has(d)) { actual++; d = sumarDias(d, -1); }
  const pasados = [...set].filter((f) => f <= hoy).sort();
  let mejor = 0, seguidos = 0, prev = null;
  for (const f of pasados) {
    seguidos = prev && diferencia(prev, f) === 1 ? seguidos + 1 : 1;
    if (seguidos > mejor) mejor = seguidos;
    prev = f;
  }
  const proximo = PREMIOS.find((p) => p > actual) || null;
  return { actual, mejor: Math.max(mejor, actual), hoyHecho: set.has(hoy), total: pasados.length, proximo };
}

// presupuestos: [{categoria, tope}] · deudas: [{restante}] solo las que "yo debo". Llegan en la etapa 3.
export function apretado(movs, hoy, presupuestos = [], deudas = [], nombreDe = (id) => id) {
  const delMesActual = delMes(movs, hoy.slice(0, 7));
  const ingresos = delMesActual.filter((x) => x.tipo === "ingreso").reduce((a, x) => a + x.monto, 0);
  const gastos = delMesActual.filter((x) => x.tipo !== "ingreso");
  const total = gastos.reduce((a, x) => a + x.monto, 0);
  const motivos = [];
  if (ingresos > 0 && total >= ingresos * 0.9) motivos.push("ya gastaste casi todo lo que cobraste");
  let pasado = null, cerca = null;
  for (const p of presupuestos) {
    if (!(p.tope > 0)) continue;
    const g = gastos.filter((x) => x.categoria === p.categoria).reduce((a, x) => a + x.monto, 0);
    if (g >= p.tope) pasado = pasado || p.categoria;
    else if (g >= p.tope * 0.8) cerca = cerca || p.categoria;
  }
  if (pasado) motivos.push("te pasaste del tope de " + nombreDe(pasado));
  else if (cerca) motivos.push("estás llegando al tope de " + nombreDe(cerca));
  if (ingresos > 0 && deudas.reduce((a, d) => a + d.restante, 0) >= ingresos) motivos.push("debés más de lo que cobrás en el mes");
  return motivos;
}

// Devuelve la fecha que hay que cubrir (ayer) o null. motivos = apretado(...)
export function salvavidasPara(movs, dias, hoy, motivos) {
  const ayer = sumarDias(hoy, -1), set = diasAnotados(movs, dias);
  if (set.has(ayer)) return null;
  let antes = 0, d = sumarDias(hoy, -2);
  while (set.has(d)) { antes++; d = sumarDias(d, -1); }
  if (antes < 2) return null;
  const ultimo = dias.filter((x) => x.salvavidas && !x.regalo).map((x) => x.fecha).sort().pop();
  if (ultimo && diferencia(ultimo, hoy) < 30) return null;
  return motivos.length ? ayer : null;
}

// Devuelve los días que tapa el salvavidas de regalo, o null si ya se usó o no hace falta.
export function regaloPara(movs, dias, hoy, tope = 7) {
  if (dias.some((x) => x.regalo)) return null;
  const set = diasAnotados(movs, dias), faltan = [];
  let d = sumarDias(hoy, -1);
  while (!set.has(d)) {
    faltan.push(d);
    if (faltan.length > tope) return null;
    d = sumarDias(d, -1);
  }
  if (!faltan.length) return null;
  let antes = 0;
  while (set.has(d)) { antes++; d = sumarDias(d, -1); }
  return antes >= 2 ? faltan : null;
}

// Festejo: si con lo anotado hoy la racha llega justo a un número de festejo.
export function festejoDeHoy(info) {
  return info.hoyHecho && FESTEJOS.includes(info.actual) ? info.actual : null;
}
