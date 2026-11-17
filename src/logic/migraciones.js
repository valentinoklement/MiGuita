// Estructura de los datos guardados y sus migraciones.
// Cada cambio de estructura sube VERSION y agrega una función a MIGRACIONES (de la versión n a n+1), con su prueba.
// Una copia importada (etapa 5) también pasa por migrar().
//
// Datos: { schemaVersion, config: {...}, y una lista por cada nombre de LISTAS }
//   mov:  { id, tipo: "gasto"|"ingreso", monto (centavos), detalle, categoria (id), medio (id o ""), fecha "AAAA-MM-DD", ts, mod, fijo?, cuota?, grupo?, previo? }
//         Todo lo que mueve plata es un movimiento, y si cuenta o no para «Te queda» lo decide una sola regla: cuenta() en src/logic/saldo.js.
//   dia:  { fecha, sinGasto?: true, salvavidas?: true }
//   presupuestos, metas, deudas, fijos: ver src/logic/plan.js · grupos: ver src/logic/grupos.js · tarjetas, compras: ver src/logic/cuotas.js
//   cotización: { id: "AAAA-MM-DD|tipo", fecha, tipo, valor (centavos por dólar), fuente, hora }
//   mov en dólares además lleva usd: { monto (centavos de dólar), valor, fecha, tipo, fuente, estimado }
//   config: { categorias: {gasto, ingreso}, medios: [...], tema, movimiento, ocultar, nombre, ... }
import { categoriasIniciales, mediosIniciales, NUEVAS_V10, TAMBIEN_SE_LLAMA, RESPALDO } from "./categorias.js";
import { NOTIF_INICIAL } from "./avisos.js";
import { LEXICO_GASTO, quitarAcentos } from "./lexico.js";

export const VERSION = 10;

