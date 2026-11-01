// Cuentas del mes, según las reglas de negocio de la especificación (sección 7).

export function fechaLocal(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function sumarDias(fecha, n) {
  const [a, m, d] = fecha.split("-").map(Number);
  return fechaLocal(new Date(a, m - 1, d + n));
}

export function diasDelMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(a, m, 0).getDate();
}

export function cambiarMes(mes, n) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

export function delMes(movs, mes) {
  return movs.filter((x) => x.fecha.slice(0, 7) === mes);
}

// "hoy" de referencia para mirar un mes: hoy si es el actual, el último día si ya pasó, el primero si es futuro.
export function referencia(mes, hoy) {
  const actual = hoy.slice(0, 7);
  if (mes === actual) return hoy;
  return mes < actual ? mes + "-" + String(diasDelMes(mes)).padStart(2, "0") : mes + "-01";
}

export function resumenMes(movs, hoy) {
  const mes = hoy.slice(0, 7);
  let ingresos = 0, gastos = 0;
  for (const x of delMes(movs, mes)) {
    if (x.tipo === "ingreso") ingresos += x.monto; else gastos += x.monto;
  }
  const teQueda = ingresos - gastos;
  const dia = Number(hoy.slice(8, 10));
  const faltan = diasDelMes(mes) - dia + 1; // contando hoy
  // Por día y promedio se muestran en pesos enteros.
  const porDia = teQueda > 0 ? Math.floor(teQueda / faltan / 100) * 100 : 0;
  const queda = ingresos > 0 ? Math.max(0, 1 - gastos / ingresos) : 1; // pan francés de Inicio
  const promedio = Math.round(gastos / dia / 100) * 100; // gastado por día hasta hoy
  const proyeccion = promedio * diasDelMes(mes); // si sigue a este ritmo
  return { ingresos, gastos, teQueda, porDia, faltan, queda, promedio, proyeccion };
}

// Gasto por grupo (categoría o medio), de mayor a menor, con su parte del total.
export function gastosPor(movs, mes, campo) {
  const m = new Map();
  let total = 0;
  for (const x of delMes(movs, mes)) {
    if (x.tipo === "ingreso") continue;
    const k = x[campo] || "";
    m.set(k, (m.get(k) || 0) + x.monto);
    total += x.monto;
  }
  return [...m].map(([id, monto]) => ({ id, monto, parte: total ? monto / total : 0 })).sort((a, b) => b.monto - a.monto);
}

export function gastosPorDia(movs, mes) {
  const v = new Array(diasDelMes(mes)).fill(0);
  for (const x of delMes(movs, mes)) if (x.tipo !== "ingreso") v[Number(x.fecha.slice(8, 10)) - 1] += x.monto;
  return v;
}

// Fresca menos de 70%, pasada de 70% a menos de 90%, podrida desde 90%.
// Los presupuestos (80% pasada, 100% podrida) se suman en la etapa 3.
export function estadoMiguita(ingresos, gastos) {
  if (ingresos <= 0) return "ok";
  const r = gastos / ingresos;
  return r >= 0.9 ? "bad" : r >= 0.7 ? "mid" : "ok";
}

// Movimientos agrupados por día, del más nuevo al más viejo, con lo gastado cada día.
export function porDiaAgrupado(movs) {
  const orden = [...movs].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.ts - a.ts);
  const grupos = [];
  for (const x of orden) {
    let g = grupos[grupos.length - 1];
    if (!g || g.fecha !== x.fecha) grupos.push((g = { fecha: x.fecha, gastado: 0, movs: [] }));
    g.movs.push(x);
    if (x.tipo !== "ingreso") g.gastado += x.monto;
  }
  return grupos;
}
