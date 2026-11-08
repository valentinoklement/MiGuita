// Recorridos completos en un Chrome de verdad: lo que hace una persona en la app, de punta a punta.
// Uso: npm run recorridos   Hace falta tener Chrome instalado. No usa internet: lo de afuera queda bloqueado.
// Además de cada recorrido, comprueba siempre que no haya errores y que la pantalla sea exactamente la que se quería dibujar.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { codificar } from "../src/logic/grupos.js";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const PUERTO = 8131, BASE = `http://localhost:${PUERTO}/`;
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const IPHONE = (v) => `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`;
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const j = JSON.stringify;

const RUTA = process.env.CHROME || ["C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"].find(existsSync);
let servidor, chrome, perfil, ws, n = 0;
const pendientes = new Map(), oyentes = new Map();

function enviar(method, params = {}, sessionId) {
  const id = ++n;
  ws.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
  return new Promise((ok, mal) => pendientes.set(id, { ok, mal, method }));
}

before(async () => {
  if (!RUTA) return;
  servidor = createServer(async (q, r) => {
    try {
      const p = decodeURIComponent(new URL(q.url, BASE).pathname);
      const archivo = normalize(join(RAIZ, p.endsWith("/") ? p + "index.html" : p));
      r.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream", "Cache-Control": "no-store" });
      r.end(await readFile(archivo));
    } catch { r.writeHead(404); r.end(); }
  }).listen(PUERTO);
  perfil = await mkdtemp(join(tmpdir(), "miguita-recorridos-"));
  chrome = spawn(RUTA, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--user-data-dir=" + perfil, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const url = await new Promise((ok, mal) => {
    let t = "";
    chrome.stderr.on("data", (d) => { t += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(t); if (m) ok(m[1]); });
    setTimeout(() => mal(new Error("Chrome no arrancó")), 20000);
  });
  ws = new WebSocket(url);
  await new Promise((ok) => ws.addEventListener("open", ok, { once: true }));
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pendientes.get(m.id);
      pendientes.delete(m.id);
      if (m.error) p.mal(new Error(p.method + ": " + m.error.message)); else p.ok(m.result);
    } else oyentes.get(m.sessionId + m.method)?.(m.params);
  });
});

after(async () => {
  if (!RUTA) return;
  try { await enviar("Browser.close"); } catch { /* ya cerrado */ }
  servidor.close();
  await esperar(500);
  chrome.kill();
  await rm(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }).catch(() => {});
});

