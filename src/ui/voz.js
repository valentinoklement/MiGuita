// Hablar en vez de escribir: la pantalla de grabar y la lista para revisar varios gastos antes de anotarlos.
import { Art } from "../art/art.js";
import { formatear } from "../logic/dinero.js";
import { esc } from "./pantallas.js";

export const puedeGrabar = () => !!(globalThis.MediaRecorder && globalThis.navigator?.mediaDevices?.getUserMedia);

export function crearVistasVoz(st, V) {
  const { crd } = V.ayudas;
  const grande = (act, t, alt = "") => `<button class="btn pp w grande ${alt}" data-act="${act}">${t}</button>`;
  const chico = (act, t) => `<button class="link chico" data-act="${act}">${t}</button>`;
  const cabeza = (titulo, texto, ancho = 170) => `<div class="hero-b entrada">${Art.miguita("ok").replace("<svg", `<svg style="width:${ancho}px"`)}<b>${titulo}</b>${texto ? `<span>${texto}</span>` : ""}</div>`;
  const EJEMPLO = "Por ejemplo: <i>«15 mil de nafta, 10 lucas de birra y 8 mil en el súper»</i>";

  function grabar() {
    const v = st.voz || { paso: "aviso" };
    if (v.paso === "aviso") return cabeza("Hablá en vez de escribir", "Decí todos tus gastos juntos y se anotan por separado.") +
      crd(`<div class="sub voz-aviso">Tu audio se manda a nuestro servidor solo para pasarlo a texto y <b>no se guarda</b>. El celu te va a pedir permiso para usar el micrófono.</div>`) +
      `<div class="relleno"></div>` + grande("vozDale", "Dale") + chico("vozCancelar", "Cancelar");
    if (v.paso === "pidiendo") return cabeza("Un segundo…", "Si el celu te pregunta, dale permiso al micrófono.") + `<div class="relleno"></div>` + chico("vozCancelar", "Cancelar");
    if (v.paso === "grabando") return cabeza("Te escucho…", "Decí todo junto, como te salga. " + EJEMPLO) +
      `<div class="ondas" aria-hidden="true">${[14, 30, 22, 44, 28, 50, 20, 36, 16].map((a, i) => `<i style="height:${a}px;animation-delay:${(i * 0.13).toFixed(2)}s"></i>`).join("")}</div>` +
      `<div class="relleno"></div>` + grande("vozListo", "Listo, ya está") + chico("vozCancelar", "Cancelar");
    if (v.paso === "enviando") return cabeza("Dejame pensar…", "Estoy pasando tu audio a texto.") + `<div class="relleno"></div>`;
    if (v.paso === "nada") return cabeza("No encontré ningún monto", v.texto ? `Escuché: <i>«${esc(v.texto)}»</i>` : "No se escuchó nada.") +
      `<div class="sub" style="text-align:center">Probá de nuevo. ${EJEMPLO}</div><div class="relleno"></div>` + grande("vozDale", "Hablar de nuevo") + chico("vozCancelar", "Mejor lo escribo");
    return cabeza("No pude escucharte", esc(v.error || "")) + `<div class="relleno"></div>` + grande("vozDale", "Probar de nuevo") + chico("vozCancelar", "Mejor lo escribo");
  }

  const plataDe = (x) => formatear(x.monto, { moneda: x.moneda === "USD" ? "US$ " : "$" });

  function editor(x, i) {
    const e = st.varios.editando, lista = st.cfg.categorias[x.tipo].filter((c) => !c.oculta || c.id === e.categoria);
    return `<div class="vario-ed${i ? "" : " f"}">` +
      `<div class="quick"><div class="pp"><input class="field" data-act="varioCampo" data-k="detalle" value="${esc(e.detalle)}" aria-label="Qué fue" maxlength="120" placeholder="Qué fue"></div></div>` +
      `<div class="quick"><div class="pp"><input class="field" data-act="varioCampo" data-k="monto" value="${esc(e.monto)}" aria-label="Cuánto fue" inputmode="decimal" maxlength="16" placeholder="Cuánto fue"></div></div>` +
      `<div class="quick"><div class="pp"><select class="field" data-act="varioCat" aria-label="Categoría">${lista.map((c) => `<option value="${esc(c.id)}"${c.id === e.categoria ? " selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select></div></div>` +
      (e.error ? `<div class="msg" role="alert">${esc(e.error)}</div>` : "") +
      `<div class="chips"><button class="pp" data-act="varioListo" aria-pressed="true">Listo</button><button class="pp" data-act="varioQuitar" data-v="${i}">Quitar este</button></div></div>`;
  }

  function revisar() {
    const r = st.varios;
    if (!r) return "";
    const fila = (x, i) => r.editando?.i === i ? editor(x, i) :
      `<button class="row rowb${i ? "" : " f"}" data-act="varioEditar" data-v="${i}"><span>${esc(x.detalle || V.nombreCat(x.categoria))}<small>${esc(V.nombreCat(x.categoria))}${x.revisar ? " · ¿está bien el monto?" : ""}</small></span>` +
      `<span class="${x.tipo === "gasto" ? "neg" : "pos"}">${x.tipo === "gasto" ? "-" : "+"}${plataDe(x)}</span></button>`;
    const pesos = r.items.filter((x) => x.moneda !== "USD").reduce((a, x) => a + (x.tipo === "gasto" ? x.monto : 0), 0);
    return `<div class="top"><div><h1 class="titulo-g">Entendí esto</h1><small>Si algo está mal, tocalo y lo cambiás.</small></div></div>` +
      (r.voz && r.texto ? `<div class="sub">Escuché: <i>«${esc(r.texto)}»</i></div>` : "") +
      crd(r.items.map(fila).join("")) +
      (pesos ? `<div class="row f total-v"><span>Total gastado</span><span>${formatear(pesos, { moneda: "$" })}</span></div>` : "") +
      (r.error ? `<div class="msg" role="alert">${esc(r.error)}</div>` : "") +
      `<div class="relleno"></div>` + grande("variosAnotar", r.items.length === 1 ? "Anotarlo" : `Anotar los ${r.items.length}`) +
      chico("variosCancelar", r.voz ? "Hablar de nuevo" : "Cancelar");
  }

  return { grabar, revisar };
}
