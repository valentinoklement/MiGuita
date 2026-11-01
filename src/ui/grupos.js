// Pantallas de Grupos: lista, un grupo (gastos, saldos, pagos), formularios, compartir, unir y WhatsApp.
import { Art } from "../art/art.js";
import { formatear, leerMonto } from "../logic/dinero.js";
import { centavos, repartir, saldos, saldar, totalGrupo, miParte, textoWhatsApp } from "../logic/grupos.js";
import { sumarDias } from "../logic/mes.js";
import { esc } from "./pantallas.js";

const AMIGOS = ["canon", "bola", "fact", "luna"];
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
    if (id === g.yo) return Art.miguita("ok");
    const i = vivos(g).filter((m) => m.id !== g.yo).findIndex((m) => m.id === id);
    return Art.factura(AMIGOS[Math.max(0, i) % AMIGOS.length]);
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
    if (!st.grupos.length) h += crd(`<div class="empty"><b>Todavía no tenés grupos</b><span>Creá uno para el asado, el viaje o el depto, y la app calcula quién le paga a quién.</span></div>`);
    h += [...st.grupos].sort((a, b) => b.ts - a.ts).map((g) => {
      const s = g.yo ? saldos(g)[g.yo] || 0 : 0;
      return `<button class="card pp gc" data-act="abrirGrupo" data-v="${esc(g.id)}"><span><b>${esc(g.nombre)}</b><small>${vivos(g).length} integrantes</small></span>` +
        `<span class="v ${s > 0 ? "pos" : s < 0 ? "neg" : ""}">${s ? plataG(g, s, { signo: true }) : "Saldado"}<small>${s > 0 ? "Te deben" : s < 0 ? "Debés" : "Todo al día"}</small></span></button>`;
    }).join("");
    return h + btn("nuevoGrupo", "Nuevo grupo") + btn("unirme", "Unirme con un código", { alt: true });
  }

  /* ---------- un grupo ---------- */
  function unGrupo() {
    const g = grupo();
    if (!g) return back("Grupos") + crd(`<div class="empty"><b>Ese grupo ya no está en este celu</b></div>`);
    const total = totalGrupo(g), n = vivos(g).length;
    const s = g.sync;
    let h = `<div class="secrow">${back("Grupos")}<button class="link" data-act="editarGrupo">Editar</button></div>` + encabezado(g, g.nombre) +
      (s ? `<div class="estado-sync${s.error ? " mal" : ""}">${s.error === "codigo" ? "El código del grupo ya no funciona" : s.error === "red" || (s.pendiente && navigator.onLine === false) ? "Sin conexión: se manda cuando vuelva internet" : "● Conectado: todos ven lo mismo"}</div>` :
        g.id.startsWith("ej_") ? "" : `<button class="link estado-sync" data-act="abrirCompartir">Conectalo para que todos vean los gastos al instante ›</button>`) +
      chips("grupoTab", [["gastos", "Gastos"], ["saldos", "Saldos"], ["pagos", "Pagos"]], st.grupoTab, "Parte del grupo");
    if (st.grupoTab === "gastos") {
      const gastos = g.gastos.filter((x) => !x.x).sort((a, b) => (b.f || "").localeCompare(a.f || "") || b.ts - a.ts);
      h += crd(`<div class="sub">Total del grupo</div><div class="big">${plataG(g, total)}</div><div class="sub">${n ? plataG(g, Math.round(total / n)) + " por persona" : ""}</div>`);
      h += crd(lbl("Gastos del grupo") + (gastos.length ? gastos.map((x, i) =>
        `<button class="row rowb${i ? "" : " f"}" data-act="editarGastoG" data-v="${esc(x.id)}"><span>${esc(x.t)}<small>Pagó ${esc(nombre(g, x.p))} · entre ${x.a.length || 1}${x.f ? " · " + fecha(x.f) : ""}</small></span><span>${plataG(g, centavos(x.m))}</span></button>`).join("") :
        `<div class="empty"><span>Sumá el primer gasto: quién pagó y entre quiénes.</span></div>`));
      if (g.yo && g.moneda === "ARS")
        h += crd(`<div class="srow f"><span class="rt"><b>Sumar mi parte a mis gastos</b><small>Mi parte: ${plataG(g, miParte(g))}</small></span>${interruptor("grupoLoc", !!g.loc, "Sumar mi parte a mis gastos")}</div>`);
      h += btn("sumarGastoG", "Sumar gasto");
    } else if (st.grupoTab === "saldos") {
      const b = saldos(g), pagos = saldar(b);
      h += crd(lbl("Cómo está cada uno") + vivos(g).map((m) =>
        `<button class="mrow rowb" data-act="editarPersona" data-v="${esc(m.id)}">${dibujo(g, m.id)}<span class="rt"><b>${esc(nombre(g, m.id))}</b>${m.alias ? `<small>alias: ${esc(m.alias)}</small>` : ""}</span>` +
        `<span class="amt ${b[m.id] > 0 ? "pos" : b[m.id] < 0 ? "neg" : ""}">${b[m.id] ? plataG(g, b[m.id], { signo: true }) : "$0"}</span></button>`).join("") +
        `<div class="chips"><button class="pp" data-act="nuevaPersona">+ Sumar integrante</button></div>`);
      h += crd(lbl("Para saldar") + (pagos.length ? pagos.map((p, i) => {
        const al = g.miembros.find((m) => m.id === p.a)?.alias;
        const texto = p.a === g.yo ? nombre(g, p.de) + " te paga" : p.de === g.yo ? "Le pagás a " + nombre(g, p.a) : nombre(g, p.de) + " le paga a " + nombre(g, p.a);
        return `<button class="row rowb${i ? "" : " f"}" data-act="registrarPagoG" data-v="${esc(p.de + "|" + p.a + "|" + p.m)}"><span>${esc(texto)}${al ? `<small>alias: ${esc(al)}</small>` : ""}</span><span>${plataG(g, p.m)}</span></button>`;
      }).join("") + `<div class="sub">Tocá un pago para registrarlo cuando se haga.</div>` : `<div class="empty"><b>Están todos al día</b></div>`));
    } else {
      const pagos = g.pagos.filter((p) => !p.x).sort((a, b) => (b.f || "").localeCompare(a.f || "") || b.ts - a.ts);
      h += crd(lbl("Pagos registrados") + (pagos.length ? pagos.map((p, i) =>
        `<button class="row rowb${i ? "" : " f"}" data-act="editarPagoG" data-v="${esc(p.id)}"><span>${esc(nombre(g, p.de))} le pagó a ${esc(nombre(g, p.a))}<small>${fecha(p.f)}</small></span><span>${plataG(g, centavos(p.m))}</span></button>`).join("") :
        `<div class="empty"><span>Cuando alguien le transfiera a otro, registralo acá y se descuenta de los saldos.</span></div>`));
      h += btn("registrarPagoG", "Registrar un pago");
    }
    return h + `<div class="btnrow">${btn("abrirCompartir", "Compartir", { alt: true })}${btn("abrirWhatsApp", "Resumen", { alt: true })}</div>`;
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
          `<div class="chips"><button class="pp" data-act="sumarFila">+ Sumar integrante</button></div><div class="hint">El alias es solo de Mercado Pago, nunca el CBU.</div>`) +
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
      const g = grupo(), v = f().vals, ids = v.a;
      const total = leerMonto(v.m);
      let reparto = "";
      if (total && ids.length) {
        const r = repartir(total, v.sp, ids, pesosDe(v));
        reparto = crd(lbl("Cada uno pone") + ids.map((i, k) => `<div class="row${k ? "" : " f"}"><span>${esc(nombre(g, i))}</span>` +
          (v.sp === "eq" ? "" : `<input class="field mini" data-act="gPeso" data-k="${esc(i)}" value="${esc(v.w[i] ?? "")}" inputmode="decimal" aria-label="${v.sp === "pc" ? "Porcentaje" : v.sp === "sh" ? "Partes" : "Monto"} de ${esc(nombre(g, i))}" placeholder="${v.sp === "pc" ? "%" : v.sp === "sh" ? "1" : "$"}" maxlength="12">`) +
          `<span>${plataG(g, r[i] || 0)}</span></div>`).join("") + `<div class="sub">${{ eq: "Los centavos se reparten exactos.", sh: "Por ejemplo, 2 partes paga el doble que 1.", pc: "Los porcentajes tienen que sumar 100.", ex: "Los montos tienen que sumar el total." }[v.sp]}</div>`);
      }
      return back(g.nombre) + hdr(g.nombre, f().id ? "Editar gasto" : "Sumar gasto") +
        campo("t", "Qué fue", { ph: "por ejemplo: carne y chorizos", max: 80 }) +
        campo("m", "Monto", { ph: "por ejemplo 41.200", modo: "monto", max: 16 }) +
        lbl("Pagó") + elegir("p", vivos(g).map((m) => [m.id, nombre(g, m.id)]), "Quién pagó") +
        lbl("Entre quiénes") + `<div class="chips" role="group" aria-label="Entre quiénes">` + vivos(g).map((m) =>
          `<button class="pp" data-act="gEntre" data-v="${esc(m.id)}" aria-pressed="${ids.includes(m.id)}">${ids.includes(m.id) ? "✓ " : ""}${esc(nombre(g, m.id))}</button>`).join("") + "</div>" +
        lbl("Cómo se reparte") + elegir("sp", REPARTOS, "Cómo se reparte") + reparto +
        pie(f().id ? "Guardar cambios" : "Guardar gasto", f().id ? "Borrar gasto" : "");
    },
    pago() {
      const g = grupo(), v = f().vals;
      return back(g.nombre) + hdr(g.nombre, f().id ? "Editar pago" : "Registrar un pago") +
        lbl("Quién paga") + elegir("de", vivos(g).map((m) => [m.id, nombre(g, m.id)]), "Quién paga") +
        lbl("A quién") + elegir("a", vivos(g).map((m) => [m.id, nombre(g, m.id)]), "A quién") +
        campo("m", "Monto", { modo: "monto", max: 16 }) +
        lbl("Cuándo") + elegir("f", [[hoy, "Hoy"], [ayer, "Ayer"]].concat(v.f !== hoy && v.f !== ayer ? [[v.f, fecha(v.f)]] : []), "Fecha") +
        pie("Guardar pago", f().id ? "Borrar pago" : "");
    },
    persona() {
      const g = grupo();
      const usado = f().id && (g.gastos.some((x) => !x.x && (x.p === f().id || x.a.includes(f().id))) || g.pagos.some((p) => !p.x && (p.de === f().id || p.a === f().id)));
      return back(g.nombre) + hdr(g.nombre, f().id ? "Editar persona" : "Sumar integrante") +
        campo("nombre", "Nombre", { max: 40 }) +
        campo("alias", "Alias para cobrar (opcional)", { ph: "solo alias, nunca el CBU", max: 22 }) +
        crd(`<div class="srow f"><span class="rt"><b>Soy yo</b><small>Marca cuál sos en este grupo (solo en este celu)</small></span>${interruptor("gSoyYo", !!f().vals.soyYo, "Soy yo")}</div>`) +
        pie("Guardar", f().id && !usado ? "Quitar persona" : "") +
        (usado ? crd(`<div class="sub">${esc(nombre(g, f().id))} tiene gastos o pagos. Para quitarlo, primero cambialos o borralos.</div>`) : "");
    },
  };
  const formulario = () => FORMS[st.gform.tipo]();

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
    return hdr(g.nombre, "¿Quién sos en este grupo?") +
      vivos(g).map((m, i) => opcion(m.id, m.nombre, Art.factura(AMIGOS[i % AMIGOS.length]))).join("") +
      opcion("_otra", "— Soy otra persona —", "") +
      (st.yoElegido === "_otra" ? `<div class="quick"><div class="pp"><input class="field" data-act="nombreNuevo" value="${esc(st.nombreNuevo)}" placeholder="Tu nombre" aria-label="Tu nombre" maxlength="40"></div></div>` : "") +
      (st.yoElegido ? crd(lbl("Tu alias para cobrar (opcional)") +
        `<input class="field fondo" data-act="aliasQuien" value="${esc(st.aliasQuien)}" placeholder="tu.alias.mp" aria-label="Tu alias para cobrar" maxlength="22" autocapitalize="none" autocomplete="off" spellcheck="false">` +
        `<div class="sub">Así los demás ven a dónde transferirte. Solo el alias, nunca el CBU.</div>`) : "") +
      (st.errorQuien ? `<div class="msg" role="alert">${esc(st.errorQuien)}</div>` : "") +
      btn("listoQuien", "Listo") + `<button class="btn pp w alt" data-act="volver">Cancelar</button>`;
  }

  function whatsapp() {
    const g = grupo();
    const texto = textoWhatsApp(g, (c) => formatear(c, { moneda: g.moneda === "USD" ? "US$ " : "$" }));
    return back(g.nombre) + hdr(g.nombre, "Resumen para WhatsApp") + crd(`<div class="wa">${esc(texto)}</div>`) +
      `<div class="btnrow">${btn("copiarResumen", "Copiar resumen")}<a class="btn pp alt" href="https://wa.me/?text=${encodeURIComponent(texto)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></div>` +
      `<div class="sub">Se ve el alias de quien cobra en cada pago.</div>`;
  }

  return { lista, unGrupo, formulario, compartir, unido, quien, whatsapp };
}
