// Pantallas de Grupos: lista, un grupo (tu situación y sus juntadas), una juntada (compras, quién entra en qué
// y cómo quedar a mano), formularios, compartir, unir y WhatsApp.
import { Art } from "../art/art.js";
import { amigo, BASES, DETALLES, MIGUITA, CAMISETAS, miguitaCon, personaje } from "../art/amigos.js";
import { formatear, leerMonto } from "../logic/dinero.js";
import { centavos, repartir, saldos, saldar, miParte, textoWhatsApp, juntadasVivas, gastosDe, pagosDe, haySueltos, cuentas, detalleDe, miSituacion, pagadores, MAX_HISTORIAL } from "../logic/grupos.js";
import { sumarDias, fechaLocal } from "../logic/mes.js";
import { esc } from "./pantallas.js";

const REPARTOS = [["eq", "Parejo"], ["sh", "Partes"], ["pc", "Porcentaje"], ["ex", "Montos"]];

// Pesos de reparto escritos en el formulario → como los guarda el grupo (partes, porcentaje o pesos).
export function pesosDe(v) {
  return Object.fromEntries(v.a.map((i) => {
    const s = String(v.w[i] ?? "").trim();
    if (s === "") return [i, ""];
    return [i, v.sp === "ex" ? (leerMonto(s) ?? 0) / 100 : Number(s.replace(",", ".")) || 0];
  }));
}

