// Datos de ejemplo para probar la app, armados alrededor de hoy. Sin nombres ni casos personales.
// Todos los ids empiezan con "ej_" para poder quitarlos de un toque.
import { sumarDias, cambiarMes } from "../logic/mes.js";

const DIAS_ATRAS = [
  // [días antes de hoy, tipo, pesos, detalle, categoría, medio]
  [0, "gasto", 38500, "Supermercado", "super", "debito"],
  [0, "gasto", 20000, "Nafta", "auto", "mp"],
  [1, "gasto", 3800, "Café", "comida", ""],
  [1, "gasto", 12900, "Farmacia", "salud", "debito"],
  [2, "gasto", 9800, "Suscripción de música", "subs", "credito"],
  [3, "gasto", 26400, "Verdulería", "super", "efectivo"],
  [4, "gasto", 15000, "Cine", "salidas", "mp"],
  [6, "gasto", 7200, "Colectivo", "transporte", "debito"],
  [8, "gasto", 42000, "Zapatillas", "ropa", "credito"],
];

export function datosDeEjemplo(hoy) {
  const mes = hoy.slice(0, 7), anterior = cambiarMes(mes, -1);
  const movs = [];
  const sumar = (fecha, tipo, pesos, detalle, categoria, medio) =>
    movs.push({ id: "ej_" + movs.length, tipo, monto: pesos * 100, detalle, categoria, medio, fecha, ts: 1000 - movs.length, mod: 0 });

  sumar(mes + "-01", "ingreso", 620000, "Sueldo", "sueldo", "transferencia");
  DIAS_ATRAS.forEach(([d, ...resto]) => {
    const f = sumarDias(hoy, -d);
    if (f.slice(0, 7) === mes) sumar(f, ...resto);
  });
  // El mes anterior, para poder comparar en Resumen.
  sumar(anterior + "-01", "ingreso", 600000, "Sueldo", "sueldo", "transferencia");
  sumar(anterior + "-05", "gasto", 350000, "Alquiler", "servicios", "transferencia");
  sumar(anterior + "-10", "gasto", 95000, "Supermercado", "super", "debito");
  sumar(anterior + "-18", "gasto", 30000, "Cena", "comida", "mp");
  return movs;
}

// Presupuestos, metas, deudas y fijos de ejemplo. El fijo empieza el mes que viene para no anotar nada solo.
export function planDeEjemplo(hoy) {
  const mes = hoy.slice(0, 7);
  return {
    presupuestos: [
      { id: "ej_p1", categoria: "super", tope: 160000_00 },
      { id: "ej_p2", categoria: "comida", tope: 40000_00 },
      { id: "ej_p3", categoria: "salidas", tope: 30000_00 },
    ],
    metas: [
      { id: "ej_m1", nombre: "Viaje", icono: "viaje", moneda: "ARS", objetivo: 610000_00, ahorrado: 380000_00, fecha: "", ts: 1 },
      { id: "ej_m2", nombre: "Fondo de emergencia", icono: "emergencia", moneda: "USD", objetivo: 1000_00, ahorrado: 170_00, fecha: "", ts: 2 },
    ],
    deudas: [
      { id: "ej_d1", tipo: "debo", quien: "Un amigo", concepto: "Préstamo", total: 70000_00, pagado: 0, vence: "", ts: 1 },
      { id: "ej_d2", tipo: "meDeben", quien: "Una compañera", concepto: "Entradas del recital", total: 45000_00, pagado: 15000_00, vence: "", ts: 2 },
    ],
    fijos: [
      { id: "ej_f1", nombre: "Alquiler", monto: 350000_00, categoria: "servicios", medio: "transferencia", dia: 5, activo: true, desde: cambiarMes(mes, 1), hechos: [] },
      { id: "ej_f2", nombre: "Gimnasio", monto: 35000_00, categoria: "gym", medio: "debito", dia: 10, activo: false, desde: cambiarMes(mes, 1), hechos: [] },
    ],
  };
}

// Un grupo de ejemplo. Los montos del grupo van en pesos (ver src/logic/grupos.js).
export function grupoDeEjemplo(hoy) {
  const f = sumarDias(hoy, -1);
  return {
    id: "ej_g1", nombre: "Asado del sábado", moneda: "ARS", ts: 1, yo: "ej_yo", loc: false,
    miembros: [
      { id: "ej_yo", nombre: "Vos", alias: "", ts: 1, x: false },
      { id: "ej_a", nombre: "Amiga", alias: "amiga.mp", ts: 1, x: false },
      { id: "ej_b", nombre: "Amigo", alias: "", ts: 1, x: false },
    ],
    gastos: [
      { id: "ej_x1", t: "Carne y chorizos", m: 41400, p: "ej_yo", a: ["ej_yo", "ej_a", "ej_b"], sp: "eq", w: {}, f, ts: 2, x: false, por: "ej_yo" },
      { id: "ej_x2", t: "Bebidas", m: 20400, p: "ej_a", a: ["ej_yo", "ej_a", "ej_b"], sp: "eq", w: {}, f, ts: 3, x: false, por: "ej_a" },
      { id: "ej_x3", t: "Carbón, pan y postre", m: 24600, p: "ej_b", a: ["ej_yo", "ej_a", "ej_b"], sp: "eq", w: {}, f, ts: 4, x: false, por: "ej_b" },
    ],
    pagos: [],
  };
}
