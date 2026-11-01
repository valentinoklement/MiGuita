// "Tu mes en MiGuita": lo que muestra la tarjeta para compartir al cerrar el mes.
import { cambiarMes, delMes, diasDelMes, gastosPor } from "./mes.js";

// Los números del mes. Las cuotas que se anotan solas cuentan como gasto, pero no como día anotado.
export function datosDelMes(movs, dias, mes) {
  const del = delMes(movs, mes);
  const gastos = del.filter((x) => x.tipo !== "ingreso").reduce((a, x) => a + x.monto, 0);
  const ingresos = del.filter((x) => x.tipo === "ingreso").reduce((a, x) => a + x.monto, 0);
  const anotados = new Set([...del.filter((x) => !x.cuota).map((x) => x.fecha), ...dias.filter((d) => d.fecha.slice(0, 7) === mes).map((d) => d.fecha)]);
  let mejor = 0, seguidos = 0;
  for (let d = 1; d <= diasDelMes(mes); d++) {
    seguidos = anotados.has(mes + "-" + String(d).padStart(2, "0")) ? seguidos + 1 : 0;
    mejor = Math.max(mejor, seguidos);
  }
  return { mes, gastos, ingresos, top: gastosPor(movs, mes, "categoria").slice(0, 3), diasAnotados: anotados.size, totalDias: diasDelMes(mes), mejorRacha: mejor };
}

// El mes que ya cerró y todavía no se mostró. Lo de ejemplo no cuenta. null si no hay ninguno.
export function mesParaMostrar(movs, hoy, visto) {
  const mes = cambiarMes(hoy.slice(0, 7), -1);
  if (visto >= mes) return null;
  return delMes(movs, mes).some((x) => x.tipo !== "ingreso" && !x.id.startsWith("ej_")) ? mes : null;
}

// Un chiste fijo para cada mes: siempre el mismo, así no cambia cada vez que se mira.
export function elegirDelMes(lista, mes) {
  const n = [...mes].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  return lista[n % lista.length];
}
