// Primera vez: bienvenida, primer ingreso e instrucciones para instalar la app.
import { Art } from "../art/art.js";
import { esc } from "./pantallas.js";

export const instalada = () => matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

export function crearVistasPrimera(st, V) {
  const { hdr, lbl, crd, chips } = V.ayudas;
  const icono = (p) => `<span class="ri">${Art.icono(p)}</span>`;

  function bienvenida() {
    return `<div class="hero-b inicio-b">${Art.miguita("ok")}<b>MiGuita</b><span>Anotá lo que gastás en 10 segundos.</span></div>` +
      `<button class="btn pp w" data-act="empezar">Empezar</button>` +
      `<button class="btn pp w alt" data-act="conEjemplo">Mirar con datos de ejemplo</button>` +
      `<div class="sub" style="text-align:center">Tus datos se guardan solo en este celu. Sin cuentas ni publicidad.</div>`;
  }

  function primerIngreso() {
    const p = st.primera;
    return hdr("Para empezar", "¿Cuánto cobrás por mes?", "ok") +
      lbl("¿Cómo te llamás? (opcional)") + `<div class="quick"><div class="pp"><input class="field" data-act="primeraNombre" value="${esc(p.nombre)}" placeholder="Para saludarte" aria-label="Tu nombre" maxlength="30" autocomplete="given-name"></div></div>` +
      lbl("Lo que cobrás este mes") + `<div class="quick"><div class="pp"><input class="field" data-act="primeraMonto" value="${esc(p.monto)}" placeholder="por ejemplo 620.000" inputmode="decimal" aria-label="Ingreso del mes" maxlength="16"></div></div>` +
      chips("primeraMoneda", [["ARS", "Pesos"], ["USD", "Dólares"]], p.moneda, "Moneda") +
      (p.error ? `<div class="msg" role="alert">${esc(p.error)}</div>` : "") +
      `<button class="btn pp w" data-act="primeraSeguir">Seguir</button><button class="btn pp w alt" data-act="primeraSaltar">Ahora no</button>` +
      `<div class="sub">Lo podés cambiar cuando quieras. Se anota como ingreso de hoy.</div>`;
  }

  function instalar() {
    const paso = (n, t, p) => `<div class="srow${n === 1 ? " f" : ""}"><span class="stn">${n}</span><span class="rt"><b>${t}</b></span>${p ? icono(p) : ""}</div>`;
    return hdr("Para tenerla a mano", "Instalar MiGuita", "ok") +
      crd(lbl("iPhone (Safari)") + paso(1, "Tocá Compartir", '<path d="M12 15V4M8 8l4-4 4 4M5 12v8h14v-8"/>') +
        paso(2, "Elegí «Agregar a pantalla de inicio»", '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>') + paso(3, "Abrí MiGuita desde el ícono")) +
      crd(lbl("Android (Chrome)") + paso(1, "Tocá el menú de los tres puntos", '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>') +
        paso(2, "Elegí «Instalar app»", '<path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14"/>') + paso(3, "Abrí MiGuita desde el ícono")) +
      `<div class="sub">En iPhone, los avisos y el bloqueo funcionan mejor con la app agregada a la pantalla de inicio. Los datos de Safari y los de la app instalada son distintos: conviene usar siempre el ícono.</div>` +
      `<button class="btn pp w" data-act="listoInstalar">Listo</button>`;
  }

  return { bienvenida, primerIngreso, instalar };
}
