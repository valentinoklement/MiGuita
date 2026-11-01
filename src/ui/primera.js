// Primera vez: qué es la app y cómo instalarla, más el tutorial que queda en Ajustes.
import { Art } from "../art/art.js";
import { queNavegador, linkAChrome } from "../logic/instalar.js";

export const instalada = () => matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
export const navegadorActual = () => queNavegador(navigator.userAgent, navigator.maxTouchPoints, !!navigator.brave);

export function crearVistasPrimera(st, V) {
  const { hdr, lbl, crd } = V.ayudas;
  const icono = (p) => `<span class="ri">${Art.icono(p)}</span>`;
  const grande = (act, t) => `<button class="btn pp w grande" data-act="${act}">${t}</button>`;
  const chico = (act, t) => `<button class="link chico" data-act="${act}">${t}</button>`;
  const paso = (n, t, p) => `<div class="srow paso-i${n === 1 ? " f" : ""}"><span class="stn">${n}</span><span class="rt">${t}</span>${p ? icono(p) : ""}</div>`;
  const cabeza = (ancho) => `<div class="hero-b entrada">${Art.miguita("ok").replace("<svg", `<svg style="width:${ancho}px"`)}<b>MiGuita</b>` +
    `<strong class="gancho">¿En qué se te va la plata?</strong><span>Anotá tus gastos en segundos y enterate.</span></div>`;
  const COMPARTIR = '<path d="M12 15V4M8 8l4-4 4 4M5 12v8h14v-8"/>';
  const SUMAR = '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>';

  // Cada celu ve solo lo suyo. Si el navegador deja instalar con un toque, alcanza con un botón, sea cual sea el navegador.
  function instalar() {
    const n = navegadorActual();
    const salir = chico("seguirSinInstalar", st.desdePrimera ? "Seguir sin instalar" : "Volver");
    if (instalada()) return hdr("Para tenerla a mano", "Instalar MiGuita", "ok") + crd(`<div class="empty"><b>Ya la estás usando instalada</b><span>Abrila siempre desde el ícono.</span></div>`) + salir;
    if (st.puedeInstalar) return cabeza(170) + `<div class="relleno"></div>` + grande("instalarYa", "Instalar en mi celu") + `<div class="sub centro">Es gratis y no te pide cuenta.</div>` + salir;
    if (n.so === "iphone") {
      if (n.interno) return cabeza(110) + crd(lbl("Abrila en Safari para instalarla") + paso(1, "Tocá el menú de esta ventana, los <b>···</b>") + paso(2, "Elegí «Abrir en Safari»")) +
        `<button class="btn pp w alt" data-act="copiarDireccion">Copiar el link</button>` + salir;
      return cabeza(110) + crd(lbl("Instalala en 3 pasos") + paso(1, "Tocá <b>Compartir</b>. Si no lo ves, tocá primero los <b>···</b>", COMPARTIR) + paso(2, "Elegí «Agregar a inicio»", SUMAR) + paso(3, "Arriba, tocá «Agregar»")) +
        salir + (n.safari ? `<div class="flecha" aria-hidden="true">↓</div>` : "");
    }
    const aChrome = n.so === "android" && !n.chrome;
    return cabeza(110) + (aChrome ? `<a class="btn pp w grande" href="${linkAChrome()}">Instalar con Chrome</a>` : "") +
      crd(lbl(aChrome ? "O desde este navegador:" : "Instalala en 3 pasos") + paso(1, "Tocá el menú, los <b>⋮</b> o las <b>≡</b>") + paso(2, "Buscá «Instalar» o «Agregar a pantalla de inicio»") + paso(3, "Confirmá")) + salir;
  }

  function yaInstalada() {
    return `<div class="hero-b entrada">${Art.miguita("ok").replace("<svg", '<svg style="width:150px"')}<b>¡Ya la tenés!</b><span>Cerrá esta ventana y buscá este ícono en tu celu:</span></div>` +
      `<div class="ic-final"><img src="icons/icono-192.png" alt=""><span>MiGuita</span></div><div class="sub centro">Desde ahora abrila siempre desde ahí.</div><div class="relleno"></div>` +
      chico("noEncuentro", "No lo encuentro");
  }

  function noEncuentro() {
    return `<b class="ayuda-t">¿No encontrás el ícono?</b><span class="ayuda-x">A veces queda entre todas tus apps y no en la pantalla principal.</span>` +
      paso(1, "Deslizá hasta el final de tus pantallas") + paso(2, "O escribí «MiGuita» en el buscador del celu") +
      `<button class="btn pp w" data-act="reinstalar">Instalar de nuevo</button>` + chico("seguirSinInstalar", "Seguir acá por ahora");
  }

  // Tutorial: qué se puede hacer con la app. Se puede saltear; queda en Ajustes › Cómo usar MiGuita.
  const PASOS = [
    () => [Art.miguita("ok"), "Anotá en 10 segundos", "Escribí «15mil nafta» o «10 lucas birra» y listo: la app pone la categoría sola. También podés tocar el micrófono y decir varios gastos juntos."],
    () => [Art.pan(0.6), "Mirá cuánto te queda", "Si cargás lo que cobrás, ves cuánto te queda del mes y cuánto podés gastar por día. Si te pasás, Miguita se empieza a poner fea."],
    () => [Art.masa(0.6), "Ahorrá para algo", "En Mis cuentas ponés metas (un viaje, un fondo de emergencia), topes por categoría, deudas, gastos fijos y compras en cuotas que se anotan solos."],
    () => [`<div class="crew">${["fact", "canon", "bola"].map((k) => Art.factura(k)).join("")}</div>`, "Dividí con amigos", "Armá el grupo una vez e invitalos con un link. En cada juntada marcan quién entra en qué (la comida, el fernet, la birra) y la app dice quién le pasa a quién, con el alias a mano."],
    () => [Art.masa(0.35), "Sumá días de racha", "Cada día que anotás suma un ingrediente a la receta. ¿Qué sale del horno a los 7 días? ¿Y a los 100? Para saberlo, hay que llegar."],
    () => [Art.miguita("ok"), "Tus datos son tuyos", "Tus gastos quedan en tu celu. Podés cerrarla con PIN y hacer copias de seguridad desde Ajustes."],
  ];
  function tutorial() {
    const n = st.tutorialPaso, [dibujo, titulo, texto] = PASOS[n](), ultimo = n === PASOS.length - 1;
    return `<div class="tuto"><button class="link saltar" data-act="saltarTutorial">Saltear</button>` +
      `<div class="tuto-dibujo" aria-hidden="true">${dibujo}</div><b>${titulo}</b><span>${texto}</span>` +
      `<div class="dots" role="img" aria-label="Paso ${n + 1} de ${PASOS.length}">${PASOS.map((_, i) => `<i class="${i === n ? "on" : ""}"></i>`).join("")}</div></div>` +
      `<div class="btnrow">${n ? `<button class="btn pp alt" data-act="tutorialPaso" data-v="${n - 1}">Atrás</button>` : ""}` +
      `<button class="btn pp" data-act="${ultimo ? "saltarTutorial" : "tutorialPaso"}" data-v="${n + 1}">${ultimo ? "¡Empezar!" : "Siguiente"}</button></div>`;
  }

  return { instalar, yaInstalada, noEncuentro, tutorial };
}
