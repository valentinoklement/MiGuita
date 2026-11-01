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
      `<button class="link" data-act="yaUsoMiguita" style="display:block;margin:6px auto 0">¿Ya usás MiGuita en otro dispositivo? Conectalo</button>` +
      `<button class="link" data-act="tengoCopia" style="display:block;margin:0 auto 10px">Tengo una copia de seguridad</button>` +
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

  // Cada celu ve solo sus pasos. En Android (y en compus con Chrome) hay un botón que abre la instalación del navegador.
  function instalar() {
    const paso = (n, t, p) => `<div class="srow${n === 1 ? " f" : ""}"><span class="stn">${n}</span><span class="rt"><b>${t}</b></span>${p ? icono(p) : ""}</div>`;
    const ua = navigator.userAgent;
    const iphone = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    const android = /Android/.test(ua);
    const pasosIphone = crd(lbl("En iPhone, con Safari") + paso(1, "Tocá Compartir, abajo en el medio de Safari", '<path d="M12 15V4M8 8l4-4 4 4M5 12v8h14v-8"/>') +
      paso(2, "Elegí «Agregar a pantalla de inicio»", '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>') + paso(3, "Abrí MiGuita desde el ícono nuevo"));
    const pasosAndroid = crd(lbl("En Android, con Chrome") +
      paso(1, "Tocá los tres puntos ⋮ de Chrome, arriba a la derecha (no los de MiGuita, abajo)", '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>') +
      paso(2, "Elegí «Instalar app» o «Agregar a la pantalla principal»", '<path d="M12 4v10m0 0l-4-4m4 4l4-4M5 19h14"/>') + paso(3, "Abrí MiGuita desde el ícono nuevo"));
    let h = hdr("Para tenerla a mano", "Instalar MiGuita", "ok");
    if (instalada()) return h + crd(`<div class="empty"><b>Ya la estás usando instalada</b><span>Abrila siempre desde el ícono.</span></div>`) + `<button class="btn pp w" data-act="listoInstalar">Listo</button>`;
    if (st.puedeInstalar) h += crd(`<b style="font:800 17px 'Bricolage Grotesque',sans-serif">Un toque y listo</b><div class="sub">Se agrega el ícono de MiGuita a tu celu, como cualquier app.</div>`) +
      `<button class="btn pp w" data-act="instalarYa">Instalar MiGuita</button>` + `<div class="hint">Si no aparece la ventana para instalar, seguí estos pasos:</div>`;
    h += iphone ? pasosIphone : android ? pasosAndroid : pasosIphone + pasosAndroid;
    if (iphone) h += `<div class="sub">Los avisos y el bloqueo funcionan mejor con la app agregada a la pantalla de inicio. Lo que anotes en Safari y en la app instalada se guarda por separado: usá siempre el ícono.</div>`;
    if (android) h += `<div class="sub">Si en el menú de Chrome dice «Abrir app», MiGuita ya está instalada: buscá el ícono en tu celu.</div>`;
    return h + `<button class="btn pp w${st.puedeInstalar ? " alt" : ""}" data-act="listoInstalar">${st.puedeInstalar ? "Ahora no" : "Listo"}</button>`;
  }

  // Tutorial: qué se puede hacer con la app. Se puede saltear; después queda en Más › Cómo usar MiGuita.
  const PASOS = [
    () => [Art.miguita("ok"), "Anotá en 10 segundos", "Escribí «café 3800» o «10 lucas nafta» y listo: la app pone la categoría sola. Así llevás la cuenta de todo lo que gastás, aunque no cargues tu sueldo."],
    () => [Art.pan(0.6), "Mirá cuánto te queda", "Si cargás lo que cobrás, ves cuánto te queda del mes y cuánto podés gastar por día. Si te pasás, Miguita se empieza a poner fea."],
    () => [Art.masa(0.6), "Ahorrá para algo", "En Plan ponés metas (un viaje, un fondo de emergencia), topes por categoría, deudas, gastos fijos y compras en cuotas que se anotan solos."],
    () => [`<div class="crew">${["fact", "canon", "bola"].map((k) => Art.factura(k)).join("")}</div>`, "Dividí con amigos", "Armá el grupo una vez e invitalos con un link. En cada juntada marcan quién entra en qué (la comida, el fernet, la birra) y la app dice quién le pasa a quién, con el alias a mano."],
    () => [Art.masa(0.35), "Sumá días de racha", "Cada día que anotás suma un ingrediente a la receta. ¿Qué sale del horno a los 7 días? ¿Y a los 100? Para saberlo, hay que llegar."],
    () => [Art.miguita("ok"), "Tus datos son tuyos", "Todo queda solo en tu celu. Podés cerrarla con PIN y hacer copias de seguridad desde Más."],
  ];
  function tutorial() {
    const n = st.tutorialPaso, [dibujo, titulo, texto] = PASOS[n](), ultimo = n === PASOS.length - 1;
    return `<div class="tuto"><button class="link saltar" data-act="saltarTutorial">Saltear</button>` +
      `<div class="tuto-dibujo" aria-hidden="true">${dibujo}</div><b>${titulo}</b><span>${texto}</span>` +
      `<div class="dots" role="img" aria-label="Paso ${n + 1} de ${PASOS.length}">${PASOS.map((_, i) => `<i class="${i === n ? "on" : ""}"></i>`).join("")}</div></div>` +
      `<div class="btnrow">${n ? `<button class="btn pp alt" data-act="tutorialPaso" data-v="${n - 1}">Atrás</button>` : ""}` +
      `<button class="btn pp" data-act="${ultimo ? "saltarTutorial" : "tutorialPaso"}" data-v="${n + 1}">${ultimo ? "¡Empezar!" : "Siguiente"}</button></div>`;
  }

  return { bienvenida, primerIngreso, instalar, tutorial };
}
