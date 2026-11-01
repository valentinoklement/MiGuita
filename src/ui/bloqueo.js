// Pantalla de bloqueo. Se muestra antes que todo cuando hay PIN, y termina cuando se abren los datos.
import { Art } from "../art/art.js";
import { esc } from "./pantallas.js";
import { secretoDeHuella } from "./huella.js";

export function tecladoPin(act = "pinTecla", ok = "OK") {
  const k = (t, etiqueta) => `<button class="key pp" data-act="${act}" data-v="${t}"${etiqueta ? ` aria-label="${etiqueta}"` : ""}>${t}</button>`;
  return `<div class="pad p3">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => k(n)).join("")}${k(ok)}${k(0)}${k("⌫", "Borrar un número")}</div>`;
}
export const puntos = (n, total = 6) => `<div class="dots" aria-hidden="true">${Array.from({ length: Math.max(total, n) }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div>`;

export function pantallaBloqueo(base, raiz) {
  const seg = base.seguridad, clave = seg.modo === "clave";
  let pin = "", error = "", olvide = false, confirmarBorrar = false;
  document.body.className = base.temaBloqueo + " motion";

  return new Promise((listo) => {
    function dibujar() {
      raiz.innerHTML = `<main class="scr bloqueo">` + (olvide ?
        `<button class="back" data-act="volverB">‹ Bloqueo</button><div class="top"><div><small>Seguridad</small><h1>Olvidé mi ${clave ? "contraseña" : "PIN"}</h1></div>${Art.miguita("bad")}</div>` +
        `<div class="card pp"><div class="msg">Sin el ${clave ? "contraseña" : "PIN"} no se pueden abrir los datos de este celu.</div><div class="sub">No hay cuenta ni servidor que lo restablezca.</div></div>` +
        `<div class="card pp"><div class="sub">Si tenés una copia de seguridad: borrá todo y después, en Ajustes › Copias de seguridad, elegí «Restaurar una copia» con su contraseña.</div></div>` +
        `<button class="btn pp w alt del" data-act="borrarB">${confirmarBorrar ? "Tocá de nuevo: se borra todo lo de este celu" : "Borrar todo y empezar de nuevo"}</button>` :
        `<div class="hero-b">${Art.miguita("ok")}<b>MiGuita está cerrada</b><span>${clave ? "Escribí tu contraseña" : "Poné tu PIN"}</span></div>` +
        (clave ? `<form class="quick" data-form="clave"><div class="pp"><input id="claveB" type="password" class="field" aria-label="Contraseña" autocomplete="current-password"></div><button class="btn pp" type="submit">Abrir</button></form>` :
          puntos(pin.length) + tecladoPin()) +
        (error ? `<div class="msg" role="alert" style="text-align:center">${esc(error)}</div>` : "") +
        (seg.huella ? `<button class="btn pp w alt" data-act="huellaB">Usar huella o cara</button>` : "") +
        `<button class="link" data-act="olvideB" style="align-self:center">Olvidé mi ${clave ? "contraseña" : "PIN"}</button>`) + `</main>`;
      raiz.querySelectorAll(".pp").forEach((e) => e.style.setProperty("--dl", (-Math.random() * 2.5).toFixed(2) + "s"));
      raiz.querySelector("#claveB")?.focus();
    }

    async function probar(secreto, huella) {
      error = "Abriendo…"; dibujar();
      const r = await base.desbloquear(secreto, huella);
      if (r === null) { raiz.innerHTML = ""; listo(); return; }
      if (/borraron/.test(r)) { location.reload(); return; }
      pin = ""; error = r; dibujar();
    }

    raiz.addEventListener("click", async function al(e) {
      if (!base.bloqueada) return raiz.removeEventListener("click", al);
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const v = b.dataset.v;
      switch (b.dataset.act) {
        case "pinTecla":
          if (v === "OK") { if (pin.length >= 4) probar(pin); else { error = "El PIN tiene de 4 a 6 números."; dibujar(); } return; }
          if (v === "⌫") pin = pin.slice(0, -1);
          else if (pin.length < 6) pin += v;
          error = "";
          dibujar();
          raiz.querySelector(`[data-act="pinTecla"][data-v="${v}"]`)?.focus();
          return;
        case "huellaB":
          try { probar(null, await secretoDeHuella(seg.huella)); } catch { error = "No se pudo usar la huella. Probá con el " + (clave ? "contraseña" : "PIN") + "."; dibujar(); }
          return;
        case "olvideB": olvide = true; break;
        case "volverB": olvide = false; confirmarBorrar = false; break;
        case "borrarB":
          if (!confirmarBorrar) { confirmarBorrar = true; break; }
          await base.borrarTodo(); location.reload(); return;
        default: return;
      }
      dibujar();
    });
    raiz.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = raiz.querySelector("#claveB")?.value || "";
      if (v) probar(v);
    });
    dibujar();
    if (seg.huella) raiz.querySelector('[data-act="huellaB"]')?.click();
  });
}
