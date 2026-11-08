// La app se mudó de valentinoklement.github.io/MiGuita a miguita-app.pages.dev.
// En la dirección vieja, quien no tiene nada se va solo a la nueva y quien tiene datos se los lleva con un toque,
// por el mismo camino cifrado de «Usar en otro dispositivo». En la nueva, el link #m=<código> trae todo solo.
import { Art } from "../art/art.js";
import { DIRECCION } from "../logic/instalar.js";
import { nuevoCodigoVinculo } from "../logic/vinculo.js";
import { esc } from "./pantallas.js";
import { instalada, navegadorActual } from "./primera.js";

const NUEVA = "https://" + DIRECCION;
const CORTA = DIRECCION.replace(/\/$/, "");

export function crearMudanza({ st, hoy, V, ponerConfig, sincronizarVinculo, unirVinculo, cortarEscucha, apagarAvisos, dibujar, irA, abrir, mostrarAviso }) {
  const { crd, lbl } = V.ayudas;
  const cabeza = (t, x) => `<div class="hero-b entrada">${Art.miguita("ok").replace("<svg", '<svg style="width:150px"')}<b>${t}</b>${x ? `<span>${x}</span>` : ""}</div>`;
  const paso = (n, t) => `<div class="srow paso-i${n === 1 ? " f" : ""}"><span class="stn">${n}</span><span class="rt">${t}</span></div>`;
  const destino = () => { const m = st.cfg.mudada; return m?.fecha === hoy ? NUEVA + "#m=" + encodeURIComponent(m.codigo) + (m.seguir ? "&s=1" : "") : NUEVA; };

  function pantalla() {
    const m = st.mudanza || {}, ya = st.cfg.mudada;
    if (m.recibiendo) return cabeza("Trayendo tus datos…", "Un segundo, ya casi está.");
    if (ya && navegadorActual().so === "iphone" && instalada())
      return cabeza("Falta un pasito", "En iPhone, cada app guarda lo suyo.") +
        crd(lbl("Para llevarte tus datos") + paso(1, "Copiá este código") + `<div class="code corto">${esc(ya.codigo)}</div><button class="btn pp w alt" data-act="copiarCodigoMudanza">Copiar el código</button>` +
          paso(2, `Abrí Safari y entrá a <b>${CORTA}</b>`) + paso(3, "Instalala y abrila desde el ícono nuevo") + paso(4, "Andá a Ajustes › Usar en otro dispositivo y pegá el código"));
    if (ya) return cabeza("MiGuita ya está en su casa nueva", `Ahora se abre desde ${CORTA}. Este ícono ya no se usa: podés borrarlo.`) + `<div class="relleno"></div>` +
      `<a class="btn pp w grande" href="${destino()}">Abrir MiGuita</a>`;
    return cabeza("MiGuita se mudó", `Ahora vive en <b>${CORTA}</b>. Sigue siendo gratis y tus datos se pasan con un toque, cifrados.`) + `<div class="relleno"></div>` +
      (m.error ? `<div class="msg" role="alert">${esc(m.error)}</div>` : "") +
      `<button class="btn pp w grande" data-act="llevarDatos">${m.trabajando ? "Llevando tus datos…" : "Llevar mis datos"}</button>` +
      (m.trabajando ? "" : `<button class="link chico" data-act="mudarLuego">Más tarde</button>`);
  }

  // Sube todo cifrado y abre la dirección nueva con el código: desde ahí se trae solo.
  async function llevarDatos() {
    if (st.mudanza?.trabajando) return;
    st.mudanza = { trabajando: true }; dibujar();
    const seguir = !!st.cfg.vinculo;
    if (!seguir) ponerConfig("vinculo", { codigo: nuevoCodigoVinculo(), v: 0, base: {} });
    await sincronizarVinculo();
    if (st.cfg.vinculo?.error || navigator.onLine === false) {
      if (!seguir) ponerConfig("vinculo", null);
      st.mudanza = { error: "No pude conectarme. Revisá internet y probá de nuevo." };
      return dibujar();
    }
    const codigo = st.cfg.vinculo.codigo;
    if (st.cfg.avisos) await apagarAvisos();
    if (!seguir) { cortarEscucha(); ponerConfig("vinculo", null); }
    ponerConfig("mudada", { fecha: hoy, codigo, seguir });
    st.mudanza = null;
    if (navegadorActual().so === "iphone" && instalada()) return dibujar();
    location.href = destino();
  }

  // En la dirección nueva: trae lo de la vieja. Si no tenía otros dispositivos conectados, después se desconecta.
  async function recibir(codigo, seguir) {
    st.vinc = { pegado: codigo, error: "", trabajando: false, verCodigo: false };
    st.mudanza = { recibiendo: true };
    irA("mudanza"); dibujar();
    await unirVinculo();
    st.mudanza = null;
    irA("inicio");
    if (st.vinc?.error) { abrir("dispositivos"); return dibujar(); }
    if (!seguir) { cortarEscucha(); ponerConfig("vinculo", null); }
    mostrarAviso("¡Listo! Tus datos ya están acá. Si tenías PIN o avisos, activalos de nuevo en Ajustes.");
    dibujar();
  }

  return { pantalla, llevarDatos, recibir };
}
