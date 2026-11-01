// Tu plata: un punto de partida que no es un ingreso, así no cuenta en Resumen ni en Análisis.
//   saldo: { monto (centavos), ts (cuándo se cargó), fecha "AAAA-MM-DD", listo? (ya no preguntar si un gasto estaba descontado) }
// Desde ahí suma y resta lo que se anota después. Lo marcado como previo ya estaba incluido en el número que se cargó.
export function cuenta(saldo, m) {
  return !!saldo && !m.previo && !m.id.startsWith("ej_") && m.fecha >= saldo.fecha && m.ts >= saldo.ts;
}

export function tuPlata(saldo, movs) {
  if (!saldo) return null;
  return movs.filter((m) => cuenta(saldo, m)).reduce((a, m) => a + (m.tipo === "ingreso" ? m.monto : -m.monto), saldo.monto);
}

// Recién cargado el número, lo que se anota ese mismo día puede ser anterior: se pregunta hasta que digan que no.
export const hayQuePreguntar = (saldo, mov, hoy) => !!saldo && !saldo.listo && saldo.fecha === hoy && mov.fecha === hoy;
