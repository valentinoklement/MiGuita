// Reglas de los avisos (especificación, sección 4). Iguales para el aviso dentro de la app y para el servicio
// que los manda con la app cerrada.
//   notif: { cantidad: 0..3, horas: ["13:00", ...], forma: "sonido"|"silencio", tipos: { dia, racha, presupuesto },
//            noMolestar: { activo, desde, hasta } }

export const NOTIF_INICIAL = { cantidad: 1, horas: ["21:00", "13:00", "18:00"], forma: "sonido", tipos: { dia: true, racha: true, presupuesto: true }, noMolestar: { activo: false, desde: "23:00", hasta: "08:00" } };

// ¿La hora cae dentro de "no molestar"? La franja puede cruzar la medianoche (23:00 a 08:00).
export function enNoMolestar(nm, hora) {
  if (!nm?.activo || nm.desde === nm.hasta) return false;
  return nm.desde < nm.hasta ? hora >= nm.desde && hora < nm.hasta : hora >= nm.desde || hora < nm.hasta;
}

// Avisos de hoy, a lo sumo 3, ordenados por hora.
// estado: { hoyHecho, racha, presupuestos: [nombre de categoría que cruzó el 90% y no se avisó este mes], ahora: "HH:MM" }
export function avisosDeHoy(notif, estado) {
  const lista = [];
  if (notif.tipos.dia && !estado.hoyHecho)
    notif.horas.slice(0, notif.cantidad).forEach((h) => lista.push({ hora: h, tipo: "dia", texto: "¿Anotaste tus gastos de hoy?" }));
  if (notif.tipos.racha && estado.racha >= 3 && !estado.hoyHecho && !lista.some((a) => a.hora === "21:00"))
    lista.push({ hora: "21:00", tipo: "racha", texto: "Tu racha de " + estado.racha + " días se corta si hoy no anotás nada." });
  if (notif.tipos.presupuesto)
    (estado.presupuestos || []).forEach((c) => lista.push({ hora: estado.ahora, tipo: "presupuesto", texto: "Ya usaste el 90% del presupuesto de " + c + "." }));
  return lista.filter((a) => !enNoMolestar(notif.noMolestar, a.hora)).sort((a, b) => a.hora.localeCompare(b.hora)).slice(0, 3);
}

// Presupuestos que cruzaron el 90% este mes y todavía no se avisaron. avisados: ["AAAA-MM|categoria"]
export function presupuestosPorAvisar(estados, mes, avisados = []) {
  return estados.filter((e) => e.uso >= 0.9 && !avisados.includes(mes + "|" + e.categoria)).map((e) => e.categoria);
}
