// Mis platas: dólares, cripto, inversiones y lo demás, qué se ve en Inicio y en qué orden.
import { Art } from "../art/art.js";
import { formatear } from "../logic/dinero.js";
import { limpiar, TIPOS_PLATA, etiquetaDe, enPesos } from "../logic/platas.js";
import { valorPara, nombreTipo } from "../logic/dolar.js";
import { esc } from "./pantallas.js";

export function crearVistasPlatas(st, hoy, V) {
  const { back, hdr, lbl, crd, interruptor, chips } = V.ayudas;
  const { plata } = V;
  const dolar = () => valorPara(hoy, st.cfg.dolar.tipo, st.cotizaciones, st.cfg.dolar.manual)?.valor || 0;
  const monto = (x) => formatear(x.monto, { moneda: etiquetaDe(x), oculto: st.cfg.ocultar });

  function fila(p, id, i) {
    const x = p.items.find((y) => y.id === id), d = dolar();
    const nombre = id === "total" ? "Todo junto" : id === "pesos" ? "Pesos" : esc(x.nombre);
    const enARS = x?.moneda === "USD" && d ? " · ≈ " + plata(enPesos(x, d)) : "";
    const sub = id === "total" ? "La suma de las que están prendidas" : id === "pesos" ? "Lo que te queda, con lo que anotás" : monto(x) + enARS;
    const dato = `<b>${nombre}</b><small>${sub}</small>`;
    const clase = id === "total" ? "pd-total" : id === "pesos" ? "pd-pesos" : "pd-" + x.color;
    const flecha = (delta, t, que) => `<button class="pp ord" data-act="plataMover" data-v="${esc(id)}|${delta}" aria-label="${que} ${nombre}">${t}</button>`;
    return `<div class="plata-row${i ? "" : " f"}"><i class="pd ${clase}" aria-hidden="true"></i>` +
      (x ? `<button class="plata-nombre rowb" data-act="plataEditar" data-v="${esc(id)}">${dato}</button>` : `<span class="plata-nombre">${dato}</span>`) +
      `<div class="plata-ctrl">${i ? flecha(-1, "↑", "Subir") : ""}${i < p.orden.length - 1 ? flecha(1, "↓", "Bajar") : ""}${interruptor("plataVer", !p.ocultas.includes(id), "Mostrar " + nombre + " en Inicio", id)}</div></div>`;
  }

  function platas() {
    const p = limpiar(st.cfg.platas), d = dolar();
    const sumar = `<div class="chips" role="group" aria-label="Sumar una plata">` + TIPOS_PLATA.map(([t, n]) => `<button class="pp" data-act="plataNueva" data-v="${t}">+ ${n}</button>`).join("") + "</div>";
    const usaDolar = p.items.some((x) => x.moneda === "USD");
    return back("Inicio") + hdr("Tu plata", "Mis platas", "", "platas") +
      (p.items.length ? crd(lbl("En Inicio, en este orden") + p.orden.map((id, i) => fila(p, id, i)).join("")) +
        `<div class="hint">Tocando el número de Inicio pasás de una a otra. Con las flechitas elegís el orden y con el interruptor, cuáles se ven.</div>` :
        crd(`<div class="empty vacio-m">${Art.platasTodo().replace("<svg", '<svg style="width:150px;margin:0 auto"')}<b>¿Tenés plata en otro lado?</b><span>Dólares, USDT, inversiones… Cargala acá y tocando el número de Inicio pasás de una a otra.</span></div>`)) +
      lbl("Sumar") + sumar +
      (usaDolar ? `<div class="hint">${d ? "Se pasan a pesos con el dólar " + esc(nombreTipo(st.cfg.dolar.tipo).toLowerCase()) + " (" + formatear(d) + "). Lo cambiás en Ajustes › Dólar." : "Para sumarlas falta el valor del dólar: cargalo en Ajustes › Dólar."}</div>` : "");
  }

  function plataEd() {
    const f = st.plataEd, elige = f.tipo === "inv" || f.tipo === "otra";
    return back("Mis platas") + hdr("Mis platas", f.id ? "Cambiar plata" : "Sumar plata") +
      lbl("Nombre") + `<div class="quick"><div class="pp"><input class="field" data-act="platCampo" data-k="nombre" value="${esc(f.nombre)}" placeholder="por ejemplo: acciones" aria-label="Nombre" maxlength="24" autocomplete="off"></div></div>` +
      (elige ? lbl("¿En qué moneda?") + chips("plataMoneda", [["ARS", "Pesos"], ["USD", "Dólares"]], f.moneda, "Moneda") : "") +
      lbl(f.moneda === "USD" ? "¿Cuánto tenés, en dólares?" : "¿Cuánto tenés, en pesos?") +
      `<div class="quick"><div class="pp"><input class="field" data-act="platCampo" data-k="monto" value="${esc(f.monto)}" placeholder="por ejemplo 1.200" inputmode="decimal" aria-label="Cuánto tenés" maxlength="16"></div></div>` +
      `<div class="hint">Esto lo actualizás vos cuando cambie. No toca tus pesos ni lo que anotás.</div>` +
      (f.error ? `<div class="msg" role="alert">${esc(f.error)}</div>` : "") +
      `<button class="btn pp w" data-act="plataEdGuardar">Guardar</button>` +
      (f.id ? `<button class="btn pp w alt del" data-act="plataBorrar">${st.confirmar === "plata" ? "Tocá de nuevo para borrar" : "Borrar"}</button>` : "");
  }

  return { platas, plataEd };
}
