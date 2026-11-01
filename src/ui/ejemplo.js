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
    tarjetas: [{ id: "ej_t1", nombre: "Visa", ts: 1 }, { id: "ej_t2", nombre: "Mastercard", ts: 2 }],
    // Las cuotas ya pagas no se anotan y la próxima es el mes que viene: el ejemplo no anota nada solo.
    compras: [
      { id: "ej_c1", tarjeta: "ej_t1", detalle: "Heladera", categoria: "otros", total: 600000_00, cuotas: 6, desde: cambiarMes(mes, -1), dia: 10, previas: 2, hechas: 2, ts: 1, mod: 1 },
      { id: "ej_c2", tarjeta: "ej_t1", detalle: "Zapatillas", categoria: "ropa", total: 90000_00, cuotas: 3, desde: mes, dia: 10, previas: 1, hechas: 1, ts: 2, mod: 2 },
      { id: "ej_c3", tarjeta: "ej_t2", detalle: "Celular", categoria: "otros", total: 480000_00, cuotas: 12, desde: cambiarMes(mes, -2), dia: 10, previas: 3, hechas: 3, ts: 3, mod: 3 },
    ],
  };
}

// Un grupo de ejemplo. Los montos del grupo van en pesos (ver src/logic/grupos.js).
export function grupoDeEjemplo(hoy) {
  const f = sumarDias(hoy, -1);
  return {
    id: "ej_g1", nombre: "Los amigos", moneda: "ARS", ts: 1, yo: "ej_yo", loc: false,
    miembros: [
      { id: "ej_yo", nombre: "Vos", alias: "", ts: 1, x: false },
      { id: "ej_a", nombre: "Amiga", alias: "amiga.mp", ts: 1, x: false },
      { id: "ej_b", nombre: "Amigo", alias: "amigo.mp", ts: 1, x: false },
      { id: "ej_c", nombre: "Vecina", alias: "", ts: 1, x: false },
    ],
    juntadas: [{ id: "ej_j1", nombre: "Asado del sábado", f, gente: ["ej_yo", "ej_a", "ej_b", "ej_c"], ts: 1, x: false }],
    gastos: [
      { id: "ej_x1", t: "Carne y chorizos", m: 41400, p: "ej_a", a: ["ej_yo", "ej_a", "ej_b", "ej_c"], sp: "eq", w: {}, f, ts: 2, x: false, por: "ej_a", j: "ej_j1" },
      { id: "ej_x2", t: "Fernet", m: 18000, p: "ej_b", a: ["ej_yo", "ej_a", "ej_b"], sp: "eq", w: {}, f, ts: 3, x: false, por: "ej_b", j: "ej_j1" },
      { id: "ej_x3", t: "Birra", m: 9600, p: "ej_yo", a: ["ej_b", "ej_c"], sp: "eq", w: {}, f, ts: 4, x: false, por: "ej_yo", j: "ej_j1" },
      { id: "ej_x4", t: "Carbón y pan", m: 8000, p: "ej_yo", a: ["ej_yo", "ej_a", "ej_b", "ej_c"], sp: "eq", w: {}, f, ts: 5, x: false, por: "ej_yo", j: "ej_j1" },
    ],
    pagos: [],
    hist: [
      { id: "ej_h1", ts: Date.now() - 864e5, por: "ej_a", q: "a", k: "j", o: "ej_j1", t: "Asado del sábado", j: "ej_j1" },
      { id: "ej_h2", ts: Date.now() - 86e6, por: "ej_a", q: "a", k: "g", o: "ej_x1", t: "Carne y chorizos", j: "ej_j1", m: 41400 },
      { id: "ej_h3", ts: Date.now() - 85e6, por: "ej_b", q: "c", k: "g", o: "ej_x2", t: "Fernet", j: "ej_j1", m: 18000, m0: 15000 },
    ],
  };
}
