// Tu plata: un punto de partida que no es un ingreso, así no cuenta en Resumen ni en Análisis.
//   saldo: { monto (centavos), ts (cuándo se cargó), fecha "AAAA-MM-DD", listo? (ya no preguntar si un gasto estaba descontado),
//            vistas? (cuánto de lo guardado en metas ya se preguntó o se sumó), aparte? (la parte de eso que no está dentro de esta plata) }
// Desde ahí suma y resta lo que se anota después. Lo marcado como previo ya estaba incluido en el número que se cargó.
export function cuenta(saldo, m) {
  return !!saldo && !m.previo && !m.id.startsWith("ej_") && m.fecha >= saldo.fecha && m.ts >= saldo.ts;
}

export function tuPlata(saldo, movs) {
  if (!saldo) return null;
  return movs.filter((m) => cuenta(saldo, m)).reduce((a, m) => a + (m.tipo === "ingreso" ? m.monto : -m.monto), saldo.monto);
}

// Lo guardado para metas, en pesos o en dólares. Las de dólares no se restan de la plata en pesos.
export const enMetas = (metas, moneda = "ARS") => metas.filter((x) => x.moneda === moneda && !x.id.startsWith("ej_")).reduce((a, x) => a + x.ahorrado, 0);

// Lo guardado que está dentro de tu plata: ya tiene destino, así que no se puede usar.
export const apartado = (saldo, metas) => Math.max(0, enMetas(metas) - (saldo?.aparte || 0));

export function podesUsar(saldo, movs, metas) {
  return saldo ? tuPlata(saldo, movs) - apartado(saldo, metas) : null;
}

// Lo guardado sobre lo que todavía no se preguntó si está dentro de la plata cargada.
export const ahorroSinPreguntar = (saldo, metas) => (saldo ? Math.max(0, enMetas(metas) - (saldo.vistas || 0)) : 0);

// El pan del mes, de 0 a 1: de lo que tuviste para usar este mes, cuánto queda. Se llena de nuevo cuando cobrás y al cambiar de mes.
export function parteDePlata(saldo, movs, mes, metas = []) {
  if (!saldo) return 0;
  const usar = podesUsar(saldo, movs, metas);
  if (usar <= 0) return 0;
  const gastos = movs.filter((m) => cuenta(saldo, m) && m.tipo !== "ingreso" && m.fecha.startsWith(mes)).reduce((a, m) => a + m.monto, 0);
  return usar / (usar + gastos);
}

// Recién cargado el número, lo que se anota ese mismo día puede ser anterior: se pregunta hasta que digan que no.
export const hayQuePreguntar = (saldo, mov, hoy) => !!saldo && !saldo.listo && saldo.fecha === hoy && mov.fecha === hoy;
