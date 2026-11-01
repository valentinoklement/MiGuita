// Estructura de los datos guardados y sus migraciones.
// Cada cambio de estructura sube VERSION y agrega una función a MIGRACIONES (de la versión n a n+1), con su prueba.
// Una copia importada (etapa 5) también pasa por migrar().
//
// Datos: { schemaVersion, config: {...}, y una lista por cada nombre de LISTAS }
//   mov:  { id, tipo: "gasto"|"ingreso", monto (centavos), detalle, categoria (id), medio (id o ""), fecha "AAAA-MM-DD", ts, mod, fijo? }
//   dia:  { fecha, sinGasto?: true, salvavidas?: true }
//   presupuestos, metas, deudas, fijos: ver src/logic/plan.js · grupos: ver src/logic/grupos.js
//   cotización: { id: "AAAA-MM-DD|tipo", fecha, tipo, valor (centavos por dólar), fuente, hora }
//   mov en dólares además lleva usd: { monto (centavos de dólar), valor, fecha, tipo, fuente, estimado }
//   config: { categorias: {gasto, ingreso}, medios: [...], tema, movimiento, ocultar, nombre, ... }
import { categoriasIniciales, mediosIniciales } from "./categorias.js";
import { NOTIF_INICIAL } from "./avisos.js";

export const VERSION = 4;

// Nombre de cada lista guardada y su clave.
export const LISTAS = { movs: "id", dias: "fecha", presupuestos: "id", metas: "id", deudas: "id", fijos: "id", grupos: "id", cotizaciones: "id" };

const MIGRACIONES = [
  // 0 → 1: base nueva vacía, con categorías y medios por defecto.
  (d) => ({
    movs: d.movs || [],
    dias: d.dias || [],
    config: { tema: "dark", movimiento: true, ocultar: false, ...d.config, categorias: d.config?.categorias || categoriasIniciales(), medios: d.config?.medios || mediosIniciales() },
  }),
  // 1 → 2: Plan (presupuestos, metas, deudas y gastos fijos).
  (d) => ({ ...d, presupuestos: d.presupuestos || [], metas: d.metas || [], deudas: d.deudas || [], fijos: d.fijos || [] }),
  // 2 → 3: Grupos.
  (d) => ({ ...d, grupos: d.grupos || [] }),
  // 3 → 4: Ajustes (dólar, avisos y copias).
  (d) => ({
    ...d,
    cotizaciones: d.cotizaciones || [],
    config: {
      dolar: { tipo: "blue", fuente: "dolarapi", manual: 0, hora: "10:00", conversion: "diaGasto" },
      notif: structuredClone(NOTIF_INICIAL),
      copias: { auto: false, cada: "semana", ultima: "" },
      ...d.config,
    },
  }),
];

export function migrar(datos) {
  let d = { ...(datos || {}) };
  let v = Number.isInteger(d.schemaVersion) ? d.schemaVersion : 0;
  if (v > VERSION) throw new Error("Estos datos son de una versión más nueva de MiGuita. Actualizá la app.");
  while (v < VERSION) {
    d = MIGRACIONES[v](d);
    v++;
  }
  d.schemaVersion = VERSION;
  return d;
}
