// Pantallas de Más: avisos, seguridad (PIN, huella, bloqueo), dólar, copias de seguridad y mis dispositivos.
import { Art } from "../art/art.js";
import { formatear } from "../logic/dinero.js";
import { TIPOS, FUENTES, nombreTipo, valorPara } from "../logic/dolar.js";
import { esc } from "./pantallas.js";
import { tecladoPin, puntos } from "./bloqueo.js";

export function crearVistasAjustes(st, hoy, V) {
  const { back, hdr, lbl, crd, chips, interruptor } = V.ayudas;
  const fila = (t, s, derecha, primera) => `<div class="srow${primera ? " f" : ""}"><span class="rt"><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span>${derecha}</div>`;
  const hora = (act, valor, etiqueta) => `<input type="time" class="sel hora" data-act="${act}" value="${esc(valor)}" aria-label="${esc(etiqueta)}">`;
  const btn = (act, texto, alt, v) => `<button class="btn pp w${alt ? " alt" : ""}" data-act="${act}"${v ? ` data-v="${v}"` : ""}>${texto}</button>`;
  const fechaHora = (iso) => iso ? new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  /* ---------- avisos ---------- */
  function notif() {
    const n = st.cfg.notif;
    const permiso = !("Notification" in globalThis) ? "no" : Notification.permission;
    return back("Más") + hdr("Ajustes", "Notificaciones") +
      crd(`<div class="sub"><b>Por ahora los avisos aparecen cuando abrís MiGuita.</b> Que lleguen con la app cerrada está en camino.</div>`) +
      lbl("¿Cuántos avisos por día?") + chips("notifCant", [["0", "Ninguno"], ["1", "1"], ["2", "2"], ["3", "3"]], String(n.cantidad), "Cantidad de avisos") +
      (n.cantidad ? crd(n.horas.slice(0, n.cantidad).map((h, i) => fila("Aviso " + (i + 1), "", hora("notifHora", h, "Hora del aviso " + (i + 1)).replace('data-act="notifHora"', `data-act="notifHora" data-i="${i}"`), !i)).join("")) +
        `<div class="sub">Te avisamos solo si todavía no anotaste nada ese día.</div>` : "") +
      lbl("Cómo avisar") + chips("notifForma", [["sonido", "Con sonido y vibración"], ["silencio", "En silencio"]], n.forma, "Cómo avisar") +
      `<div class="hint">Que solo vibre depende del modo del celu (si está en vibrar).</div>` +
      crd(lbl("Qué avisos") +
        fila("Anotar los gastos del día", "A las horas de arriba", interruptor("notifTipo", n.tipos.dia, "Anotar los gastos del día", "dia"), true) +
        fila("Racha en riesgo", "A las 21:00 si tenés 3 días o más", interruptor("notifTipo", n.tipos.racha, "Racha en riesgo", "racha")) +
        fila("Presupuesto por pasarse", "Una vez al llegar al 90%", interruptor("notifTipo", n.tipos.presupuesto, "Presupuesto por pasarse", "presupuesto"))) +
      crd(fila("No molestar", n.noMolestar.activo ? "Sin avisos en esa franja" : "Apagado", interruptor("notifNM", n.noMolestar.activo, "No molestar"), true) +
        (n.noMolestar.activo ? fila("Desde", "", hora("notifDesde", n.noMolestar.desde, "No molestar desde")) + fila("Hasta", "", hora("notifHasta", n.noMolestar.hasta, "No molestar hasta")) : "")) +
      btn("probarAviso", "Probar un aviso", true) +
      (permiso === "denied" ? crd(`<div class="msg">Los avisos están bloqueados en este celu.</div><div class="sub">Para activarlos: en Android, mantené apretado el ícono de MiGuita › Información de la app › Notificaciones. En iPhone: Ajustes › Notificaciones › MiGuita.</div>`) :
        permiso === "no" ? crd(`<div class="sub">Este navegador no permite avisos. En iPhone hay que agregar MiGuita a la pantalla de inicio (iOS 16.4 o más).</div>`) : "");
  }

  /* ---------- seguridad ---------- */
  function seguridad() {
    const seg = st.seguridad;
    if (st.pinFlujo) return crearPin();
    let h = back("Más") + hdr("Ajustes", "Seguridad", "ok");
    if (!seg) {
      h += crd(`<b style="font:800 17px 'Bricolage Grotesque',sans-serif">Cerrá MiGuita con un PIN</b><div class="sub">Tus datos se guardan cifrados: sin el PIN no se pueden leer.</div>`) +
        btn("ponerPin", "Poner un PIN", false, "pin") + btn("ponerPin", "Usar una contraseña larga", true, "clave");
    } else {
      h += crd(fila(seg.modo === "clave" ? "Contraseña" : "PIN", "Activado: los datos están cifrados", `<button class="link" data-act="ponerPin" data-v="${seg.modo}">Cambiar</button>`, true) +
        (st.hayHuella ? fila("Huella o cara", seg.huella ? "Activada" : "Abrir sin escribir el PIN", interruptor("huella", !!seg.huella, "Huella o cara")) : "")) +
        lbl("Bloqueo automático") + chips("bloqueo", [["salir", "Al salir"], ["1", "1 minuto"], ["5", "5 minutos"]], seg.bloqueo, "Bloqueo automático") +
        crd(fila("Borrar todo tras 10 errores", "Para que nadie lo pruebe sin fin", interruptor("borrar10", !!seg.borrarTras10, "Borrar todo tras 10 errores"), true)) +
        `<button class="btn pp w alt del" data-act="quitarPin">${st.confirmar === "pin" ? "Tocá de nuevo: los datos quedan sin cifrar" : "Quitar " + (seg.modo === "clave" ? "la contraseña" : "el PIN")}</button>`;
    }
    h += crd(fila("Tapar la app en multitarea", "Se ve a Miguita en lugar de tus números", interruptor("tapar", !!st.cfg.tapar, "Tapar la app en multitarea"), true));
    if (st.segMsg) h += `<div class="msg" role="status">${esc(st.segMsg)}</div>`;
    return h + crd(lbl("Lo que tenés que saber") +
      `<div class="sub">• Si te olvidás el PIN y no tenés una copia, no hay forma de recuperar los datos. Por eso conviene la copia automática.</div>` +
      `<div class="sub">• Un PIN corto frena a un curioso, pero no a alguien con herramientas para copiar la memoria del celu. Para más protección, usá una contraseña larga.</div>` +
      `<div class="sub">• La app no tiene cuentas, publicidad ni seguimiento, y tus gastos no salen de tu celu. Solo los grupos que conectes viajan por internet, cifrados.</div>`);
  }

  function crearPin() {
    const f = st.pinFlujo, clave = f.modo === "clave";
    const titulo = f.paso === 1 ? (clave ? "Elegí tu contraseña" : "Elegí tu PIN") : (clave ? "Repetila" : "Repetilo");
    return `<button class="back" data-act="cancelarPin">‹ Cancelar</button>` +
      `<div class="hero-b">${Art.miguita("ok")}<b>${titulo}</b><span>${clave ? "8 caracteres o más" : "De 4 a 6 números"}</span></div>` +
      (clave ? `<form class="quick" data-form="pinClave"><div class="pp"><input id="pinClave" type="password" class="field" aria-label="${titulo}" autocomplete="new-password"></div><button class="btn pp" type="submit">Seguir</button></form>` :
        puntos(f.actual.length) + tecladoPin("pinNuevo", "OK")) +
      (f.error ? `<div class="msg" role="alert" style="text-align:center">${esc(f.error)}</div>` : "") +
      `<div class="sub" style="text-align:center">Si te lo olvidás, solo se recupera con una copia de seguridad.</div>`;
  }

  /* ---------- dólar ---------- */
  function dolar() {
    const d = st.cfg.dolar;
    const v = valorPara(hoy, d.tipo, st.cotizaciones, d.manual);
    const origen = v ? (v.fuente === "manual" ? "cargado a mano" : (FUENTES.find((x) => x[0] === v.fuente) || [, v.fuente])[1] + (v.fecha === hoy ? " · hoy" : " · del " + v.fecha.split("-").reverse().join("/"))) : "";
    return back("Más") + hdr("Ajustes", "Dólar") +
      crd(`<div class="sub">Dólar ${esc(nombreTipo(d.tipo).toLowerCase())}</div><div class="big std">${v ? formatear(v.valor) : "Sin valor"}</div><div class="sub">${v ? esc(origen) + (v.estimado ? " (estimado)" : "") : "Cargalo a mano o actualizá."}</div>` +
        (d.tipo !== "fijo" && d.fuente !== "manual" ? `<div class="chips"><button class="pp" data-act="actualizarDolar">${st.dolarCargando ? "Buscando…" : "Actualizar ahora"}</button></div>` : "")) +
      (st.dolarPendiente ? crd(`<div class="msg">El dólar saltó de ${formatear(st.dolarPendiente.anterior)} a ${formatear(st.dolarPendiente.valor)}.</div><div class="sub">Es más de 30% de diferencia. ¿Lo usamos?</div>` +
        `<div class="chips"><button class="pp" data-act="confirmarDolar" aria-pressed="true">Sí, usarlo</button><button class="pp" data-act="descartarDolar">No</button></div>`) : "") +
      (st.dolarError ? `<div class="msg" role="alert">${esc(st.dolarError)}</div>` : "") +
      lbl("Tipo") + chips("dolarTipo", TIPOS, d.tipo, "Tipo de dólar") +
      lbl("De dónde sale el precio") + chips("dolarFuente", FUENTES, d.fuente, "Fuente") +
      lbl(d.tipo === "fijo" || d.fuente === "manual" ? "Valor en pesos" : "Valor a mano (por si fallan las fuentes)") +
      `<div class="quick"><div class="pp"><input class="field" data-act="dolarManual" value="${d.manual ? esc(formatear(d.manual, { moneda: "" })) : ""}" placeholder="por ejemplo 1.250" inputmode="decimal" aria-label="Valor del dólar a mano" maxlength="12"></div></div>` +
      (d.tipo !== "fijo" && d.fuente !== "manual" ? crd(fila("Se actualiza solo", "Una vez por día, desde esta hora (o al abrir la app)", hora("dolarHora", d.hora, "Hora de actualización"), true)) : "") +
      lbl("Gastos en dólares de otro día") + chips("dolarConv", [["diaGasto", "Con el dólar de ese día"], ["hoy", "Con el de hoy"]], d.conversion, "Conversión") +
      `<div class="hint">Se usa el precio de venta. Para anotar en dólares, elegí US$ al anotar un gasto.</div>`;
  }

  /* ---------- copias ---------- */
  function copias() {
    const c = st.cfg.copias, f = st.copiaFlujo;
    const ex = st.exportado;
    let h = back("Más") + hdr("Ajustes", "Copias y Excel") +
      crd(lbl("Para Excel") + `<div class="sub">Todos tus movimientos en una planilla que se abre con Excel o Google Sheets. No va cifrada: guardala donde nadie más la vea.</div>` +
        (ex ? `<div class="btnrow">${ex.compartible ? `<button class="btn pp" data-act="compartirExcel">Mandar</button>` : ""}<a class="btn pp${ex.compartible ? " alt" : ""}" href="${ex.url}" download="${esc(ex.nombre)}">Descargar</a></div>` :
          `<button class="btn pp w alt" data-act="exportarExcel">Exportar a Excel</button>`)) +
      crd(lbl("Tus datos") + `<div class="sub">${c.ultima ? "Última copia: " + fechaHora(c.ultima) : "Todavía no hiciste ninguna copia."}</div>`) +
      crd(fila("Recordarme hacer la copia", c.auto ? "Te avisamos en Inicio cuando toca" : "Apagado", interruptor("copiaAuto", c.auto, "Recordarme hacer la copia"), true) +
        (c.auto ? `<div class="chips">${["semana", "mes"].map((x) => `<button class="pp" data-act="copiaCada" data-v="${x}" aria-pressed="${c.cada === x}">Cada ${x}</button>`).join("")}</div>` : ""));
    if (f?.paso === "crear") {
      h += crd(lbl("Contraseña de la copia") +
        `<input type="password" class="field fondo" data-act="copiaC1" aria-label="Contraseña de la copia" placeholder="8 caracteres o más" autocomplete="new-password">` +
        `<input type="password" class="field fondo" data-act="copiaC2" aria-label="Repetí la contraseña" placeholder="Repetila" autocomplete="new-password">` +
        `<div class="sub">Sin esta contraseña la copia no se puede abrir. Anotala en un lugar seguro.</div>`) +
        btn("crearCopia", f.trabajando ? "Armando la copia…" : "Crear la copia");
    } else if (f?.paso === "listo") {
      h += crd(`<b style="font:800 16px 'Bricolage Grotesque',sans-serif">Copia lista</b><div class="sub">Guardala fuera del celu: mandátela por WhatsApp, por mail o a Drive o iCloud.</div>`) +
        (f.compartible ? btn("compartirCopia", "Mandar la copia") : "") + `<a class="btn pp w${f.compartible ? " alt" : ""}" href="${f.url}" download="${esc(f.nombre)}">Descargar el archivo</a>`;
    } else if (f?.paso === "restaurar") {
      h += crd(lbl("Restaurar una copia") +
        `<input type="file" class="sel" data-act="copiaArchivo" accept=".miguita,.json,application/json" aria-label="Elegir el archivo de la copia">` +
        `<input type="password" class="field fondo" data-act="copiaC1" aria-label="Contraseña de la copia" placeholder="Contraseña de la copia" autocomplete="current-password">` +
        (f.resumen ? `<div class="row f"><span>Movimientos</span><span>${f.resumen.movs}</span></div><div class="row"><span>Grupos</span><span>${f.resumen.grupos}</span></div><div class="row"><span>Hecha</span><span>${esc(fechaHora(f.creada))}</span></div>` +
          `<div class="msg">Lo que hay ahora en este celu se reemplaza por la copia.</div>` : "")) +
        (f.resumen ? `<button class="btn pp w del" data-act="aplicarCopia">${st.confirmar === "copia" ? "Tocá de nuevo para reemplazar todo" : "Reemplazar todo con esta copia"}</button>` :
          btn("abrirCopia", f.trabajando ? "Abriendo…" : "Abrir la copia"));
    } else {
      h += btn("hacerCopia", "Hacer una copia ahora") + btn("restaurarCopia", "Restaurar una copia", true);
    }
    if (f?.error) h += `<div class="msg" role="alert">${esc(f.error)}</div>`;
    if (f) h += `<button class="btn pp w alt" data-act="cancelarCopia">${f.paso === "listo" ? "Listo" : "Cancelar"}</button>`;
    return h + `<div class="hint">La copia va cifrada con tu contraseña. MiGuita no la guarda en ningún servidor.</div>`;
  }

  /* ---------- mis dispositivos ---------- */
  function dispositivos() {
    const vin = st.cfg.vinculo, f = st.vinc || (st.vinc = { pegado: "", error: "", trabajando: false, verCodigo: false });
    let h = back("Más") + hdr("Ajustes", "Usar en otro dispositivo");
    if (!vin) {
      h += crd(`<b style="font:800 17px 'Bricolage Grotesque',sans-serif">Tus datos en el celu y en la compu</b>` +
          `<div class="sub">Conectá dos o más dispositivos y van a ver lo mismo: lo que anotás en uno aparece en los otros. Sin mail ni contraseña, con un código.</div>` +
          `<div class="sub">Viaja cifrado: solo lo pueden abrir tus dispositivos. El tema, el PIN y los avisos quedan en cada uno.</div>`) +
        lbl("¿Es el primero?") + btn("crearVinculo", f.trabajando ? "Conectando…" : "Conectar otro dispositivo") +
        `<div class="hint">Te damos un código para poner en el otro.</div>` +
        crd(lbl("¿Ya tenés un código?") +
          `<div class="quick"><div class="pp"><input class="field" data-act="codigoVinculo" value="${esc(f.pegado)}" placeholder="XXXX-XXXX-XXXX-XXXX" aria-label="Código de tus dispositivos" maxlength="40" autocapitalize="characters" autocomplete="off" spellcheck="false"></div></div>` +
          (f.error ? `<div class="msg" role="alert">${esc(f.error)}</div>` : "") +
          btn("unirVinculo", f.trabajando ? "Conectando…" : "Conectar este dispositivo") +
          `<div class="sub">Si en este ya anotaste cosas, se juntan con las del otro: no se pierde nada.</div>`);
      return h;
    }
    const estado = vin.error === "version" ? "Otro dispositivo tiene una versión más nueva: actualizá MiGuita acá." :
      vin.error === "codigo" ? "El código ya no funciona." : vin.error === "red" || navigator.onLine === false ? "Sin conexión: se manda cuando vuelva internet." :
      vin.ultimo ? "Al día · " + fechaHora(vin.ultimo) : "Conectando…";
    h += crd(`<div class="sub">${vin.error ? "" : "● "}Conectado con tus otros dispositivos</div><b style="font:800 17px 'Bricolage Grotesque',sans-serif">${esc(estado)}</b>`) +
      crd(lbl("Para sumar otro dispositivo") +
        `<div class="sub">En el otro: abrí MiGuita, andá a Más › Usar en otro dispositivo y poné este código.</div>` +
        (f.verCodigo ? `<div class="code corto">${esc(vin.codigo)}</div>` + (f.svg ? f.svg + `<div class="sub" style="text-align:center">O escanealo con la cámara del otro celu.</div>` : "") +
          `<div class="btnrow">${btn("copiarCodigoVinculo", "Copiar código")}${btn("verCodigoVinculo", "Ocultar", true)}</div>` :
          btn("verCodigoVinculo", "Mostrar el código")) +
        `<div class="msg">Quien tenga este código ve y cambia todos tus datos. No se lo mandes a nadie.</div>`) +
      `<button class="btn pp w alt del" data-act="desconectarVinculo">${st.confirmar === "vinculo" ? "Tocá de nuevo para desconectar" : "Desconectar este dispositivo"}</button>` +
      `<div class="hint">Si desconectás, tus datos quedan en este dispositivo pero dejan de actualizarse con los otros.</div>`;
    return h;
  }

  return { notif, seguridad, dolar, copias, dispositivos };
}