// Un celu nuevo, sin nada guardado.
async function celu({ ancho = 375, alto = 812, ua = ANDROID, letra = "" } = {}) {
  const { browserContextId } = await enviar("Target.createBrowserContext");
  const { targetId } = await enviar("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await enviar("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => enviar(m, p, sessionId);
  const errores = [], pedidos = [];
  oyentes.set(sessionId + "Runtime.exceptionThrown", (p) => errores.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text));
  oyentes.set(sessionId + "Network.requestWillBeSent", (p) => pedidos.push(p.request.url));
  await s("Page.enable"); await s("Runtime.enable"); await s("Network.enable"); await s("DOM.enable");
  await s("Network.setBlockedURLs", { urls: ["*dolarapi.com*", "*bluelytics*", "*workers.dev*", "*pages.dev*"] });
  await s("Emulation.setDeviceMetricsOverride", { width: ancho, height: alto, deviceScaleFactor: 2, mobile: true });
  await s("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await s("Emulation.setUserAgentOverride", { userAgent: ua });
  await s("Page.addScriptToEvaluateOnNewDocument", { source: `window.__miguitaVerificar = true;${letra ? `try { localStorage.setItem("miguita-letra", ${j(letra)}); } catch {}` : ""}` });
  const ev = async (x) => {
    const r = await s("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const c = {
    ev, s, errores, pedidos, ancho,
    async hasta(cond, que = cond) {
      for (let i = 0; i < 100; i++) { if (await ev(cond).catch(() => false)) return; await esperar(50); }
      assert.fail("Nunca pasó: " + que + "\nEn pantalla: " + await c.texto().catch(() => "?"));
    },
    async ir(hash = "") {
      await s("Page.navigate", { url: BASE + hash });
      await c.hasta("window.__miguitaLista === true", "que la app arranque");
      await esperar(80);
    },
    texto: () => ev(`document.querySelector("#app").innerText`),
    async ve(re) { await c.hasta(`${re}.test(document.querySelector("#app").innerText)`, "ver " + re); },
    async noVe(re) { assert.doesNotMatch(await c.texto(), re); },
    async clic(sel) { await ev(`(() => { const e = document.querySelector(${j(sel)}); if (!e) throw new Error("No está: " + ${j(sel)}); e.click(); })()`); await esperar(70); },
    async boton(texto) { await ev(`(() => { const e = [...document.querySelectorAll("#app button, #app a")].find((b) => b.innerText.includes(${j(texto)})); if (!e) throw new Error("No hay botón: " + ${j(texto)}); e.click(); })()`); await esperar(70); },
    async escribir(sel, v) { await ev(`(() => { const e = document.querySelector(${j(sel)}); if (!e) throw new Error("No está: " + ${j(sel)}); e.value = ${j(v)}; e.dispatchEvent(new Event("input", { bubbles: true })); })()`); await esperar(30); },
    async anotar(t) { await ev(`(() => { const e = document.querySelector("#rapido"); e.value = ${j(t)}; e.closest("form").requestSubmit(); })()`); await esperar(150); },
    async teclas(t) { for (const k of t) { await ev(`[...document.querySelectorAll("[data-act=tecla]")].find((b) => b.dataset.v === ${j(k)}).click()`); await esperar(25); } },
    // Primera vez en Android, sin la guía.
    async empezar() { await c.ir(); await c.clic("[data-act=seguirSinInstalar]"); await c.clic("[data-act=guiaFin]"); await esperar(80); },
    async numero() { return ev(`document.querySelector(".tecard .big").innerText`); },
    async frase() { return ev(`[...document.querySelectorAll(".tecard .sub")].pop().innerText`); },
    async sinProblemas() {
      assert.deepEqual(errores, [], "errores en la app");
      assert.deepEqual(await ev(`window.__miguitaDiferencias || []`), [], "la pantalla no quedó como se quería dibujar");
      assert.equal(await ev(`!!document.getElementById("fallo-chico") || !!document.getElementById("fallo")`), false, "apareció el cartel de error");
    },
    async cerrar() { await c.sinProblemas(); await enviar("Target.disposeBrowserContext", { browserContextId }); },
  };
  return c;
}

const paso = (nombre, fn) => test(nombre, { skip: RUTA ? false : "No encontré Chrome" }, fn);

paso("instalar en Android: se usa primero y después aparece un botón", async () => {
  const c = await celu();
  await c.ir();
  await c.ve(/Empezar/);
  await c.clic("[data-act=seguirSinInstalar]");
  await c.anotar("kiosco 2500");
  await c.clic("[data-act=guiaSig]");
  await c.clic("[data-act=guiaSig]");
  await c.ev(`(() => { const e = new Event("beforeinstallprompt", { cancelable: true }); window.__prompts = 0; e.prompt = () => { if (++window.__prompts > 1) throw new Error("usado dos veces"); return Promise.resolve(); }; e.userChoice = Promise.resolve({ outcome: "dismissed" }); dispatchEvent(e); })()`);
  await c.ve(/Instalá MiGuita en tu celu/);
  await c.clic("[data-act=instalarYa]");
  await esperar(120);
  assert.equal(await c.ev("window.__prompts"), 1);
  await c.noVe(/Instalá MiGuita en tu celu/);
  await c.cerrar();
});

paso("instalar en iPhone: los pasos de cada versión", async () => {
  const c = await celu({ ua: IPHONE("26.0") });
  await c.ir();
  await c.ve(/SON 4 PASOS/i);
  await c.ve(/tres puntitos/);
  await c.boton("Ya la agregué");
  await c.ve(/Ya la tenés/);
  await c.cerrar();
  const v = await celu({ ua: IPHONE("17.5") });
  await v.ir();
  await v.ve(/SON 3 PASOS/i);
  await v.ve(/abajo al medio/);
  await v.cerrar();
});

paso("anotar: un gasto y lo que estás escribiendo no se pierde", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("nafta 20000");
  assert.equal(await c.numero(), "$20.000");
  await c.ve(/Nafta/);
  assert.equal(await c.ev(`document.querySelector("#rapido").value`), "");
  // Empieza a escribir el siguiente y se va el cartelito de «Anotado».
  await c.ev(`(() => { const e = document.querySelector("#rapido"); e.focus(); e.value = "verduleria 8"; })()`);
  await c.hasta(`!document.querySelector(".snack")`, "que se vaya el cartelito");
  assert.equal(await c.ev(`document.querySelector("#rapido").value`), "verduleria 8");
  assert.equal(await c.ev(`document.activeElement === document.querySelector("#rapido")`), true);
  await c.cerrar();
});

paso("la plata: primero el gasto y después la plata, con las dos respuestas", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("nafta 20000");
  await c.clic("[data-act=abrir][data-v=plata]");
  await c.escribir("[data-act=plataMonto]", "100000");
  await c.clic("[data-act=plataGuardar]");
  await c.ve(/Antes anotaste Nafta por \$20\.000/);
  await c.clic("[data-act=plataFaltaba]");
  await c.ve(/Te queda/);
  assert.equal(await c.numero(), "$80.000");
  assert.equal(await c.frase(), "Gastaste $20.000 de $100.000");
  await c.clic(".tecard");
  await c.ve(/Empezaste con\s+\$100\.000/);
  await c.ve(/Te queda\s+\$80\.000/);
  await c.clic("[data-act=volver]");
  // Le entra plata: suma.
  await c.boton("Me entró plata");
  await c.clic("[data-act=cargarIngreso]");
  await c.teclas("50000");
  await c.clic("[data-act=guardar]");
  await c.hasta(`document.querySelector(".tecard .big")?.innerText === "$130.000"`, "que sume lo que entró");
  await c.cerrar();

  const d = await celu();
  await d.empezar();
  await d.anotar("nafta 20000");
  await d.clic("[data-act=abrir][data-v=plata]");
  await d.escribir("[data-act=plataMonto]", "100000");
  await d.clic("[data-act=plataGuardar]");
  await d.clic("[data-act=plataYaEstaba]");
  await d.ve(/Te queda/);
  assert.equal(await d.numero(), "$100.000");
  assert.equal(await d.frase(), "Gastaste $20.000 de $120.000");
  await d.clic(".tecard");
  await d.ve(/Empezaste con\s+\$120\.000/);
  await d.cerrar();
});

