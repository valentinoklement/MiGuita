// Red de seguridad: si la app no puede arrancar o algo se rompe, la persona ve un mensaje en vez de una pantalla en blanco.
// Va sin módulos y antes que todo, para que funcione aunque falle el resto (o el navegador sea muy viejo).
(function () {
  var SERVIDOR = "https://miguita-grupos.valentinoklement.workers.dev/buzon";
  var ultimo = "", tiempo = 0;
  var estilo = "position:fixed;z-index:99;left:0;right:0;font:600 15px/1.45 system-ui,sans-serif;color:#2A1608;background:#E2C9A0;";
  var boton = "display:block;width:100%;min-height:46px;margin-top:10px;border:0;border-radius:12px;font:800 15px system-ui,sans-serif;";

  function caja(id, css, titulo, texto, conAvisar) {
    if (document.getElementById(id)) return;
    var d = document.createElement("div"), h = document.createElement("b"), p = document.createElement("div");
    d.id = id; d.setAttribute("role", "alert"); d.style.cssText = estilo + css;
    h.textContent = titulo; h.style.cssText = "display:block;font-size:18px;margin-bottom:6px";
    p.textContent = texto;
    d.appendChild(h); d.appendChild(p);
    var r = document.createElement("button");
    r.textContent = "Volver a cargar"; r.style.cssText = boton + "background:#F4AE3D;color:#2A1608";
    r.addEventListener("click", function () { location.reload(); });
    d.appendChild(r);
    if (conAvisar) {
      var a = document.createElement("button");
      a.textContent = "Avisar del error"; a.style.cssText = boton + "background:#33211A;color:#F8E9D2";
      a.addEventListener("click", function () {
        a.disabled = true; a.textContent = "Mandando…";
        // Solo el texto técnico del error y el tipo de celu: nunca datos de la persona.
        fetch(SERVIDOR, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "error", texto: ultimo.slice(0, 600), aparato: navigator.userAgent.slice(0, 120) }) })
          .then(function () { a.textContent = "¡Gracias! Ya llegó"; }, function () { a.textContent = "No se pudo mandar"; });
      });
      d.appendChild(a);
    }
    document.body.appendChild(d);
  }

  function fallo(texto) {
    ultimo = String(texto);
    if (window.__miguitaLista) {
      // Ya estaba andando: un cartel abajo, sin tapar nada. Como mucho uno por minuto.
      if (Date.now() - tiempo < 60000) return;
      tiempo = Date.now();
      caja("fallo-chico", "bottom:0;padding:16px;box-shadow:0 -4px 16px rgba(0,0,0,.4)", "Algo no anduvo bien", "Lo último que hiciste puede no haberse guardado.", true);
    } else {
      caja("fallo", "top:0;bottom:0;padding:32px 24px", "MiGuita no pudo abrir", "Tus datos no se tocaron: siguen guardados en este celu. Probá volver a cargar. Si sigue igual, avisanos.", true);
    }
  }
  addEventListener("error", function (e) { if (e.message) fallo(e.message + " (" + String(e.filename || "").split("/").pop() + ":" + e.lineno + ")"); });
  addEventListener("unhandledrejection", function (e) { var r = e.reason; fallo((r && (r.stack || r.message)) || r || "promesa"); });
  // La base no puede abrir porque otra ventana vieja la tiene tomada.
  window.__miguitaBloqueo = function () {
    caja("bloqueo-base", "top:0;bottom:0;padding:32px 24px", "MiGuita está abierta en otra ventana", "Tus datos están bien. Cerrá la otra ventana o pestaña de MiGuita para poder seguir.");
  };
  window.__miguitaDesbloqueo = function () { var d = document.getElementById("bloqueo-base"); if (d) d.remove(); };
  // Si después de un rato no apareció nada (navegador muy viejo, por ejemplo).
  setTimeout(function () { if (!window.__miguitaLista && !document.getElementById("bloqueo-base") && !document.querySelector("#app > *")) fallo("no arrancó: " + navigator.userAgent); }, 15000);
})();
