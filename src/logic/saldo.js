// Tu plata: un punto de partida que no es un ingreso, así no cuenta en Resumen ni en Análisis.
//   saldo: { monto (centavos), ts (cuándo se cargó), fecha "AAAA-MM-DD", listo? (ya no preguntar si un gasto estaba descontado),
//            vistas? (cuánto de lo guardado en metas ya se preguntó o se sumó), aparte? (la parte de eso que no está dentro de esta plata), mod? }
//
// LA ÚNICA REGLA de «Te queda». Todo lo que mueve plata (anotar, deudas, grupos, cuotas, fijos, metas, importar) termina en un
// movimiento, y acá se decide si ese movimiento cuenta. Ningún otro archivo lo decide por su cuenta (lo comprueba tests/plata.test.mjs):
//   · cuenta lo que pasó después de cargar la plata: con fecha posterior, o del mismo día pero anotado después (ts);
//   · no cuenta lo marcado como previo (la persona dijo que ya estaba en el número, o salió de otra plata), ni lo de ejemplo;
//   · no cuenta lo comprado con tarjeta de crédito: la plata sale cuando se paga la tarjeta (ver logic/tarjeta.js);
//   · sin plata cargada, cuenta todo desde el mes del primer ingreso (saldoEfectivo).
import { esDeCredito, idsDeTarjeta, paraGastos, tarjetaDelMes } from "./tarjeta.js";

export function cuenta(saldo, m) {
  if (!saldo || m.previo || m.id.startsWith("ej_") || esDeCredito(m)) return false;
  if (saldo.implicito) return m.fecha >= saldo.fecha;
  return m.fecha > saldo.fecha || (m.fecha === saldo.fecha && m.ts >= saldo.ts);
}