paso("sin cargar la plata, gasto e ingreso se complementan", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("nafta 20000");
  await c.anotar("cobré 100000");
  assert.equal(await c.numero(), "$80.000");
  assert.equal(await c.frase(), "Gastaste $20.000 de $100.000");
  await c.cerrar();
});

paso("corregir: cambiar un gasto, borrarlo y deshacer", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("cafe 1500");
  await c.clic("[data-act=editar]");
  await c.teclas("3000");
  await c.clic("[data-act=guardar]");
  await c.hasta(`document.querySelector(".tecard .big")?.innerText === "$3.000"`, "que cambie el monto");
  await c.clic("[data-act=editar]");
  await c.clic("[data-act=borrarMov]");
  await c.clic("[data-act=borrarMov]");
  await c.hasta(`document.querySelector(".tecard .big")?.innerText === "$0"`, "que se borre");
  await c.clic("[data-act=deshacer]");
  await c.hasta(`document.querySelector(".tecard .big")?.innerText === "$3.000"`, "que vuelva con deshacer");
  await c.cerrar();
});

paso("copia: se hace en un celu y se restaura en otro", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("alquiler 300000");
  await c.ev(`(() => { const o = URL.createObjectURL; URL.createObjectURL = (b) => { window.__copia = b; return o.call(URL, b); }; })()`);
  await c.clic(".nav [data-v=mas]");
  await c.clic("[data-act=abrir][data-v=copias]");
  await c.clic("[data-act=hacerCopia]");
  await c.escribir("[data-act=copiaC1]", "clave-de-prueba");
  await c.escribir("[data-act=copiaC2]", "clave-de-prueba");
  await c.clic("[data-act=crearCopia]");
  await c.ve(/Copia lista/);
  const contenido = await c.ev(`window.__copia.text()`);
  await c.cerrar();

  const archivo = join(perfil, "copia.miguita");
  await writeFile(archivo, contenido);
  const d = await celu();
  await d.empezar();
  await d.clic(".nav [data-v=mas]");
  await d.clic("[data-act=abrir][data-v=copias]");
  await d.clic("[data-act=restaurarCopia]");
  const { root } = await d.s("DOM.getDocument");
  const { nodeId } = await d.s("DOM.querySelector", { nodeId: root.nodeId, selector: "[data-act=copiaArchivo]" });
  await d.s("DOM.setFileInputFiles", { nodeId, files: [archivo] });
  await esperar(150);
  await d.escribir("[data-act=copiaC1]", "clave-de-prueba");
  await d.clic("[data-act=abrirCopia]");
  await d.ve(/Reemplazar todo/);
  await d.clic("[data-act=aplicarCopia]");
  await d.clic("[data-act=aplicarCopia]");
  await d.hasta(`window.__miguitaLista === true && /Alquiler/.test(document.querySelector("#app").innerText)`, "que vuelvan los datos");
  await d.cerrar();
});