export function crearVistasGrupos(st, hoy, V) {
  const ayer = sumarDias(hoy, -1);
  const { back, hdr, lbl, crd, chips, interruptor } = V.ayudas;
  const grupo = () => st.grupos.find((g) => g.id === st.grupoId);
  const vivos = (g) => g.miembros.filter((m) => !m.x);
  const plataG = (g, c, o = {}) => formatear(c, { ...o, oculto: st.cfg.ocultar, moneda: g.moneda === "USD" ? "US$ " : "$" });
  const nombre = (g, id) => (id === g.yo ? "Vos" : g.miembros.find((m) => m.id === id)?.nombre || "?");
  const dibujo = (g, id) => {
    const m = g.miembros.find((x) => x.id === id), pj = m?.pj, cam = m?.cam || 0;
    if (Number.isInteger(pj)) return personaje(pj, cam);
    if (id === g.yo) return miguitaCon(0, cam);
    const i = vivos(g).filter((x) => x.id !== g.yo).findIndex((x) => x.id === id);
    return amigo(i, cam);
  };
  const fecha = (f) => f ? Number(f.slice(8, 10)) + " " + ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][Number(f.slice(5, 7)) - 1] : "";
  const btn = (act, texto, { alt = false, v = "" } = {}) => `<button class="btn pp w${alt ? " alt" : ""}" data-act="${act}"${v ? ` data-v="${esc(v)}"` : ""}>${texto}</button>`;

  function encabezado(g, titulo) {
    const otros = vivos(g).filter((m) => m.id !== g.yo).slice(0, 4).map((m) => dibujo(g, m.id));
    const mitad = Math.floor(otros.length / 2);
    return `<div class="top"><div><small>${vivos(g).length} integrantes</small><h1>${esc(titulo)}</h1></div></div>` +
      `<div class="crew" aria-hidden="true">${otros.slice(0, mitad).join("")}${g.yo ? Art.miguita("ok") : ""}${otros.slice(mitad).join("")}</div>`;
  }

  /* ---------- lista ---------- */
  function lista() {
    let h = `<div class="top"><div><small>${st.grupos.length ? st.grupos.length + (st.grupos.length === 1 ? " grupo" : " grupos") : "Dividí gastos"}</small><h1>Grupos</h1></div></div>` +
      `<div class="crew" aria-hidden="true">${["luna", "fact", "canon", "bola"].map((k) => Art.factura(k)).join("")}</div>`;
    if (!st.grupos.length) h += comoFunciona();
    h += [...st.grupos].sort((a, b) => b.ts - a.ts).map((g) => {
      const sit = miSituacion(g), s = sit.meDeben - sit.debo;
      return `<button class="card pp gc" data-act="abrirGrupo" data-v="${esc(g.id)}"><span><b>${esc(g.nombre)}</b><small>${vivos(g).length} integrantes</small></span>` +
        `<span class="v ${s > 0 ? "pos" : s < 0 ? "neg" : ""}">${s ? plataG(g, s, { signo: true }) : "Saldado"}<small>${s > 0 ? "Te deben" : s < 0 ? "Debés" : "Todo al día"}</small></span></button>`;
    }).join("");
    return h + btn("nuevoGrupo", "Nuevo grupo") + btn("unirme", "Unirme con un código", { alt: true });
  }

  /* ---------- un grupo ---------- */
  // Explicación corta, para cuando todavía no hay nada.
  function comoFunciona() {
    const paso = (n, t, s) => `<div class="paso"><span class="num">${n}</span><span><b>${t}</b><small>${s}</small></span></div>`;
    return crd(lbl("Cómo funciona") +
      paso(1, "Armá el grupo una vez", "Con tus amigos, tu pareja o los del depto.") +
      paso(2, "Invitalos con el link", "Cada uno ve todo al instante y anota desde su celu.") +
      paso(3, "Cada salida es una juntada", "Cargás qué se compró, quién lo pagó y quién entra en qué.") +
      paso(4, "La app dice quién le pasa a quién", "Con el alias a mano y la menor cantidad de transferencias."));
  }
  const estadoSync = (g) => {
    const s = g.sync;
    if (s) return `<div class="estado-sync${s.error ? " mal" : ""}">${s.error === "codigo" ? "El código del grupo ya no funciona" : s.error === "red" || (s.pendiente && navigator.onLine === false) ? "Sin conexión: se manda cuando vuelva internet" : "● Conectado: todos ven lo mismo"}</div>`;
    return g.id.startsWith("ej_") ? "" : `<button class="link estado-sync" data-act="abrirCompartir">Invitá a los demás para que vean todo al instante ›</button>`;
  };
  const yaVisto = (g, j) => st.cfg.vistos?.[g.id + "|" + j] || 0;
  const hayNuevo = (g, j) => { const v = yaVisto(g, j); return gastosDe(g, j).some((x) => x.ts > v && x.por && x.por !== g.yo) || pagosDe(g, j).some((p) => p.ts > v && p.de !== g.yo && p.a !== g.yo); };

  /* ---------- un grupo ---------- */
  function unGrupo() {
    const g = grupo();
    if (!g) return back("Grupos") + crd(`<div class="empty"><b>Ese grupo ya no está en este celu</b></div>`);
    let h = `<div class="secrow">${back("Grupos")}<button class="link" data-act="editarGrupo">Editar</button></div>` + encabezado(g, g.nombre) + estadoSync(g);
    // Lo que más importa, arriba: cuánto tengo que pasar o me tienen que pasar.
    if (g.yo) {
      const { debo, meDeben } = miSituacion(g);
      h += crd(debo || meDeben ?
        (debo ? `<div class="sub">Tenés que pasar</div><div class="big neg-txt">${plataG(g, debo)}</div>` : "") +
        (meDeben ? `<div class="sub">Te tienen que pasar</div><div class="big">${plataG(g, meDeben)}</div>` : "") +
        `<div class="sub">Entrá a cada juntada para ver a quién y copiar el alias.</div>` :
        `<div class="sub">Tu situación</div><div class="big">Estás a mano</div>`);
    }
    h += btn("nuevaJuntada", "Nueva juntada");
    const js = juntadasVivas(g);
    const fila = (id, nombre, sub, i) => {
      const compras = gastosDe(g, id), total = compras.reduce((a, x) => a + centavos(x.m), 0);
      const ts = cuentas(g, id), debo = ts.filter((t) => t.de === g.yo).reduce((a, t) => a + t.m, 0), meDeben = ts.filter((t) => t.a === g.yo).reduce((a, t) => a + t.m, 0);
      const estado = !compras.length ? "Sin compras" : debo ? `<span class="neg">Debés ${plataG(g, debo)}</span>` : meDeben ? `<span class="pos">Te deben ${plataG(g, meDeben)}</span>` : ts.length ? `Faltan ${ts.length} ${ts.length === 1 ? "pago" : "pagos"}` : "A mano ✓";
      return `<button class="row rowb${i ? "" : " f"}" data-act="abrirJuntada" data-v="${esc(id)}"><span>${esc(nombre)}${hayNuevo(g, id) ? ` <em class="nuevo">nuevo</em>` : ""}<small>${sub}</small></span><span class="der">${plataG(g, total)}<small>${estado}</small></span></button>`;
    };
    if (js.length || haySueltos(g))
      h += crd(lbl("Juntadas") + js.map((j, i) => fila(j.id, j.nombre, [fecha(j.f), j.gente.length + " personas"].filter(Boolean).join(" · "), i)).join("") +
        (haySueltos(g) ? fila("", "Gastos sueltos", "Los de antes de las juntadas", js.length) : ""));
    else h += comoFunciona();
    h += crd(lbl("Integrantes") + vivos(g).map((m) =>
      `<button class="mrow rowb" data-act="editarPersona" data-v="${esc(m.id)}">${dibujo(g, m.id)}<span class="rt"><b>${esc(nombre(g, m.id))}</b><small>${m.alias ? "alias: " + esc(m.alias) : "sin alias"}</small></span><span class="chev" aria-hidden="true">›</span></button>`).join("") +
      `<div class="chips"><button class="pp" data-act="nuevaPersona">+ Sumar integrante</button></div>`);
    if (g.yo && g.moneda === "ARS")
      h += crd(`<div class="srow f"><span class="rt"><b>Contar lo que me toca en mis gastos</b><small>Hasta ahora te tocó ${plataG(g, miParte(g))} en total</small></span>${interruptor("grupoLoc", !!g.loc, "Contar lo que me toca en mis gastos")}</div>`);
    return h + btn("abrirCompartir", g.sync ? "Invitar al grupo" : "Invitar y conectar", { alt: true }) +
      `<div class="chips"><button class="pp" data-act="verHistorial">Quién cambió qué</button></div>`;
  }

  /* ---------- una juntada ---------- */
  function juntada() {
    const g = grupo(), jid = st.juntadaId;
    if (!g) return back("Grupos") + crd(`<div class="empty"><b>Ese grupo ya no está en este celu</b></div>`);
    const ju = jid ? (g.juntadas || []).find((x) => x.id === jid && !x.x) : null;
    if (jid && !ju) return back(g.nombre) + crd(`<div class="empty"><b>Esa juntada ya no está</b><span>Alguien la borró.</span></div>`);
    const vivosIds = new Set(vivos(g).map((m) => m.id));
    const gente = (ju ? ju.gente.filter((i) => vivosIds.has(i)) : [...vivosIds]).sort((a, b) => (a === g.yo ? -1 : b === g.yo ? 1 : 0));
    const compras = gastosDe(g, jid).sort((a, b) => a.ts - b.ts), pagos = pagosDe(g, jid).sort((a, b) => a.ts - b.ts);
    const total = compras.reduce((a, x) => a + centavos(x.m), 0), ts = cuentas(g, jid), visto = st.vistoAntes || 0;
    const alias = (id) => g.miembros.find((m) => m.id === id)?.alias || "";
    let h = `<div class="secrow">${back(g.nombre)}${ju ? `<button class="link" data-act="editarJuntada">Editar</button>` : ""}</div>` +
      `<div class="top"><div><small>${[ju && fecha(ju.f), gente.length + " personas", compras.length ? plataG(g, total) : ""].filter(Boolean).join(" · ")}</small><h1>${esc(ju ? ju.nombre : "Gastos sueltos")}</h1></div></div>`;

    // Lo mío: a quién le paso, quién me pasa, y por qué.
    if (g.yo && gente.includes(g.yo) && compras.length) {
      const mias = ts.filter((t) => t.de === g.yo), aMi = ts.filter((t) => t.a === g.yo);
      for (const t of mias)
        h += crd(`<div class="sub">Le pasás a ${esc(nombre(g, t.a))}</div><div class="big">${plataG(g, t.m)}</div>` +
          `<div class="sub">${alias(t.a) ? "alias: <b>" + esc(alias(t.a)) + "</b>" : "No tiene alias cargado: pedíselo."}</div>` +
          `<div class="btnrow">${alias(t.a) ? btn("copiarAlias", "Copiar alias", { v: alias(t.a) }) : ""}${btn("yaPague", "Ya le pagué", { alt: !!alias(t.a), v: t.de + "|" + t.a + "|" + t.m })}</div>`, "tuyo");
      if (aMi.length)
        h += crd(lbl("Te tienen que pasar") + aMi.map((t, i) => `<div class="row${i ? "" : " f"}"><span>${esc(nombre(g, t.de))}<small>${plataG(g, t.m)}</small></span><button class="btnmini" data-act="yaPague" data-v="${esc(t.de + "|" + t.a + "|" + t.m)}">Ya me pagó</button></div>`).join(""), "tuyo");
      if (!mias.length && !aMi.length) h += crd(`<div class="sub">Tu parte</div><div class="big">Estás a mano ✓</div>`, "tuyo");
      const d = detalleDe(g, jid, g.yo);
      if (d.toca || d.puso) h += `<details class="card pp porque"><summary>Por qué te toca ${plataG(g, d.toca)}</summary>` +
        d.lineas.map((l, i) => `<div class="row${i ? "" : " f"}"><span>${esc(l.t)}<small>entre ${l.entre}</small></span><span>${plataG(g, l.parte)}</span></div>`).join("") +
        `<div class="row"><span><b>Te toca</b></span><span><b>${plataG(g, d.toca)}</b></span></div><div class="row"><span>Pusiste</span><span>${plataG(g, d.puso)}</span></div></details>`;
    }

    // Compras.
    h += crd(lbl("Compras") + (compras.length ? compras.map((x, i) => {
      const quien = Object.keys(pagadores(x)).map((p) => nombre(g, p)).join(" y ");
      const nuevo = x.ts > visto && x.por && x.por !== g.yo;
      return `<button class="row rowb${i ? "" : " f"}" data-act="editarGastoG" data-v="${esc(x.id)}"><span>${esc(x.t)}${nuevo ? ` <em class="nuevo">nuevo</em>` : ""}<small>Pagó ${esc(quien)} · entre ${(x.a && x.a.length) || 1}</small></span><span>${plataG(g, centavos(x.m))}</span></button>`;
    }).join("") : `<div class="empty"><span>Sumá lo que se compró y quién lo pagó: la comida, el fernet, la birra…</span></div>`));
    h += btn("sumarGastoG", compras.length ? "+ Sumar compra" : "Sumar la primera compra", { alt: !!compras.length });

    // Quién entra en qué: una grilla para marcar todo de una.
    if (compras.length && gente.length) {
      h += crd(lbl("¿Quién entra en qué?") + `<div class="sub">Tocá para marcar o desmarcar. Cada uno también puede marcarse desde su celu.</div>` +
        `<div class="grilla-caja"><table class="grilla"><thead><tr><th></th>` + compras.map((x) =>
          `<th><button data-act="columna" data-v="${esc(x.id)}" aria-label="Marcar a todos o a nadie en ${esc(x.t)}">${esc(x.t.length > 12 ? x.t.slice(0, 11) + "…" : x.t)}</button></th>`).join("") + `</tr></thead><tbody>` +
        gente.map((p) => `<tr${p === g.yo ? ' class="yo"' : ""}><th>${esc(nombre(g, p))}</th>` + compras.map((x) => {
          const en = (x.a || []).includes(p);
          return `<td><button class="celda${en ? " on" : ""}" data-act="celda" data-v="${esc(x.id + "|" + p)}" aria-pressed="${en}" aria-label="${esc(nombre(g, p))} en ${esc(x.t)}">${en ? "✓" : ""}</button></td>`;
        }).join("") + `</tr>`).join("") + `</tbody></table></div>`);
    }

    // Para quedar a mano: todo lo que falta y lo que ya se pagó.
    if (compras.length) {
      h += crd(lbl("Para quedar a mano") + (ts.length ? ts.map((t, i) =>
        `<div class="row${i ? "" : " f"}"><span>${esc(nombre(g, t.de))} → ${esc(nombre(g, t.a))}<small>${alias(t.a) ? "alias: " + esc(alias(t.a)) : ""}</small></span><span class="der">${plataG(g, t.m)}<button class="link" data-act="yaPague" data-v="${esc(t.de + "|" + t.a + "|" + t.m)}">Ya se pagó</button></span></div>`).join("") :
        `<div class="empty"><b>Están todos a mano ✓</b></div>`) +
        (pagos.length ? `<div class="sub" style="margin-top:8px">Ya pagado</div>` + pagos.map((p) =>
          `<button class="row rowb pagado" data-act="editarPagoG" data-v="${esc(p.id)}"><span>✓ ${esc(nombre(g, p.de))} le pasó a ${esc(nombre(g, p.a))}</span><span>${plataG(g, centavos(p.m))}</span></button>`).join("") : "") +
        `<div class="sub">Son la menor cantidad de transferencias posible. Cada uno le paga directo a quien puso la plata.</div>`);
      h += btn("whatsJuntada", "Mandar al grupo de WhatsApp", { alt: true });
    }
    return h + (ju ? `<div class="chips"><button class="pp" data-act="verHistorial" data-v="${esc(jid)}">Quién cambió qué</button></div>` : "");
  }

  /* ---------- historial ---------- */
  function textoCambio(g, h) {
    const quien = h.por === g.yo ? "Vos" : g.miembros.find((m) => m.id === h.por)?.nombre || "Alguien";
    const vos = quien === "Vos";
    const verbo = { a: vos ? "sumaste" : "sumó", c: vos ? "cambiaste" : "cambió", b: vos ? "borraste" : "borró" }[h.q];
    const t = "«" + h.t + "»";
    const $ = (m) => plataG(g, centavos(m));
    let que;
    if (h.k === "n") que = "el nombre del grupo a " + t;
    else if (h.k === "j") que = "la juntada " + t;
    else if (h.k === "m") que = h.q === "a" ? "a " + h.t + " al grupo" : h.q === "b" ? "a " + h.t + " del grupo" : "los datos de " + h.t;
    else if (h.k === "p") que = "el pago de " + h.t + (h.m !== undefined ? " (" + $(h.m) + ")" : "");
    else if (h.q === "c" && h.m0 !== undefined) que = t + ": de " + $(h.m0) + " a " + $(h.m);
    else if (h.q === "c" && h.e) que = "quién entra en " + t;
    else que = t + (h.m !== undefined ? " (" + $(h.m) + ")" : "");
    return quien + " " + verbo + " " + que;
  }
  function historial() {
    const g = grupo();
    if (!g) return back("Grupos");
    const jid = st.histJ, ju = jid ? (g.juntadas || []).find((x) => x.id === jid) : null;
    const lista = (g.hist || []).filter((h) => !jid || h.j === jid).sort((a, b) => b.ts - a.ts);
    const cuando = (ts) => {
      const d = new Date(ts), f = fechaLocal(d);
      return (f === hoy ? "hoy" : f === ayer ? "ayer" : fecha(f)) + ", " + d.toTimeString().slice(0, 5);
    };
    return back(ju ? ju.nombre : g.nombre) + hdr(esc(ju ? ju.nombre : g.nombre), "Quién cambió qué") +
      crd(lista.length ? lista.map((h, i) => `<div class="row${i ? "" : " f"}"><span class="hist">${esc(textoCambio(g, h))}<small>${cuando(h.ts)}</small></span></div>`).join("") :
        `<div class="empty"><b>Todavía no hay cambios</b><span>Cuando alguien sume, cambie o borre algo, va a aparecer acá.</span></div>`) +
      `<div class="hint">Se guardan los últimos ${MAX_HISTORIAL} cambios. Lo de antes de esta versión no aparece.</div>`;
  }

  /* ---------- formularios ---------- */
  const f = () => st.gform;
  const campo = (k, etiqueta, { ph = "", modo = "text", max = 60, valor } = {}) => lbl(etiqueta) +
    `<div class="quick"><div class="pp"><input class="field" data-act="gcampo" data-k="${k}" value="${esc(valor ?? f().vals[k] ?? "")}" placeholder="${esc(ph)}" aria-label="${esc(etiqueta)}" maxlength="${max}" autocomplete="off"${modo === "monto" ? ' inputmode="decimal"' : ""}></div></div>`;
  const elegir = (k, opciones, etiqueta) => `<div class="chips" role="group" aria-label="${esc(etiqueta)}">` + opciones.map(([v, t]) =>
    `<button class="pp" data-act="gSel" data-k="${k}" data-v="${esc(v)}" aria-pressed="${f().vals[k] === v}">${esc(t)}</button>`).join("") + "</div>";
  const pie = (texto, borrar) => (f().error ? `<div class="msg" role="alert">${esc(f().error)}</div>` : "") + btn("guardarG", texto) +
    (borrar ? `<button class="btn pp w alt del" data-act="borrarG">${st.confirmar === "g" ? "Tocá de nuevo para " + borrar.toLowerCase() : borrar}</button>` : "");

  const FORMS = {
    grupoNuevo() {
      const v = f().vals;
      return back("Grupos") + hdr("Nuevo", "Nuevo grupo") +
        campo("nombre", "Nombre", { ph: "por ejemplo: viaje a la costa", max: 60 }) +
        lbl("Moneda") + elegir("moneda", [["ARS", "Pesos"], ["USD", "Dólares"]], "Moneda") +
        crd(lbl("Integrantes") + v.miembros.map((m, i) =>
          `<div class="persona"><input class="field" data-act="gPersona" data-i="${i}" data-k="nombre" value="${esc(m.nombre)}" placeholder="${i ? "Nombre" : "Tu nombre"}" aria-label="${i ? "Nombre de la persona " + (i + 1) : "Tu nombre"}" maxlength="40">` +
          `<input class="field" data-act="gPersona" data-i="${i}" data-k="alias" value="${esc(m.alias)}" placeholder="alias (opcional)" aria-label="Alias de ${i ? "la persona " + (i + 1) : "vos"}" maxlength="22" autocapitalize="none">` +
          (i ? `<button class="mbtn" data-act="quitarFila" data-v="${i}" aria-label="Quitar persona ${i + 1}">×</button>` : `<span class="hint">vos</span>`) + `</div>`).join("") +
          `<div class="chips"><button class="pp" data-act="sumarFila">+ Sumar integrante</button></div><div class="hint">Podés dejarlo solo con vos: cada uno se suma con su nombre cuando le mandás el link. Poné solo el alias (de cualquier billetera o banco), nunca el CBU.</div>`) +
        pie("Crear grupo");
    },
    grupoEditar() {
      return back("Grupo") + hdr("Grupo", "Editar grupo") +
        campo("nombre", "Nombre", { max: 60 }) +
        lbl("Moneda") + elegir("moneda", [["ARS", "Pesos"], ["USD", "Dólares"]], "Moneda") +
        `<div class="hint">Si lo borrás, se borra solo de este celu: los demás lo siguen teniendo.</div>` +
        pie("Guardar", "Borrar el grupo");
    },
    gasto() {
      if (f().vals.j !== undefined) return FORMS.compra();
      const g = grupo(), v = f().vals, ids = v.a;
      const total = leerMonto(v.m);
      let reparto = "";
      if (total && ids.length) {
        const r = repartir(total, v.sp, ids, pesosDe(v));
        reparto = crd(lbl("Cada uno pone") + ids.map((i, k) => `<div class="row${k ? "" : " f"}"><span>${esc(nombre(g, i))}</span>` +
          (v.sp === "eq" ? "" : `<input class="field mini" data-act="gPeso" data-k="${esc(i)}" value="${esc(v.w[i] ?? "")}" inputmode="decimal" aria-label="${v.sp === "pc" ? "Porcentaje" : v.sp === "sh" ? "Partes" : "Monto"} de ${esc(nombre(g, i))}" placeholder="${v.sp === "pc" ? "%" : v.sp === "sh" ? "1" : "$"}" maxlength="12">`) +
          `<span>${plataG(g, r[i] || 0)}</span></div>`).join("") + `<div class="sub">${{ eq: "Los centavos se reparten exactos.", sh: "Por ejemplo, 2 partes paga el doble que 1.", pc: "Los porcentajes tienen que sumar 100.", ex: "Los montos tienen que sumar el total." }[v.sp]}</div>`);
      }
      return back(g.nombre) + hdr(esc(g.nombre), f().id ? "Editar gasto" : "Sumar gasto") +
        campo("t", "Qué fue", { ph: "por ejemplo: carne y chorizos", max: 80 }) +
        campo("m", "Monto", { ph: "por ejemplo 41.200", modo: "monto", max: 16 }) +
        lbl("Pagó") + elegir("p", vivos(g).map((m) => [m.id, nombre(g, m.id)]), "Quién pagó") +
        lbl("Entre quiénes") + `<div class="chips" role="group" aria-label="Entre quiénes">` + vivos(g).map((m) =>
          `<button class="pp" data-act="gEntre" data-v="${esc(m.id)}" aria-pressed="${ids.includes(m.id)}">${ids.includes(m.id) ? "✓ " : ""}${esc(nombre(g, m.id))}</button>`).join("") + "</div>" +
        lbl("Cómo se reparte") + elegir("sp", REPARTOS, "Cómo se reparte") + reparto +
        pie(f().id ? "Guardar cambios" : "Guardar gasto", f().id ? "Borrar gasto" : "");
    },
    compra() {
      const g = grupo(), v = f().vals;
      const ju = (g.juntadas || []).find((x) => x.id === v.j);
      const gente = vivos(g).filter((m) => (ju ? ju.gente.includes(m.id) : true));
      const opciones = (k, act) => `<div class="chips" role="group">` + gente.map((m) =>
        `<button class="pp" data-act="${act}" data-v="${esc(m.id)}" aria-pressed="${v[k].includes(m.id)}">${v[k].includes(m.id) ? "✓ " : ""}${esc(nombre(g, m.id))}</button>`).join("") + "</div>";
      return back(ju ? ju.nombre : g.nombre) + hdr(esc(ju ? ju.nombre : g.nombre), f().id ? "Editar compra" : "Sumar compra") +
        campo("t", "Qué se compró", { ph: "por ejemplo: fernet", max: 80 }) +
        campo("m", "Cuánto salió", { ph: "por ejemplo 30.000", modo: "monto", max: 16 }) +
        lbl("¿Quién pagó?") + opciones("pagan", "gPaga") +
        (v.pagan.length > 1 ? crd(lbl("¿Cuánto puso cada uno?") + v.pagan.map((i, k) => `<div class="row${k ? "" : " f"}"><span>${esc(nombre(g, i))}</span>` +
          `<input class="field mini" data-act="gPP" data-k="${esc(i)}" value="${esc(v.pp[i] ?? "")}" inputmode="decimal" placeholder="$" aria-label="Cuánto puso ${esc(nombre(g, i))}" maxlength="14"></div>`).join("") +
          `<div class="sub">Si dejás uno vacío, se completa con lo que falta.</div>`) : "") +
        lbl("¿Entre quiénes se divide?") + opciones("a", "gEntre") +
        `<div class="hint">Se divide en partes iguales. Después lo podés ajustar en la grilla de la juntada.</div>` +
        pie(f().id ? "Guardar cambios" : "Sumar compra", f().id ? "Borrar compra" : "");
    },
    juntada() {
      const g = grupo(), v = f().vals;
      return back(g.nombre) + hdr(esc(g.nombre), f().id ? "Editar juntada" : "Nueva juntada") +
        campo("nombre", "¿Qué fue?", { ph: "por ejemplo: asado del sábado", max: 60 }) +
        lbl("¿Cuándo?") + elegir("f", [[hoy, "Hoy"], [ayer, "Ayer"]].concat(v.f !== hoy && v.f !== ayer ? [[v.f, fecha(v.f)]] : []), "Fecha") +
        lbl("¿Quiénes fueron?") + `<div class="chips" role="group" aria-label="Quiénes fueron">` + vivos(g).map((m) =>
          `<button class="pp" data-act="gGente" data-v="${esc(m.id)}" aria-pressed="${v.gente.includes(m.id)}">${v.gente.includes(m.id) ? "✓ " : ""}${esc(nombre(g, m.id))}</button>`).join("") + "</div>" +
        `<div class="quick"><div class="pp"><input class="field" data-act="gcampo" data-k="otro" value="${esc(v.otro || "")}" placeholder="¿Vino alguien más? Escribí su nombre" aria-label="Sumar a alguien que vino" maxlength="40"></div></div>` +
        (v.otro?.trim() ? `<div class="chips"><button class="pp" data-act="gSumarOtro">+ Sumar a ${esc(v.otro.trim())}</button></div>` : "") +
        pie(f().id ? "Guardar" : "Crear juntada", f().id ? "Borrar la juntada" : "");
    },
    pago() {
      const g = grupo(), v = f().vals;
      return back(g.nombre) + hdr(esc(g.nombre), f().id ? "Editar pago" : "Registrar un pago") +
        lbl("Quién paga") + elegir("de", vivos(g).map((m) => [m.id, nombre(g, m.id)]), "Quién paga") +
        lbl("A quién") + elegir("a", vivos(g).map((m) => [m.id, nombre(g, m.id)]), "A quién") +
        campo("m", "Monto", { modo: "monto", max: 16 }) +
        lbl("Cuándo") + elegir("f", [[hoy, "Hoy"], [ayer, "Ayer"]].concat(v.f !== hoy && v.f !== ayer ? [[v.f, fecha(v.f)]] : []), "Fecha") +
        pie("Guardar pago", f().id ? "Borrar pago" : "");
    },
    persona() {
      const g = grupo();
      const usado = f().id && (g.gastos.some((x) => !x.x && (x.p === f().id || x.a.includes(f().id))) || g.pagos.some((p) => !p.x && (p.de === f().id || p.a === f().id)));
      return back(g.nombre) + hdr(esc(g.nombre), f().id ? "Editar persona" : "Sumar integrante") +
        campo("nombre", "Nombre", { max: 40 }) +
        campo("alias", "Alias para cobrar (opcional)", { ph: "solo alias, nunca el CBU", max: 22 }) +
        personajes() +
        crd(`<div class="srow f"><span class="rt"><b>Soy yo</b><small>Marca cuál sos en este grupo (solo en este celu)</small></span>${interruptor("gSoyYo", !!f().vals.soyYo, "Soy yo")}</div>`) +
        pie("Guardar", f().id && !usado ? "Quitar persona" : "") +
        (usado ? crd(`<div class="sub">${esc(nombre(g, f().id))} tiene gastos o pagos. Para quitarlo, primero cambialos o borralos.</div>`) : "");
    },
  };
  const formulario = () => FORMS[st.gform.tipo]();

  // Elegir el personaje que te representa en el grupo (un chiche: si no elegís, se reparte solo).
  function personajes() {
    // pj: 0 a 63 = amigo (base + 16 × detalle); -1 a -4 = Miguita (sola, gorro, anteojos, moño).
    const v = f().vals, pj = v.pj, elegido = Number.isInteger(pj);
    const base = !elegido ? null : pj < 0 ? MIGUITA : pj % 16, detalle = !elegido ? 0 : pj < 0 ? -1 - pj : Math.floor(pj / 16);
    const cam = v.cam || 0;
    const opcion = (valor, dib, nombre) => `<button class="pj pp" data-act="gPj" data-v="${valor}" aria-pressed="${base === valor}" aria-label="${esc(nombre)}">${dib}</button>`;
    return crd(lbl("Personaje") + `<div class="pjs" role="group" aria-label="Personaje">` +
      opcion(MIGUITA, miguitaCon(detalle, cam), "Miguita") + BASES.map((n, i) => opcion(i, amigo(i + 16 * detalle, cam), n)).join("") + "</div>" +
      (elegido ? `<div class="chips" role="group" aria-label="Detalle">` + DETALLES.map((n, k) =>
        `<button class="pp" data-act="gPjDetalle" data-v="${k}" aria-pressed="${detalle === k}">${n}</button>`).join("") + "</div>" : "") +
      (elegido ? lbl("Camiseta") + `<div class="chips" role="group" aria-label="Camiseta">` + CAMISETAS.map((n, k) =>
        `<button class="pp" data-act="gCam" data-v="${k}" aria-pressed="${cam === k}">${n}</button>`).join("") + "</div>" : "") +
      `<div class="sub">${pj == null ? "Si no elegís, la app te asigna uno." : "Así aparece en el grupo."}${pj != null ? ` <button class="link" data-act="gPj" data-v="">Que lo elija la app</button>` : ""}</div>`);
  }

  /* ---------- compartir, unir y WhatsApp ---------- */
  function compartir() {
    const c = st.compartir, g = grupo();
    let h = back(g ? g.nombre : "Grupos");
    if (g?.sync) {
      h += encabezado(g, "Invitar al grupo") +
        crd(lbl("Código del grupo") + `<div class="code corto">${esc(g.sync.codigo)}</div><div class="sub">Tus amigos lo ponen en Grupos › «Unirme con un código». O mandales la invitación con el link.</div>`) +
        `<div class="btnrow">${navigator.share ? btn("compartirCodigo", "Mandar invitación") : btn("copiarLink", "Copiar invitación")}${btn("copiarCodigo", "Copiar código", { alt: true })}</div>` +
        crd(lbl("O que lo escaneen") + (c.svg ? c.svg + `<div class="sub" style="text-align:center">Con la cámara del celu se abre directo.</div>` : `<div class="sub">…</div>`)) +
        crd(`<div class="sub"><b>Quien tenga este código puede ver y anotar en el grupo.</b> Pasalo solo a la gente del grupo.</div>` +
          `<div class="sub">Lo del grupo viaja y se guarda cifrado: ni MiGuita lo puede leer. Tus gastos personales no salen de tu celu.</div>`) +
        `<button class="btn pp w alt del" data-act="desconectarGrupo">${st.confirmar === "desconectar" ? "Tocá de nuevo para desconectar" : "Desconectar este celu"}</button>`;
      return h;
    }
    if (g) {
      h += encabezado(g, "Compartir grupo") +
        crd(`<b style="font:800 17px 'Bricolage Grotesque',sans-serif">Conectá el grupo</b>` +
          `<div class="sub">Así, cuando alguien anota un gasto, lo ven todos al instante. Te damos un código corto para pasarle a tus amigos.</div>` +
          `<div class="sub">Lo del grupo viaja cifrado: solo lo puede abrir quien tenga el código. Tus gastos personales no salen de tu celu.</div>` +
          (c.error ? `<div class="msg" role="alert">${esc(c.error)}</div>` : "")) +
        btn("conectarGrupo", c.conectando ? "Conectando…" : "Conectar el grupo") +
        `<details class="card pp sinconectar"><summary>Mandar una copia sin conectar</summary>` +
          `<div class="sub">Es una foto del grupo en este momento: si después alguien anota algo, hay que volver a mandarla.</div>` +
          `<div class="code">${c.codigo ? esc(c.codigo) : "Armando el código…"}</div>` +
          `<div class="btnrow">${btn("copiarCodigo", "Copiar código")}${navigator.share ? btn("compartirCodigo", "Mandar", { alt: true }) : ""}</div>` +
          (c.svg ? c.svg : `<div class="sub">${c.codigo ? "El grupo es muy grande para un QR: mandá el código." : ""}</div>`) +
        `</details>`;
      return h;
    }
    h += hdr("Grupos", "Unirme a un grupo");
    h += crd(lbl("¿Te pasaron un código?") +
      `<textarea class="field code-in" data-act="pegado" rows="2" placeholder="Por ejemplo: K7QM-3XPA-9TRB" aria-label="Código del grupo" maxlength="400000" autocapitalize="characters" autocomplete="off" spellcheck="false">${esc(c.pegado)}</textarea>` +
      (c.error ? `<div class="msg" role="alert">${esc(c.error)}</div>` : "") +
      `<div class="btnrow">${btn("unirCodigo", c.uniendo ? "Buscando…" : "Unirme")}${btn("escanear", c.escaneando ? "Cerrar cámara" : "Escanear QR", { alt: true })}</div>` +
      (c.escaneando ? `<video class="cam" muted playsinline aria-label="Cámara para escanear"></video>` : ""));
    return h;
  }

  function unido() {
    const g = grupo(), n = st.unido;
    const fila = (t, x, i) => `<div class="row${i ? "" : " f"}"><span>${t}</span><span>${x.nuevos || x.cambiados ? [x.nuevos ? x.nuevos + (x.nuevos === 1 ? " nuevo" : " nuevos") : "", x.cambiados ? x.cambiados + (x.cambiados === 1 ? " cambiado" : " cambiados") : ""].filter(Boolean).join(", ") : "Sin cambios"}</span></div>`;
    return encabezado(g, "Código unido") + crd(lbl("Qué trajo") + fila("Gastos", n.gastos, 0) + fila("Pagos", n.pagos, 1) + fila("Integrantes", n.miembros, 2)) + btn("verGrupo", "Ver el grupo");
  }

  function quien() {
    const g = st.pendiente;
    const opcion = (id, texto, dib) => `<button class="card pp qs" data-act="elegirYo" data-v="${esc(id)}" aria-pressed="${st.yoElegido === id}"><span class="rd${st.yoElegido === id ? " on" : ""}"></span>${dib}<b>${esc(texto)}</b></button>`;
    // Cada uno se pone su nombre: si ya estaba en la lista lo elige (y lo puede corregir); si no, se suma.
    return hdr(esc(g.nombre), "¿Quién sos en este grupo?") +
      opcion("_otra", "No estoy en la lista: sumarme", Art.miguita("ok")) +
      (vivos(g).length ? `<div class="sub" style="margin:4px 2px">O si ya te anotaron, elegite:</div>` : "") +
      vivos(g).map((m, i) => opcion(m.id, m.nombre, amigo(i))).join("") +
      (st.yoElegido ? lbl("Tu nombre en el grupo") + `<div class="quick"><div class="pp"><input class="field" data-act="nombreNuevo" value="${esc(st.nombreNuevo)}" placeholder="Tu nombre" aria-label="Tu nombre en el grupo" maxlength="40" autocomplete="given-name"></div></div>` : "") +
      (st.yoElegido ? crd(lbl("Tu alias para cobrar (opcional)") +
        `<input class="field fondo" data-act="aliasQuien" value="${esc(st.aliasQuien)}" placeholder="tu.alias.mp" aria-label="Tu alias para cobrar" maxlength="22" autocapitalize="none" autocomplete="off" spellcheck="false">` +
        `<div class="sub">Así los demás ven a dónde transferirte. Solo el alias, nunca el CBU.</div>`) : "") +
      (st.errorQuien ? `<div class="msg" role="alert">${esc(st.errorQuien)}</div>` : "") +
      btn("listoQuien", "Listo") + `<button class="btn pp w alt" data-act="volver">Cancelar</button>`;
  }

  function whatsapp() {
    const g = grupo();
    const ju = st.whatsJ !== undefined ? (g.juntadas || []).find((x) => x.id === st.whatsJ) : null;
    const texto = textoWhatsApp(g, (c) => formatear(c, { moneda: g.moneda === "USD" ? "US$ " : "$" }), st.whatsJ);
    return back(ju ? ju.nombre : g.nombre) + hdr(esc(g.nombre), "Resumen para WhatsApp") + crd(`<div class="wa">${esc(texto)}</div>`) +
      `<div class="btnrow">${btn("copiarResumen", "Copiar resumen")}<a class="btn pp alt" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></div>` +
      `<div class="sub">Se ve el alias de quien cobra en cada pago.</div>`;
  }

  return { lista, unGrupo, juntada, historial, formulario, compartir, unido, quien, whatsapp };
}
