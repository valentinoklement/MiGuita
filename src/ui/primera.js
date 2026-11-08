// Primera vez: qué es la app y cómo instalarla, más el tutorial que queda en Ajustes.
import { Art } from "../art/art.js";
import { queNavegador, linkAChrome, safariNuevo } from "../logic/instalar.js";

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

  // Dónde mirar en Safari: una barrita igual a la del celu, con el botón que hay que tocar resaltado.
  const barraSafari = (nuevo) => nuevo ?
    `<div class="safari" aria-hidden="true"><span class="sf-i">‹</span><span class="sf-url">valentinoklement.github.io</span><span class="sf-i on">···</span></div>` :
    `<div class="safari viejo" aria-hidden="true"><span class="sf-i">‹</span><span class="sf-i">›</span><span class="sf-i on"><svg viewBox="0 0 24 24">${COMPARTIR}</svg></span><span class="sf-i"><svg viewBox="0 0 24 24"><path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14"/></svg></span><span class="sf-i"><svg viewBox="0 0 24 24"><rect x="4" y="8" width="12" height="12" rx="2"/><path d="M8 4h10a2 2 0 0 1 2 2v10"/></svg></span></div>`;

  // En iPhone no hay botón posible: solo se puede explicar. Se instala primero, porque lo anotado en Safari no pasa a la app.
  function iphone(n, salir) {
    if (n.interno) return cabeza(110) + crd(lbl("Abrila en Safari para instalarla") + paso(1, "Tocá el menú de esta ventana, los <b>···</b>") + paso(2, "Elegí «Abrir en Safari»")) +
      `<button class="btn pp w alt" data-act="copiarDireccion">Copiar el link</button>` + salir;
    const nuevo = n.safari && safariNuevo(navigator.userAgent);
    const pasos = !n.safari ? [["Tocá <b>Compartir</b>, arriba al lado de la dirección. Si no lo ves, tocá primero los <b>···</b>", COMPARTIR], ["Deslizá para abajo y tocá <b>Agregar a inicio</b>", SUMAR], ["Tocá <b>Agregar</b>"]] :
      nuevo ? [["Tocá los tres puntitos <b>···</b>, abajo a la derecha"], ["Tocá <b>Compartir</b>", COMPARTIR], ["Deslizá para abajo y tocá <b>Agregar a inicio</b>", SUMAR], ["Dejá prendido <b>Abrir como app web</b> y tocá <b>Agregar</b>"]] :
      [["Tocá <b>Compartir</b>: el cuadrado con la flechita, abajo al medio", COMPARTIR], ["Deslizá para abajo y tocá <b>Agregar a inicio</b>", SUMAR], ["Arriba a la derecha, tocá <b>Agregar</b>"]];
    const conDatos = st.movs.some((m) => !m.id.startsWith("ej_"));
    return `<div class="hero-b">${Art.miguita("ok").replace("<svg", '<svg style="width:84px"')}<b>Instalá MiGuita</b></div>` +
      (conDatos ? crd(`<b class="pregunta">Lo que ya anotaste no pasa solo a la app</b><div class="sub">Primero sacá un código acá. Después, en la app, andá a Ajustes › Usar en otro dispositivo y ponelo.</div><div class="chips"><button class="pp" data-act="abrir" data-v="dispositivos">Pasar mis datos</button></div>`, "aviso") : "") +
      crd(lbl(`Son ${pasos.length} pasos`) + pasos.map(([t, p], i) => paso(i + 1, t, p)).join("")) +
      (n.safari ? barraSafari(nuevo) : `<button class="btn pp w alt" data-act="copiarDireccion">O copiá el link y abrilo en Safari</button>`) +
      `<button class="btn pp w grande" data-act="yaLaAgregue">Ya la agregué</button>` +
      (st.desdePrimera ? `<div class="sub centro">Si seguís en Safari, lo que anotes no pasa a la app cuando la instales.</div>` : "") + salir +
      (n.safari ? `<div class="flecha${nuevo ? " der" : ""}" aria-hidden="true">↓</div>` : "");
  }

  // Cada celu ve solo lo suyo. Si el navegador deja instalar con un toque, alcanza con un botón, sea cual sea el navegador.
  function instalar() {
    const n = navegadorActual();
    const salir = chico("seguirSinInstalar", st.desdePrimera ? "Seguir sin instalar" : "Volver");
    if (instalada()) return hdr("Para tenerla a mano", "Instalar MiGuita", "ok") + crd(`<div class="empty"><b>Ya la estás usando instalada</b><span>Abrila siempre desde el ícono.</span></div>`) + salir;
    if (st.puedeInstalar) return cabeza(170) + `<div class="relleno"></div>` + grande("instalarYa", "Instalar en mi celu") + `<div class="sub centro">Es gratis y no te pide cuenta.</div>` + salir;
    if (n.so === "iphone") return iphone(n, salir);
    // Android con Chrome: el botón de instalar recién existe después de un toque y 30 segundos de uso. Mientras tanto se empieza a usar,
    // y al ratito aparece el botón en Inicio. Lo anotado sigue ahí después de instalar, porque en Android es la misma memoria.
    if (n.chrome && st.desdePrimera) return cabeza(170) + `<div class="relleno"></div>` + grande("seguirSinInstalar", "Empezar") + `<div class="sub centro">Es gratis y no te pide cuenta. Anotá tu primer gasto y después la instalás con un toque.</div>`;
    const aChrome = n.so === "android" && !n.chrome;
    return cabeza(110) + (aChrome ? `<a class="btn pp w grande" href="${linkAChrome()}">Abrir en Chrome</a><div class="sub centro">Desde acá no se puede instalar. En Chrome, sí.</div>` : "") +
      (n.interno ? "" : crd(lbl(aChrome ? "O desde este navegador:" : "Instalala en 3 pasos") + paso(1, "Tocá los tres puntitos <b>⋮</b>, arriba a la derecha") + paso(2, "Elegí la opción que diga <b>Instalar</b>. Si no está, «Agregar a la pantalla principal»") + paso(3, "Si te pregunta, tocá <b>Instalar</b> y no «Crear acceso directo», que solo abre el navegador"))) +
      (aChrome ? "" : `<div class="sub centro">¿Arriba dice «Abrir en Chrome»? Tocalo primero.</div>`) + salir;
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
    () => [Art.pan(0.6), "Mirá cuánto te queda", "Decile cuánta plata tenés y te muestra cuánto te queda: cada gasto resta y cada ingreso suma. Si te pasás, Miguita se preocupa con vos."],
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