paso("invitado a un grupo: entiende dónde cayó y se suma", async () => {
  const hoy = new Date().toISOString().slice(0, 10);
  const grupo = { id: "gprueba", nombre: "Asado", moneda: "ARS", ts: 1, miembros: [{ id: "a", nombre: "Juana", ts: 1 }, { id: "b", nombre: "Pedro", ts: 1 }], gastos: [{ id: "x", t: "Carne", m: 100, p: "a", a: ["a", "b"], sp: "eq", w: {}, f: hoy, ts: 1 }], pagos: [] };
  const codigo = await codificar(grupo);
  const c = await celu();
  await c.ir("#g=" + encodeURIComponent(codigo));
  await c.ve(/Te invitaron a dividir los gastos de «Asado»/);
  await c.boton("No estoy en la lista");
  await c.escribir("[data-act=nombreNuevo]", "Invitada");
  await c.clic("[data-act=listoQuien]");
  await c.ve(/Asado/);
  await c.ve(/Tenela a mano/);
  await c.cerrar();
});

paso("mudanza: en la dirección vieja, con datos, ofrece llevárselos", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("nafta 20000");
  await c.s("Page.addScriptToEvaluateOnNewDocument", { source: `window.__miguitaHost = "valentinoklement.github.io";` });
  await c.ir();
  await c.ve(/MiGuita se mudó/);
  await c.boton("Llevar mis datos");
  await c.ve(/No pude conectarme/); // el servidor está bloqueado en las pruebas
  await c.boton("Más tarde");
  await c.ve(/Nafta/);
  await c.cerrar();
});

paso("mudanza: en la dirección vieja, sin datos, se va solo a la nueva", async () => {
  const c = await celu();
  await c.s("Page.addScriptToEvaluateOnNewDocument", { source: `window.__miguitaHost = "valentinoklement.github.io";` });
  await c.s("Page.navigate", { url: BASE + "#u=ABCD" });
  await c.hasta(`true`, "");
  for (let i = 0; i < 60 && !c.pedidos.some((u) => u.startsWith("https://miguita-app.pages.dev/")); i++) await esperar(50);
  assert.ok(c.pedidos.some((u) => u.startsWith("https://miguita-app.pages.dev/")), "no fue a la dirección nueva");
});

paso("mudanza: el link de la dirección nueva avisa si no pudo traer los datos", async () => {
  const c = await celu();
  await c.ir("#m=K7QM-3XPA-9TRB-2HDW");
  await c.ve(/No pude conectarme/);
  await c.cerrar();
});

for (const [ancho, alto] of [[320, 640], [360, 740], [375, 812]]) for (const letra of ["", "grande", "enorme"])
  paso(`nada se sale de la pantalla: ${ancho} de ancho, letra ${letra || "normal"}`, async () => {
    const c = await celu({ ancho, alto, letra });
    await c.empezar();
    await c.anotar("alquiler 1250000");
    await c.anotar("cobré 5000000");
    const mide = async (donde) => {
      const r = await c.ev(`({ inner: innerWidth, sw: document.documentElement.scrollWidth, fuera: [...document.querySelectorAll("#app *")].filter((e) => { if (e.closest("svg") || e.closest(".vh")) return false; const q = e.getBoundingClientRect(); return q.width && q.right > ${ancho} + 1; }).map((e) => String(e.className || e.tagName)).slice(0, 5) })`);
      assert.ok(r.inner <= ancho + 2 && r.sw <= ancho + 2 && !r.fuera.length, donde + ": " + JSON.stringify(r));
    };
    await mide("Inicio");
    await c.clic(".tecard"); await mide("Resumen"); await c.clic("[data-act=volver]");
    await c.clic("[data-act=abrir][data-v=plata]"); await mide("Mi plata"); await c.clic("[data-act=volver]");
    await c.ev(`(() => { const e = document.querySelector("#rapido"); e.value = ""; e.closest("form").requestSubmit(); })()`); await esperar(150);
    await c.teclas("1250000"); await mide("Hoja de anotar"); await c.clic("[data-act=cerrarHoja]");
    for (const v of ["plan", "grupos", "mas"]) { await c.clic(`.nav [data-v=${v}]`); await mide(v); }
    await c.clic("[data-act=abrir][data-v=personalizacion]"); await mide("Personalización");
    await c.cerrar();
  });