// Nombre de cada lista guardada y su clave.
export const LISTAS = { movs: "id", dias: "fecha", presupuestos: "id", metas: "id", deudas: "id", fijos: "id", grupos: "id", cotizaciones: "id", tarjetas: "id", compras: "id" };

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
  // 4 → 5: fijos de ingreso y fijos que preguntan antes de anotarse.
  (d) => ({ ...d, fijos: (d.fijos || []).map((f) => ({ tipo: "gasto", modo: "auto", ...f })) }),
  // 5 → 6: el medio "Mercado Pago" pasa a "Billetera virtual" (sirve también para Ualá, MODO, Naranja X…), salvo que la persona lo haya renombrado.
  (d) => ({ ...d, config: { ...d.config, medios: (d.config?.medios || []).map((m) => (m.id === "mp" && m.nombre === "Mercado Pago" ? { ...m, nombre: "Billetera virtual" } : m)) } }),
  // 6 → 7: compras en cuotas y tarjetas.
  (d) => ({ ...d, tarjetas: d.tarjetas || [], compras: d.compras || [] }),
  // 7 → 8: tomar alcohol pasa de Comer afuera a Salidas. Lo ya anotado queda como está, y lo que la persona corrigió a mano se sigue respetando.
  (d) => {
    const gasto = d.config?.categorias?.gasto;
    if (!gasto) return d;
    const pasan = ["bar", "birra", "cerveza"];
    return { ...d, config: { ...d.config, categorias: { ...d.config.categorias, gasto: gasto.map((c) =>
      c.id === "comida" ? { ...c, claves: c.claves.filter((k) => !pasan.includes(k)) } :
      c.id === "salidas" ? { ...c, claves: [...c.claves, ...pasan.filter((k) => !c.claves.includes(k))] } : c) } } };
  },
  // 8 → 9: Verdulería y Panadería salen del súper, y entre los ingresos «Trabajo/changas» pasa antes que «Sueldo» (la mayoría no cobra un sueldo fijo).
  (d) => {
    const cats = d.config?.categorias;
    if (!cats?.gasto || !cats?.ingreso) return d;
    const base = categoriasIniciales(), pasan = ["verdu", "verduleria", "verdulería", "fruta"];
    const plano = (s) => quitarAcentos(s).trim();
    let gasto = cats.gasto.map((c) => (c.id === "super" ? { ...c, claves: c.claves.filter((k) => !pasan.includes(k)) } : c));
    for (const id of ["panaderia", "verduleria"]) {
      if (gasto.some((c) => c.id === id)) continue;
      const nueva = base.gasto.find((c) => c.id === id);
      // Si la persona ya se había hecho una con ese nombre, no se duplica: la suya aprende las palabras.
      const suya = gasto.find((c) => plano(c.nombre) === plano(nueva.nombre));
      if (suya) { suya.claves = [...new Set([...suya.claves, ...nueva.claves, ...LEXICO_GASTO[id]])].slice(0, 60); continue; }
      const i = gasto.findIndex((c) => c.id === "carne");
      gasto = [...gasto.slice(0, i + 1), nueva, ...gasto.slice(i + 1)];
    }
    let ingreso = cats.ingreso.map((c) => c.id === "extra" && c.nombre === "Extra/freelance" ? { ...c, nombre: "Trabajo/changas", claves: [...new Set(["trabajo", "laburo", ...c.claves, "bono"])] } :
      c.id === "sueldo" ? { ...c, claves: c.claves.filter((k) => k !== "pago" && k !== "cobro") } : c);
    const ie = ingreso.findIndex((c) => c.id === "extra"), is = ingreso.findIndex((c) => c.id === "sueldo");
    if (ie > is && is >= 0) ingreso = [...ingreso.slice(0, is), ingreso[ie], ...ingreso.slice(is, ie), ...ingreso.slice(ie + 1)];
    return { ...d, config: { ...d.config, categorias: { ...cats, gasto, ingreso } } };
  },
  // 9 → 10: categorías «Trabajo/insumos», «Mascotas», «Casa/hogar» y «Pago de tarjeta» (respeta lo que cada uno renombró o creó), y el orden de las metas
  // pasa a config.metasOrden: así cambiar la prioridad en un dispositivo no pisa la plata que otro le sumó a esa meta.
  (d) => {
    const cats = d.config?.categorias;
    let config = d.config || {};
    if (cats?.gasto) {
      const base = categoriasIniciales(), plano = (s) => quitarAcentos(s).trim();
      const pasan = base.gasto.filter((c) => NUEVAS_V10.includes(c.id)).flatMap((c) => c.claves).map(plano);
      // Lo que pasa a una categoría nueva sale de donde estaba por defecto (la ferretería estaba en Servicios).
      let gasto = cats.gasto.map((c) => (c.id === "servicios" ? { ...c, claves: c.claves.filter((k) => !pasan.includes(plano(k))) } : c));
      for (const id of NUEVAS_V10) {
        if (gasto.some((c) => c.id === id)) continue;
        const nueva = base.gasto.find((c) => c.id === id);
        const nombres = [plano(nueva.nombre), plano(nueva.nombre.split("/")[0]), ...(TAMBIEN_SE_LLAMA[id] || [])];
        const suya = gasto.find((c) => nombres.includes(plano(c.nombre)));
        if (suya) { gasto = gasto.map((c) => (c === suya ? { ...c, claves: [...new Set([...c.claves, ...nueva.claves, ...LEXICO_GASTO[id]])].slice(0, 60) } : c)); continue; }
        const i = gasto.findIndex((c) => c.id === RESPALDO.gasto);
        gasto = i < 0 ? [...gasto, nueva] : [...gasto.slice(0, i), nueva, ...gasto.slice(i)];
      }
      config = { ...config, categorias: { ...cats, gasto } };
    }
    const metas = d.metas || [];
    if (metas.some((m) => m.orden !== undefined)) {
      const ids = [...metas].sort((a, b) => (a.orden ?? Infinity) - (b.orden ?? Infinity) || a.ts - b.ts).map((m) => m.id);
      config = { ...config, metasOrden: config.metasOrden || { ids, mod: 0 } };
    }
    return { ...d, config, metas: metas.map(({ orden, ...m }) => m) };
  },
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