// Por qué un movimiento no mueve «Te queda», para decírselo a la persona. "" si lo mueve o si no hay nada que explicar.
export function porQueNoCuenta(saldo, m) {
  if (!saldo || m.id.startsWith("ej_") || cuenta(saldo, m)) return "";
  if (esDeCredito(m)) return "es con tarjeta de crédito, así que sale de tu plata cuando pagues la tarjeta";
  if (m.previo) return "ya estaba contado";
  return saldo.implicito ? "es de antes de tu primer ingreso" : "es de antes de que cargaras tu plata";
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
// «De cuánto» es la plata que hubo: lo comprado con crédito todavía no salió, y lo pagado de compras de antes con la tarjeta sí.
// neto: lo que la tarjeta cambió la cuenta este mes (lo comprado con crédito menos lo pagado de compras con crédito).
// ids: las categorías que son pagar la tarjeta (idsDeTarjeta); sin ellas, solo «Pago de tarjeta».
export function enElMes(saldo, movs, mes, metas = [], ids = idsDeTarjeta()) {
  const usar = podesUsar(saldo, movs, metas), gastado = delMesReal(paraGastos(movs, ids), mes, false), tarjeta = tarjetaDelMes(movs, mes, ids);
  const neto = tarjeta.compras - tarjeta.pagado;
  return { usar, gastado, hubo: usar + gastado - neto, neto, tarjeta };
}
// «Gastaste X de Y» solo cuando la cuenta da: Y − X = lo que te queda. Con la tarjeta en el medio a veces no da, y entonces no se dice «de».
export const deCuanto = (e) => (e.neto === 0 && e.hubo > 0 ? e.hubo : null);

// El pan del mes, de 0 a 1: de lo que tuviste para usar este mes, cuánto queda. Se llena de nuevo cuando cobrás y al cambiar de mes.
export function parteDePlata(saldo, movs, mes, metas = [], ids = idsDeTarjeta()) {
  if (!saldo) return 0;
  const { usar, hubo } = enElMes(saldo, movs, mes, metas, ids);
  return usar <= 0 ? 0 : usar / hubo;
}

// De dónde sale el número de Inicio, siempre con lo de este mes: con qué se empezó, qué entró, qué se gastó y qué quedó.
// Con qué se empezó sale de la cuenta, así cierra siempre, aunque la plata se haya cargado a mitad de mes o en otro mes.
// Con tarjeta de crédito hay un renglón más, «tarjeta»: lo comprado con crédito este mes todavía no salió de la plata, y lo pagado de
// compras con crédito de antes sí salió aunque no sea gasto de este mes. Así «Gastaste» es el mismo número que el resto de Resumen.
// Lo devuelto a la tarjeta no entra en «Te entró»: no llegó a la plata.
//   tenias + entro − gasto + tarjeta − metas = queda
export function desglose(saldo, movs, metas, mes, ids = idsDeTarjeta()) {
  if (!saldo) return null;
  const { usar, gastado, neto, tarjeta: t } = enElMes(saldo, movs, mes, metas, ids), entro = delMesReal(movs, mes, true) - t.devuelto, paraMetas = apartado(saldo, metas);
  return { tenias: usar + paraMetas + gastado - neto - entro, entro, gasto: gastado, tarjeta: neto, debeTarjeta: t.debe, metas: paraMetas, queda: usar };
}

// Al cargar la plata por primera vez puede haber cosas ya anotadas este mes: hay que preguntar si ese número ya las tiene en cuenta.
// Lo comprado con crédito no entra: no tocó la plata, esté o no en ese número.
export function anotadoAntes(movs, mes) {
  const lista = movs.filter((m) => !m.previo && !m.id.startsWith("ej_") && !esDeCredito(m) && m.fecha.startsWith(mes));
  const suma = (t) => lista.filter((m) => (m.tipo === "ingreso") === (t === "ingreso")).reduce((a, m) => a + m.monto, 0);
  return { lista, gastos: suma("gasto"), ingresos: suma("ingreso") };
}

// «No, todavía no estaba restado»: el punto de partida se corre a antes del primer movimiento, así el orden en que se anotó no importa.
// Nunca queda con una hora del futuro (lo que se anota solo trae la hora de su día): si no, lo que se anote enseguida no contaría.
export function saldoDesde(monto, lista, ahora = Date.now()) {
  return { monto, ts: Math.min(ahora, ...lista.map((m) => m.ts)), fecha: lista.map((m) => m.fecha).sort()[0], listo: true };
}

// Cargar o corregir la plata: ese número es lo que hay ahora, así que todo lo ya anotado queda adentro.
// Devuelve la plata nueva y los movimientos que hay que marcar como previos: los que por su hora o su fecha seguirían contando
// (lo que se anota solo trae la hora de su día, y una juntada puede tener fecha futura).
// Lo que ya se contestó sobre los ahorros de las metas sigue valiendo.
export function plataNueva(viejo, monto, movs, hoy, ahora = Date.now()) {
  const saldo = { monto, ts: ahora, fecha: hoy, ...(viejo?.vistas !== undefined && { vistas: viejo.vistas }), ...(viejo?.aparte !== undefined && { aparte: viejo.aparte }) };
  return { saldo, previos: movs.filter((m) => cuenta(saldo, m)) };
}

/* ---------- las metas y la plata cargada ---------- */
// Sumar a una meta mueve plata que ya se tiene: con la plata cargada, queda apartada (baja lo que te queda) sin preguntar nada.
export function sumarAMeta(saldo, meta, monto) {
  const adentro = !!saldo && !saldo.implicito && meta.moneda === "ARS" && !meta.id.startsWith("ej_");
  return { meta: { ...meta, ahorrado: meta.ahorrado + monto }, saldo: adentro ? { ...saldo, vistas: (saldo.vistas || 0) + monto } : saldo };
}
// Si bajó lo guardado en metas (se borró una, se editó), lo apartado no puede ser más que lo que hay. Devuelve la misma plata si no cambia.
export function ahorrosAlDia(saldo, metas) {
  const total = enMetas(metas);
  if (!saldo || ((saldo.vistas || 0) <= total && (saldo.aparte || 0) <= total)) return saldo;
  return { ...saldo, vistas: Math.min(saldo.vistas || 0, total), aparte: Math.min(saldo.aparte || 0, total) };
}
// La respuesta a «¿lo que guardaste para tus metas está dentro de tu plata?».
export const responderAhorro = (saldo, metas, aparte) => ({ ...saldo, vistas: enMetas(metas), aparte: (saldo.aparte || 0) + (aparte ? ahorroSinPreguntar(saldo, metas) : 0) });

// Recién cargado el número, lo que se anota ese mismo día puede ser anterior: se pregunta hasta que digan que no.
// Lo comprado con crédito no: no resta de la plata, así que no hay nada que preguntar.
export const hayQuePreguntar = (saldo, mov, hoy) => !!saldo && !saldo.listo && saldo.fecha === hoy && mov.fecha === hoy && !esDeCredito(mov);

/* ---------- sacar plata de una meta ---------- */
// La plata sale de la meta y vuelve a estar para usar. Si además ya se gastó, la app anota ese gasto como cualquier otro:
// sale lo mismo que entró y «Te queda» no cambia. Devuelve cómo quedan la meta y la plata cargada (la misma si no cambia).
//   · Meta en pesos con la plata cargada: lo guardado que estaba adentro vuelve solo (deja de estar apartado); lo que estaba
//     aparte entra a la plata (sube el número cargado).
//   · Meta en dólares, de ejemplo o sin plata cargada: lo guardado nunca estuvo en el número, así que solo baja la meta.
export function sacarDeMeta(saldo, metas, meta, monto) {
  const m = { ...meta, ahorrado: meta.ahorrado - monto };
  if (!saldo || saldo.implicito || meta.moneda !== "ARS" || meta.id.startsWith("ej_")) return { meta: m, saldo };
  const total = enMetas(metas), aparte = Math.min(saldo.aparte || 0, total), adentro = total - aparte;
  const deAparte = monto - Math.min(monto, adentro);
  return { meta: m, saldo: { ...saldo, monto: saldo.monto + deAparte, aparte: aparte - deAparte, vistas: Math.min(saldo.vistas || 0, total - monto) } };
}
// ¿El gasto de lo que se sacó de una meta tiene que quedar fuera de «Te queda»? Sí cuando esa plata nunca estuvo ahí: dólares.
export const gastoDeMetaAparte = (meta) => meta.moneda === "USD";
// Lo que la pantalla le promete a la persona antes de sacar: "vuelve" (sube lo que te queda), "igual" (no cambia) o "resta" (baja).
export function efectoDeSacar(saldo, meta, gasto) {
  const adentro = !!saldo && !saldo.implicito && meta.moneda === "ARS" && !meta.id.startsWith("ej_");
  if (meta.id.startsWith("ej_")) return "igual";
  if (adentro) return gasto ? "igual" : "vuelve";
  if (meta.moneda === "USD" || !saldo) return "igual";
  return gasto ? "resta" : "igual";
}
