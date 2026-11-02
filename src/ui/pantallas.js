// Pantallas de MiGuita. Cada función devuelve HTML; los textos de la persona pasan siempre por esc().
import { AYUDAS } from "./ayuda.js";
import { apartado, enMetas, podesUsar, ahorroSinPreguntar, parteDePlata, tuPlata } from "../logic/saldo.js";
import { puedeGrabar } from "./voz.js";
import { Art } from "../art/art.js";
import { formatear, evaluar } from "../logic/dinero.js";
import { RESPALDO, BILLETERAS, BILLETERA_GENERAL } from "../logic/categorias.js";
import { sumarDias, cambiarMes, delMes, referencia, resumenMes, gastosPor, gastosPorDia, estadoMiguita, porDiaAgrupado } from "../logic/mes.js";
import { infoRacha, apretado, PREMIOS } from "../logic/racha.js";
import { estadoPresupuestos, estadoConPresupuestos, resumenDeudas, restante, fijosPorConfirmar } from "../logic/plan.js";
import { valorPara, aPesos, nombreTipo } from "../logic/dolar.js";
import { mesParaMostrar } from "../logic/tumes.js";
import { EN_PRUEBA } from "../logic/buzon.js";
import { ICONO_BILLETERA } from "./importar.js";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const PREMIO_TEXTO = { 7: "un miñón", 14: "un cañoncito", 21: "medialunas", 30: "una pastafrola", 60: "un pan dulce", 100: "una torta" };

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/* ---------- ayudas ---------- */
export function crearVistas(st, hoy) {
  const plata = (c, o = {}) => formatear(c, { ...o, oculto: st.cfg.ocultar });
  const cat = (id) => st.cfg.categorias.gasto.find((c) => c.id === id) || st.cfg.categorias.ingreso.find((c) => c.id === id);
  const nombreCat = (id) => cat(id)?.nombre || "Otros";
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

  // Estado de Miguita del mes: el peor entre gasto sobre ingresos y los presupuestos.
  function estadoDelMes(mes, r) {
    return estadoConPresupuestos(estadoMiguita(r.ingresos, r.gastos), estadoPresupuestos(st.presupuestos, st.movs, mes));
  }
  const motivosApretado = () => apretado(st.movs, hoy, st.presupuestos,
    resumenDeudas(st.deudas, hoy).activas.filter((d) => d.tipo === "debo").map((d) => ({ restante: restante(d) })), nombreCat);

  const MIC = '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>';

  /* ---------- Inicio ---------- */
  function inicio() {
    const actual = st.mes === hoy.slice(0, 7);
    const r = resumenMes(st.movs, referencia(st.mes, hoy));
    const movs = porDiaAgrupado(delMes(st.movs, st.mes)).flatMap((g) => g.movs);
    const ra = infoRacha(st.movs, st.dias, hoy);
    const nombre = (st.cfg.nombre || "").trim();
    const guiando = st.guiaPaso !== null && st.guiaPaso !== undefined;
    const sinIngreso = r.ingresos === 0;
    let h = `<div class="top"><div><small>${mesNav()}` +
      `<button class="eyeb" data-act="ocultar" aria-pressed="${st.cfg.ocultar}" aria-label="${st.cfg.ocultar ? "Mostrar montos" : "Ocultar montos"}">${Art.icono(st.cfg.ocultar ? Art.OJO_TAPADO : Art.OJO)}</button></small>` +
      `<h1>Hola${nombre ? ", " + esc(nombre) : ""}${guiando ? "" : preg("inicio")}</h1>` +
      `<button class="racha" data-act="abrir" data-v="racha" aria-label="Ver tu racha">${Art.minion()}<span>${ra.actual ? ra.actual + (ra.actual === 1 ? " día" : " días") + (ra.hoyHecho ? "" : " · salvala hoy") : "Empezá tu racha"}</span></button>` +
      `</div><button class="miguita-toque${st.chiste ? " salta" + (st.chiste.n % 2) + (st.chiste.giro ? " gira" : "") : ""}" data-act="tocarMiguita" aria-label="Tocar a Miguita">` +
      `${Art.miguita(estadoDelMes(st.mes, r))}${st.chiste ? `<span class="globo" role="status">${esc(st.chiste.texto)}</span>` : ""}</button></div>`;

    const peor = actual && estadoPresupuestos(st.presupuestos, st.movs, st.mes).find((p) => p.nivel !== "ok");
    if (peor) h += `<button class="card pp tecard" data-act="verPlan" data-v="presupuesto">` +
      `<span class="msg">${peor.nivel === "pasado" ? "Te pasaste del tope de " : "Estás llegando al tope de "}${esc(nombreCat(peor.categoria))}.</span>` +
      `<span class="sub">Gastaste ${plata(peor.gastado)} de ${plata(peor.tope)}.</span></button>`;

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
      const n = st.dudaSaldo.ids.length;
      h += crd(`<b class="pregunta">¿${n > 1 ? "Estos ya estaban descontados" : "Esto ya estaba descontado"} de los ${plata(st.cfg.saldo.monto)} que cargaste?</b><div class="sub">Si lo pagaste antes de cargar tu plata, no te lo resto de nuevo.</div>` +
        `<div class="chips"><button class="pp" data-act="saldoYa" aria-pressed="true">Sí, ya estaba</button><button class="pp" data-act="saldoNo">No, restalo</button></div>`, "aviso");
    }
    const sinPreguntar = guiando ? 0 : ahorroSinPreguntar(st.cfg.saldo, st.metas);
    if (sinPreguntar) h += crd(`<b class="pregunta">¿Lo que guardaste para tus metas está dentro de tu plata?</b><div class="sub">Son ${plata(sinPreguntar)}. Si está adentro, te muestro solo lo que podés usar.</div>` +
      `<div class="chips"><button class="pp" data-act="ahorroAdentro" aria-pressed="true">Sí, está adentro</button><button class="pp" data-act="ahorroAparte">No, lo tengo aparte</button></div>`, "aviso");
    // Un solo cartel de bienvenida por vez, para no llenar la pantalla. Lo que cobrás y tu nombre se piden acá, sin obligar.
    const reales = st.movs.filter((m) => !m.id.startsWith("ej_")).length;
    if (guiando) { /* mientras dura la guía, nada más */ }
    else if (actual && sinIngreso && reales && !st.cfg.ingresoVisto && !st.cfg.saldo)
      h += crd(`<b class="pregunta">¿Querés saber cuánto te queda este mes?</b><div class="sub">Cargá lo que cobrás y te lo digo. Es opcional.</div><div class="chips"><button class="pp" data-act="abrir" data-v="plata" aria-pressed="true">Cargar</button><button class="pp" data-act="cerrarCartel" data-v="ingresoVisto">Ahora no</button></div>`, "aviso");
    else if (EN_PRUEBA && !st.cfg.pruebaVisto)
      h += crd(`<b class="pregunta">Estás probando MiGuita antes que nadie</b><div class="sub">La estamos probando en un grupo chico de amigos. Si algo anda mal o se te ocurre una idea, mandala: a fin de mes, el aporte más útil se lleva una birra.</div>` +
        `<div class="chips"><button class="pp" data-act="abrirComentario" aria-pressed="true">Mandar un comentario</button><button class="pp" data-act="cerrarCartel" data-v="pruebaVisto">Después</button></div>`, "aviso");
    else if (!(matchMedia("(display-mode: standalone)").matches || navigator.standalone) && !st.cfg.instalarVisto && st.movs.length)
      h += crd(`<b class="pregunta">Tenela a mano en tu celu</b><div class="sub">Instalala y se abre desde un ícono, como cualquier app.</div><div class="chips"><button class="pp" data-act="abrir" data-v="instalar" aria-pressed="true">Ver cómo</button><button class="pp" data-act="cerrarCartel" data-v="instalarVisto">Ahora no</button></div>`, "aviso");

    if (!guiando && reales >= 3 && !nombre && !st.cfg.nombreVisto && !(actual && sinIngreso && !st.cfg.ingresoVisto && !st.cfg.saldo))
      h += crd(`<b class="pregunta">¿Cómo te llamás?</b><div class="sub">Es para saludarte. Es opcional.</div><div class="quick"><div class="pp"><input class="field" data-act="nombre" value="" placeholder="Tu nombre" aria-label="Tu nombre" maxlength="30" autocomplete="given-name"></div></div><div class="chips"><button class="pp" data-act="cerrarCartel" data-v="nombreVisto" aria-pressed="true">Listo</button></div>`, "aviso");

    const cerrado = actual && mesParaMostrar(st.movs, hoy, st.cfg.mesVisto || "");
    if (cerrado) h += crd(`<b class="pregunta">Ya está tu mes de ${mesTexto(cerrado).toLowerCase()}</b><div class="sub">Miguita te armó una tarjeta para compartir: en qué se te fue la plata, tu racha y un chiste.</div>` +
      `<div class="chips"><button class="pp" data-act="abrirTuMes" data-v="${cerrado}" aria-pressed="true">Verla</button><button class="pp" data-act="descartarTuMes" data-v="${cerrado}">Ahora no</button></div>`, "aviso");

    if (hayEjemplo())
      h += crd(`<span>Estás viendo datos de ejemplo</span><button class="btnmini" data-act="quitarEjemplo">Quitar</button>`, "banner");

    if (actual && !ra.hoyHecho && ra.actual > 0 && new Date().getHours() >= 18 && Date.now() > st.avisoLuego)
      h += crd(`<b>¿Ya anotaste tus gastos de hoy?</b><div class="sub">Tu racha de ${ra.actual} ${ra.actual === 1 ? "día" : "días"} se corta si hoy no anotás nada.</div>` +
        `<div class="chips"><button class="pp" data-act="nuevo" aria-pressed="true">Anotar</button><button class="pp" data-act="noGaste">No gasté hoy</button><button class="pp" data-act="luego">Más tarde</button></div>`, "aviso");

    // Fijos que preguntan antes de anotarse.
    if (actual) for (const f of fijosPorConfirmar(st.fijos, hoy)) {
      const ing = f.tipo === "ingreso";
      h += crd(`<div class="sec">${ing ? "Ingreso fijo" : "Gasto fijo"} · día ${f.dia}</div><b class="pregunta">${ing ? "¿Ya cobraste " : "¿Ya pagaste "}${esc(f.nombre)}?</b><div class="sub">${plata(f.monto, f.moneda === "USD" ? { moneda: "US$ " } : {})}</div>` +
        `<div class="chips"><button class="pp" data-act="confirmarFijo" data-v="${esc(f.id)}" aria-pressed="true">Sí, anotar</button><button class="pp" data-act="cambiarFijo" data-v="${esc(f.id)}">Otro monto</button><button class="pp" data-act="saltearFijo" data-v="${esc(f.id)}">Este mes no</button></div>`, "aviso");
    }
    const c = st.cfg.copias;
    if (actual && c.auto && (!c.ultima || Date.now() - Date.parse(c.ultima) >= (c.cada === "mes" ? 30 : 7) * 864e5))
      h += crd(`<span>Toca hacer tu copia de seguridad</span><button class="btnmini" data-act="abrir" data-v="copias">Hacerla</button>`, "banner");
    // Aunque no haya activado el recordatorio: si ya anotó bastante y nunca hizo una copia, se lo decimos (cada 30 días como mucho).
    else if (actual && !c.ultima && st.movs.filter((m) => !m.id.startsWith("ej_")).length >= 10 && (!c.pospuesta || Date.now() - Date.parse(c.pospuesta) >= 30 * 864e5))
      h += crd(`<div class="sub"><b>Tus datos están solo en este celu.</b> Si lo perdés o se borra la app, se pierden. Una copia los salva.</div>` +
        `<div class="chips"><button class="pp" data-act="abrir" data-v="copias" aria-pressed="true">Hacer una copia</button><button class="pp" data-act="posponerCopia">Ahora no</button></div>`, "aviso");

    // Con su plata cargada se ve un solo número: lo que puede usar. Sin eso, "te queda" sale de lo cobrado; sin ingresos, se muestra lo gastado.
    const miPlata = tuPlata(st.cfg.saldo, st.movs);
    const conPlata = actual && miPlata !== null && !guiando;
    if (conPlata) {
      const usar = podesUsar(st.cfg.saldo, st.movs, st.metas), ars = enMetas(st.metas), usd = enMetas(st.metas, "USD");
      const guardado = [ars && plata(ars), usd && plata(usd, { moneda: "US$ " })].filter(Boolean).join(" y ");
      h += `<button class="card pp hr tecard" data-act="abrir" data-v="resumen" aria-label="Ver el resumen del mes">${Art.pan(parteDePlata(st.cfg.saldo, st.movs, st.mes, st.metas))}<span class="ht"><span class="sub">${usar < 0 ? "Te pasaste por" : "Podés usar"}</span>` +
        `<span class="big std">${plata(Math.abs(usar))}</span>` +
        `<span class="sub">${usar > 0 ? "Podés gastar " + plata(Math.floor(usar / r.faltan / 100) * 100) + " por día" : "Tocá para ver en qué se fue"}</span>` +
        (guardado ? `<span class="sub">Ahorros para tus metas: ${guardado}</span>` : "") + `</span></button>`;
    } else h += `<button class="card pp hr tecard" data-act="abrir" data-v="resumen" aria-label="Ver el resumen del mes">${Art.pan(r.queda)}<span class="ht"><span class="sub">${sinIngreso ? "Gastaste" : "Te queda"}</span>` +
      `<span class="big std">${plata(sinIngreso ? r.gastos : r.teQueda)}</span>` +
      `<span class="sub">${sinIngreso ? "Tocá para ver en qué se fue" : actual ? "Podés gastar " + plata(r.porDia) + " por día" : "Gastaste " + plata(r.gastos)}</span></span></button>`;

    const conMic = !guiando && puedeGrabar();
    h += (guiando ? "" : conPlata ?
      `<div class="plata-fila sola"><button class="btnmini" data-act="abrir" data-v="plata">Cargar plata</button></div>` : miPlata !== null ?
      `<div class="plata-fila"><span><small>Tu plata ahora</small><b${miPlata < 0 ? ' class="neg-v"' : ""}>${plata(miPlata)}</b></span><button class="btnmini" data-act="abrir" data-v="plata">Cargar plata</button></div>` :
      `<div class="plata-fila sola"><button class="btnmini" data-act="abrir" data-v="plata">+ Cargar plata</button></div>`) + `<form class="quick" data-form="rapido"><div class="pp${st.error ? " err" : ""}"><input id="rapido" placeholder="15mil nafta" aria-label="Anotar un gasto" autocomplete="off" enterkeyhint="done" maxlength="300"></div>` +
      (conMic ? `<button class="btn pp mic" type="button" data-act="hablar" aria-label="Hablar: decí tus gastos con la voz">${Art.icono(MIC)}</button>` : "") +
      `<button class="btn pp anotar" type="submit">Anotar</button></form>` +
      (conMic && !st.cfg.vozAviso ? `<div class="nuevo-mic">Nuevo: tocá el micrófono y decí lo que gastaste o te entró</div>` : "") +
      (st.error ? `<div class="msg" role="alert">${esc(st.error)}</div>` : "") +
      (guiando ? "" : `<button class="traer" data-act="abrir" data-v="importar"><span aria-hidden="true">${Art.icono(ICONO_BILLETERA)}</span><span>¿Usás Mercado Pago? <b>Traé tus gastos solos</b></span><span class="chev" aria-hidden="true">›</span></button>`);

    h += crd(`<div class="sec secrow" data-guia="mov"><span>Últimos movimientos</span>${movs.length ? `<button class="link" data-act="abrir" data-v="movimientos">Ver todos ›</button>` : ""}</div>` +
      (movs.length ? movs.slice(0, 5).map((x, i) => fila(x, i === 0, subInicio)).join("") :
        `<div class="empty"><b>Todavía no anotaste nada</b><span>Escribí «15mil nafta» arriba y listo.</span></div>`));
    if (!st.movs.length && !guiando) h += `<button class="link chico" data-act="yaUsoMiguita">¿Ya usás MiGuita en otro celu? Conectalo</button><button class="link chico" data-act="tengoCopia">Tengo una copia de seguridad</button>`;
    return h;
  }

  /* ---------- la guía de la primera vez: se hace usando la app de verdad ---------- */
  function guia() {
    const p = st.guiaPaso;
    const globo = (titulo, texto, boton = "") => `<div class="guia-globo"><div class="gcab">${Art.miguita("ok").replace("<svg", '<svg style="width:62px"')}<b>${titulo}</b></div><div class="gtxt">${texto}</div>${boton ? `<button class="btn pp w guia-sig" data-act="guiaSig">${boton}</button>` : ""}<div class="dots" role="img" aria-label="Paso ${p + 1} de 3">${[0, 1, 2].map((i) => `<i class="${i === p ? "on" : ""}"></i>`).join("")}</div></div>`;
    const saltar = p < 2 ? `<button class="guia-saltar" data-act="guiaFin">Saltear</button>` : "";
    let texto = "";
    if (p === 1) {
      const nuevos = st.movs.length - st.guiaBase, m = [...st.movs].sort((a, b) => b.ts - a.ts)[0];
      const que = m?.detalle ? " de " + esc(m.detalle.toLowerCase()) : "";
      texto = nuevos > 1 ? `Anoté tus ${nuevos} gastos y a cada uno le puse su categoría. Si algo está mal, lo tocás y lo cambiás.` :
        m?.tipo === "ingreso" ? `Entendí que entraron ${plata(m.monto)}${que} y lo puse en ${esc(nombreCat(m.categoria))}. Si algo está mal, lo tocás y lo cambiás.` :
        `Entendí que son ${plata(m?.monto || 0)}${que} y lo puse en ${esc(nombreCat(m?.categoria))}. Si algo está mal, lo tocás y lo cambiás.`;
    }
    return `<div class="guia-fondo"></div>` + saltar + (
      p === 0 ? globo("Empecemos", "Escribí lo último que gastaste. Por ejemplo: <b>10 lucas birra</b>. Después tocá <b>Anotar</b>.") :
      p === 1 ? globo("¡Anotado!", texto, "Seguir") :
      globo("Abajo está lo demás", `<div class="g3"><b>Grupos</b> Dividí gastos con amigos.</div><div class="g3"><b>Mis cuentas</b> Cuotas, metas, deudas y gastos fijos.</div><div class="g3"><b>Ajustes</b> Avisos, personalización y PIN.</div>`, "¡A usarla!"));
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
    const r = resumenMes(st.movs, referencia(st.mes, hoy));
    const pc = gastosPor(st.movs, st.mes, "categoria"), pm = gastosPor(st.movs, st.mes, "medio");
    const dias = gastosPorDia(st.movs, st.mes);
    const max = Math.max(...dias), diaMax = dias.indexOf(max);
    let h = back("Inicio") + hdr(mesNav(), "Resumen", estadoDelMes(st.mes, r), "resumen") +
      crd(`<div class="stats"><div><div class="sub">Ingresos</div><b class="pos">${plata(r.ingresos)}</b></div><div><div class="sub">Gastos</div><b class="neg">${plata(r.gastos)}</b></div><div><div class="sub">Queda</div><b>${plata(r.teQueda)}</b></div></div>` +
        (() => { const d = dolarDe(referencia(st.mes, hoy)); return d && r.gastos ? `<div class="sub">≈ ${formatear(Math.round(r.gastos * 100 / d.valor), { moneda: "US$ ", oculto: st.cfg.ocultar }).replace(/,\d\d$/, "")} gastados · dólar ${nombreTipo(st.cfg.dolar.tipo).toLowerCase()} ${formatear(d.valor)}</div>` : ""; })());
    if (!r.gastos) return h + crd(`<div class="empty"><b>Sin gastos este mes</b><span>Cuando anotes, acá vas a ver en qué se te va la plata.</span></div>`);
    h += `<div class="btnrow"><button class="btn pp alt" data-act="abrirTuMes" data-v="${st.mes}">Tu mes${actual ? " (hasta hoy)" : ""}</button><button class="btn pp alt" data-act="verPlan" data-v="analisis">Ver análisis</button></div>`;
    h += crd(lbl("Por categoría") + pc.map((c) => `<div class="crow">${Art.catIcon(c.id)}<div class="cr"><div class="row f" style="padding:0 0 3px;min-height:0"><span>${esc(nombreCat(c.id))} · ${Math.round(c.parte * 100)}%</span><span>${plata(c.monto)}</span></div>${Art.barra(c.monto / pc[0].monto)}</div></div>`).join(""));
    h += crd(lbl("Por medio de pago") + pm.map((m, i) => `<div class="row${i ? "" : " f"}"><span>${esc(nombreMedio(m.id) || "Sin medio")}</span><span>${plata(m.monto)}</span></div>`).join(""));
    h += crd(lbl("Tu ritmo") + `<div class="row f"><span>Gastás en promedio</span><span>${plata(r.promedio)} por día</span></div>` +
      (actual ? `<div class="sub">A este ritmo, a fin de mes vas a gastar ${plata(r.proyeccion)}.</div>` : ""));
    h += crd(lbl("Por día") + Art.barrasDias(dias, diaMax) + `<div class="sub">Más gastaste: ${esc(nombreDia(st.mes + "-" + String(diaMax + 1).padStart(2, "0"), true))}, ${plata(max)}</div>`);
    // Los últimos meses, para comparar.
    const seis = Array.from({ length: 6 }, (_, i) => cambiarMes(st.mes, i - 5)).map((m) => ({ m, g: delMes(st.movs, m).filter((x) => x.tipo !== "ingreso").reduce((a, x) => a + x.monto, 0) }));
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
        lbl("Mi alias para cobrar") + `<div class="quick"><div class="pp${st.errorAlias ? " err" : ""}"><input class="field" data-act="miAlias" value="${esc(st.cfg.alias || "")}" placeholder="tu alias, nunca el CBU" aria-label="Mi alias para cobrar" maxlength="22" autocapitalize="none" autocomplete="off"></div></div>` +
        (st.errorAlias ? `<div class="msg" role="alert">${esc(st.errorAlias)}</div>` : "") + `<div class="hint">Se suma a los grupos que crees, para que te transfieran. Nunca pongas el CBU.</div>`) +
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
        (matchMedia("(display-mode: standalone)").matches || navigator.standalone ? "" : ir("instalar", "Instalar MiGuita", "Para tenerla en la pantalla de inicio", '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 8v7m0 0l-3-3m3 3l3-3"/>')) +
        (EN_PRUEBA ? accion("abrirComentario", "Mandar un comentario", "Una idea o algo que anda mal", '<path d="M4 5h16v11H9l-5 4z"/>') : ""));
  }

  /* ---------- Cargar plata ---------- */
  function cargarPlata() {
    const s = st.cfg.saldo, ahora = tuPlata(s, st.movs);
    const sueldo = st.fijos.find((f) => f.tipo === "ingreso" && f.categoria === "sueldo") || st.fijos.find((f) => f.tipo === "ingreso");
    const opcion = (act, t, sub) => `<button class="srow rowb" data-act="${act}" style="width:100%;text-align:left"><span class="rt"><b>${t}</b><small>${sub}</small></span><span class="chev" aria-hidden="true">›</span></button>`;
    return back("Inicio") + hdr("Tu plata", "Cargar plata", "", "plata") +
      crd(lbl("Lo que tengo ahora") + (s ? `<div class="row f"><span>Tu plata ahora</span><span>${plata(ahora)}</span></div>` : "") +
        (s && apartado(s, st.metas) ? `<div class="row"><span>Para tus metas</span><span>${plata(apartado(s, st.metas))}</span></div><div class="row"><span>Podés usar</span><span>${plata(podesUsar(s, st.movs, st.metas))}</span></div>` : "") +
        `<div class="sub">${s ? "¿No coincide? Poné lo que tenés de verdad y arranca de nuevo desde ahí." : "Sumá lo que tenés en Mercado Pago, en el banco y en efectivo. No cuenta como ingreso."}</div>` +
        `<div class="quick"><div class="pp${st.plataError ? " err" : ""}"><input class="field" data-act="plataMonto" value="${esc(st.plataTexto || "")}" placeholder="por ejemplo 30.000" inputmode="decimal" aria-label="Lo que tengo ahora" maxlength="16"></div><button class="btn pp anotar" data-act="plataGuardar">${s ? "Actualizar" : "Guardar"}</button></div>` +
        (st.plataError ? `<div class="msg" role="alert">${esc(st.plataError)}</div>` : "")) +
      crd(lbl("Lo que cobrás") +
        opcion("plataSueldo", sueldo ? "Mi sueldo: " + esc(sueldo.nombre) : "Mi sueldo", sueldo ? plata(sueldo.monto, sueldo.moneda === "USD" ? { moneda: "US$ " } : {}) + " · día " + sueldo.dia + (sueldo.activo ? "" : " · pausado") : "Cuánto cobrás y qué día. Se anota solo todos los meses.").replace("srow rowb", "srow f rowb") +
        opcion("cargarIngreso", "Cobré algo, una sola vez", "Una changa, un regalo, lo que te transfirieron."));
  }

  /* ---------- Personalización ---------- */
  function personalizacion() {
    return back("Ajustes") + hdr("Ajustes", "Personalización") +
      crd(lbl("Apariencia") +
        `<div class="srow f"><span class="rt"><b>Tema</b></span>${chips("tema", [["dark", "Oscuro"], ["light", "Claro"]], st.cfg.tema, "Tema")}</div>` +
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
          `<span style="display:flex;align-items:center;gap:10px">${t === "medios" ? "" : Art.catIcon(c.id).replace("<svg", '<svg style="width:34px;flex:none"')}<span>${esc(c.nombre)}${sub ? `<small>${esc(sub)}</small>` : ""}</span></span><span class="chev" aria-hidden="true">›</span></button>`;
      }).join("")) +
      `<button class="btn pp w" data-act="agregarCat">+ Agregar ${t === "medios" ? "medio de pago" : "categoría"}</button>` +
      (t === "medios" ? "" : `<div class="sub">Las palabras clave sirven para adivinar la categoría cuando escribís «súper 5000».</div>`);
  }

  function editarCat() {
    const { tipo, id } = st.editCat;
    const medios = tipo === "medios";
    const c = medios ? st.cfg.medios.find((m) => m.id === id) : st.cfg.categorias[tipo].find((x) => x.id === id);
    if (!c) return back("Categorías");
    const respaldo = !medios && RESPALDO[tipo] === id;
    return back("Categorías") + hdr(medios ? "Medio de pago" : tipo === "gasto" ? "Categoría de gasto" : "Categoría de ingreso", esc(c.nombre)) +
      lbl("Nombre") + `<div class="quick"><div class="pp"><input class="field" data-act="catNombre" value="${esc(c.nombre)}" aria-label="Nombre" maxlength="30"></div></div>` +
      (medios ? "" : lbl("Palabras clave") + `<div class="quick"><div class="pp"><input class="field" data-act="catClaves" value="${esc(c.claves.join(", "))}" placeholder="por ejemplo: coto, verdulería" aria-label="Palabras clave separadas por coma" maxlength="400"></div></div><div class="hint">Separalas con comas.</div>`) +
      (respaldo ? `<div class="hint">Esta es la categoría que se usa cuando ninguna otra coincide, por eso no se puede ocultar.</div>` :
        crd(`<div class="srow f"><span class="rt"><b>Ocultar</b><small>No aparece al anotar. Lo ya anotado se mantiene.</small></span>${interruptor("catOcultar", !!(c.oculta || c.oculto), "Ocultar")}</div>`));
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
      cats.map((c) => `<button class="cat pp" data-act="cat" data-v="${esc(c.id)}" aria-pressed="${c.id === s.categoria}">${Art.catIcon(c.id)}${esc(c.nombre.split("/")[0])}</button>`).join("") + "</div>" +
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

  return { inicio, movimientos, resumen, racha, festejo, mas, cargarPlata, personalizacion, hayEjemplo, categorias, editarCat, hoja, nombreCat, nombreMedio, nombreDia, mesTexto, plata, motivosApretado, estadoDelMes,
    guia, ayuda, ayudaHoja,
    ayudas: { back, hdr, lbl, crd, chips, interruptor, preg } };
}
