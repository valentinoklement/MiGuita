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
export const apartado = (saldo, metas) => (saldo?.implicito ? 0 : Math.max(0, enMetas(metas) - (saldo?.aparte || 0)));

// Sin plata cargada, lo primero que entra hace de punto de partida: desde el mes de ese ingreso todo suma y resta, y lo que sobra pasa al mes siguiente.
export function saldoEfectivo(saldo, movs) {
  if (saldo) return saldo;
  const primero = movs.filter((m) => m.tipo === "ingreso" && !m.id.startsWith("ej_")).map((m) => m.fecha).sort()[0];
  return primero ? { monto: 0, ts: 0, fecha: primero.slice(0, 7) + "-01", implicito: true } : null;
}

export function podesUsar(saldo, movs, metas) {
  return saldo ? tuPlata(saldo, movs) - apartado(saldo, metas) : null;
}

// Lo guardado sobre lo que todavía no se preguntó si está dentro de la plata cargada.
export const ahorroSinPreguntar = (saldo, metas) => (saldo ? Math.max(0, enMetas(metas) - (saldo.vistas || 0)) : 0);

const delMesReal = (movs, mes, ingreso) => movs.filter((m) => !m.id.startsWith("ej_") && (m.tipo === "ingreso") === ingreso && m.fecha.startsWith(mes)).reduce((a, m) => a + m.monto, 0);

// Lo del mes para mostrar en Inicio: cuánto se gastó y de cuánto («gastaste 20.000 de 100.000»).
// Cuenta todo lo gastado en el mes, también lo anotado antes de cargar la plata: es el mismo número que muestra Resumen.
export function enElMes(saldo, movs, mes, metas = []) {
  const usar = podesUsar(saldo, movs, metas), gastado = delMesReal(movs, mes, false);
  return { usar, gastado, hubo: usar + gastado };
}

// El pan del mes, de 0 a 1: de lo que tuviste para usar este mes, cuánto queda. Se llena de nuevo cuando cobrás y al cambiar de mes.
export function parteDePlata(saldo, movs, mes, metas = []) {
  if (!saldo) return 0;
  const { usar, hubo } = enElMes(saldo, movs, mes, metas);
  return usar <= 0 ? 0 : usar / hubo;
}

// De dónde sale el número de Inicio, siempre con lo de este mes: con qué se empezó, qué entró, qué se gastó y qué quedó.
// Con qué se empezó sale de la cuenta, así cierra siempre, aunque la plata se haya cargado a mitad de mes o en otro mes.
export function desglose(saldo, movs, metas, mes) {
  if (!saldo) return null;
  const { usar, gastado } = enElMes(saldo, movs, mes, metas), entro = delMesReal(movs, mes, true), paraMetas = apartado(saldo, metas);
  return { tenias: usar + paraMetas + gastado - entro, entro, gasto: gastado, metas: paraMetas, queda: usar };
}

// Al cargar la plata por primera vez puede haber cosas ya anotadas este mes: hay que preguntar si ese número ya las tiene en cuenta.
export function anotadoAntes(movs, mes) {
  const lista = movs.filter((m) => !m.previo && !m.id.startsWith("ej_") && m.fecha.startsWith(mes));
  const suma = (t) => lista.filter((m) => (m.tipo === "ingreso") === (t === "ingreso")).reduce((a, m) => a + m.monto, 0);
  return { lista, gastos: suma("gasto"), ingresos: suma("ingreso") };
}

// «No, todavía no estaba restado»: el punto de partida se corre a antes del primer movimiento, así el orden en que se anotó no importa.
export function saldoDesde(monto, lista) {
  return { monto, ts: Math.min(...lista.map((m) => m.ts)), fecha: lista.map((m) => m.fecha).sort()[0], listo: true };
}

// Recién cargado el número, lo que se anota ese mismo día puede ser anterior: se pregunta hasta que digan que no.
export const hayQuePreguntar = (saldo, mov, hoy) => !!saldo && !saldo.listo && saldo.fecha === hoy && mov.fecha === hoy;
