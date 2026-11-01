// Pantallas de Mis cuentas: topes, metas, deudas, gastos fijos y sus formularios.
import { Art } from "../art/art.js";
import { formatear, leerMonto } from "../logic/dinero.js";
import { delMes, resumenMes } from "../logic/mes.js";
import { estadoPresupuestos, infoMeta, resumenDeudas, restante } from "../logic/plan.js";
import { resumenCuotas, infoCompra, MAX_CUOTAS, SIN_TARJETA } from "../logic/cuotas.js";
import { esc } from "./pantallas.js";
import { crearVistasAnalisis } from "./analisis.js";

const PESTANAS = [["presupuesto", "Topes"], ["metas", "Metas"], ["deudas", "Deudas"], ["fijos", "Fijos"], ["cuotas", "Cuotas"], ["analisis", "Análisis"]];

export function crearVistasPlan(st, hoy, V) {
  const { back, hdr, lbl, crd, chips, interruptor } = V.ayudas;
  const { plata, nombreCat } = V;
  const mes = hoy.slice(0, 7);
  const VA = crearVistasAnalisis(st, hoy, V);
  const dinero = (c, moneda) => plata(c, { moneda: moneda === "USD" ? "US$ " : "$" });
  const fecha = (f) => f.split("-").reverse().join("/");

  function encabezado() {
    const r = resumenMes(st.movs, hoy);
    return hdr("Lo que planifico", "Mis cuentas", V.estadoDelMes(mes, r), st.planTab) + chips("planTab", PESTANAS, st.planTab, "Parte de mis cuentas");
  }
  const vacio = (titulo, texto) => crd(`<div class="empty vacio-m">${Art.miguita("ok").replace("<svg", '<svg style="width:96px"')}<b>${titulo}</b><span>${texto}</span></div>`);
  const nuevo = (tipo, texto) => `<button class="btn pp w" data-act="nuevoPlan" data-v="${tipo}">${texto}</button>`;

  /* ---------- pestañas ---------- */
  function presupuesto() {
    const est = estadoPresupuestos(st.presupuestos, st.movs, mes);
    if (!est.length) return vacio("¿Querés gastar menos en algo?", "Poné un tope por mes, por ejemplo en Salidas, y Miguita te avisa antes de que te pases.") + nuevo("presupuesto", "+ Poner un tope");
    return crd(lbl("Este mes, por categoría") + est.map((p) =>
      `<button class="pbrow rowb" data-act="editarPlan" data-v="${esc(p.id)}">${Art.pan(p.queda)}<span class="pbt"><b>${esc(nombreCat(p.categoria))}</b>` +
      `<span class="${p.nivel === "pasado" ? "neg" : ""}">${p.resto >= 0 ? "Quedan " + plata(p.resto) : "Te pasaste " + plata(-p.resto)}</span>` +
      `<small>Gastaste ${plata(p.gastado)} de ${plata(p.tope)}</small></span></button>`).join("")) +
      nuevo("presupuesto", "+ Poner un tope");
  }

  function metas() {
    if (!st.metas.length) return vacio("¿Estás juntando plata para algo?", "Poné una meta, como un viaje, y andá sumando. Te digo cuánto guardar por mes.") + nuevo("meta", "+ Nueva meta");
    const total = (m) => st.metas.filter((x) => x.moneda === m).reduce((a, x) => a + x.ahorrado, 0);
    const hayUsd = st.metas.some((x) => x.moneda === "USD"), hayArs = st.metas.some((x) => x.moneda !== "USD");
    return crd(`<div class="stats">${hayArs ? `<div><div class="sub">Ahorrado en pesos</div><b>${plata(total("ARS"))}</b></div>` : ""}${hayUsd ? `<div><div class="sub">En dólares</div><b>${dinero(total("USD"), "USD")}</b></div>` : ""}</div>`) +
      st.metas.map((m) => {
        const i = infoMeta(m, hoy);
        const extra = i.cumplida ? "¡Meta cumplida!" : i.vencida ? `<span class="neg">Se pasó la fecha del ${fecha(m.fecha)}</span>` : i.porMes ? `Para llegar al ${fecha(m.fecha)}: ${dinero(i.porMes, m.moneda)} por mes` : "Faltan " + dinero(i.falta, m.moneda);
        return crd(`<button class="gl rowb" data-act="editarPlan" data-v="${esc(m.id)}">${Art.masa(i.parte).replace('class="dg"', 'class="dg" style="width:104px;flex:none"')}` +
          `<span><b>${esc(m.nombre)}</b><small>${dinero(m.ahorrado, m.moneda)} de ${dinero(m.objetivo, m.moneda)} · ${Math.floor(i.parte * 100)}%</small><small>${extra}</small></span></button>` +
          (i.cumplida ? "" : `<div class="chips"><button class="pp" data-act="sumarAhorro" data-v="${esc(m.id)}">Sumar ahorro</button></div>`));
      }).join("") + nuevo("meta", "+ Nueva meta");
  }

  function deudas() {
    const r = resumenDeudas(st.deudas, hoy);
    const tarjeta = (d) => {
      const me = d.tipo === "meDeben", falta = restante(d);
      const $ = (c) => dinero(c, d.moneda);
      return crd(`<button class="rowb tecard" data-act="editarPlan" data-v="${esc(d.id)}"><span class="drow"><b>${esc(d.concepto || d.quien)}</b><span class="${falta ? (me ? "pos" : "") : ""}">${falta ? $(falta) : "Saldada ✓"}</span></span>` +
        Art.barra(d.total ? d.pagado / d.total : 1) +
        `<span class="sub">${me ? "Te debe " : "Le debés a "}${esc(d.quien || "alguien")} · ${me ? "cobraste" : "pagaste"} ${$(d.pagado)} de ${$(d.total)}` +
        (d.vence && falta ? (r.vencida(d) ? ` · <span class="neg">venció el ${fecha(d.vence)}</span>` : ` · vence el ${fecha(d.vence)}`) : "") + `</span></button>` +
        (falta ? `<div class="chips"><button class="pp" data-act="pagarDeuda" data-v="${esc(d.id)}">${me ? "Registrar cobro" : "Registrar pago"}</button></div>` : ""));
    };
    if (!st.deudas.length) return vacio("¿Alguien te debe plata? ¿O le debés a alguien?", "Anotalo acá y andá tachando a medida que se paga, así no te olvidás.") + nuevo("deuda", "+ Nueva deuda");
    const usd = (c) => (c ? `<small style="display:block">+ ${dinero(c, "USD")}</small>` : "");
    return crd(`<div class="stats"><div><div class="sub">Debés</div><b class="neg">${plata(r.debo)}${usd(r.deboUsd)}</b></div><div><div class="sub">Te deben</div><b class="pos">${plata(r.meDeben)}${usd(r.meDebenUsd)}</b></div></div>`) +
      r.activas.map(tarjeta).join("") + nuevo("deuda", "+ Nueva deuda") +
      (r.saldadas.length ? `<div class="chips"><button class="pp" data-act="verSaldadas" aria-pressed="${st.verSaldadas}">${st.verSaldadas ? "Ocultar" : "Ver"} saldadas (${r.saldadas.length})</button></div>` +
        (st.verSaldadas ? r.saldadas.map(tarjeta).join("") : "") : "");
  }

  function fijos() {
    if (!st.fijos.length) return vacio("¿Pagás algo todos los meses?", "Cargá el alquiler, Netflix o tu sueldo una sola vez y se anotan solos el día que elijas.") + nuevo("fijo", "+ Nuevo fijo");
    const activos = st.fijos.filter((f) => f.activo);
    const suma = (t) => activos.filter((f) => (f.tipo || "gasto") === t && f.moneda !== "USD").reduce((a, f) => a + f.monto, 0);
    const gastos = suma("gasto"), ingresosFijos = suma("ingreso");
    const ingresos = resumenMes(st.movs, hoy).ingresos;
    const lista = (t, titulo) => {
      const fs = [...st.fijos].filter((f) => (f.tipo || "gasto") === t).sort((a, b) => a.dia - b.dia);
      return fs.length ? crd(lbl(titulo) + fs.map((f, i) =>
        `<div class="srow${i ? "" : " f"}"><button class="rt rowb" data-act="editarPlan" data-v="${esc(f.id)}" style="text-align:left"><b>${esc(f.nombre)}</b>` +
        `<small>${f.activo ? "Día " + f.dia + " · " + (f.modo === "recordar" ? "te preguntamos" : "se anota solo") + ((f.hechos || []).includes(mes) ? " · listo este mes ✓" : "") : "Pausado"}</small></button>` +
        `<span class="amt${t === "ingreso" ? " pos" : ""}">${dinero(f.monto, f.moneda)}</span>${interruptor("fijoActivo", f.activo, (f.activo ? "Pausar " : "Activar ") + f.nombre, f.id)}</div>`).join("")) : "";
    };
    return crd(`<div class="stats"><div><div class="sub">Gastos fijos por mes</div><b>${plata(gastos)}</b></div>` +
        (ingresosFijos ? `<div><div class="sub">Ingresos fijos</div><b class="pos">${plata(ingresosFijos)}</b></div>` : ingresos ? `<div><div class="sub">De tus ingresos del mes</div><b>${Math.round(gastos / ingresos * 100)}%</b></div>` : "") + `</div>`) +
      lista("ingreso", "Ingresos fijos") + lista("gasto", "Gastos fijos") + nuevo("fijo", "+ Nuevo fijo");
  }

  function cuotas() {
    if (!st.compras.length && !st.tarjetas.length) return vacio("¿Compraste algo en cuotas?", "Cargalo una vez y cada mes se anota solo. Así sabés cuánto te falta pagar.") + nuevo("compra", "+ Cargar una compra en cuotas") + nuevo("tarjeta", "+ Nueva tarjeta").replace("btn pp w", "btn pp w alt");
    const r = resumenCuotas(st.compras, st.tarjetas, hoy);
    const $$ = (t) => [t.pesos || !t.usd ? plata(t.pesos) : "", t.usd ? dinero(t.usd, "USD") : ""].filter(Boolean).join(" + ");
    const mesCorto = (m) => V.mesTexto(m) + (m.slice(0, 4) === hoy.slice(0, 4) ? "" : " " + m.slice(0, 4));
    const fila = (c, i) => {
      const n = c.info, moneda = c.moneda;
      return `<button class="row rowb${i ? "" : " f"}" data-act="editarPlan" data-v="${esc(c.id)}"><span>${esc(c.detalle)}<small>${n.terminada ? "Terminada: " + c.cuotas + " de " + c.cuotas : "Pagaste " + n.hechas + " de " + c.cuotas + " · faltan " + n.faltan + " · próxima " + fecha(n.proxima).slice(0, 5)}</small></span>` +
        `<span class="der">${n.terminada ? dinero(c.total, moneda) : dinero(n.cuota, moneda) + "<small>por cuota</small>"}</span></button>`;
    };
    const proximos = r.meses.slice(1).filter((m) => m.pesos || m.usd);
    return crd(`<div class="stats"><div><div class="sub">Falta pagar</div><b class="neg">${$$(r.total)}</b></div><div><div class="sub">Este mes</div><b>${$$(r.meses[0])}</b></div></div>` +
        lbl("Lo que ya tenés comprometido") + (proximos.length ? proximos.map((m, i) => `<div class="row${i ? "" : " f"}"><span>${mesCorto(m.mes)}</span><span>${$$(m)}</span></div>`).join("") : `<div class="sub">Nada para los próximos meses.</div>`)) +
      r.tarjetas.map((t) => crd(`<div class="secrow"><b style="font:800 17px 'Bricolage Grotesque',sans-serif">${esc(t.nombre)}</b>${t.id ? `<button class="link" data-act="editarTarjeta" data-v="${esc(t.id)}">Editar</button>` : ""}</div>` +
        `<div class="sub">Debés ${$$(t.debe)} · este mes ${$$(t.esteMes)}${(() => { const x = st.tarjetas.find((y) => y.id === t.id); return x?.cierre ? " · cierra el " + x.cierre + ", vence el " + x.vence : ""; })()}</div>` +
        (t.compras.length ? t.compras.map(fila).join("") : `<div class="sub">No tiene cuotas pendientes.</div>`) +
        (st.verTerminadas && t.terminadas.length ? lbl("Terminadas") + t.terminadas.map(fila).join("") : ""))).join("") +
      nuevo("compra", "+ Nueva compra en cuotas") + nuevo("tarjeta", "+ Nueva tarjeta").replace("btn pp w", "btn pp w alt") +
      (r.terminadas ? `<div class="chips"><button class="pp" data-act="verTerminadas" aria-pressed="${!!st.verTerminadas}">${st.verTerminadas ? "Ocultar" : "Ver"} terminadas (${r.terminadas})</button></div>` : "");
  }

  function plan() {
    return encabezado() + { presupuesto, metas, deudas, fijos, cuotas, analisis: VA.analisis }[st.planTab]();
  }

  /* ---------- formularios ---------- */
  const campo = (k, etiqueta, { ph = "", modo = "text", max = 60 } = {}) => lbl(etiqueta) +
    `<div class="quick"><div class="pp"><input class="field" data-act="campo" data-k="${k}" value="${esc(st.form.vals[k] ?? "")}" placeholder="${esc(ph)}" aria-label="${esc(etiqueta)}" maxlength="${max}" autocomplete="off"${modo === "monto" ? ' inputmode="decimal"' : modo === "num" ? ' inputmode="numeric"' : ""}></div></div>`;
  const campoFecha = (k, etiqueta) => lbl(etiqueta) +
    `<input type="date" class="sel" data-act="campoFecha" data-k="${k}" value="${esc(st.form.vals[k] || "")}" aria-label="${esc(etiqueta)}">`;
  const selector = (k, etiqueta, opciones) => lbl(etiqueta) +
    `<select class="sel" data-act="campoSel" data-k="${k}" aria-label="${esc(etiqueta)}">` +
    opciones.map(([v, t]) => `<option value="${esc(v)}"${v === st.form.vals[k] ? " selected" : ""}>${esc(t)}</option>`).join("") + "</select>";
  const opcion = (k, opciones, etiqueta) => `<div class="chips" role="group" aria-label="${esc(etiqueta)}">` + opciones.map(([v, t]) =>
    `<button class="pp" data-act="formSel" data-k="${k}" data-v="${esc(v)}" aria-pressed="${st.form.vals[k] === v}">${esc(t)}</button>`).join("") + "</div>";
  const catsGasto = (actual) => st.cfg.categorias.gasto.filter((c) => !c.oculta || c.id === actual);
  const mediosVisibles = (actual) => st.cfg.medios.filter((m) => !m.oculto || m.id === actual);
  const pie = (texto) => (st.form.error ? `<div class="msg" role="alert">${esc(st.form.error)}</div>` : "") +
    `<button class="btn pp w" data-act="guardarPlan">${texto}</button>` +
    (st.form.id && !["ahorro", "pago"].includes(st.form.tipo) ? `<button class="btn pp w alt del" data-act="borrarPlan">${st.confirmar === "plan" ? "Tocá de nuevo para borrar" : "Borrar"}</button>` : "");

  const FORMS = {
    presupuesto() {
      const v = st.form.vals;
      const usadas = new Set(st.presupuestos.filter((p) => p.id !== st.form.id).map((p) => p.categoria));
      const tope = leerMonto(v.tope);
      const gastado = delMes(st.movs, mes).filter((x) => x.tipo !== "ingreso" && x.categoria === v.categoria).reduce((a, x) => a + x.monto, 0);
      return back("Mis cuentas") + hdr("Topes", st.form.id ? "Editar tope" : "Nuevo tope") +
        selector("categoria", "Categoría", catsGasto(v.categoria).filter((c) => !usadas.has(c.id)).map((c) => [c.id, c.nombre])) +
        campo("tope", "Tope del mes, en pesos", { ph: "por ejemplo 90.000", modo: "monto", max: 16 }) +
        crd(`<div class="sub">Este mes gastaste ${plata(gastado)} en ${esc(nombreCat(v.categoria))}.${tope ? (tope >= gastado ? " Con este tope te quedarían " + plata(tope - gastado) + "." : " Con este tope ya te pasaste " + plata(gastado - tope) + ".") : ""}</div>`) +
        pie("Guardar tope");
    },
    meta() {
      const v = st.form.vals;
      const obj = leerMonto(v.objetivo), ah = leerMonto(v.ahorrado || "0");
      const i = obj ? infoMeta({ objetivo: obj, ahorrado: ah || 0, fecha: v.fecha }, hoy) : null;
      return back("Mis cuentas") + hdr("Metas", st.form.id ? "Editar meta" : "Nueva meta") +
        campo("nombre", "¿Para qué ahorrás?", { ph: "por ejemplo: un viaje", max: 40 }) +
        lbl("Ícono") + `<div class="cats" role="group" aria-label="Ícono">` + Art.ICONOS_META.map((m) =>
          `<button class="cat pp" data-act="formSel" data-k="icono" data-v="${m.id}" aria-pressed="${v.icono === m.id}">${Art.metaIcon(m.id)}${m.nombre}</button>`).join("") + "</div>" +
        lbl("Moneda") + opcion("moneda", [["ARS", "Pesos"], ["USD", "Dólares"]], "Moneda") +
        campo("objetivo", "Objetivo", { ph: "por ejemplo 1.200.000", modo: "monto", max: 16 }) +
        campo("ahorrado", "Ya ahorrado", { ph: "0", modo: "monto", max: 16 }) +
        campoFecha("fecha", "Fecha límite (opcional)") +
        (i?.porMes ? crd(`<div class="sub">Para llegar a esa fecha necesitás ${dinero(i.porMes, v.moneda)} por mes.</div>`) : "") +
        pie(st.form.id ? "Guardar meta" : "Crear meta");
    },
    deuda() {
      const me = st.form.vals.tipo === "meDeben";
      return back("Mis cuentas") + hdr("Deudas", st.form.id ? "Editar deuda" : "Nueva deuda") +
        lbl("¿Qué tipo es?") + opcion("tipo", [["debo", "Yo debo"], ["meDeben", "Me deben"]], "Tipo de deuda") +
        campo("quien", me ? "¿Quién te debe?" : "¿A quién le debés?", { max: 40 }) +
        campo("concepto", "¿Por qué?", { ph: "por ejemplo: un préstamo", max: 60 }) +
        lbl("Moneda") + opcion("moneda", [["ARS", "Pesos"], ["USD", "Dólares"]], "Moneda") +
        campo("total", st.form.vals.moneda === "USD" ? "Monto total, en dólares" : "Monto total, en pesos", { modo: "monto", max: 16 }) +
        campo("pagado", me ? "Ya cobrado" : "Ya pagado", { ph: "0", modo: "monto", max: 16 }) +
        campoFecha("vence", "Fecha límite (opcional)") +
        pie("Guardar deuda");
    },
    fijo() {
      const v = st.form.vals, ing = v.tipo === "ingreso";
      const cats = (ing ? st.cfg.categorias.ingreso : catsGasto(v.categoria)).filter((c) => !c.oculta || c.id === v.categoria);
      return back(st.form.desdePlata ? "Cargar plata" : "Mis cuentas") + hdr("Fijos", st.form.id ? "Editar fijo" : "Nuevo fijo") +
        lbl("¿Qué es?") + opcion("tipo", [["gasto", "Un gasto"], ["ingreso", "Un ingreso"]], "Tipo") +
        campo("nombre", "Nombre", { ph: ing ? "por ejemplo: sueldo" : "por ejemplo: alquiler", max: 40 }) +
        lbl("Moneda") + opcion("moneda", [["ARS", "Pesos"], ["USD", "Dólares"]], "Moneda") +
        campo("monto", v.moneda === "USD" ? "Monto por mes, en dólares" : "Monto por mes, en pesos", { modo: "monto", max: 16 }) +
        (v.moneda === "USD" ? `<div class="hint">Se anota en pesos con el dólar de ese día (el que elegiste en Ajustes › Dólar).</div>` : "") +
        selector("categoria", "Categoría", cats.map((c) => [c.id, c.nombre])) +
        campo("dia", ing ? "Día del mes en que cobrás" : "Día del mes en que se paga", { ph: "1 a 31", modo: "num", max: 2 }) +
        selector("medio", "Medio de pago (opcional)", [["", "Ninguno"], ...mediosVisibles(v.medio).map((m) => [m.id, m.nombre])]) +
        lbl("Cuando llega el día") + opcion("modo", [["auto", "Que se anote solo"], ["recordar", "Que me pregunte"]], "Cuando llega el día") +
        `<div class="hint">${v.modo === "recordar" ? "Ese día te aparece en Inicio: lo confirmás (también con otro monto) o lo salteás ese mes." : "Se anota solo ese día, aunque no abras la app."}</div>` +
        crd(`<div class="srow f"><span class="rt"><b>Activo</b><small>${v.activo ? "Todos los meses, el día " + (v.dia || "elegido") : "Pausado: no se anota ni pregunta"}</small></span>${interruptor("formSwitch", !!v.activo, "Activo", "activo")}</div>`) +
        pie("Guardar");
    },
    compra() {
      const v = st.form.vals, id = st.form.id, antes = id && st.compras.find((c) => c.id === id);
      const total = leerMonto(v.total), n = Number(v.cuotas);
      const anotadas = antes ? infoCompra(antes).hechas - (antes.previas || 0) : 0;
      return back("Mis cuentas") + hdr("Cuotas", id ? "Editar compra" : "Nueva compra en cuotas") +
        campo("detalle", "¿Qué compraste?", { ph: "por ejemplo: heladera", max: 60 }) +
        lbl("Moneda") + opcion("moneda", [["ARS", "Pesos"], ["USD", "Dólares"]], "Moneda") +
        campo("total", v.moneda === "USD" ? "Total, en dólares" : "Total, en pesos", { ph: "con el interés, si tiene", modo: "monto", max: 16 }) +
        campo("cuotas", "¿En cuántas cuotas?", { ph: "1 a " + MAX_CUOTAS, modo: "num", max: 2 }) +
        (total && n >= 1 ? crd(`<div class="sub">${n} ${n === 1 ? "cuota" : "cuotas"} de ${dinero(Math.floor(total / n), v.moneda)}.${v.moneda === "USD" ? " Cada una se anota en pesos con el dólar de ese día." : ""}</div>`) : "") +
        campo("yaPagas", "¿Cuántas ya pagaste?", { ph: "0", modo: "num", max: 2 }) +
        `<div class="hint">Las que ya pagaste no se anotan como gasto. Las que vengan, se anotan solas en su mes.</div>` +
        (id ? "" : lbl("La próxima cuota") + opcion("proxima", [["este", "En este mes"], ["sig", "El mes que viene"]], "Próxima cuota")) +
        selector("tarjeta", "Tarjeta", [["", st.tarjetas.length ? "Elegí una" : SIN_TARJETA], ...st.tarjetas.map((t) => [t.id, t.nombre])]) +
        campo("tarjetaNueva", "¿Otra tarjeta?", { ph: "por ejemplo: Visa", max: 30 }) +
        selector("categoria", "Categoría", catsGasto(v.categoria).map((c) => [c.id, c.nombre])) +
        (anotadas ? `<div class="hint">Ya se anotaron ${anotadas} ${anotadas === 1 ? "cuota" : "cuotas"} como gasto. Si guardás, se actualizan; si borrás, se borran también.</div>` : "") +
        pie(id ? "Guardar" : "Sumar compra");
    },
    tarjeta() {
      const id = st.form.id, deCompras = id ? st.compras.filter((c) => c.tarjeta === id).length : 0;
      return back("Mis cuentas") + hdr("Cuotas", id ? "Editar tarjeta" : "Nueva tarjeta") +
        campo("nombre", "Nombre", { ph: "por ejemplo: Visa", max: 30 }) +
        campo("cierre", "Día de cierre (opcional)", { ph: "1 a 31", modo: "num", max: 2 }) +
        campo("vence", "Día de vencimiento (opcional)", { ph: "1 a 31", modo: "num", max: 2 }) +
        `<div class="hint">Con estos días, lo que compres después del cierre pasa solo al resumen siguiente y cada cuota cae en el vencimiento.</div>` +
        (deCompras ? `<div class="hint">Si la borrás, sus ${deCompras} ${deCompras === 1 ? "compra queda" : "compras quedan"} como «${SIN_TARJETA}»: no se pierde nada.</div>` : "") +
        pie("Guardar");
    },
    ahorro() {
      const m = st.metas.find((x) => x.id === st.form.id);
      const suma = leerMonto(st.form.vals.monto) || 0;
      const i = infoMeta({ ...m, ahorrado: m.ahorrado + suma }, hoy);
      return back("Mis cuentas") + hdr(esc(m.nombre), "Sumar ahorro") +
        campo("monto", "¿Cuánto sumás?", { modo: "monto", max: 16 }) +
        crd(`${Art.masa(i.parte).replace('class="dg"', 'class="dg" style="width:104px;flex:none"')}<div><div class="sub">Pasás de ${dinero(m.ahorrado, m.moneda)} a ${dinero(m.ahorrado + suma, m.moneda)}</div><b style="font:800 17px 'Bricolage Grotesque',sans-serif">${Math.floor(i.parte * 100)}% de la meta</b></div>`, "gl") +
        pie("Sumar");
    },
    pago() {
      const d = st.deudas.find((x) => x.id === st.form.id);
      const me = d.tipo === "meDeben";
      return back("Mis cuentas") + hdr(esc(d.concepto || d.quien), me ? "Cobrarle a " + esc(d.quien || "alguien") : "Pagarle a " + esc(d.quien || "alguien")) +
        campo("monto", d.moneda === "USD" ? "Monto, en dólares" : "Monto", { modo: "monto", max: 16 }) + `<div class="hint">Falta ${me ? "cobrar" : "pagar"} ${dinero(restante(d), d.moneda)}.${d.moneda === "USD" ? " Si lo anotás, se pasa a pesos con el dólar de hoy." : ""}</div>` +
        crd(`<div class="srow f"><span class="rt"><b>Anotarlo también como ${me ? "ingreso" : "gasto"}</b><small>Categoría ${esc(nombreCat(me ? "otros_in" : "deudas"))}</small></span>${interruptor("formSwitch", !!st.form.vals.anotar, "Anotarlo también", "anotar")}</div>`) +
        pie(me ? "Registrar cobro" : "Registrar pago");
    },
  };

  const formulario = () => FORMS[st.form.tipo]();

  function metaLograda(m) {
    return `<div class="hero" role="dialog" aria-modal="true" aria-label="Meta cumplida">${Art.masa(1)}<b>¡Lo lograste!</b>` +
      `<span>${esc(m.nombre)}: ${dinero(m.ahorrado, m.moneda)} ahorrados</span><button class="btn pp w" data-act="cerrarFestejo">Genial</button></div>`;
  }

  return { plan, formulario, metaLograda, formatear };
}
