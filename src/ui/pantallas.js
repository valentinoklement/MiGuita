// Pantallas de MiGuita. Cada función devuelve HTML; los textos de la persona pasan siempre por esc().
import { AYUDAS } from "./ayuda.js";
import { apartado, podesUsar, ahorroSinPreguntar, parteDePlata, tuPlata, enElMes, deCuanto, desglose, saldoEfectivo } from "../logic/saldo.js";
import { navegadorActual } from "./primera.js";
import { puedeGrabar } from "./voz.js";
import { Art } from "../art/art.js";
import { COLORES_PLATA } from "../art/extra.js";
import { limpiar as limpiarPlatas, vistas as vistasPlata, elegirVista, totalDe, enPesos, etiquetaDe, letraDe } from "../logic/platas.js";
import { formatear, evaluar } from "../logic/dinero.js";
import { RESPALDO, BILLETERAS, BILLETERA_GENERAL } from "../logic/categorias.js";
import { sumarDias, cambiarMes, delMes, referencia, resumenMes, gastosPor, gastosPorDia, estadoMiguita, porDiaAgrupado } from "../logic/mes.js";
import { infoRacha, apretado, PREMIOS } from "../logic/racha.js";
import { estadoPresupuestos, estadoConPresupuestos, resumenDeudas, restante, fijosPorConfirmar, mesPendiente } from "../logic/plan.js";
import { valorPara, aPesos, nombreTipo } from "../logic/dolar.js";
import { mesParaMostrar } from "../logic/tumes.js";
import { EN_PRUEBA } from "../logic/buzon.js";
import { ICONO_BILLETERA } from "./importar.js";
import { idsDeTarjeta, paraGastos, sinCubrir, comprasPosibles, pagoParaElegir, pagoParaSaldar, restoSiEligen } from "../logic/tarjeta.js";
import { repetidos } from "../logic/repetidos.js";
import { limpiarDibujo, caminoDe, puntosDe, COLORES_DIBUJO, NOMBRES_COLOR, ANCHO, ALTO, ANCHO_COLOR, ANCHO_LINEA, MAX_TRAZOS, MAX_PUNTOS } from "../logic/iconos.js";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const PREMIO_TEXTO = { 7: "un miñón", 14: "un cañoncito", 21: "medialunas", 30: "una pastafrola", 60: "un pan dulce", 100: "una torta" };
const DIAS_BOTON_TUTORIAL = 14;
const TARJETA_SIGUE = "Lo que compraste con crédito y todavía no pagaste. Sigue en tu plata hasta que pagues la tarjeta.";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ---------- ayudas ---------- */
export function crearVistas(st, hoy) {
  const plata = (c, o = {}) => formatear(c, { ...o, oculto: st.cfg.ocultar });
  const cat = (id) => st.cfg.categorias.gasto.find((c) => c.id === id) || st.cfg.categorias.ingreso.find((c) => c.id === id);
  const nombreCat = (id) => cat(id)?.nombre || "Otros";
  // El ícono de una categoría: el que eligió o dibujó la persona, o el de siempre. Todas las pantallas lo sacan de acá.
  const iconoDe = (id) => Art.iconoDeCategoria(cat(id) || { id });
  const nombreMedio = (id) => st.cfg.medios.find((m) => m.id === id)?.nombre || "";
  const mesTexto = (mes) => MESES[Number(mes.slice(5, 7)) - 1];

  function nombreDia(fecha, largo) {
    const [a, m, d] = fecha.split("-").map(Number);
    const base = DIAS[new Date(a, m - 1, d).getDay()] + " " + d + (largo ? " " + MESES[m - 1].slice(0, 3).toLowerCase() : "");
    if (fecha === hoy) return largo ? "Hoy · " + base : "hoy";
    if (fecha === sumarDias(hoy, -1)) return largo ? "Ayer · " + base : "ayer";
    return largo ? base[0].toUpperCase() + base.slice(1) : base;
  }

  const back = (t) => `<button class="back" data-act="volver">‹ ${esc(t)}</button>`;
  const preg = (clave) => `<button class="preg" data-act="ayuda" data-v="${clave}" aria-label="¿Cómo funciona esto?">?</button>`;
  const hdr = (small, titulo, estado, ayuda) => `<div class="top"><div><small>${small}</small><h1>${titulo}${ayuda ? preg(ayuda) : ""}</h1></div>${estado ? Art.miguita(estado) : ""}</div>`;
  const lbl = (t) => `<div class="sec">${t}</div>`;
  const crd = (inner, cls = "") => `<div class="card pp ${cls}">${inner}</div>`;
  const mesNav = () => `<button class="mbtn" data-act="mes" data-v="-1" aria-label="Mes anterior">‹</button>${mesTexto(st.mes)}<button class="mbtn" data-act="mes" data-v="1" aria-label="Mes siguiente">›</button>`;

  function chips(act, opciones, elegido, etiqueta) {
    return `<div class="chips" role="group" aria-label="${etiqueta}">` + opciones.map(([v, t]) =>
      `<button class="pp" data-act="${act}" data-v="${esc(v)}" aria-pressed="${v === elegido}">${esc(t)}</button>`).join("") + "</div>";
  }
  const interruptor = (act, on, etiqueta, v = "") =>
    `<button class="sw pp" role="switch" aria-checked="${on}" aria-label="${esc(etiqueta)}" data-act="${act}" data-v="${esc(v)}"><i></i></button>`;

  function fila(x, primera, sub) {
    const neg = x.tipo === "gasto";
    return `<button class="row rowb${primera ? " f" : ""}" data-act="editar" data-v="${esc(x.id)}"><span>${esc(x.detalle || nombreCat(x.categoria))}<small>${esc(sub(x))}</small></span>` +
      `<span class="${neg ? "neg" : "pos"}">${plata(neg ? -x.monto : x.monto, { signo: true })}</span></button>`;
  }
  const enUsd = (x) => x.usd ? " · " + formatear(x.usd.monto, { moneda: "US$ ", oculto: st.cfg.ocultar }) : "";
  const subInicio = (x) => nombreCat(x.categoria) + " · " + nombreDia(x.fecha) + enUsd(x);
  const subLista = (x) => [nombreCat(x.categoria), nombreMedio(x.medio)].filter(Boolean).join(" · ") + enUsd(x);
  const dolarDe = (fecha) => valorPara(fecha, st.cfg.dolar.tipo, st.cotizaciones, st.cfg.dolar.manual);

  const hayEjemplo = () => ["movs", "presupuestos", "metas", "deudas", "fijos", "compras"].some((k) => st[k].some((x) => x.id.startsWith("ej_")));
  // Lo que cuenta como gastado: sin contar dos veces una compra con crédito y el pago de la tarjeta (ver logic/tarjeta.js).
  // Todo lo que suma gastos usa esta lista; la lista de movimientos muestra cada uno tal cual se anotó.
  const idsTarjeta = () => idsDeTarjeta(st.cfg.categorias);
  const movsGasto = () => paraGastos(st.movs, idsTarjeta());

  // Estado de Miguita del mes: el peor entre gasto sobre ingresos y los presupuestos.
  function estadoDelMes(mes, r) {
    return estadoConPresupuestos(estadoMiguita(r.ingresos, r.gastos), estadoPresupuestos(st.presupuestos, movsGasto(), mes));
  }
  const motivosApretado = () => apretado(movsGasto(), hoy, st.presupuestos,
    resumenDeudas(st.deudas, hoy).activas.filter((d) => d.tipo === "debo").map((d) => ({ restante: restante(d) })), nombreCat);

  const MIC = '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>';

  // Instalar va primero: sin el ícono en el celu, la gente se olvida de la app. «Ahora no» lo guarda una semana.
  function cartelInstalar() {
    const celu = navegadorActual().so, real = (x) => !x.id.startsWith("ej_");
    if (celu === "compu" || matchMedia("(display-mode: standalone)").matches || navigator.standalone) return "";
    if (typeof st.cfg.instalarVisto === "string" && sumarDias(st.cfg.instalarVisto, 7) > hoy) return "";
    const luego = `<button class="pp" data-act="instalarLuego">Ahora no</button>`;
    const verComo = `<div class="chips"><button class="pp" data-act="abrir" data-v="instalar" aria-pressed="true">Ver cómo</button>${luego}</div>`;
    if (st.puedeInstalar) return crd(`<b class="pregunta">Instalá MiGuita en tu celu</b><div class="sub">Un toque y la tenés con su ícono, como cualquier app.</div><div class="chips"><button class="pp" data-act="instalarYa" aria-pressed="true">Instalar</button>${luego}</div>`, "aviso");
    if (!st.movs.some(real) && !st.grupos.some(real)) return "";
    if (celu === "iphone") return crd(`<b class="pregunta">Instalala para no perder lo anotado</b><div class="sub">En el iPhone, Safari puede borrar lo que anotaste si pasás unos días sin entrar. Con el ícono, no.</div>${verComo}`, "aviso");
    return crd(`<b class="pregunta">Tenela a mano en tu celu</b><div class="sub">Instalala y se abre desde un ícono, como cualquier app.</div>${verComo}`, "aviso");
  }

  /* ---------- la tarjeta del número de Inicio ---------- */
  // Con una sola plata es un botón que lleva al detalle. Con varias, arriba del número van los puntitos de colores y tocarlo pasa a la siguiente.
  function tarjetaPlata(conPlata, r, actual, guiando, saldo) {
    const platas = limpiarPlatas(st.cfg.platas);
    const vs = (st.vistasPlata = actual && !guiando ? vistasPlata(platas, { conPesos: conPlata }) : ["pesos"]);
    const vista = elegirVista(vs, st.cfg.vistaPlata), varias = vs.length > 1, pos = vs.indexOf(vista);
    const usd = (c) => formatear(c, { moneda: "US$ ", oculto: st.cfg.ocultar });
    const cot = dolarDe(hoy), dolar = cot?.valor || 0, conDolar = "dólar " + nombreTipo(st.cfg.dolar.tipo).toLowerCase();
    const delMes = conPlata ? enElMes(saldo, st.movs, st.mes, st.metas, idsTarjeta()) : null;
    const claseDe = (id) => (id === "total" ? "pd-total" : id === "pesos" ? "pd-pesos" : "pd-" + platas.items.find((x) => x.id === id).color);
    const nombreDe = (id) => (id === "total" ? "Todo junto" : id === "pesos" ? "Pesos" : esc(platas.items.find((x) => x.id === id).nombre));
    const puntos = varias ? `<span class="plata-puntos" aria-hidden="true">${vs.map((id) => `<i class="pd ${claseDe(id)}${id === vista ? " on" : ""}"></i>`).join("")}</span>` : "";
    const pista = varias && !st.cfg.plataTocada ? `<span class="plata-pista">Tocá para ver tus otras platas</span>` : "";

    let dibujo, titulo, numero, abajo;
    if (vista === "total") {
      const t = totalDe(platas, delMes?.usar ?? 0, dolar);
      dibujo = Art.platasTodo(); titulo = "Todo junto"; numero = plata(t.pesos);
      const metas = apartado(saldo, st.metas);
      abajo = (t.sinDolar ? "Falta el valor del dólar" : t.usd !== null ? "≈ " + usd(t.usd) : "En pesos") + (metas ? ` · aparte, ${plata(metas)} en metas` : "");
    } else if (vista !== "pesos") {
      const x = platas.items.find((y) => y.id === vista), v = enPesos(x, dolar);
      dibujo = Art.platas(COLORES_PLATA[x.color], letraDe(x)); titulo = esc(x.nombre); numero = formatear(x.monto, { moneda: etiquetaDe(x), oculto: st.cfg.ocultar });
      abajo = x.moneda !== "USD" ? (x.fecha === hoy ? "Actualizada hoy" : x.fecha ? "Actualizada el " + x.fecha.slice(8, 10) + "/" + x.fecha.slice(5, 7) : "En pesos") : v === null ? "Falta el valor del dólar" : `≈ ${plata(v)} · ${conDolar}`;
    } else if (conPlata) {
      const { usar, gastado, neto, tarjeta } = delMes, de = deCuanto(delMes);
      dibujo = Art.pan(parteDePlata(saldo, st.movs, st.mes, st.metas, idsTarjeta())); titulo = usar < 0 ? "Estás abajo" : "Te queda"; numero = plata(Math.abs(usar));
      // Una sola frase con la cuenta. «De $Y» solo cuando da: Y − lo gastado = lo que te queda (deCuanto). Con algo sin pagar en la tarjeta,
      // la frase lo dice: esa plata sigue en «Te queda», pero ya tiene destino. Si se pagó la tarjeta de compras de antes, también.
      const partes = [];
      if (gastado) partes.push(de !== null ? `Gastaste ${plata(gastado)} de ${plata(de)}` : neto === 0 ? `Este mes gastaste ${plata(gastado)}` : `Gastaste ${plata(gastado)}`);
      if (tarjeta.debe > 0) partes.push(`tarjeta por pagar: ${plata(tarjeta.debe)}`);
      else if (neto < 0) partes.push(`pagaste la tarjeta: ${plata(-neto)}`); // el mismo número que el renglón de Resumen
      const frase = partes.join(" · ") || "Todavía no gastaste nada este mes";
      abajo = frase[0].toUpperCase() + frase.slice(1) + (usar < 0 ? ". Pasa, ya se acomoda" : "");
    } else {
      dibujo = Art.pan(r.queda); titulo = actual ? "Gastaste este mes" : "En " + mesTexto(st.mes).toLowerCase() + " gastaste"; numero = plata(r.gastos);
      abajo = !actual && r.ingresos ? "Entraron " + plata(r.ingresos) : varias ? "En «Ver el detalle» está en qué se fue" : "Tocá para ver en qué se fue";
    }

    // Lo de adentro. El número cambia de clase en cada vista: así vuelve a entrar con su saltito.
    // Los números largos («USDT 12.500.000») bajan de tamaño para entrar siempre.
    const largo = numero.length > 13 ? " muy-largo" : numero.length > 10 ? " largo" : "";
    const cuerpo = `${dibujo}<span class="ht">${puntos}<span class="sub">${titulo}</span><span class="${varias ? "vp" + pos + " plata-salta " : ""}big std${largo}">${numero}</span><span class="sub">${abajo}</span>${pista}</span>`;
    if (!varias && !conPlata) return `<button class="card pp hr tecard" data-act="abrir" data-v="resumen" aria-label="Ver el resumen del mes">${cuerpo}</button>`;
    const pie = (texto) => `<span>${texto}</span><i aria-hidden="true">→</i>`;
    const clases = "hr plata-cuerpo" + largo;
    if (!varias) return `<button class="card pp tecard solo" data-act="abrir" data-v="resumen" aria-label="Ver de dónde sale lo que te queda"><span class="${clases}">${cuerpo}</span><span class="ver-res">${pie("Ver el detalle")}</span></button>`;
    const proxima = vs[(pos + 1) % vs.length];
    const esPesos = vista === "pesos";
    return `<div class="card pp tecard solo"><button class="plata-toca" data-act="plataSig" aria-label="Mostrando ${nombreDe(vista)}, ${numero}. Tocá para ver ${nombreDe(proxima)}"><span class="${clases}">${cuerpo}</span></button>` +
      `<button class="ver-res" data-act="abrir" data-v="${esPesos ? "resumen" : "platas"}">${pie(esPesos ? "Ver el detalle" : "Ver mis platas")}</button></div>`;
  }

  /* ---------- Inicio ---------- */
  function inicio() {
    const actual = st.mes === hoy.slice(0, 7);
    const r = resumenMes(movsGasto(), referencia(st.mes, hoy));
    const movs = porDiaAgrupado(delMes(st.movs, st.mes)).flatMap((g) => g.movs);
    const ra = infoRacha(st.movs, st.dias, hoy);
    const nombre = (st.cfg.nombre || "").trim();
    const guiando = st.guiaPaso !== null && st.guiaPaso !== undefined;
    const sinIngreso = r.ingresos === 0;
    let h = `<div class="top"><div><small>${mesNav()}` +
      `<button class="eyeb" data-act="ocultar" aria-pressed="${st.cfg.ocultar}" aria-label="${st.cfg.ocultar ? "Mostrar montos" : "Ocultar montos"}">${Art.icono(st.cfg.ocultar ? Art.OJO_TAPADO : Art.OJO)}</button></small>` +
      `<h1>Hola${nombre ? ", " + esc(nombre) : ""}${guiando ? "" : `<button class="preg txt" data-act="ayuda" data-v="inicio">¿Cómo se usa?</button>`}</h1>` +
      `<div class="racha-fila"><button class="racha" data-act="abrir" data-v="racha" aria-label="Ver tu racha">${Art.minion()}<span>${ra.actual ? ra.actual + (ra.actual === 1 ? " día" : " días") + (ra.hoyHecho ? "" : " · anotá hoy y sigue") : "Empezá tu racha"}</span></button>` +
      // Los primeros días, un botoncito para ver el tutorial de los personajes. Después sigue en Ajustes.
      (!guiando && st.cfg.primeraVez && sumarDias(st.cfg.primeraVez, DIAS_BOTON_TUTORIAL) > hoy ? `<button class="tuto-chip" data-act="abrir" data-v="tutorial">Ver tutorial</button>` : "") + `</div>` +
      `</div><button class="miguita-toque${st.chiste ? " salta" + (st.chiste.n % 2) + (st.chiste.giro ? " gira" : "") : ""}" data-act="tocarMiguita" aria-label="Tocar a Miguita">` +
      `${Art.miguita(estadoDelMes(st.mes, r))}${st.chiste ? `<span class="globo" role="status">${esc(st.chiste.texto)}</span>` : ""}</button></div>`;

    const peor = actual && estadoPresupuestos(st.presupuestos, movsGasto(), st.mes).find((p) => p.nivel !== "ok");
    if (peor) h += `<button class="card pp tecard" data-act="verPlan" data-v="presupuesto">` +
      `<span class="msg">${peor.nivel === "pasado" ? "Superaste el tope de " : "Estás llegando al tope de "}${esc(nombreCat(peor.categoria))}.</span>` +
      `<span class="sub">Gastaste ${plata(peor.gastado)} de ${plata(peor.tope)}.${peor.nivel === "pasado" ? " Pasa: el mes que viene arranca de cero." : ""}</span></button>`;

    if (st.regaloRacha) h += crd(`<div class="crow">${Art.salvavidas}<div class="cr"><b class="pregunta">¡Te salvamos la racha!</b><div class="sub">Por ser de los primeros en probar MiGuita, te regalamos un salvavidas: tus ${ra.actual} días siguen en pie. Es uno solo, así que cuidala.</div></div></div>` +
      `<div class="chips"><button class="pp" data-act="regaloListo" aria-pressed="true">¡Gracias!</button></div>`, "aviso");
    if (!st.persistente) h += crd(`<div class="msg" role="alert">Este navegador no deja guardar: lo que anotes se pierde al cerrar.</div>`);
    // Dudas de lo que se acaba de escribir.
    if (st.dudaMonto) {
      const d = st.dudaMonto, $ = (c) => formatear(c, { moneda: d.p.moneda === "USD" ? "US$ " : "$" });
      h += crd(`<b class="pregunta">¿Cuánto fue?</b><div class="sub">Escribiste «${esc(d.texto)}».</div><div class="chips">` +
        d.p.opciones.map((c, i) => `<button class="pp" data-act="dudaMontoSel" data-v="${c}"${i ? "" : ' aria-pressed="true"'}>${$(c)}</button>`).join("") +
        `<button class="pp" data-act="dudaMontoOtro">Otro</button><button class="pp" data-act="dudaMontoNo">Cancelar</button></div>`, "aviso");
    }
    if (st.dudaCat) {
      const lista = st.cfg.categorias[st.dudaCat.tipo].filter((c) => !c.oculta && c.id !== RESPALDO[st.dudaCat.tipo]);
      h += crd(`<b class="pregunta">¿En qué categoría va «${esc(st.dudaCat.detalle)}»?</b><div class="sub">La anoté en Otros. Si me decís, la próxima vez ya lo sé.</div><div class="chips">` +
        lista.map((c) => `<button class="pp" data-act="dudaCatSel" data-v="${esc(c.id)}">${esc(c.nombre)}</button>`).join("") + `<button class="pp" data-act="dudaCatSel" data-v="">Dejar en Otros</button></div>`, "aviso");
    }
    if (st.dudaSaldo) {
      const entro = st.dudaSaldo.ids.every((id) => st.movs.find((x) => x.id === id)?.tipo === "ingreso");
      h += crd(`<b class="pregunta">${entro ? `¿Esta plata ya estaba dentro de los ${plata(st.cfg.saldo.monto)} que me dijiste?` : `¿Ya habías pagado esto cuando me dijiste que tenías ${plata(st.cfg.saldo.monto)}?`}</b><div class="sub">${entro ? "Si ya estaba, no te la sumo de nuevo." : "Si ya lo habías pagado, no te lo resto de nuevo."}</div>` +
        `<div class="chips"><button class="pp" data-act="saldoYa" aria-pressed="true">${entro ? "Sí, ya estaba" : "Sí, ya estaba pago"}</button><button class="pp" data-act="saldoNo">${entro ? "No, sumala" : "No, restalo"}</button></div>`, "aviso");
    }
    // Se pagó la tarjeta y una parte no la cubren compras con crédito anotadas: si esas compras se anotaron sin decir «crédito»,
    // la persona elige cuáles eran. Sale de los datos (pagoParaElegir): se va sola cuando el pago queda cubierto y vuelve si se deshace.
    // Si el pago ya cubre compras con crédito y sobra una parte, lo más común son intereses o impuestos: se pregunta así.
    const pagoEnDuda = guiando || !actual ? null : pagoParaElegir(st.movs, idsTarjeta(), hoy);
    if (pagoEnDuda) {
      const sobra = sinCubrir(st.movs, idsTarjeta(), pagoEnDuda), parte = sobra < pagoEnDuda.monto, v = esc(pagoEnDuda.id);
      h += crd(parte ?
        `<b class="pregunta">¿Qué son los ${plata(sobra)} de más que pagaste de la tarjeta?</b><div class="sub">Pagaste ${plata(pagoEnDuda.monto)} y lo que anotaste con crédito suma menos. Pueden ser intereses o impuestos, o compras que anotaste sin decir «crédito».</div>` +
          `<div class="chips"><button class="pp" data-act="tarjetaNueva" data-v="${v}" aria-pressed="true">Intereses o impuestos</button><button class="pp" data-act="tarjetaElegir" data-v="${v}">Elegir compras</button></div>` :
        `<b class="pregunta">¿Ya anotaste lo que compraste con esa tarjeta?</b><div class="sub">Pagaste ${plata(pagoEnDuda.monto)} de la tarjeta. Si ya anotaste esas compras, elegilas y no cuento el pago dos veces.</div>` +
          `<div class="chips"><button class="pp" data-act="tarjetaElegir" data-v="${v}" aria-pressed="true">Sí, elegirlas</button><button class="pp" data-act="tarjetaNueva" data-v="${v}">No, es un gasto nuevo</button></div>`, "aviso");
    }
    const sinPreguntar = guiando ? 0 : ahorroSinPreguntar(st.cfg.saldo, st.metas);
    if (sinPreguntar) h += crd(`<b class="pregunta">¿Lo que guardaste para tus metas está dentro de tu plata?</b><div class="sub">Son ${plata(sinPreguntar)}. Si está adentro, te muestro solo lo que podés usar.</div>` +
      `<div class="chips"><button class="pp" data-act="ahorroAdentro" aria-pressed="true">Sí, está adentro</button><button class="pp" data-act="ahorroAparte">No, lo tengo aparte</button></div>`, "aviso");
    // Un solo cartel de bienvenida por vez, para no llenar la pantalla. Lo que cobrás y tu nombre se piden acá, sin obligar.
    const reales = st.movs.filter((m) => !m.id.startsWith("ej_")).length;
    // Quien tenía PIN en la dirección vieja no puede quedar sin protección sin enterarse.
    if (!guiando && st.cfg.pinViejo && !st.cfg.pinAvisado && !st.seguridad)
      h += crd(`<b class="pregunta">Volvé a ponerle PIN</b><div class="sub">En la dirección vieja tenías MiGuita cerrada con PIN. Acá todavía está abierta.</div><div class="chips"><button class="pp" data-act="abrir" data-v="seguridad" aria-pressed="true">Poner PIN</button><button class="pp" data-act="cerrarCartel" data-v="pinAvisado">Ahora no</button></div>`, "aviso");
    const conPlataEfectiva = saldoEfectivo(st.cfg.saldo, st.movs);
    const instalar = guiando ? "" : cartelInstalar();
    const antesDelCartel = h.length;
    if (guiando) { /* mientras dura la guía, nada más */ }
    else if (instalar) h += instalar;
    else if (actual && sinIngreso && reales && !st.cfg.ingresoVisto && !conPlataEfectiva)
      h += crd(`<b class="pregunta">¿Querés saber cuánto te queda?</b><div class="sub">Decime cuánta plata tenés hoy y te lo digo. Es opcional.</div><div class="chips"><button class="pp" data-act="abrir" data-v="plata" aria-pressed="true">Poner cuánto tengo</button><button class="pp" data-act="cerrarCartel" data-v="ingresoVisto">Ahora no</button></div>`, "aviso");
    else if (EN_PRUEBA && !st.cfg.pruebaVisto)
      h += crd(`<b class="pregunta">Estás probando MiGuita antes que nadie</b><div class="sub">La estamos probando en un grupo chico de amigos. Si algo anda mal o se te ocurre una idea, mandala: a fin de mes, el aporte más útil se lleva una birra.</div>` +
        `<div class="chips"><button class="pp" data-act="abrirComentario" aria-pressed="true">Mandar un comentario</button><button class="pp" data-act="cerrarCartel" data-v="pruebaVisto">Después</button></div>`, "aviso");

    const huboCartel = h.length > antesDelCartel;
    if (!guiando && reales >= 3 && !nombre && !st.cfg.nombreVisto && !(actual && sinIngreso && !st.cfg.ingresoVisto && !conPlataEfectiva))
      h += crd(`<b class="pregunta">¿Cómo te llamás?</b><div class="sub">Es para saludarte. Es opcional.</div><div class="quick"><div class="pp"><input class="field" data-act="nombre" value="" placeholder="Tu nombre" aria-label="Tu nombre" maxlength="30" autocomplete="given-name"></div></div><div class="chips"><button class="pp" data-act="cerrarCartel" data-v="nombreVisto" aria-pressed="true">Listo</button></div>`, "aviso");

    const cerrado = actual && mesParaMostrar(st.movs, hoy, st.cfg.mesVisto || "");
    if (cerrado) h += crd(`<b class="pregunta">Ya está tu mes de ${mesTexto(cerrado).toLowerCase()}</b><div class="sub">Miguita te armó una tarjeta para compartir: en qué se te fue la plata, tu racha y un chiste.</div>` +
      `<div class="chips"><button class="pp" data-act="abrirTuMes" data-v="${cerrado}" aria-pressed="true">Verla</button><button class="pp" data-act="descartarTuMes" data-v="${cerrado}">Ahora no</button></div>`, "aviso");

    if (hayEjemplo())
      h += crd(`<span>Estás viendo datos de ejemplo</span><button class="btnmini" data-act="quitarEjemplo">Quitar</button>`, "banner");

    if (actual && !ra.hoyHecho && ra.actual > 0 && new Date().getHours() >= 18 && Date.now() > st.avisoLuego)
      h += crd(`<b>¿Ya anotaste tus gastos de hoy?</b><div class="sub">Anotá algo hoy y tu racha de ${ra.actual} ${ra.actual === 1 ? "día" : "días"} sigue.</div>` +
        `<div class="chips"><button class="pp" data-act="nuevo" aria-pressed="true">Anotar</button><button class="pp" data-act="noGaste">No gasté hoy</button><button class="pp" data-act="luego">Más tarde</button></div>`, "aviso");


    // Fijos que preguntan antes de anotarse.
    if (actual) for (const f of fijosPorConfirmar(st.fijos, hoy)) {
      const ing = f.tipo === "ingreso", mesF = mesPendiente(f, hoy), deOtroMes = mesF !== hoy.slice(0, 7);
      h += crd(`<div class="sec">${ing ? "Ingreso fijo" : "Gasto fijo"} · día ${f.dia}${deOtroMes ? " de " + mesTexto(mesF).toLowerCase() : ""}</div><b class="pregunta">${ing ? "¿Ya cobraste " : "¿Ya pagaste "}${esc(f.nombre)}${deOtroMes ? " de " + mesTexto(mesF).toLowerCase() : ""}?</b><div class="sub">${plata(f.monto, f.moneda === "USD" ? { moneda: "US$ " } : {})}</div>` +
        `<div class="chips"><button class="pp" data-act="confirmarFijo" data-v="${esc(f.id)}" aria-pressed="true">Sí, anotar</button><button class="pp" data-act="cambiarFijo" data-v="${esc(f.id)}">Otro monto</button><button class="pp" data-act="posponerFijo" data-v="${esc(f.id)}">Todavía no</button></div>` +
        `<button class="link chico izq" data-act="saltearFijo" data-v="${esc(f.id)}">Este mes no</button>`, "aviso");
    }
    const c = st.cfg.copias, diasDesde = (f) => (Date.now() - Date.parse(f)) / 864e5;
    if (actual && c.auto && (!c.ultima || diasDesde(c.ultima) >= (c.cada === "mes" ? 30 : 7)))
      h += crd(`<span>Toca hacer tu copia de seguridad</span><button class="btnmini" data-act="abrir" data-v="copias">Hacerla</button>`, "banner");
    // Aunque no haya activado el recordatorio: desde el día siguiente al primer uso, si no hay copia reciente ni otro dispositivo conectado.
    else if (actual && !huboCartel && !st.cfg.vinculo && reales >= 3 && (st.cfg.primeraVez || hoy) < hoy && (!c.ultima || diasDesde(c.ultima) >= 60) && (!c.pospuesta || diasDesde(c.pospuesta) >= 14))
      h += crd(`<b class="pregunta">Tus datos están solo en este celu</b><div class="sub">${c.ultima ? "Tu última copia es del " + new Date(c.ultima).toLocaleDateString("es-AR") + "." : "No están en internet: si lo perdés o lo cambiás, se pierden."} Guardá una copia o conectá otro dispositivo.</div>` +
        `<div class="chips"><button class="pp" data-act="abrir" data-v="copias" aria-pressed="true">Hacer una copia</button><button class="pp" data-act="abrir" data-v="dispositivos">Conectar otro</button><button class="pp" data-act="posponerCopia">Ahora no</button></div>`, "aviso");

    // Un solo número y, debajo, la cuenta en una frase: así se entiende de dónde sale sin tocar nada. El detalle está en Resumen.
    const miPlata = tuPlata(conPlataEfectiva, st.movs);
    const conPlata = actual && miPlata !== null && !guiando;
    h += tarjetaPlata(conPlata, r, actual, guiando, conPlataEfectiva);

    const conMic = !guiando && puedeGrabar();
    const hayPlatas = limpiarPlatas(st.cfg.platas).items.length > 0;
    const aPlatas = !guiando && actual && (conPlata || hayPlatas) ? `<button class="a-platas" data-act="abrir" data-v="platas">${hayPlatas ? "Mis platas" : "¿Dólares o cripto?"}<span aria-hidden="true">›</span></button>` : "";
    h += (guiando ? "" : conPlata ?
      `<div class="plata-fila">${aPlatas}<button class="btnmini" data-act="abrir" data-v="plata">Me entró plata</button></div>` : miPlata !== null ?
      `<div class="plata-fila"><span><small>Tu plata ahora</small><b${miPlata < 0 ? ' class="neg-v"' : ""}>${plata(miPlata)}</b></span><button class="btnmini" data-act="abrir" data-v="plata">Me entró plata</button></div>` :
      `<div class="plata-fila${aPlatas ? "" : " sola"}">${aPlatas}<button class="btnmini" data-act="abrir" data-v="plata">¿Cuánta plata tenés?</button></div>`) +
      `<label class="quick-t" for="rapido">Escribí qué gastaste y cuánto</label><form class="quick" data-form="rapido"><div class="pp${st.error ? " err" : ""}"><input id="rapido" placeholder="Ej: 15mil nafta" autocomplete="off" enterkeyhint="done" maxlength="300"></div>` +
      (conMic ? `<button class="btn pp mic" type="button" data-act="hablar" aria-label="Hablar: decí tus gastos con la voz">${Art.icono(MIC)}</button>` : "") +
      `<button class="btn pp anotar" type="submit">Anotar</button></form>` + loDeSiempre(guiando || !actual) +
      (conMic && !st.cfg.vozAviso && reales < 3 ? `<div class="nuevo-mic">Nuevo: tocá el micrófono y decí lo que gastaste o te entró</div>` : "") +
      (st.error ? `<div class="msg" role="alert">${esc(st.error)}</div>` : "");

    h += crd(`<div class="sec secrow" data-guia="mov"><span>Últimos movimientos</span>${movs.length ? `<button class="link" data-act="abrir" data-v="movimientos">Ver todos ›</button>` : ""}</div>` +
      (movs.length ? movs.slice(0, 5).map((x, i) => fila(x, i === 0, subInicio)).join("") :
        `<div class="empty"><b>Todavía no anotaste nada</b><span>Escribí «15mil nafta» arriba y listo.</span></div>`));
    if (!guiando) h += `<button class="traer" data-act="abrir" data-v="importar"><span aria-hidden="true">${Art.icono(ICONO_BILLETERA)}</span><span>¿Usás Mercado Pago? <b>Traé tus gastos solos</b></span><span class="chev" aria-hidden="true">›</span></button>`;
    if (!st.movs.length && !guiando) h += `<button class="link chico" data-act="yaUsoMiguita">¿Ya usás MiGuita en otro celu? Conectalo</button><button class="link chico" data-act="tengoCopia">Tengo una copia de seguridad</button>`;
    return h;
  }

  /* ---------- la guía de la primera vez: se hace usando la app de verdad ---------- */
  function guia() {
    const p = st.guiaPaso;
    const globo = (titulo, texto, boton = "") => `<div class="guia-globo"><div class="guia-cuenta"><span>Paso <b>${p + 1}</b> de 3</span><span class="guia-barra" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= p ? "on" : ""}"></i>`).join("")}</span></div><div class="gcab">${Art.miguita("ok").replace("<svg", '<svg style="width:62px"')}<b>${titulo}</b></div><div class="gtxt">${texto}</div>${boton ? `<button class="btn pp w guia-sig" data-act="guiaSig">${boton}</button>` : ""}</div>`;
    // Se saltea de a un paso: el último se termina con su botón.
    const saltar = p < 2 ? `<button class="guia-saltar" data-act="guiaSig">Saltear este paso ›</button>` : "";
    let texto = "";
    const nuevos = st.movs.length - st.guiaBase;
    if (p === 1) {
      const m = [...st.movs].sort((a, b) => b.ts - a.ts)[0];
      const que = m?.detalle ? " de " + esc(m.detalle.toLowerCase()) : "";
      texto = nuevos < 1 ? `Cada cosa que anotes aparece en esta lista, con su categoría. Si algo está mal, lo tocás y lo cambiás.` :
        nuevos > 1 ? `Anoté tus ${nuevos} gastos y a cada uno le puse su categoría. Si algo está mal, lo tocás y lo cambiás.` :
        m?.tipo === "ingreso" ? `Entendí que entraron ${plata(m.monto)}${que} y lo puse en ${esc(nombreCat(m.categoria))}. Si algo está mal, lo tocás y lo cambiás.` :
        `Entendí que son ${plata(m?.monto || 0)}${que} y lo puse en ${esc(nombreCat(m?.categoria))}. Si algo está mal, lo tocás y lo cambiás.`;
    }
    return `<div class="guia-fondo"></div>` + saltar + (
      p === 0 ? globo("Empecemos", "Escribí lo último que gastaste. Por ejemplo: <b>10 lucas birra</b>. Después tocá <b>Anotar</b>.") :
      p === 1 ? globo(nuevos < 1 ? "Acá va lo que anotes" : "¡Anotado!", texto, "Seguir") :
      globo("Abajo está lo demás", `<div class="g3"><b>Grupos</b> Dividí gastos con amigos.</div><div class="g3"><b>Mis cuentas</b> Cuotas, metas, deudas y gastos fijos.</div><div class="g3"><b>Ajustes</b> Letra más grande, avisos y PIN.</div>`, "¡A usarla!"));
  }

  /* ---------- la ventanita del signo de pregunta ---------- */
  function ayudaHoja(contenido) {
    return `<div class="sheet-bg" data-act="cerrarAyuda"><div class="sheet" role="dialog" aria-modal="true" data-act="nada"><div class="grab"></div>${contenido}</div></div>`;
  }
  function ayuda(clave) {
    const a = AYUDAS[clave];
    if (!a) return "";
    const paso = (t, i) => `<div class="srow paso-i${i ? "" : " f"}"><span class="stn">${i + 1}</span><span class="rt">${t}</span></div>`;
    return ayudaHoja(`<b class="ayuda-t">${a.t}</b>${a.x ? `<span class="ayuda-x">${a.x}</span>` : ""}${(a.pasos || []).map(paso).join("")}<button class="btn pp w" data-act="cerrarAyuda">Entendido</button>`);
  }

  /* ---------- Movimientos ---------- */
  function movimientos() {
    const f = st.filtro;
    const texto = f.texto.trim().toLowerCase();
    // Escribiendo algo se busca en todos los meses: "¿cuándo pagué tal cosa?".
    const lista = (texto ? st.movs : delMes(st.movs, st.mes)).filter((x) =>
      (f.tipo === "todos" || (f.tipo === "gastos") === (x.tipo === "gasto")) &&
      (!f.cat || x.categoria === f.cat) &&
      (!texto || (x.detalle + " " + nombreCat(x.categoria) + " " + nombreMedio(x.medio)).toLowerCase().includes(texto)));
    const cats = [...st.cfg.categorias.gasto, ...st.cfg.categorias.ingreso];
    return back("Inicio") + hdr(mesNav(), "Movimientos", "", "movimientos") +
      `<div class="quick"><div class="pp"><input id="buscar" data-act="buscar" value="${esc(f.texto)}" placeholder="Buscar un gasto" aria-label="Buscar" autocomplete="off" maxlength="60"></div></div>` +
      chips("filtro", [["todos", "Todos"], ["gastos", "Gastos"], ["ingresos", "Ingresos"]], f.tipo, "Filtrar") +
      (texto ? `<div class="hint">Buscando en todos los meses.</div>` : "") +
      `<select class="sel" data-act="filtroCat" aria-label="Categoría"><option value="">Todas las categorías</option>` +
      cats.map((c) => `<option value="${esc(c.id)}"${c.id === f.cat ? " selected" : ""}>${esc(c.nombre)}</option>`).join("") + "</select>" +
      (lista.length ? porDiaAgrupado(lista).map((g) => crd(
        `<div class="sec secrow"><span>${esc(nombreDia(g.fecha, true))}${texto && g.fecha.slice(0, 4) !== hoy.slice(0, 4) ? " " + g.fecha.slice(0, 4) : ""}</span><span>${g.gastado ? plata(-g.gastado) : ""}</span></div>` +
        g.movs.map((x, i) => fila(x, i === 0, subLista)).join(""))).join("") :
        crd(`<div class="empty"><b>${delMes(st.movs, st.mes).length ? "No hay movimientos con ese filtro" : "No hay movimientos este mes"}</b></div>`));
  }

  /* ---------- Resumen ---------- */
  function resumen() {
    const actual = st.mes === hoy.slice(0, 7);
    const gm = movsGasto(), r = resumenMes(gm, referencia(st.mes, hoy));
    const pc = gastosPor(gm, st.mes, "categoria"), pm = gastosPor(gm, st.mes, "medio");
    const dias = gastosPorDia(gm, st.mes);
    const max = Math.max(...dias), diaMax = dias.indexOf(max);
    // Con la plata cargada, arriba va la cuenta del número de Inicio, con lo de este mes. Así nunca aparecen dos números distintos para lo mismo.
    const d = actual ? desglose(saldoEfectivo(st.cfg.saldo, st.movs), st.movs, st.metas, st.mes, idsTarjeta()) : null;
    const fila2 = (t, v, primera) => `<div class="row${primera ? " f" : ""}"><span>${t}</span><span>${v}</span></div>`;
    // Lo que falta pagar de la tarjeta ya tiene destino: no entra en lo que se puede gastar por día.
    const porDia = (() => { const usar = !actual ? 0 : d ? d.queda - d.debeTarjeta : r.teQueda; return usar > 0 ? `<div class="sub">Podés gastar ${plata(Math.floor(usar / r.faltan / 100) * 100)} por día hasta fin de mes.</div>` : ""; })();
    const enDolares = (() => { const v = dolarDe(referencia(st.mes, hoy)); return v && r.gastos ? `<div class="sub">≈ ${formatear(Math.round(r.gastos * 100 / v.valor), { moneda: "US$ ", oculto: st.cfg.ocultar }).replace(/,\d\d$/, "")} gastados · dólar ${nombreTipo(st.cfg.dolar.tipo).toLowerCase()} ${formatear(v.valor)}</div>` : ""; })();
    let h = back("Inicio") + hdr(mesNav(), "Resumen", estadoDelMes(st.mes, r), "resumen") + (d ?
      crd(lbl("De dónde sale lo que te queda") + (d.tenias > 0 ? fila2("Empezaste con", plata(d.tenias), true) : "") +
        (d.entro ? fila2("Te entró", plata(d.entro, { signo: true }), d.tenias <= 0) : "") + (d.gasto ? fila2("Gastaste", plata(-d.gasto), d.tenias <= 0 && !d.entro) : "") +
        (d.tarjeta > 0 ? fila2(d.debeTarjeta > 0 ? "Con crédito, todavía no salió de tu plata" : "Con crédito, no salió de tu plata", plata(d.tarjeta, { signo: true })) : d.tarjeta < 0 ? fila2("Pagaste la tarjeta (compras de antes)", plata(d.tarjeta)) : "") +
        (d.metas ? fila2("Guardado para tus metas", plata(-d.metas)) : "") +
        `<div class="row total"><span>${d.queda < 0 ? "Estás abajo" : "Te queda"}</span><span>${plata(Math.abs(d.queda))}</span></div>` +
        (d.debeTarjeta ? `<div class="row"><span>Tarjeta por pagar</span><span>${plata(d.debeTarjeta)}</span></div><div class="sub">${TARJETA_SIGUE}</div><div class="chips"><button class="pp" data-act="pagarTarjeta" aria-pressed="true">Pagué la tarjeta</button></div>` +
          (pagoParaSaldar(st.movs, idsTarjeta()) ? `<button class="link chico izq" data-act="tarjetaSaldada">Ya la pagué toda: quedó una diferencia</button>` : "") : "") +
        (d.tenias < 0 ? `<div class="sub">No todo está anotado: hubo plata que se movió sin pasar por acá.</div>` : "") +
        `<div class="sub">¿No coincide con lo que tenés de verdad?</div><div class="chips"><button class="pp" data-act="corregirPlata">Corregir mi plata</button></div>`) + (porDia || enDolares ? crd(porDia + enDolares) : "") :
      crd(`<div class="stats"><div><div class="sub">Entró</div><b class="pos">${plata(r.ingresos)}</b></div><div><div class="sub">Gastaste</div><b class="neg">${plata(r.gastos)}</b></div>${r.ingresos ? `<div><div class="sub">Quedó</div><b>${plata(r.teQueda)}</b></div>` : ""}</div>` +
        (actual ? `<div class="sub">Esto es solo de este mes. Si me decís cuánta plata tenés, te cuento toda.</div><div class="chips"><button class="pp" data-act="abrir" data-v="plata">¿Cuánta plata tenés?</button></div>` : "") + porDia + enDolares));
    if (!r.gastos) return h + crd(`<div class="empty"><b>Sin gastos este mes</b><span>Cuando anotes, acá vas a ver en qué se te va la plata.</span></div>`);
    h += `<div class="btnrow"><button class="btn pp alt" data-act="abrirTuMes" data-v="${st.mes}">Tu mes${actual ? " (hasta hoy)" : ""}</button><button class="btn pp alt" data-act="verPlan" data-v="analisis">Ver análisis</button></div>`;
    h += crd(lbl("Por categoría") + pc.map((c) => `<div class="crow">${iconoDe(c.id)}<div class="cr"><div class="row f" style="padding:0 0 3px;min-height:0"><span>${esc(nombreCat(c.id))} · ${Math.round(c.parte * 100)}%</span><span>${plata(c.monto)}</span></div>${Art.barra(c.monto / pc[0].monto)}</div></div>`).join(""));
    h += crd(lbl("Por medio de pago") + pm.map((m, i) => `<div class="row${i ? "" : " f"}"><span>${esc(nombreMedio(m.id) || "Sin medio")}</span><span>${plata(m.monto)}</span></div>`).join(""));
    h += crd(lbl("Tu ritmo") + `<div class="row f"><span>Gastás en promedio</span><span>${plata(r.promedio)} por día</span></div>` +
      (actual ? `<div class="sub">A este ritmo, a fin de mes vas a gastar ${plata(r.proyeccion)}.</div>` : ""));
    h += crd(lbl("Por día") + Art.barrasDias(dias, diaMax) + `<div class="sub">Más gastaste: ${esc(nombreDia(st.mes + "-" + String(diaMax + 1).padStart(2, "0"), true))}, ${plata(max)}</div>`);
    // Los últimos meses, para comparar.
    const seis = Array.from({ length: 6 }, (_, i) => cambiarMes(st.mes, i - 5)).map((m) => ({ m, g: delMes(gm, m).filter((x) => x.tipo !== "ingreso").reduce((a, x) => a + x.monto, 0) }));
    const tope = Math.max(...seis.map((x) => x.g), 1), previo = seis[4].g;
    h += crd(lbl("Últimos 6 meses") + seis.filter((x) => x.g).map((x) => `<div class="crow"><div class="cr"><div class="row f" style="padding:0 0 3px;min-height:0"><span>${mesTexto(x.m)}</span><span>${plata(x.g)}</span></div>${Art.barra(x.g / tope)}</div></div>`).join("") +
      (previo ? `<div class="sub">${r.gastos > previo ? "Gastaste " + Math.round((r.gastos / previo - 1) * 100) + "% más" : r.gastos < previo ? "Gastaste " + Math.round((1 - r.gastos / previo) * 100) + "% menos" : "Gastaste lo mismo"} que el mes anterior.</div>` : ""));
    return h;
  }

  /* ---------- Racha ---------- */
  function racha() {
    const ra = infoRacha(st.movs, st.dias, hoy);
    const enSemana = ra.actual ? ((ra.actual - 1) % 7) + 1 : 0;
    const salvados = new Set(st.dias.filter((d) => d.salvavidas).map((d) => d.fecha));
    const anotados = new Set([...st.movs.map((x) => x.fecha), ...st.dias.map((d) => d.fecha)]);
    // Calendario de 5 semanas que termina en la semana de hoy (lunes primero).
    const [a, m, d] = hoy.split("-").map(Number);
    const dow = (new Date(a, m - 1, d).getDay() + 6) % 7;
    let cal = ["L", "M", "M", "J", "V", "S", "D"].map((x) => `<span class="dw" aria-hidden="true">${x}</span>`).join("");
    for (let j = 0; j < 35; j++) {
      const off = dow + 28 - j, f = sumarDias(hoy, -off);
      const cls = off < 0 ? "f" : salvados.has(f) ? "s" : anotados.has(f) ? "x" : "";
      cal += `<span class="cd ${cls}${off === 0 ? " t" : ""}" title="${f}"></span>`;
    }
    const iProx = Art.PREMIOS.findIndex((p) => p.dias === ra.proximo);
    const motivos = motivosApretado();
    return back("Inicio") + hdr("Tu racha", ra.actual + (ra.actual === 1 ? " día" : " días"), "ok", "racha") +
      crd(lbl("Ingredientes de esta semana") + `<div class="ings">${[0, 1, 2, 3, 4, 5, 6].map((i) => Art.ingrediente(i, i < enSemana)).join("")}</div>` +
        `<div class="sub">${ra.hoyHecho ? "Hoy ya sumaste tu ingrediente." : "Anotá tus gastos del día y se suma un ingrediente."}</div>`) +
      (ra.proximo ? crd(lbl("Próximo premio") + `<div class="crow">${iProx >= 0 ? Art.premio(iProx).replace("<svg", '<svg class="st"') : ""}<div class="cr"><div class="row f" style="padding:0 0 3px;min-height:0"><span>${PREMIO_TEXTO[ra.proximo].replace(/^(un|una) /, "").replace(/^./, (c) => c.toUpperCase())} · ${ra.proximo} días</span><span>faltan ${ra.proximo - ra.actual}</span></div>${Art.barra(ra.actual / ra.proximo)}</div></div>`) : "") +
      crd(lbl("Últimas 5 semanas") + `<div class="cal" role="img" aria-label="Calendario de días anotados">${cal}</div>` +
        `<div class="stats"><div><div class="sub">Mejor racha</div><b>${ra.mejor} ${ra.mejor === 1 ? "día" : "días"}</b></div><div><div class="sub">Días anotados</div><b>${ra.total}</b></div></div>`) +
      crd(`<div class="crow">${Art.salvavidas}<div class="cr"><b style="font:800 15px 'Bricolage Grotesque',sans-serif">Salvavidas</b><div class="sub">Se regala solo si estás complicado con la plata, una vez cada 30 días, para no perder una racha de 2 días o más. ${EN_PRUEBA && !st.dias.some((d) => d.regalo) ? "Y por estar probando la app, la primera vez que se te corte la racha te regalamos uno. " : ""}${motivos.length ? "Ahora estás en esa situación: " + esc(motivos.join(", ")) + "." : "Ahora no lo necesitás."}</div></div></div>`) +
      (ra.hoyHecho ? "" : `<button class="btn pp w alt" data-act="noGaste">Hoy no gasté nada</button>`);
  }

  function festejo(n) {
    const i = Art.PREMIOS.findIndex((p) => p.dias === n);
    const prox = PREMIOS.find((p) => p > n);
    return `<div class="hero" role="dialog" aria-modal="true" aria-label="Festejo de racha">` +
      (i >= 0 ? Art.premio(i) : Art.miguita("ok")) +
      `<b>${PREMIO_TEXTO[n] ? "¡Horneaste " + PREMIO_TEXTO[n] + "!" : "¡" + n + " días seguidos!"}</b><span>${n} días anotando tus gastos</span>` +
      (prox ? `<small>Próximo: ${PREMIO_TEXTO[prox].replace(/^(un|una) /, "")} a los ${prox} días</small>` : "") +
      `<button class="btn pp w" data-act="cerrarFestejo">Seguir</button></div>`;
  }

  /* ---------- Ajustes ---------- */
  function billetera() {
    const n = st.cfg.medios.find((m) => m.id === "mp")?.nombre || BILLETERA_GENERAL;
    const otra = n !== BILLETERA_GENERAL && !BILLETERAS.includes(n);
    return crd(lbl("Tu billetera virtual") + chips("billetera", BILLETERAS.map((b) => [b, b]), n, "Tu billetera virtual") +
      `<div class="quick"><div class="pp"><input class="field" data-act="billeteraOtra" value="${otra ? esc(n) : ""}" placeholder="¿Otra? Escribila acá" aria-label="Otra billetera virtual" maxlength="30" autocomplete="off"></div></div>` +
      `<div class="hint">Aparece con ese nombre al anotar y en los resúmenes. Si no elegís ninguna, dice «${BILLETERA_GENERAL}». Tocala de nuevo para sacarla.</div>`);
  }

  function mas() {
    const n = st.cfg.notif, d = dolarDe(hoy), cp = st.cfg.copias;
    const ir = (v, t, sub, i, primera) => `<button class="srow rowb${primera ? " f" : ""}" data-act="abrir" data-v="${v}" style="width:100%;text-align:left"><span class="ri">${Art.icono(i)}</span><span class="rt"><b>${t}</b><small>${esc(sub)}</small></span><span class="chev" aria-hidden="true">›</span></button>`;
    const accion = (act, t, sub, i) => `<button class="srow rowb" data-act="${act}" style="width:100%;text-align:left"><span class="ri">${Art.icono(i)}</span><span class="rt"><b>${t}</b><small>${esc(sub)}</small></span><span class="chev" aria-hidden="true">›</span></button>`;
    return hdr("Tu app", "Ajustes", "ok") +
      crd(lbl("Tu nombre") + `<div class="quick"><div class="pp"><input class="field" data-act="nombre" value="${esc(st.cfg.nombre || "")}" placeholder="Para saludarte en Inicio" aria-label="Tu nombre" maxlength="30" autocomplete="given-name"></div></div>` +
        lbl("Mi alias o CBU para cobrar") + `<div class="quick"><div class="pp${st.errorAlias ? " err" : ""}"><input class="field" data-act="miAlias" value="${esc(st.cfg.alias || "")}" placeholder="tu alias, CBU o CVU" aria-label="Mi alias, CBU o CVU para cobrar" maxlength="30" autocapitalize="none" autocomplete="off"></div></div>` +
        (st.errorAlias ? `<div class="msg" role="alert">${esc(st.errorAlias)}</div>` : "") + `<div class="hint">Se suma a los grupos que crees, para que te transfieran. Puede ser tu alias, tu CBU o tu CVU: con eso solo te pueden mandar plata.</div>`) +
      crd(lbl("Tu app") +
        ir("notif", "Notificaciones", n.cantidad ? n.cantidad + (n.cantidad === 1 ? " aviso" : " avisos") + " por día · " + (n.forma === "sonido" ? "con sonido" : "en silencio") : "Sin avisos", '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20h4"/>', true) +
        ir("personalizacion", "Personalización", "Tema, billetera, categorías y medios de pago", '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="15.5" cy="10" r="1"/><path d="M12 21c-1.5 0-2-1-2-2s1-2 2-2h2a5 5 0 0 0 5-4"/>') +
        ir("seguridad", "Seguridad", st.seguridad ? (st.seguridad.modo === "clave" ? "Contraseña" : "PIN") + (st.seguridad.huella ? " y huella" : "") + " · datos cifrados" : "Sin PIN", '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>') +
        ir("dolar", "Dólar", nombreTipo(st.cfg.dolar.tipo) + (d ? " · " + formatear(d.valor) : " · sin valor") + (st.cfg.dolar.fuente === "manual" || st.cfg.dolar.tipo === "fijo" ? " · a mano" : " · se actualiza solo"), '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-2-6-2-6 0s6 2 6 4.5-6 2.5-6 0"/>')) +
      crd(lbl("Tus datos") +
        ir("copias", "Copias y Excel", cp.ultima ? "Última: " + new Date(cp.ultima).toLocaleDateString("es-AR") : "Todavía no hiciste ninguna", '<path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14"/>', true) +
        ir("dispositivos", "Usar en otro dispositivo", st.cfg.vinculo ? (st.cfg.vinculo.error ? "Conectado · sin conexión" : "Conectado · todo al día") : "Celu y compu con los mismos datos", '<rect x="2" y="5" width="13" height="10" rx="2"/><path d="M5 19h7"/><rect x="17" y="9" width="5" height="10" rx="1.5"/>') +
        ir("privacidad", "Privacidad", "Qué se guarda y dónde, borrar todo", '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>')) +
      crd(lbl("Ayuda") +
        ir("tutorial", "Cómo usar MiGuita", "Todo lo que podés hacer, en un minuto", '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5M12 17h0"/>', true) +
        accion("repetirGuia", "Repetir la guía", "La de la primera vez, en Inicio", '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/>') +
        accion("invitar", "Invitar a alguien", "Un mensaje listo para mandar por WhatsApp, con los pasos", '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6M18 8v6M15 11h6"/>') +
        (matchMedia("(display-mode: standalone)").matches || navigator.standalone ? "" : ir("instalar", "Instalar MiGuita", "Para tenerla en la pantalla de inicio", '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 8v7m0 0l-3-3m3 3l3-3"/>')) +
        (EN_PRUEBA ? accion("abrirComentario", "Mandar un comentario", "Una idea o algo que anda mal", '<path d="M4 5h16v11H9l-5 4z"/>') : ""));
  }

  /* ---------- Mi plata ---------- */
  // La pregunta de cuando ya había cosas anotadas: cada botón dice cómo queda el número, para no tener que imaginárselo.
  function dudaPlata() {
    const d = st.dudaPlata, soloGastos = !d.ingresos, uno = d.lista.length === 1 ? d.lista[0] : null;
    const que = uno ? `${esc(uno.detalle || nombreCat(uno.categoria))} por ${plata(uno.monto)}` : soloGastos ? `${d.lista.length} gastos por ${plata(d.gastos)}` : `gastos por ${plata(d.gastos)} e ingresos por ${plata(d.ingresos)}`;
    return crd(`<b class="pregunta">Antes anotaste ${que}</b><div class="sub">¿Los ${plata(d.monto)} son lo que tenés ahora, o todavía falta ${soloGastos ? "restarle eso" : "tenerlo en cuenta"}?</div>` +
      `<div class="chips"><button class="pp" data-act="plataYaEstaba">Ya está ${soloGastos ? "restado" : "incluido"}: tengo ${plata(d.monto)}</button>` +
      `<button class="pp" data-act="plataFaltaba" aria-pressed="true">${soloGastos ? "Restalo" : "Tenelo en cuenta"}: me queda ${plata(d.monto + d.ingresos - d.gastos)}</button></div>`, "aviso");
  }

  function cargarPlata() {
    // Con ingresos anotados ya hay un número en Inicio aunque nunca se haya cargado la plata: no es «la primera vez».
    const s = saldoEfectivo(st.cfg.saldo, st.movs), ahora = tuPlata(s, st.movs);
    const fijos = st.fijos.filter((f) => f.tipo === "ingreso");
    const opcion = (act, v, t, sub) => `<button class="srow rowb" data-act="${act}"${v ? ` data-v="${esc(v)}"` : ""} style="width:100%;text-align:left"><span class="rt"><b>${t}</b><small>${sub}</small></span><span class="chev" aria-hidden="true">›</span></button>`;
    // Corregir el número es lo menos común: queda abajo, sin fondo y con el campo a un toque. La primera vez, en cambio, es lo primero.
    const corrigiendo = !s || st.plataCorregir || !!st.plataError;
    const debe = s ? enElMes(s, st.movs, hoy.slice(0, 7), st.metas, idsTarjeta()).tarjeta.debe : 0;
    // La tarjeta va debajo, aparte: no se resta de lo de arriba (sigue en tu plata hasta que la pagues).
    const filas = !s ? "" : `<div class="row f"><span>${s.implicito ? "Según lo que anotaste, tenés" : "Tenés ahora"}</span><span>${plata(ahora)}</span></div>` +
      (apartado(s, st.metas) ? `<div class="row"><span>Guardado para tus metas</span><span>${plata(apartado(s, st.metas))}</span></div><div class="row"><span>Te queda</span><span>${plata(podesUsar(s, st.movs, st.metas))}</span></div>` : "") +
      (debe ? `<div class="row"><span>Tarjeta por pagar</span><span>${plata(debe)}</span></div><div class="sub">${TARJETA_SIGUE}</div>` : "");
    const campo = `<div class="sub">${s ? "Poné lo que tenés de verdad y sigo desde ahí." : "Sumá los pesos que tenés en Mercado Pago, en el banco y en efectivo. Desde ahí te resto cada gasto y te sumo cada ingreso."}</div>` +
      `<div class="quick"><div class="pp${st.plataError ? " err" : ""}"><input class="field" data-act="plataMonto" value="${esc(st.plataTexto || "")}" placeholder="por ejemplo 30.000" inputmode="decimal" aria-label="Cuánta plata tenés hoy" maxlength="16"></div><button class="btn pp anotar" data-act="plataGuardar">${s && !s.implicito ? "Corregir" : "Guardar"}</button></div>` +
      (st.plataError ? `<div class="msg" role="alert">${esc(st.plataError)}</div>` : "");
    const cuanto = crd(lbl(s ? "Tu plata" : "¿Cuánta plata tenés hoy?") + filas +
      (corrigiendo ? campo : `<button class="plata-corregir" data-act="corregirPlata">¿No coincide con lo que tenés? Corregilo</button>`), s ? "plata-sec" : "");
    const cadaMes = fijos.map((f) => opcion("plataFijo", f.id, esc(f.nombre), plata(f.monto, f.moneda === "USD" ? { moneda: "US$ " } : {}) + " · día " + f.dia + (f.activo ? "" : " · pausado"))).join("") +
      opcion("plataFijo", "", fijos.length ? "Sumar otro que cobro todos los meses" : "¿Cobrás algo todos los meses?", "Un sueldo, una jubilación, un alquiler. Lo cargás una vez y te pregunto cuánto fue.");
    const entro = crd(`<b class="entro-t">¿Te entró plata?</b><div class="sub">Una changa, un bono, lo que te transfirieron o tu sueldo. Se suma a lo que tenés.</div>` +
      `<button class="btn pp w grande${s ? "" : " alt"}" data-act="cargarIngreso">Anotar lo que entró</button>` + cadaMes, "entro");
    // Con la plata ya cargada, lo más común es que haya entrado algo; la primera vez, lo primero es decir cuánto hay.
    const otras = crd(opcion("abrir", "platas", "Dólares, cripto e inversiones", "Lo que tengas en otro lado, a un toque desde Inicio.").replace("srow rowb", "srow f rowb"));
    return back("Inicio") + hdr("Tu plata", "Mi plata", "", "plata") + (st.dudaPlata ? dudaPlata() : "") + (s ? entro + cuanto : cuanto + entro) + otras;
  }

  /* ---------- Personalización ---------- */
  function personalizacion() {
    return back("Ajustes") + hdr("Ajustes", "Personalización") +
      crd(lbl("Apariencia") +
        `<div class="srow f letra-fila"><span class="rt"><b>Tamaño de letra</b><small>Agranda toda la app</small></span>${chips("letra", [["", "Normal"], ["grande", "Grande"], ["enorme", "Muy grande"]], globalThis.__miguitaLetra?.() || "", "Tamaño de letra")}</div>` +
        `<div class="srow"><span class="rt"><b>Tema</b></span>${chips("tema", [["dark", "Oscuro"], ["light", "Claro"]], st.cfg.tema, "Tema")}</div>` +
        `<div class="srow"><span class="rt"><b>Reducir movimiento</b><small>Frena el temblor de los dibujos</small></span>${interruptor("movimiento", !st.cfg.movimiento, "Reducir movimiento")}</div>` +
        `<div class="srow"><span class="rt"><b>Ocultar montos</b><small>Tapa los números en la pantalla</small></span>${interruptor("ocultar", st.cfg.ocultar, "Ocultar montos")}</div>`) +
      billetera() +
      crd(`<button class="srow f rowb" data-act="abrir" data-v="categorias" style="width:100%;text-align:left"><span class="rt"><b>Categorías y medios de pago</b><small>Renombrar, ocultar o agregar</small></span><span class="chev" aria-hidden="true">›</span></button>`);
  }

  /* ---------- Categorías y medios ---------- */
  function categorias() {
    const t = st.catTab;
    const items = t === "medios" ? st.cfg.medios : st.cfg.categorias[t];
    return back("Personalización") + hdr("Personalización", "Categorías y medios") +
      chips("catTab", [["gasto", "Gastos"], ["ingreso", "Ingresos"], ["medios", "Medios de pago"]], t, "Lista") +
      crd(items.map((c, i) => {
        const oculto = c.oculta || c.oculto;
        const sub = oculto ? "Oculta" : t === "medios" ? "" : c.claves.length ? c.claves.slice(0, 4).join(", ") + (c.claves.length > 4 ? "…" : "") : "Sin palabras clave";
        return `<button class="row rowb${i ? "" : " f"}" data-act="editarCat" data-v="${esc(c.id)}"${oculto ? ' style="opacity:.55"' : ""}>` +
          `<span class="cat-fila">${t === "medios" ? "" : Art.iconoDeCategoria(c).replace("<svg", '<svg style="width:34px;flex:none"')}<span>${esc(c.nombre)}${sub ? `<small>${esc(sub)}</small>` : ""}</span></span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("")) +
      `<button class="btn pp w" data-act="agregarCat">+ Agregar ${t === "medios" ? "medio de pago" : "categoría"}</button>` +
      (t === "medios" ? "" : `<div class="sub">Las palabras clave sirven para adivinar la categoría cuando escribís «súper 5000».</div>`) +
      (loAprendido().length ? `<button class="btn pp w alt" data-act="abrir" data-v="aprendidas">Lo que me enseñaste (${loAprendido().length})</button>` : "");
  }

  /* ---------- lo que la app aprendió de la persona ---------- */
  const loAprendido = () => Object.entries(st.cfg.aprendidas || {}).filter(([, id]) => id && cat(id)).reverse();
  function aprendidas() {
    const lista = loAprendido();
    return back("Categorías") + hdr("Personalización", "Lo que me enseñaste") +
      `<div class="sub">Cada vez que corregís una categoría, me acuerdo para la próxima. Si me enseñaste algo mal, olvidalo acá.</div>` +
      (lista.length ? crd(lista.map(([k, id], i) => `<div class="row${i ? "" : " f"}"><span>${esc(k)}<small>va a ${esc(nombreCat(id))}</small></span><button class="link" data-act="olvidar" data-v="${esc(k)}" aria-label="Olvidar ${esc(k)}">Olvidar</button></div>`).join("")) +
        `<button class="btn pp w alt del" data-act="olvidarTodo">${st.confirmar === "olvidar" ? "Tocá de nuevo para olvidar todo" : "Olvidar todo"}</button>` :
        crd(`<div class="empty"><b>Todavía no me enseñaste nada</b><span>Cuando cambies la categoría de algo, queda acá.</span></div>`));
  }

  function editarCat() {
    if (!st.editCat) return back("Categorías");
    const { tipo, id } = st.editCat;
    const medios = tipo === "medios";
    const c = medios ? st.cfg.medios.find((m) => m.id === id) : st.cfg.categorias[tipo].find((x) => x.id === id);
    if (!c) return back("Categorías");
    const respaldo = !medios && RESPALDO[tipo] === id;
    return back("Categorías") + hdr(medios ? "Medio de pago" : tipo === "gasto" ? "Categoría de gasto" : "Categoría de ingreso", esc(c.nombre)) +
      lbl("Nombre") + `<div class="quick"><div class="pp"><input class="field" data-act="catNombre" value="${esc(c.nombre)}" aria-label="Nombre" maxlength="30"></div></div>` +
      (medios ? "" : lbl("Ícono") + crd(`<button class="srow f rowb icono-fila" data-act="abrir" data-v="elegirIconoCat" style="width:100%;text-align:left">${Art.iconoDeCategoria(c)}` +
        `<span class="rt"><b>${nombreIcono(c)}</b><small>Elegí otro o dibujá el tuyo</small></span><span class="chev" aria-hidden="true">›</span></button>`)) +
      (medios ? "" : lbl("Palabras clave") + `<div class="quick"><div class="pp"><input class="field" data-act="catClaves" value="${esc(c.claves.join(", "))}" placeholder="por ejemplo: coto, verdulería" aria-label="Palabras clave separadas por coma" maxlength="400"></div></div><div class="hint">Separalas con comas.</div>`) +
      (respaldo ? `<div class="hint">Esta es la categoría que se usa cuando ninguna otra coincide, por eso no se puede ocultar.</div>` :
        crd(`<div class="srow f"><span class="rt"><b>Ocultar</b><small>No aparece al anotar. Lo ya anotado se mantiene.</small></span>${interruptor("catOcultar", !!(c.oculta || c.oculto), "Ocultar")}</div>`));
  }

  /* ---------- el ícono de una categoría: elegirlo o dibujarlo ---------- */
  // La categoría que se está editando (solo de gastos o ingresos: los medios no tienen ícono).
  const catEditada = () => st.editCat && st.editCat.tipo !== "medios" ? st.cfg.categorias[st.editCat.tipo]?.find((x) => x.id === st.editCat.id) : null;
  const nombreIcono = (c) => { const k = Art.claveDeIcono(c); return k === "dibujo" ? "Tu dibujo" : esc(Art.ICONOS_CAT.find((i) => i.id === k)?.nombre || "Otros"); };

  function elegirIconoCat() {
    const c = catEditada();
    if (!c) return back("Categorías");
    const actual = Art.claveDeIcono(c);
    // Cuáles ya usa otra categoría (de gastos o de ingresos, sin contar las ocultas): esos van aparte, al final.
    const usado = new Map();
    for (const x of [...st.cfg.categorias.gasto, ...st.cfg.categorias.ingreso]) {
      const k = Art.claveDeIcono(x);
      if (x.id !== c.id && !x.oculta && !usado.has(k)) usado.set(k, x.nombre);
    }
    const boton = (i) => `<button class="cat pp" data-act="elegirIcono" data-v="${esc(i.id)}" aria-pressed="${actual === i.id}"` +
      ` aria-label="${esc(i.nombre)}${usado.has(i.id) ? ", lo usa " + esc(usado.get(i.id)) : ""}">${Art.iconoDeLista(i.id)}${esc(i.nombre)}</button>`;
    const libres = Art.ICONOS_CAT.filter((i) => !usado.has(i.id)), enUso = Art.ICONOS_CAT.filter((i) => usado.has(i.id));
    return back(c.nombre) + hdr(esc(c.nombre), "Elegí el ícono") +
      crd(`<div class="srow f icono-fila">${Art.iconoDeCategoria(c)}<span class="rt"><b>${nombreIcono(c)}</b><small>Es el que tiene ahora</small></span></div>` +
        `<button class="btn pp w" data-act="dibujarCat">Dibujar el mío</button>`) +
      lbl("Sin usar") + `<div class="cats" role="group" aria-label="Íconos sin usar">${libres.map(boton).join("")}</div>` +
      (enUso.length ? lbl("Ya los usa otra categoría") + `<div class="cats" role="group" aria-label="Íconos que ya usa otra categoría">${enUso.map(boton).join("")}</div>` : "");
  }

  // Dibujar con el dedo. Mientras se dibuja, el trazo lo maneja lienzo.js; acá se muestra lo ya dibujado (st.dibujo).
  function dibujoCat() {
    const c = catEditada(), d = st.dibujo;
    if (!c || !d) return back("Categorías");
    const limpio = limpiarDibujo(d), camino = limpio ? limpio.t.map(caminoDe).join("") : "";
    const color = Number.isInteger(d.c) && COLORES_DIBUJO[d.c] ? d.c : 0; // solo un número de la lista llega a la pantalla
    const trazos = camino ? `<g class="fl"><path d="${camino}" stroke="${COLORES_DIBUJO[limpio.c]}" stroke-width="${ANCHO_COLOR}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>` +
      `<g class="ln" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${camino}" stroke-width="${ANCHO_LINEA}"/></g>` : "";
    const lleno = limpio && (limpio.t.length >= MAX_TRAZOS || puntosDe(limpio.t) >= MAX_PUNTOS);
    return back("Ícono") + hdr(esc(c.nombre), "Dibujá tu ícono") +
      `<div class="sub">Con el dedo, adentro del cuadro. Queda chiquito: mejor pocas líneas y grandes.</div>` +
      `<div class="lienzo pp" data-lienzo data-c="${color}"><svg viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="Lienzo para dibujar el ícono${limpio ? ", con " + limpio.t.length + (limpio.t.length === 1 ? " trazo" : " trazos") : ", vacío"}">${trazos}</svg></div>` +
      (lleno ? `<div class="hint">El dibujo está lleno. Deshacé algún trazo para seguir.</div>` : "") +
      `<div class="dib-fila"><div class="cat pp dib-muestra" aria-hidden="true">${limpio ? Art.dibujoPropio(limpio) : Art.iconoDeLista("otros")}${esc(c.nombre.split("/")[0])}</div>` +
      `<div class="chips"><button class="pp" data-act="trazoDeshacer">Deshacer</button><button class="pp" data-act="trazoBorrar">Borrar todo</button></div></div>` +
      lbl("Color") + `<div class="colores" role="group" aria-label="Color">` + COLORES_DIBUJO.map((col, i) =>
        `<button class="pp color" data-act="dibujoColor" data-v="${i}" aria-pressed="${color === i}" aria-label="${NOMBRES_COLOR[i]}"><span style="background:${col}"></span></button>`).join("") + `</div>` +
      `<button class="btn pp w" data-act="dibujoListo">Usar este dibujo</button>`;
  }

  /* ---------- hoja de anotar ---------- */
  // Compra en cuotas: en cuántas, con qué tarjeta y desde cuándo.
  function enCuotas(s, total, usd) {
    if (!s.enCuotas) return `<div class="chips"><button class="pp" data-act="enCuotas" aria-pressed="false">En cuotas</button></div>`;
    const n = s.nCuotas || 0;
    return crd(`<div class="chips"><button class="pp" data-act="enCuotas" aria-pressed="true">En cuotas</button></div>` +
      lbl("¿En cuántas?") + chips("hojaCuotas", [2, 3, 6, 9, 12, 18, 24, 36].map((c) => [String(c), String(c)]), String(n), "Cantidad de cuotas") +
      (n && total ? `<div class="sub">${n} cuotas de ${formatear(Math.floor(total / n), { moneda: usd ? "US$ " : "$" })}. Si tiene interés, poné el total con interés.</div>` : "") +
      lbl("¿Con qué tarjeta?") + (st.tarjetas.length ? chips("hojaTarjeta", st.tarjetas.map((t) => [t.id, t.nombre]), s.tarjeta, "Tarjeta") : "") +
      `<div class="quick"><div class="pp"><input data-act="hojaTarjetaNueva" value="${esc(s.tarjetaNueva || "")}" placeholder="${st.tarjetas.length ? "U otra: por ejemplo Visa" : "Por ejemplo Visa"}" aria-label="Nombre de la tarjeta" maxlength="30"></div></div>` +
      (st.tarjetas.find((t) => t.id === s.tarjeta)?.cierre ? "" : lbl("La primera cuota") + chips("hojaPrimera", [["este", "En este mes"], ["sig", "El mes que viene"]], s.primera || "este", "Primera cuota")));
  }


  function hoja() {
    const s = st.hoja;
    const total = s.tocada ? evaluar(s.expr) : s.centavos;
    const usd = s.moneda === "USD";
    const cot = usd ? dolarDe(st.cfg.dolar.conversion === "hoy" ? hoy : s.fecha) : null;
    const cuenta = /[+−]/.test(s.expr.replace(/^−/, "")) ? s.expr.replace(/([+−])/g, " $1 ") : (s.detalle || (s.tipo === "ingreso" ? "ingreso" : "gasto"));
    const tecla = (t) => `<button class="key pp" data-act="tecla" data-v="${t}"${t === "⌫" ? ' aria-label="Borrar un número"' : t === "−" ? ' aria-label="Menos"' : ""}>${t}</button>`;
    const fechas = [[hoy, "Hoy"], [sumarDias(hoy, -1), "Ayer"], [sumarDias(hoy, -2), "Anteayer"]];
    const otra = !fechas.some((f) => f[0] === s.fecha);
    const cats = st.cfg.categorias[s.tipo].filter((c) => !c.oculta || c.id === s.categoria);
    const medios = st.cfg.medios.filter((m) => !m.oculto || m.id === s.medio);
    const editar = s.modo === "editar";

    return `<div class="sheet-bg" data-act="fondo"><div class="sheet" role="dialog" aria-modal="true" aria-label="${editar ? "Editar movimiento" : "Anotar un " + s.tipo}">` +
      `<button class="back" data-act="cerrarHoja">‹ Cancelar</button>` +
      `<div class="top"><div class="chipcol">${chips("tipo", [["gasto", "Gasto"], ["ingreso", "Ingreso"]], s.tipo, "Tipo")}${chips("monedaHoja", [["ARS", "$"], ["USD", "US$"]], s.moneda, "Moneda")}</div>` +
      `<div class="amount"><small>${esc(usd ? (cot ? "≈ " + formatear(aPesos(total, cot.valor)) + " · dólar " + nombreTipo(st.cfg.dolar.tipo).toLowerCase() + " " + formatear(cot.valor) + (cot.estimado ? " (estimado)" : "") : "Falta el valor del dólar: Más › Dólar") : cuenta)}</small><div class="big" aria-live="polite">${formatear(total, { moneda: usd ? "US$ " : "$" })}</div></div></div>` +
      lbl("Categoría") + `<div class="cats" role="group" aria-label="Categoría">` +
      cats.map((c) => `<button class="cat pp" data-act="cat" data-v="${esc(c.id)}" aria-pressed="${c.id === s.categoria}">${Art.iconoDeCategoria(c)}${esc(c.nombre.split("/")[0])}</button>`).join("") + "</div>" +
      lbl("Medio de pago") + chips("medio", medios.map((m) => [m.id, m.nombre]), s.medio, "Medio de pago") +
      (s.tipo === "gasto" && !editar ? enCuotas(s, total, usd) : "") +
      `<div class="chips" role="group" aria-label="Fecha">` + fechas.map(([v, t]) => `<button class="pp" data-act="fecha" data-v="${v}" aria-pressed="${v === s.fecha}">${t}</button>`).join("") +
      `<label class="pp otra"${otra ? ' data-on="1"' : ""}>${otra ? esc(nombreDia(s.fecha, true)) : "Otra fecha"}<input type="date" data-act="otra" value="${s.fecha}" max="${hoy}" aria-label="Elegir otra fecha"></label></div>` +
      `<div class="quick"><div class="pp"><input data-act="detalle" value="${esc(s.detalle)}" placeholder="Detalle (opcional)" aria-label="Detalle" maxlength="80"></div></div>` +
      (s.error ? `<div class="msg" role="alert">${esc(s.error)}</div>` : "") +
      `<div class="pie"><div class="pad">${tecla("7")}${tecla("8")}${tecla("9")}${tecla("⌫")}${tecla("4")}${tecla("5")}${tecla("6")}${tecla("+")}${tecla("1")}${tecla("2")}${tecla("3")}` +
      `<button class="key pp ok" data-act="guardar">Guardar</button>${tecla("000")}${tecla("0")}${tecla("−")}</div>` +
      (editar ? `<button class="btn pp w alt del" data-act="borrarMov">${st.confirmar === "mov" ? "Tocá de nuevo para borrar" : "Borrar este movimiento"}</button>` : "") +
      `</div></div></div>`;
  }

  // «¿Cuáles eran de la tarjeta?»: después de «Sí, elegirlas». Lo que se elige pasa a ser compra con crédito y el pago la cubre.
  function comprasTarjeta() {
    const e = st.elegirTarjeta, ids = idsTarjeta(), pago = e && st.movs.find((x) => x.id === e.pago);
    if (!pago) return back("Inicio") + crd(`<div class="empty"><b>Ese pago ya no está</b></div>`);
    // Sin «de $Y»: con un pago mínimo o con saldo a favor, elegir justo lo pagado deja compras afuera. Se eligen todas las de ese resumen;
    // lo que el pago no cubra queda como «tarjeta por pagar».
    const lista = comprasPosibles(st.movs, ids, pago), falta = Math.max(0, sinCubrir(st.movs, ids, pago));
    const marcado = lista.filter((m) => e.marcadas.has(m.id)).reduce((a, m) => a + m.monto, 0);
    return back("Inicio") + hdr("Pagaste " + plata(pago.monto) + " de la tarjeta", "¿Cuáles eran de la tarjeta?") +
      crd(`<div class="sub">Tocá todo lo que compraste con esa tarjeta y todavía no estaba pago, aunque hayas pagado menos (el mínimo, una parte). Quedan como compras con crédito y el pago no se cuenta dos veces.</div>` +
        `<div class="sub"><b>Elegiste ${plata(marcado)}</b>${(() => {
          // Lo que quedaría sin cubrir con lo elegido, probado sobre una copia (tiene en cuenta el saldo a favor y lo que ya se debía).
          const resto = restoSiEligen(st.movs, ids, pago, e.marcadas);
          return resto > 0 ? `. Los ${plata(resto)} que no cubren los cuento como un gasto nuevo (intereses, impuestos)` : marcado > falta ? `. Lo que este pago no cubre queda como tarjeta por pagar` : "";
        })()}</div>`) +
      crd(lista.map((m, i) => `<button class="row rowb${i ? "" : " f"}" data-act="tarjetaMarcar" data-v="${esc(m.id)}" aria-pressed="${e.marcadas.has(m.id)}"><span><span class="tilde">${e.marcadas.has(m.id) ? "✓" : ""}</span>${esc(m.detalle || nombreCat(m.categoria))}<small>${esc(nombreCat(m.categoria))} · ${esc(nombreDia(m.fecha))}</small></span><span class="der">${plata(m.monto)}</span></button>`).join("")) +
      `<button class="btn pp w" data-act="tarjetaListo">Listo</button>`;
  }

  // «Lo de siempre»: lo que se anota igual una y otra vez, a un toque. Va debajo del campo, solo cuando hay algo repetido.
  function loDeSiempre(no) {
    st.repetidos = no ? [] : repetidos(st.movs, hoy);
    if (!st.repetidos.length) return "";
    return `<div class="repes" role="group" aria-label="Lo de siempre: tocá para anotarlo de nuevo"><span class="repes-t">Lo de siempre</span>` +
      st.repetidos.map((x, i) => `<button class="pp repe" data-act="repetir" data-v="${i}" aria-label="Anotar de nuevo ${esc(x.detalle)}, ${plata(x.monto)}"><span>${esc(x.detalle)}</span> <b>${plata(x.monto)}</b></button>`).join("") + `</div>`;
  }

  return { inicio, cartelInstalar, movimientos, idsTarjeta, movsGasto, comprasTarjeta, resumen, racha, festejo, mas, cargarPlata, personalizacion, hayEjemplo, categorias, editarCat, elegirIconoCat, dibujoCat, aprendidas, hoja, nombreCat, iconoCat: iconoDe, nombreMedio, nombreDia, mesTexto, plata, motivosApretado, estadoDelMes,
    guia, ayuda, ayudaHoja,
    ayudas: { back, hdr, lbl, crd, chips, interruptor, preg } };
}
