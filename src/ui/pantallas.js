// Pantallas de MiGuita. Cada función devuelve HTML; los textos de la persona pasan siempre por esc().
import { Art } from "../art/art.js";
import { formatear, evaluar } from "../logic/dinero.js";
import { RESPALDO } from "../logic/categorias.js";
import { sumarDias, delMes, referencia, resumenMes, gastosPor, gastosPorDia, estadoMiguita, porDiaAgrupado } from "../logic/mes.js";
import { infoRacha, apretado, PREMIOS } from "../logic/racha.js";
import { estadoPresupuestos, estadoConPresupuestos, resumenDeudas, restante } from "../logic/plan.js";
import { valorPara, aPesos, nombreTipo } from "../logic/dolar.js";

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

  const back = (t) => `<button class="back" data-act="volver">‹ ${t}</button>`;
  const hdr = (small, titulo, estado) => `<div class="top"><div><small>${small}</small><h1>${titulo}</h1></div>${estado ? Art.miguita(estado) : ""}</div>`;
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

  const hayEjemplo = () => ["movs", "presupuestos", "metas", "deudas", "fijos"].some((k) => st[k].some((x) => x.id.startsWith("ej_")));

  // Estado de Miguita del mes: el peor entre gasto sobre ingresos y los presupuestos.
  function estadoDelMes(mes, r) {
    return estadoConPresupuestos(estadoMiguita(r.ingresos, r.gastos), estadoPresupuestos(st.presupuestos, st.movs, mes));
  }
  const motivosApretado = () => apretado(st.movs, hoy, st.presupuestos,
    resumenDeudas(st.deudas, hoy).activas.filter((d) => d.tipo === "debo").map((d) => ({ restante: restante(d) })), nombreCat);

  /* ---------- Inicio ---------- */
  function inicio() {
    const actual = st.mes === hoy.slice(0, 7);
    const r = resumenMes(st.movs, referencia(st.mes, hoy));
    const movs = porDiaAgrupado(delMes(st.movs, st.mes)).flatMap((g) => g.movs);
    const ra = infoRacha(st.movs, st.dias, hoy);
    const nombre = (st.cfg.nombre || "").trim();
    let h = `<div class="top"><div><small>${mesNav()}` +
      `<button class="eyeb" data-act="ocultar" aria-pressed="${st.cfg.ocultar}" aria-label="${st.cfg.ocultar ? "Mostrar montos" : "Ocultar montos"}">${Art.icono(st.cfg.ocultar ? Art.OJO_TAPADO : Art.OJO)}</button></small>` +
      `<h1>Hola${nombre ? ", " + esc(nombre) : ""}</h1>` +
      `<button class="racha" data-act="abrir" data-v="racha" aria-label="Ver tu racha">${Art.minion()}<span>${ra.actual ? ra.actual + (ra.actual === 1 ? " día" : " días") + (ra.hoyHecho ? "" : " · salvala hoy") : "Empezá tu racha"}</span></button>` +
      `</div>${Art.miguita(estadoDelMes(st.mes, r))}</div>`;

    const peor = actual && estadoPresupuestos(st.presupuestos, st.movs, st.mes).find((p) => p.nivel !== "ok");
    if (peor) h += `<button class="card pp tecard" data-act="verPlan" data-v="presupuesto">` +
      `<span class="msg">${peor.nivel === "pasado" ? "Te pasaste del presupuesto de " : "Estás llegando al tope de "}${esc(nombreCat(peor.categoria))}.</span>` +
      `<span class="sub">Gastaste ${plata(peor.gastado)} de ${plata(peor.tope)}.</span></button>`;

    if (hayEjemplo())
      h += crd(`<span>Estás viendo datos de ejemplo</span><button class="btnmini" data-act="quitarEjemplo">Quitar</button>`, "banner");

    if (actual && !ra.hoyHecho && ra.actual > 0 && new Date().getHours() >= 18 && Date.now() > st.avisoLuego)
      h += crd(`<b>¿Ya anotaste tus gastos de hoy?</b><div class="sub">Tu racha de ${ra.actual} ${ra.actual === 1 ? "día" : "días"} se corta si hoy no anotás nada.</div>` +
        `<div class="chips"><button class="pp" data-act="nuevo" aria-pressed="true">Anotar</button><button class="pp" data-act="noGaste">No gasté hoy</button><button class="pp" data-act="luego">Más tarde</button></div>`, "aviso");

    const c = st.cfg.copias;
    if (actual && c.auto && (!c.ultima || Date.now() - Date.parse(c.ultima) >= (c.cada === "mes" ? 30 : 7) * 864e5))
      h += crd(`<span>Toca hacer tu copia de seguridad</span><button class="btnmini" data-act="abrir" data-v="copias">Hacerla</button>`, "banner");

    h += `<button class="card pp hr tecard" data-act="abrir" data-v="resumen" aria-label="Ver el resumen del mes">${Art.pan(r.queda)}<span class="ht"><span class="sub">Te queda</span>` +
      `<span class="big std">${plata(r.teQueda)}</span>` +
      `<span class="sub">${r.ingresos === 0 ? "Cargá tu primer ingreso para empezar" : actual ? "Podés gastar " + plata(r.porDia) + " por día" : "Gastaste " + plata(r.gastos)}</span></span></button>`;

    h += `<form class="quick" data-form="rapido"><div class="pp${st.error ? " err" : ""}"><input id="rapido" placeholder="nafta 20000" aria-label="Anotar un gasto" autocomplete="off" enterkeyhint="done" maxlength="120"></div>` +
      `<button class="btn pp" type="submit">Anotar</button></form>` +
      (st.error ? `<div class="msg" role="alert">${esc(st.error)}</div>` : "");

    h += crd(`<div class="sec secrow"><span>Últimos movimientos</span>${movs.length ? `<button class="link" data-act="abrir" data-v="movimientos">Ver todos ›</button>` : ""}</div>` +
      (movs.length ? movs.slice(0, 5).map((x, i) => fila(x, i === 0, subInicio)).join("") :
        `<div class="empty"><b>Todavía no anotaste nada</b><span>Escribí «café 3800» arriba y listo.</span></div>`));
    return h;
  }

  /* ---------- Movimientos ---------- */
  function movimientos() {
    const f = st.filtro;
    const texto = f.texto.trim().toLowerCase();
    const lista = delMes(st.movs, st.mes).filter((x) =>
      (f.tipo === "todos" || (f.tipo === "gastos") === (x.tipo === "gasto")) &&
      (!f.cat || x.categoria === f.cat) &&
      (!texto || (x.detalle + " " + nombreCat(x.categoria) + " " + nombreMedio(x.medio)).toLowerCase().includes(texto)));
    const cats = [...st.cfg.categorias.gasto, ...st.cfg.categorias.ingreso];
    return back("Inicio") + hdr(mesNav(), "Movimientos") +
      `<div class="quick"><div class="pp"><input id="buscar" data-act="buscar" value="${esc(f.texto)}" placeholder="Buscar un gasto" aria-label="Buscar" autocomplete="off" maxlength="60"></div></div>` +
      chips("filtro", [["todos", "Todos"], ["gastos", "Gastos"], ["ingresos", "Ingresos"]], f.tipo, "Filtrar") +
      `<select class="sel" data-act="filtroCat" aria-label="Categoría"><option value="">Todas las categorías</option>` +
      cats.map((c) => `<option value="${esc(c.id)}"${c.id === f.cat ? " selected" : ""}>${esc(c.nombre)}</option>`).join("") + "</select>" +
      (lista.length ? porDiaAgrupado(lista).map((g) => crd(
        `<div class="sec secrow"><span>${esc(nombreDia(g.fecha, true))}</span><span>${g.gastado ? plata(-g.gastado) : ""}</span></div>` +
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
    let h = back("Inicio") + hdr(mesNav(), "Resumen", estadoDelMes(st.mes, r)) +
      crd(`<div class="stats"><div><div class="sub">Ingresos</div><b class="pos">${plata(r.ingresos)}</b></div><div><div class="sub">Gastos</div><b class="neg">${plata(r.gastos)}</b></div><div><div class="sub">Queda</div><b>${plata(r.teQueda)}</b></div></div>` +
        (() => { const d = dolarDe(referencia(st.mes, hoy)); return d && r.gastos ? `<div class="sub">≈ ${formatear(Math.round(r.gastos * 100 / d.valor), { moneda: "US$ ", oculto: st.cfg.ocultar }).replace(/,\d\d$/, "")} gastados · dólar ${nombreTipo(st.cfg.dolar.tipo).toLowerCase()} ${formatear(d.valor)}</div>` : ""; })());
    if (!r.gastos) return h + crd(`<div class="empty"><b>Sin gastos este mes</b><span>Cuando anotes, acá vas a ver en qué se te va la plata.</span></div>`);
    h += crd(lbl("Por categoría") + pc.map((c) => `<div class="crow">${Art.catIcon(c.id)}<div class="cr"><div class="row f" style="padding:0 0 3px;min-height:0"><span>${esc(nombreCat(c.id))} · ${Math.round(c.parte * 100)}%</span><span>${plata(c.monto)}</span></div>${Art.barra(c.monto / pc[0].monto)}</div></div>`).join(""));
    h += crd(lbl("Por medio de pago") + pm.map((m, i) => `<div class="row${i ? "" : " f"}"><span>${esc(nombreMedio(m.id) || "Sin medio")}</span><span>${plata(m.monto)}</span></div>`).join(""));
    h += crd(lbl("Tu ritmo") + `<div class="row f"><span>Gastás en promedio</span><span>${plata(r.promedio)} por día</span></div>` +
      (actual ? `<div class="sub">A este ritmo, a fin de mes vas a gastar ${plata(r.proyeccion)}.</div>` : ""));
    h += crd(lbl("Por día") + Art.barrasDias(dias, diaMax) + `<div class="sub">Más gastaste: ${esc(nombreDia(st.mes + "-" + String(diaMax + 1).padStart(2, "0"), true))}, ${plata(max)}</div>`);
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
    return back("Inicio") + hdr("Tu racha", ra.actual + (ra.actual === 1 ? " día" : " días"), "ok") +
      crd(lbl("Ingredientes de esta semana") + `<div class="ings">${[0, 1, 2, 3, 4, 5, 6].map((i) => Art.ingrediente(i, i < enSemana)).join("")}</div>` +
        `<div class="sub">${ra.hoyHecho ? "Hoy ya sumaste tu ingrediente." : "Anotá tus gastos del día y se suma un ingrediente."}</div>`) +
      (ra.proximo ? crd(lbl("Próximo premio") + `<div class="crow">${iProx >= 0 ? Art.premio(iProx).replace("<svg", '<svg class="st"') : ""}<div class="cr"><div class="row f" style="padding:0 0 3px;min-height:0"><span>${PREMIO_TEXTO[ra.proximo].replace(/^(un|una) /, "").replace(/^./, (c) => c.toUpperCase())} · ${ra.proximo} días</span><span>faltan ${ra.proximo - ra.actual}</span></div>${Art.barra(ra.actual / ra.proximo)}</div></div>`) : "") +
      crd(lbl("Últimas 5 semanas") + `<div class="cal" role="img" aria-label="Calendario de días anotados">${cal}</div>` +
        `<div class="stats"><div><div class="sub">Mejor racha</div><b>${ra.mejor} ${ra.mejor === 1 ? "día" : "días"}</b></div><div><div class="sub">Días anotados</div><b>${ra.total}</b></div></div>`) +
      crd(`<div class="crow">${Art.salvavidas}<div class="cr"><b style="font:800 15px 'Bricolage Grotesque',sans-serif">Salvavidas</b><div class="sub">Se regala solo si estás complicado con la plata, una vez cada 30 días, para no perder una racha de 2 días o más. ${motivos.length ? "Ahora estás en esa situación: " + esc(motivos.join(", ")) + "." : "Ahora no lo necesitás."}</div></div></div>`) +
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

  /* ---------- Más ---------- */
  function mas() {
    const ej = hayEjemplo();
    const n = st.cfg.notif, d = dolarDe(hoy), cp = st.cfg.copias;
    const ir = (v, t, sub, i, primera) => `<button class="srow rowb${primera ? " f" : ""}" data-act="abrir" data-v="${v}" style="width:100%;text-align:left"><span class="ri">${Art.icono(i)}</span><span class="rt"><b>${t}</b><small>${esc(sub)}</small></span><span class="chev" aria-hidden="true">›</span></button>`;
    return hdr("Ajustes y copias", "Más", "ok") +
      crd(ir("notif", "Notificaciones", n.cantidad ? n.cantidad + (n.cantidad === 1 ? " aviso" : " avisos") + " por día · " + (n.forma === "sonido" ? "con sonido" : "en silencio") : "Sin avisos", '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20h4"/>', true) +
        ir("seguridad", "Seguridad", st.seguridad ? (st.seguridad.modo === "clave" ? "Contraseña" : "PIN") + (st.seguridad.huella ? " y huella" : "") + " · datos cifrados" : "Sin PIN", '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>') +
        ir("dolar", "Dólar", nombreTipo(st.cfg.dolar.tipo) + (d ? " · " + formatear(d.valor) : " · sin valor") + (st.cfg.dolar.fuente === "manual" || st.cfg.dolar.tipo === "fijo" ? " · a mano" : " · se actualiza solo"), '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-2-6-2-6 0s6 2 6 4.5-6 2.5-6 0"/>') +
        (matchMedia("(display-mode: standalone)").matches || navigator.standalone ? "" : ir("instalar", "Instalar MiGuita", "Para tenerla en la pantalla de inicio", '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 8v7m0 0l-3-3m3 3l3-3"/>')) +
        ir("copias", "Copias de seguridad", cp.ultima ? "Última: " + new Date(cp.ultima).toLocaleDateString("es-AR") : "Todavía no hiciste ninguna", '<path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14"/>')) +
      crd(lbl("Tu nombre") + `<div class="quick"><div class="pp"><input class="field" data-act="nombre" value="${esc(st.cfg.nombre || "")}" placeholder="Para saludarte en Inicio" aria-label="Tu nombre" maxlength="30" autocomplete="given-name"></div></div>`) +
      crd(lbl("Mi alias para cobrar") + `<div class="quick"><div class="pp${st.errorAlias ? " err" : ""}"><input class="field" data-act="miAlias" value="${esc(st.cfg.alias || "")}" placeholder="solo alias de Mercado Pago" aria-label="Mi alias para cobrar" maxlength="22" autocapitalize="none" autocomplete="off"></div></div>` +
        (st.errorAlias ? `<div class="msg" role="alert">${esc(st.errorAlias)}</div>` : "") + `<div class="hint">Se suma a los grupos que crees, para que te transfieran. Nunca pongas el CBU.</div>`) +
      crd(`<button class="srow f rowb" data-act="abrir" data-v="categorias" style="width:100%;text-align:left"><span class="rt"><b>Categorías y medios de pago</b><small>Renombrar, ocultar o agregar</small></span><span class="chev" aria-hidden="true">›</span></button>`) +
      crd(lbl("Apariencia") +
        `<div class="srow f"><span class="rt"><b>Tema</b></span>${chips("tema", [["dark", "Oscuro"], ["light", "Claro"]], st.cfg.tema, "Tema")}</div>` +
        `<div class="srow"><span class="rt"><b>Reducir movimiento</b><small>Frena el temblor de los dibujos</small></span>${interruptor("movimiento", !st.cfg.movimiento, "Reducir movimiento")}</div>` +
        `<div class="srow"><span class="rt"><b>Ocultar montos</b><small>Tapa los números en la pantalla</small></span>${interruptor("ocultar", st.cfg.ocultar, "Ocultar montos")}</div>`) +
      crd(lbl("Tus datos") +
        `<div class="sub">${st.persistente ? "Se guardan solo en este celu. Nada se manda a internet." : "Este navegador no deja guardar: lo que anotes se pierde al cerrar."}</div>` +
        `<div class="btnrow">${ej ? `<button class="btn pp alt" data-act="quitarEjemplo">Quitar ejemplo</button>` : `<button class="btn pp alt" data-act="ponerEjemplo">Cargar ejemplo</button>`}` +
        `<button class="btn pp alt del" data-act="borrarTodo">${st.confirmar === "todo" ? "Tocá de nuevo para borrar" : "Borrar todo"}</button></div>`) +
      `<div class="sub">Notificaciones, dólar, seguridad y copias llegan en la etapa 5.</div>`;
  }

  /* ---------- Categorías y medios ---------- */
  function categorias() {
    const t = st.catTab;
    const items = t === "medios" ? st.cfg.medios : st.cfg.categorias[t];
    return back("Más") + hdr("Ajustes", "Categorías y medios") +
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
      `<div class="chips" role="group" aria-label="Fecha">` + fechas.map(([v, t]) => `<button class="pp" data-act="fecha" data-v="${v}" aria-pressed="${v === s.fecha}">${t}</button>`).join("") +
      `<label class="pp otra"${otra ? ' data-on="1"' : ""}>${otra ? esc(nombreDia(s.fecha, true)) : "Otra fecha"}<input type="date" data-act="otra" value="${s.fecha}" max="${hoy}" aria-label="Elegir otra fecha"></label></div>` +
      `<div class="quick"><div class="pp"><input data-act="detalle" value="${esc(s.detalle)}" placeholder="Detalle (opcional)" aria-label="Detalle" maxlength="80"></div></div>` +
      (s.error ? `<div class="msg" role="alert">${esc(s.error)}</div>` : "") +
      `<div class="pad">${tecla("7")}${tecla("8")}${tecla("9")}${tecla("⌫")}${tecla("4")}${tecla("5")}${tecla("6")}${tecla("+")}${tecla("1")}${tecla("2")}${tecla("3")}` +
      `<button class="key pp ok" data-act="guardar">Guardar</button>${tecla("000")}${tecla("0")}${tecla("−")}</div>` +
      (editar ? `<button class="btn pp w alt del" data-act="borrarMov">${st.confirmar === "mov" ? "Tocá de nuevo para borrar" : "Borrar este movimiento"}</button>` : "") +
      `</div></div>`;
  }

  return { inicio, movimientos, resumen, racha, festejo, mas, categorias, editarCat, hoja, nombreCat, nombreMedio, nombreDia, plata, motivosApretado, estadoDelMes,
    ayudas: { back, hdr, lbl, crd, chips, interruptor } };
}
