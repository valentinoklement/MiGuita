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
    async empezar() { await c.ir(); await c.clic("[data-act=seguirSinInstalar]"); for (let i = 0; i < 3; i++) await c.clic("[data-act=guiaSig]"); await esperar(80); },
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
// Un fijo creado hoy con un día que ya pasó empieza el mes que viene: para probarlo se hace de cuenta que arrancó antes.
const fijosDesdeAntes = (c) => c.ev(`new Promise((ok, mal) => { const r = indexedDB.open("miguita"); r.onerror = mal; r.onsuccess = () => { const t = r.result.transaction("fijos", "readwrite"), o = t.objectStore("fijos"); o.getAll().onsuccess = (e) => { for (const f of e.target.result) o.put({ ...f, desde: "2020-01" }); }; t.oncomplete = ok; t.onerror = mal; }; })`);

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

paso("mudanza: ya mudada, si no ve sus datos tiene el código a mano", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("nafta 20000");
  await c.ev(`new Promise((ok, mal) => { const r = indexedDB.open("miguita"); r.onerror = mal; r.onsuccess = () => { const t = r.result.transaction("config", "readwrite"); t.objectStore("config").put({ k: "mudada", v: { fecha: "2026-01-01", codigo: "K7QM-3XPA-9TRB-2HDW", seguir: false } }); t.oncomplete = ok; t.onerror = mal; }; })`);
  await c.s("Page.addScriptToEvaluateOnNewDocument", { source: `window.__miguitaHost = "valentinoklement.github.io";` });
  await c.ir();
  await c.ve(/casa nueva/);
  await c.ve(/¿No ves tus datos\?/);
  await c.ve(/K7QM-3XPA-9TRB-2HDW/);
  // Pasado el día de la mudanza, el botón ya no vuelve a traer los datos solo.
  assert.equal(await c.ev(`[...document.querySelectorAll("#app a")].find((a) => a.innerText.includes("Abrir MiGuita")).getAttribute("href")`), "https://miguita-app.pages.dev/");
  await c.cerrar();
});

paso("mudanza: quien tenía PIN se entera de que acá todavía no lo tiene", async () => {
  const c = await celu();
  await c.ir("#m=K7QM-3XPA-9TRB-2HDW&p=1");
  await c.ve(/No pude conectarme/);
  await c.clic(".nav [data-v=inicio]");
  await c.ve(/Volvé a ponerle PIN/);
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

paso("guía: se saltea de a un paso y dice en cuál vas", async () => {
  const c = await celu();
  await c.ir();
  await c.clic("[data-act=seguirSinInstalar]");
  await c.ve(/Paso 1 de 3/);
  await c.boton("Saltear este paso");
  await c.ve(/Paso 2 de 3/);
  await c.ve(/Acá va lo que anotes/);
  await c.noVe(/¡Anotado!/);
  await c.boton("Saltear este paso");
  await c.ve(/Paso 3 de 3/);
  await c.noVe(/Saltear este paso/);
  await c.boton("¡A usarla!");
  await c.noVe(/Paso 3 de 3/);
  await c.cerrar();
});

paso("tutorial: desde el botoncito de Inicio, paso a paso, hasta el final", async () => {
  const c = await celu();
  await c.empezar();
  await c.boton("Ver tutorial");
  for (let i = 1; i <= 6; i++) {
    await c.ve(new RegExp("Paso " + i + " de 6"));
    // Dos personas pidieron «un lugar para ahorrar»: ya existe (las metas) y el tutorial dice dónde está.
    if (i === 3) await c.ve(/Mis cuentas › Metas/);
    if (i < 6) await c.boton("Siguiente");
  }
  await c.boton("¡Empezar!");
  await c.ve(/Escribí qué gastaste/);
  await c.cerrar();
});

paso("la tarjeta: con una sola plata es como siempre, y el detalle está pegado a ella", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("cobré 100000");
  assert.equal(await c.ev(`!!document.querySelector(".tecard .ver-res") && !document.querySelector(".plata-puntos")`), true);
  assert.equal(await c.ev(`document.querySelector(".tecard").tagName`), "BUTTON");
  await c.clic(".tecard");
  await c.ve(/De dónde sale lo que te queda/i);
  await c.cerrar();
});

paso("mis platas: dólares en la tarjeta, puntitos, orden y vuelve a la última", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("cobré 100000");
  await c.boton("¿Dólares o cripto?");
  await c.ve(/¿Tenés plata en otro lado\?/);
  await c.boton("+ Dólares");
  await c.escribir("[data-act=platCampo][data-k=monto]", "1200");
  await c.clic("[data-act=plataEdGuardar]");
  await c.ve(/Mis platas/);
  await c.clic("[data-act=volver]");
  await c.hasta(`document.querySelector(".tecard .big")?.innerText === "US$ 1.200"`, "que muestre los dólares");
  assert.equal(await c.ev(`document.querySelectorAll(".plata-puntos .pd").length`), 3, "todo junto, pesos y dólares");
  await c.ve(/Tocá para ver tus otras platas/);
  for (let i = 0; i < 3 && !/Te queda/.test(await c.ev(`document.querySelector(".tecard").innerText`)); i++) await c.clic("[data-act=plataSig]");
  await c.noVe(/Tocá para ver tus otras platas/);
  assert.equal(await c.numero(), "$100.000");
  // El detalle sigue a un toque.
  await c.clic(".ver-res");
  await c.ve(/De dónde sale lo que te queda/i);
  await c.clic("[data-act=volver]");
  // Abre en la última que quedó a la vista.
  await c.clic("[data-act=plataSig]");
  const antes = await c.numero();
  await esperar(200);
  await c.ir();
  assert.equal(await c.numero(), antes);
  // Apagar los dólares vuelve a un solo número, sin puntitos.
  await c.clic("[data-act=abrir][data-v=platas]");
  await c.clic('[data-act=plataVer][data-v="' + await c.ev(`document.querySelector("[data-act=plataEditar]").dataset.v`) + '"]');
  await c.clic("[data-act=volver]");
  await c.hasta(`!document.querySelector(".plata-puntos")`, "que se vayan los puntitos");
  await c.cerrar();
});

paso("metas: sacar plata vuelve a lo que te queda, salvo que ya la hayas gastado", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("cobré 100000");
  await c.clic(".nav [data-v=plan]");
  await c.boton("Metas");
  await c.boton("+ Nueva meta");
  await c.escribir("[data-act=campo][data-k=nombre]", "Viaje");
  await c.escribir("[data-act=campo][data-k=objetivo]", "500000");
  await c.escribir("[data-act=campo][data-k=ahorrado]", "40000");
  await c.clic("[data-act=guardarPlan]");
  await c.ve(/Viaje/);
  await c.boton("Sacar");
  await c.escribir("[data-act=campo][data-k=monto]", "900000");
  await c.clic("[data-act=guardarPlan]");
  await c.ve(/Es más de lo que tenés guardado/);
  await c.escribir("[data-act=campo][data-k=monto]", "10000");
  await c.clic("[data-act=guardarPlan]");
  await c.ve(/\$30\.000 de \$500\.000/);
  await c.boton("Sacar");
  await c.escribir("[data-act=campo][data-k=monto]", "5000");
  await c.clic("[data-act=formSwitch][data-v=gasto]");
  await c.clic("[data-act=guardarPlan]");
  await c.ve(/\$25\.000 de \$500\.000/);
  await c.clic(".nav [data-v=inicio]");
  await c.ve(/De la meta: Viaje/);
  await c.cerrar();
});

paso("metas: «Ahorros» sin objetivo se guarda, suma y nunca se cumple", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("cobré 100000");
  await c.clic(".nav [data-v=plan]");
  await c.boton("Metas");
  await c.boton("+ Nueva meta");
  await c.ve(/Objetivo \(opcional\)/i);
  await c.ve(/Sin objetivo es un lugar para ir guardando/);
  await c.noVe(/Fecha límite/i);
  await c.escribir("[data-act=campo][data-k=nombre]", "Ahorros");
  await c.clic("[data-act=guardarPlan]");
  await c.ve(/\$0 guardados/);
  await c.ve(/Para ir guardando/);
  await c.boton("Sumar");
  await c.escribir("[data-act=campo][data-k=monto]", "20000");
  await c.ve(/\$20\.000 guardados/);
  await c.clic("[data-act=guardarPlan]");
  await c.ve(/\$20\.000 guardados/);
  await c.noVe(/Lo lograste|Meta cumplida|NaN|Infinity/);
  // Con objetivo vuelve la fecha; al borrarlo, se va.
  await c.clic("[data-act=editarPlan]");
  await c.escribir("[data-act=campo][data-k=objetivo]", "50000");
  await c.ve(/Fecha límite/i);
  await c.escribir("[data-act=campo][data-k=objetivo]", "");
  await c.noVe(/Fecha límite/i);
  await c.cerrar();
});

// Un trazo con el dedo en el lienzo del ícono (toques de verdad, como en un celu), de (x0, y0) a (x1, y1) en proporción del lienzo.
async function trazar(c, x0, y0, x1, y1) {
  const r = await c.ev(`(() => { const l = document.querySelector("[data-lienzo] svg"); l.scrollIntoView({ block: "center" }); const q = l.getBoundingClientRect(); return { x: q.left, y: q.top, w: q.width, h: q.height }; })()`);
  const en = (fx, fy) => ({ x: r.x + fx * r.w, y: r.y + fy * r.h });
  await c.s("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [en(x0, y0)] });
  for (let i = 1; i <= 8; i++) await c.s("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [en(x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8)] });
  await c.s("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await esperar(80);
}

for (const [ancho, alto, letra] of [[375, 812, ""], [320, 640, "enorme"]])
  paso(`categorías: elegir un ícono o dibujar el propio, y se ve al anotar (${ancho} de ancho, letra ${letra || "normal"})`, async () => {
    const c = await celu({ ancho, alto, letra });
    await c.empezar();
    await c.clic(".nav [data-v=mas]");
    await c.clic("[data-act=abrir][data-v=personalizacion]");
    await c.clic("[data-act=abrir][data-v=categorias]");
    await c.clic("[data-act=agregarCat]");
    await c.escribir("[data-act=catNombre]", "Mate");
    await c.ev(`document.querySelector("[data-act=catNombre]").dispatchEvent(new Event("change", { bubbles: true }))`);
    // Elegir de la lista: primero los que no usa nadie; «Deshacer» vuelve al de antes.
    await c.clic("[data-act=abrir][data-v=elegirIconoCat]");
    await c.ve(/Sin usar/i);
    await c.ve(/Ya los usa otra categoría/i);
    assert.ok(await c.ev(`!!document.querySelectorAll(".cats")[0].querySelector("[data-v=mate]") && !!document.querySelectorAll(".cats")[1].querySelector("[data-v=super]")`), "el mate está sin usar y el changuito lo usa Súper");
    await c.clic("[data-act=elegirIcono][data-v=mate]");
    await c.ve(/Listo: Mate tiene ícono nuevo/);
    const muestraMate = `document.querySelector(".icono-fila svg").innerHTML.includes("M21 12L28 2.5")`;
    assert.ok(await c.ev(muestraMate), "la categoría muestra el mate");
    await c.clic("[data-act=deshacer]");
    await c.hasta(`!(${muestraMate})`, "que vuelva el de antes");
    // Dibujar el propio.
    await c.clic("[data-act=abrir][data-v=elegirIconoCat]");
    await c.clic("[data-act=dibujarCat]");
    await c.ve(/Dibujá tu ícono/);
    await trazar(c, 0.2, 0.5, 0.8, 0.5);
    const etiqueta = `document.querySelector("[data-lienzo] svg").getAttribute("aria-label")`;
    await c.hasta(`/con 1 trazo$/.test(${etiqueta})`, "un trazo");
    // Cae donde se tocó, también con la letra muy grande (la app tiene zoom).
    const n = (await c.ev(`document.querySelector("[data-lienzo] g.ln path").getAttribute("d")`)).match(/\d+(\.\d+)?/g).map(Number);
    assert.ok(Math.abs(n[0] - 8) < 1.5 && Math.abs(n[1] - 18) < 1.5, "empieza donde se tocó: " + n.join(" "));
    assert.ok(Math.abs(n.at(-2) - 32) < 1.5 && Math.abs(n.at(-1) - 18) < 1.5, "termina donde se soltó: " + n.join(" "));
    await trazar(c, 0.5, 0.15, 0.5, 0.85);
    await c.hasta(`/con 2 trazos$/.test(${etiqueta})`, "dos trazos");
    await c.clic("[data-act=trazoDeshacer]");
    await c.hasta(`/con 1 trazo$/.test(${etiqueta})`, "deshacer saca el último");
    await c.clic("[data-act=dibujoColor][data-v='3']");
    assert.equal(await c.ev(`document.querySelector("[data-act=dibujoColor][data-v='3']").getAttribute("aria-pressed")`), "true");
    await c.clic("[data-act=dibujoListo]");
    await c.ve(/Listo: Mate tiene tu dibujo/);
    await c.ve(/Tu dibujo/);
    await c.ve(/‹ Categorías/); // de vuelta en la categoría, sin pasar por la lista
    // Se ve en la lista de categorías y en la hoja de anotar (verde: el color elegido).
    await c.clic("[data-act=volver]");
    assert.ok(await c.ev(`[...document.querySelectorAll("[data-act=editarCat]")].find((b) => b.innerText.includes("Mate")).innerHTML.includes("#79A874")`), "en la lista");
    await c.clic(".nav [data-v=inicio]");
    await c.ev(`(() => { const e = document.querySelector("#rapido"); e.value = ""; e.closest("form").requestSubmit(); })()`); await esperar(150);
    assert.ok(await c.ev(`[...document.querySelectorAll("[data-act=cat]")].find((b) => b.innerText.includes("Mate"))?.innerHTML.includes("#79A874")`), "en la hoja de anotar");
    await c.clic("[data-act=cerrarHoja]");
    await c.cerrar();
  });

paso("categorías: si la app se recarga dibujando un ícono, volver atrás lleva a la lista, sin errores", async () => {
  const c = await celu();
  await c.empezar();
  await c.clic(".nav [data-v=mas]");
  await c.clic("[data-act=abrir][data-v=personalizacion]");
  await c.clic("[data-act=abrir][data-v=categorias]");
  await c.clic("[data-act=editarCat][data-v=super]");
  await c.clic("[data-act=abrir][data-v=elegirIconoCat]");
  await c.clic("[data-act=dibujarCat]");
  await c.ve(/Dibujá tu ícono/);
  // Como al tocar «Actualizar» o cuando el celu cierra la app en segundo plano: la página se recarga y el historial queda.
  await c.s("Page.reload");
  await esperar(300);
  await c.hasta("window.__miguitaLista === true", "que la app vuelva a arrancar");
  await c.ev("history.back()");
  await c.ve(/Categorías y medios/);
  // El historial quedó en otra pantalla: «‹ Personalización» igual lleva a Personalización (no a Ajustes).
  await c.clic("[data-act=volver]");
  await c.ve(/Tamaño de letra/);
  for (let i = 0; i < 2; i++) { await c.ev("history.back()"); await esperar(150); }
  await c.ve(/Categorías y medios|Tamaño de letra/);
  await c.cerrar();
});

paso("categorías: lo que quedó en el historial de una categoría no se aplica a otra", async () => {
  const c = await celu();
  await c.empezar();
  const aCategorias = async () => { await c.clic(".nav [data-v=mas]"); await c.clic("[data-act=abrir][data-v=personalizacion]"); await c.clic("[data-act=abrir][data-v=categorias]"); };
  const enOtraCosa = /Elegí el ícono|Dibujá tu ícono/;
  // Con las pestañas de abajo: se deja el ícono de Súper a medias y se abre Carnicería.
  await aCategorias();
  await c.clic("[data-act=editarCat][data-v=super]");
  await c.clic("[data-act=abrir][data-v=elegirIconoCat]");
  await c.clic(".nav [data-v=inicio]");
  await aCategorias();
  await c.clic("[data-act=editarCat][data-v=carne]");
  for (let i = 0; i < 5; i++) { await c.ev("history.back()"); await esperar(200); await c.noVe(enOtraCosa); }
  // Recargando en medio del dibujo de Súper, y después abriendo Carnicería: «‹ Categorías» vuelve a la lista.
  await aCategorias();
  await c.clic("[data-act=editarCat][data-v=super]");
  await c.clic("[data-act=abrir][data-v=elegirIconoCat]");
  await c.clic("[data-act=dibujarCat]");
  await c.s("Page.reload");
  await esperar(300);
  await c.hasta("window.__miguitaLista === true", "que la app vuelva a arrancar");
  await c.ev("history.back()");
  await c.ve(/Categorías y medios/);
  await c.clic("[data-act=editarCat][data-v=carne]");
  await c.ve(/Carnicería/);
  await c.clic("[data-act=volver]");
  await c.ve(/Categorías y medios/);
  await c.noVe(enOtraCosa);
  await c.cerrar();
});

paso("fijos: «todavía no» pregunta de nuevo a los 3 días, y «este mes no» lo cierra sin anotar nada", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("cafe 1000");
  await c.clic(".nav [data-v=plan]");
  await c.boton("Fijos");
  await c.boton("+ Nuevo fijo");
  await c.boton("Un ingreso");
  await c.escribir("[data-act=campo][data-k=nombre]", "Honorarios");
  await c.escribir("[data-act=campo][data-k=monto]", "300000");
  await c.escribir("[data-act=campo][data-k=dia]", "1");
  await c.boton("Que me pregunte");
  await c.clic("[data-act=guardarPlan]");
  // Si hoy ya pasó el día 1, empieza el mes que viene: se simula que arrancó antes.
  await fijosDesdeAntes(c);
  await c.ir();
  await c.ve(/¿Ya cobraste Honorarios\?/);
  await c.boton("Todavía no");
  await c.noVe(/¿Ya cobraste Honorarios\?/);
  await c.ve(/te pregunto en 3 días/);
  await c.clic("[data-act=deshacer]");
  await c.ve(/¿Ya cobraste Honorarios\?/);
  // «Este mes no» está, más chico que los tres botones, y no anota nada.
  assert.ok(await c.ev(`(() => { const chico = document.querySelector("[data-act=saltearFijo]"), grande = document.querySelector("[data-act=posponerFijo]");
    return chico.innerText.trim() === "Este mes no" && parseFloat(getComputedStyle(chico).fontSize) < parseFloat(getComputedStyle(grande).fontSize) && chico.getBoundingClientRect().height >= 40; })()`), "«Este mes no» es más chico que los botones, pero se puede tocar");
  await c.clic("[data-act=saltearFijo]");
  await c.noVe(/¿Ya cobraste Honorarios\?/);
  await c.ve(/no te pregunto más\. No anoté nada/);
  await c.noVe(/\+\$300\.000/);
  await c.clic("[data-act=deshacer]");
  await c.ve(/¿Ya cobraste Honorarios\?/);
  await c.boton("Otro monto");
  await c.teclas("350000");
  await c.clic("[data-act=guardar]");
  await c.hasta(`!/¿Ya cobraste Honorarios/.test(document.querySelector("#app").innerText)`, "que se vaya la pregunta");
  await c.ve(/\+\$350\.000/);
  await c.cerrar();
});

paso("categorías: lo que corregís queda aprendido", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("papas fritas 2500");
  await c.ve(/Salidas/);
  await c.clic("[data-act=editar]");
  await c.clic("[data-act=cat][data-v=super]");
  await c.clic("[data-act=guardar]");
  await c.ve(/La próxima vez ya va a Súper/);
  await c.anotar("papas fritas 3000");
  await c.hasta(`[...document.querySelectorAll("[data-act=editar]")][0].innerText.includes("Súper")`, "que la próxima ya vaya al súper");
  await c.cerrar();
});

/* ---------- que el número se pueda creer (encargo del 2026-11-11) ---------- */
// En cada camino por el que se mueve plata: el número de Inicio cambia lo que tiene que cambiar y el cartelito lo dice.
const cargarPlata = async (c, monto) => {
  await c.clic("[data-act=abrir][data-v=plata]");
  if (await c.ev(`!document.querySelector("[data-act=plataMonto]")`)) await c.clic("[data-act=corregirPlata]");
  await c.escribir("[data-act=plataMonto]", String(monto));
  await c.clic("[data-act=plataGuardar]");
  await c.ve(/Te queda/);
};
const aviso = (c) => c.ev(`document.querySelector(".snack span")?.innerText || ""`);
const esperaAviso = (c, re) => c.hasta(`${re}.test(document.querySelector(".snack span")?.innerText || "")`, "el cartelito " + re);
const numeroEs = (c, n) => c.hasta(`document.querySelector(".tecard .big")?.innerText === ${j(n)}`, "que el número de Inicio sea " + n);
const entra = async (c, donde) => {
  const r = await c.ev(`({ inner: innerWidth, sw: document.documentElement.scrollWidth, fuera: [...document.querySelectorAll("#app *")].filter((e) => { if (e.closest("svg") || e.closest(".vh")) return false; const q = e.getBoundingClientRect(); return q.width && q.right > ${c.ancho} + 1; }).map((e) => String(e.className || e.tagName)).slice(0, 5) })`);
  assert.ok(r.inner <= c.ancho + 2 && r.sw <= c.ancho + 2 && !r.fuera.length, donde + ": " + JSON.stringify(r));
};

paso("deudas: pagar una deuda baja lo que te queda, y el cartelito lo dice", async () => {
  const c = await celu({ ancho: 320, alto: 640 });
  await c.empezar();
  await cargarPlata(c, 100000);
  await c.clic(".nav [data-v=plan]");
  await c.clic("[data-act=planTab][data-v=deudas]");
  for (const [quien, total] of [["Juan", "30000"], ["Ana", "20000"]]) {
    await c.clic("[data-act=nuevoPlan]");
    await c.escribir("[data-act=campo][data-k=quien]", quien);
    await c.escribir("[data-act=campo][data-k=total]", total);
    await c.clic("[data-act=guardarPlan]");
  }
  // La que más falta va primero: Juan, $30.000. Con la opción prendida (como viene), se resta.
  await c.clic("[data-act=pagarDeuda]");
  await c.ve(/Restarlo de mi plata/);
  await c.ve(/Se anota como gasto en Deudas/);
  await entra(c, "Pagar una deuda");
  await c.clic("[data-act=guardarPlan]");
  await esperaAviso(c, /Pagaste \$30\.000\. ¡Saldada! Te queda \$70\.000/);
  // La otra, con la opción apagada: no se resta, y también se dice.
  await c.clic("[data-act=pagarDeuda]");
  await c.clic("[data-act=formSwitch][data-v=anotar]");
  await c.ve(/Apagado: solo baja la deuda\. Lo que te queda no cambia/);
  await c.clic("[data-act=guardarPlan]");
  await esperaAviso(c, /Pagaste \$20\.000\. ¡Saldada! No cambia lo que te queda/);
  await c.clic(".nav [data-v=inicio]");
  await numeroEs(c, "$70.000");
  await c.ve(/Pago: Juan/);
  await c.noVe(/Pago: Ana/);
  // Borrar el pago devuelve la plata, y deshacer el borrado la vuelve a restar.
  await c.clic("[data-act=editar]");
  await c.clic("[data-act=borrarMov]");
  await c.clic("[data-act=borrarMov]");
  await numeroEs(c, "$100.000");
  await c.clic("[data-act=deshacer]");
  await numeroEs(c, "$70.000");
  await c.cerrar();
});

paso("tarjeta: pagarla tiene su categoría, se anote escribiendo o desde una deuda", async () => {
  const c = await celu();
  await c.empezar();
  await cargarPlata(c, 500000);
  await c.anotar("pagué la visa 150000");
  await c.ve(/Pago de tarjeta/);
  await numeroEs(c, "$350.000");
  // Una deuda que es una tarjeta: su pago también queda en «Pago de tarjeta», no en «Deudas».
  await c.clic(".nav [data-v=plan]");
  await c.clic("[data-act=planTab][data-v=deudas]");
  await c.clic("[data-act=nuevoPlan]");
  await c.escribir("[data-act=campo][data-k=quien]", "Banco");
  await c.escribir("[data-act=campo][data-k=concepto]", "Tarjeta Mastercard");
  await c.escribir("[data-act=campo][data-k=total]", "50000");
  await c.clic("[data-act=guardarPlan]");
  await c.clic("[data-act=pagarDeuda]");
  await c.ve(/Se anota como gasto en Pago de tarjeta/);
  await c.clic("[data-act=guardarPlan]");
  await esperaAviso(c, /Pagaste \$50\.000\. ¡Saldada! Te queda \$300\.000/);
  await c.clic(".nav [data-v=inicio]");
  await c.ve(/Pago: Tarjeta Mastercard/);
  await c.noVe(/Deudas ·/);
  await c.cerrar();
});

paso("tarjeta de crédito: lo comprado con crédito resta cuando pagás la tarjeta, una sola vez", async () => {
  const c = await celu({ ancho: 320, alto: 640 });
  await c.empezar();
  await cargarPlata(c, 500000);
  await c.anotar("zapatillas con crédito 80000");
  await esperaAviso(c, /No cambia lo que te queda: es con tarjeta de crédito/);
  await numeroEs(c, "$500.000");
  assert.match(await c.frase(), /Gastaste \$80\.000 · tarjeta por pagar: \$80\.000/);
  // En Resumen, la cuenta lo explica y deja pagarla.
  await c.clic(".tecard");
  await c.ve(/Con crédito, todavía no salió de tu plata/);
  await c.ve(/Tarjeta por pagar/);
  await entra(c, "Resumen con la tarjeta");
  await c.clic("[data-act=pagarTarjeta]");
  await c.hasta(`document.querySelector(".sheet") && /80\.000/.test(document.querySelector(".sheet").innerText)`, "la hoja con lo que falta pagar");
  await c.clic("[data-act=guardar]");
  await c.clic(".nav [data-v=inicio]");
  await numeroEs(c, "$420.000");
  assert.doesNotMatch(await c.frase(), /tarjeta por pagar/);
  // Lo gastado sigue siendo 80.000, no 160.000: pagar la tarjeta no es otro gasto. Compra y pago en el mismo mes: la tarjeta no agrega renglones.
  await c.clic(".tecard");
  await c.noVe(/Tarjeta por pagar/);
  assert.equal((await c.ev(`[...document.querySelectorAll(".row")].find((r) => /^Gastaste/.test(r.innerText))?.innerText`)).replace(/\s+/g, " "), "Gastaste −$80.000");
  await c.noVe(/Pago de tarjeta ·/);
  await c.cerrar();
});

paso("tarjeta de crédito: si las compras ya estaban anotadas, el pago no se cuenta dos veces", async () => {
  const c = await celu();
  await c.empezar();
  await cargarPlata(c, 500000);
  await c.anotar("zapatillas 80000");
  await numeroEs(c, "$420.000");
  await c.anotar("pagué la visa 80000");
  await numeroEs(c, "$340.000");
  await c.ve(/¿Ya anotaste lo que compraste con esa tarjeta\?/);
  await c.boton("Sí, elegirlas");
  await c.ve(/¿Cuáles eran de la tarjeta\?/);
  await c.ve(/Elegiste \$0/);
  await entra(c, "La lista para elegir");
  await c.clic("[data-act=tarjetaMarcar]");
  await c.ve(/Elegiste \$80\.000/);
  await c.clic("[data-act=tarjetaListo]");
  await numeroEs(c, "$420.000");
  await esperaAviso(c, /esa compra quedó con la tarjeta/);
  await c.noVe(/¿Ya anotaste lo que compraste/);
  // Deshacer vuelve a como estaba, y la pregunta vuelve sola.
  await c.clic("[data-act=deshacer]");
  await numeroEs(c, "$340.000");
  await c.ve(/¿Ya anotaste lo que compraste con esa tarjeta\?/);
  // «No, es un gasto nuevo»: queda restado y no pregunta más.
  await c.boton("No, es un gasto nuevo");
  await esperaAviso(c, /lo cuento como un gasto nuevo/);
  await c.noVe(/¿Ya anotaste lo que compraste/);
  await numeroEs(c, "$340.000");
  await c.cerrar();
});

paso("tarjeta de crédito: el resumen trae impuestos; elegidas las compras, la pregunta no vuelve", async () => {
  const c = await celu({ ancho: 320, alto: 640 });
  await c.empezar();
  await cargarPlata(c, 500000);
  await c.anotar("zapatillas 80000");
  await c.anotar("café 2500");
  await c.anotar("pagué la visa 85000");
  await numeroEs(c, "$332.500");
  await c.boton("Sí, elegirlas");
  await c.hasta(`[...document.querySelectorAll("[data-act=tarjetaMarcar]")].some((b) => /Zapatillas/.test(b.innerText))`, "la lista con las zapatillas");
  await c.ev(`[...document.querySelectorAll("[data-act=tarjetaMarcar]")].find((b) => /Zapatillas/.test(b.innerText)).click()`);
  await c.ve(/Los \$5\.000 que no cubren los cuento como un gasto nuevo/);
  await entra(c, "La lista con lo que sobra");
  await c.clic("[data-act=tarjetaListo]");
  await numeroEs(c, "$412.500");
  await esperaAviso(c, /Los \$5\.000 que no cubren las cuento como un gasto nuevo/);
  await c.noVe(/¿Ya anotaste lo que compraste|¿Qué son los/);
  // Si el resumen ya cubre compras con crédito y sobra algo, se pregunta por esa parte (si hay gastos que podrían ser compras de la tarjeta).
  await c.anotar("almuerzo 3000");
  await c.anotar("remera con crédito 20000");
  await c.anotar("pagué la visa 21000");
  await c.ve(/¿Qué son los \$1\.000 de más que pagaste de la tarjeta\?/);
  await c.boton("Intereses o impuestos");
  await c.noVe(/¿Qué son los/);
  await c.cerrar();
});

paso("lo de siempre: a la quinta vez aparece debajo del campo, un toque lo anota y la pestañita lo oculta", async () => {
  const c = await celu({ ancho: 320, alto: 640, letra: "enorme" });
  await c.empezar();
  for (let i = 0; i < 4; i++) await c.anotar("café 2500");
  await c.noVe(/Lo de siempre/);
  await c.anotar("café 2500");
  await c.ve(/Lo de siempre/);
  await entra(c, "Inicio con lo de siempre");
  // Inicio muestra los últimos cinco movimientos: lo anotado se mira en el total del mes (cinco cafés de $2.500).
  await numeroEs(c, "$12.500");
  await c.clic("[data-act=repetir][data-v='0']");
  await esperaAviso(c, /Anotado: Café \$2\.500/);
  await numeroEs(c, "$15.000");
  await c.clic("[data-act=deshacer]");
  await numeroEs(c, "$12.500");
  // La pestañita: abierta de entrada; al tocarla se ocultan los botones y queda solo el título, también después de recargar.
  const botones = `document.querySelectorAll("[data-act=repetir]").length`, abierta = `document.querySelector("[data-act=verSiempre]").getAttribute("aria-expanded")`;
  assert.equal(await c.ev(abierta), "true");
  assert.equal(await c.ev(botones), 1);
  await c.clic("[data-act=verSiempre]");
  await c.hasta(`${botones} === 0`, "que se oculten los botones");
  assert.equal(await c.ev(abierta), "false");
  await c.ve(/Lo de siempre/);
  await entra(c, "Inicio con lo de siempre cerrado");
  await c.s("Page.reload");
  await esperar(300);
  await c.hasta("window.__miguitaLista === true", "que la app vuelva a arrancar");
  await c.ve(/Lo de siempre/);
  assert.equal(await c.ev(botones), 0, "sigue cerrada después de recargar");
  await c.clic("[data-act=verSiempre]");
  await c.hasta(`${botones} === 1`, "que vuelvan los botones");
  assert.equal(await c.ev(abierta), "true");
  await c.clic("[data-act=repetir][data-v='0']");
  await esperaAviso(c, /Anotado: Café \$2\.500/);
  await numeroEs(c, "$15.000");
  await c.cerrar();
});

for (const [ancho, letra] of [[320, "grande"], [360, "enorme"], [320, "enorme"], [320, ""], [375, ""]])
  paso(`«Gastaste este mes» con un total largo no se sale: ${ancho} de ancho, letra ${letra || "normal"}`, async () => {
    const c = await celu({ ancho, alto: 700, letra });
    await c.empezar();
    for (const [gasto, total] of [["café 2500", "$2.500"], ["súper 85000", "$87.500"], ["alquiler 1250000", "$1.337.500"], ["auto 9000000", "$10.337.500"]]) {
      await c.anotar(gasto);
      await numeroEs(c, total);
      await entra(c, "Inicio con " + total);
      // Con lugar, el pan sigue de 100 (no se achica porque sí).
      if (!letra && (ancho === 375 || total === "$2.500")) assert.equal(Math.round(await c.ev(`document.querySelector(".tecard.hr>svg.lf").getBoundingClientRect().width`)), 100, "el pan con " + total);
    }
    await c.cerrar();
  });

paso("grupos: «Ya le pagué» baja lo que te queda, y se puede apagar en el grupo", async () => {
  const hoy = new Date().toISOString().slice(0, 10);
  const grupo = { id: "gplata", nombre: "Asado", moneda: "ARS", ts: 1, miembros: [{ id: "a", nombre: "Juana", ts: 1 }, { id: "b", nombre: "Pedro", ts: 1 }],
    gastos: [{ id: "x", t: "Carne", m: 40000, p: "a", a: ["a", "b"], sp: "eq", w: {}, f: hoy, ts: 2, x: false, por: "a" }], pagos: [] };
  const c = await celu({ ancho: 320, alto: 640 });
  await c.empezar();
  await cargarPlata(c, 100000);
  await c.ir("#g=" + encodeURIComponent(await codificar(grupo)));
  await c.clic("[data-act=elegirYo][data-v=b]");
  await c.clic("[data-act=listoQuien]");
  await c.ve(/Tenés que pasar/);
  // La carne la pagó Juana: a Pedro todavía no le salió plata.
  await c.ve(/Que este grupo mueva mi plata/);
  await entra(c, "El grupo");
  await c.clic("[data-act=abrirJuntada]");
  await c.ve(/Le pasás a Juana/);
  await c.boton("Ya le pagué");
  await esperaAviso(c, /Juana\. Te queda \$80\.000/);
  await c.clic(".nav [data-v=inicio]");
  await numeroEs(c, "$80.000");
  await c.ve(/Asado: le pasé a Juana/);
  // Se apaga en el grupo: lo del grupo sale de sus movimientos y el número vuelve.
  await c.clic(".nav [data-v=grupos]");
  await c.clic("[data-act=abrirGrupo]");
  await c.clic("[data-act=grupoLoc]");
  await esperaAviso(c, /ya no toca tu plata.*Te queda \$100\.000/);
  await c.clic(".nav [data-v=inicio]");
  await numeroEs(c, "$100.000");
  await c.noVe(/le pasé a Juana/);
  // Y con el grupo apagado, un pago avisa que no cambia nada (antes no decía nada y quedaba la duda).
  await c.clic(".nav [data-v=grupos]");
  await c.clic("[data-act=abrirGrupo]");
  await c.clic("[data-act=grupoLoc]");
  await esperaAviso(c, /mueve tu plata.*Te queda \$80\.000/);
  await c.cerrar();
});

paso("metas: sacar de ahorros que estaban aparte no toca lo que te queda si ya se gastó, y vuelve si no", async () => {
  const c = await celu({ ancho: 320, alto: 640 });
  await c.empezar();
  await cargarPlata(c, 100000);
  await c.clic(".nav [data-v=plan]");
  await c.boton("Metas");
  await c.boton("+ Nueva meta");
  await c.escribir("[data-act=campo][data-k=nombre]", "Viaje");
  await c.escribir("[data-act=campo][data-k=objetivo]", "500000");
  await c.escribir("[data-act=campo][data-k=ahorrado]", "40000");
  await c.clic("[data-act=guardarPlan]");
  await c.clic(".nav [data-v=inicio]");
  await c.ve(/¿Lo que guardaste para tus metas está dentro de tu plata\?/);
  await c.clic("[data-act=ahorroAparte]");
  await numeroEs(c, "$100.000");
  await c.clic(".nav [data-v=plan]");
  await c.boton("Sacar");
  await c.escribir("[data-act=campo][data-k=monto]", "10000");
  await c.ve(/vuelve a lo que te queda/);
  await c.clic("[data-act=formSwitch][data-v=gasto]");
  await c.ve(/Lo que te queda no cambia: esa plata ya estaba separada/);
  await entra(c, "Sacar de una meta");
  await c.clic("[data-act=guardarPlan]");
  await esperaAviso(c, /Sacaste \$10\.000 de Viaje\. Lo que te queda no cambia/);
  await c.boton("Sacar");
  await c.escribir("[data-act=campo][data-k=monto]", "10000");
  await c.clic("[data-act=guardarPlan]");
  await esperaAviso(c, /Sacaste \$10\.000 de Viaje\. Te queda \$110\.000/);
  await c.clic("[data-act=deshacer]");
  await c.clic(".nav [data-v=inicio]");
  await numeroEs(c, "$100.000");
  await c.ve(/De la meta: Viaje/);
  await c.cerrar();
});

paso("ejemplo: lo que se hace con los datos de ejemplo se va con el ejemplo", async () => {
  const c = await celu();
  await c.empezar();
  await cargarPlata(c, 100000);
  await c.clic(".nav [data-v=mas]");
  await c.clic("[data-act=abrir][data-v=privacidad]");
  await c.clic("[data-act=ponerEjemplo]");
  // Se saca de la meta de ejemplo «ya gastada» y se paga la deuda de ejemplo.
  await c.clic(".nav [data-v=plan]");
  await c.boton("Metas");
  await c.boton("Sacar");
  await c.escribir("[data-act=campo][data-k=monto]", "5000");
  await c.clic("[data-act=formSwitch][data-v=gasto]");
  await c.clic("[data-act=guardarPlan]");
  await c.clic("[data-act=planTab][data-v=deudas]");
  await c.clic("[data-act=pagarDeuda]");
  await c.clic("[data-act=guardarPlan]");
  await c.clic(".nav [data-v=inicio]");
  await numeroEs(c, "$100.000");
  await c.ve(/De la meta: Viaje/);
  await c.ve(/Pago: Préstamo/);
  await c.clic("[data-act=quitarEjemplo]");
  await c.ve(/Todavía no anotaste nada/);
  await numeroEs(c, "$100.000");
  assert.equal(await c.ev(`new Promise((ok, mal) => { const r = indexedDB.open("miguita"); r.onerror = mal; r.onsuccess = () => { const q = r.result.transaction("movs").objectStore("movs").getAll(); q.onsuccess = () => ok(q.result.length); q.onerror = mal; }; })`), 0, "no queda ningún movimiento de verdad");
  await c.cerrar();
});


paso("fijos: un cobro confirmado después de cargar la plata suma, y pregunta si ya estaba", async () => {
  const c = await celu();
  await c.empezar();
  await cargarPlata(c, 100000);
  await c.clic(".nav [data-v=plan]");
  await c.boton("Fijos");
  await c.boton("+ Nuevo fijo");
  await c.boton("Un ingreso");
  await c.escribir("[data-act=campo][data-k=nombre]", "Sueldo");
  await c.escribir("[data-act=campo][data-k=monto]", "300000");
  await c.escribir("[data-act=campo][data-k=dia]", "1");
  await c.boton("Que me pregunte");
  await c.clic("[data-act=guardarPlan]");
  await fijosDesdeAntes(c);
  await c.ir();
  await c.ve(/¿Ya cobraste Sueldo/);
  await c.clic("[data-act=confirmarFijo]");
  // Antes quedaba con la fecha vieja y no sumaba. Ahora suma, y como la plata se cargó después del día del cobro, pregunta.
  await numeroEs(c, "$400.000");
  await c.ve(/¿Esta plata ya estaba dentro de los \$100\.000 que me dijiste\?/);
  await c.clic("[data-act=saldoYa]");
  await numeroEs(c, "$100.000");
  await c.ve(/Sueldo/);
  await c.cerrar();
});

paso("borrar todo: también se va la plata cargada", async () => {
  const c = await celu();
  await c.empezar();
  await cargarPlata(c, 100000);
  await c.anotar("nafta 20000");
  await c.clic("[data-act=saldoNo]");
  await numeroEs(c, "$80.000");
  await c.clic(".nav [data-v=mas]");
  await c.clic("[data-act=abrir][data-v=privacidad]");
  await c.clic("[data-act=borrarTodo]");
  await c.clic("[data-act=borrarTodo]");
  await c.clic(".nav [data-v=inicio]");
  await c.ve(/Gastaste este mes/);
  await numeroEs(c, "$0");
  await c.noVe(/Te queda/);
  // Y sigue así al volver a abrir.
  await c.ir();
  await c.ve(/Gastaste este mes/);
  await c.noVe(/Te queda/);
  await c.cerrar();
});

paso("aprender: vale en la hoja de anotar, deshacer lo desaprende y se puede olvidar", async () => {
  const c = await celu();
  await c.empezar();
  // En la hoja, al escribir el detalle se elige sola la categoría.
  await c.clic("[data-act=nuevo], #rapido");
  await c.ev(`(() => { const e = document.querySelector("#rapido"); e.value = ""; e.closest("form").requestSubmit(); })()`);
  await c.escribir("[data-act=detalle]", "nafta");
  await c.hasta(`document.querySelector("[data-act=cat][aria-pressed=true]")?.dataset.v === "auto"`, "que elija Nafta/auto sola");
  await c.clic("[data-act=cerrarHoja]");
  // Algo que no conoce: pregunta, se le enseña, y «Deshacer» deshace también lo aprendido.
  await c.anotar("zapallin 1000");
  await c.ve(/¿En qué categoría va «Zapallin»\?/);
  await c.clic("[data-act=dudaCatSel][data-v=regalos]");
  await esperaAviso(c, /La próxima vez ya lo sé/);
  await c.clic("[data-act=deshacer]");
  await c.anotar("zapallin 2000");
  await c.ve(/¿En qué categoría va «Zapallin»\?/);
  await c.clic("[data-act=dudaCatSel][data-v=regalos]");
  // Ahora sí quedó: en la hoja de anotar también lo sabe.
  await c.ev(`(() => { const e = document.querySelector("#rapido"); e.value = ""; e.closest("form").requestSubmit(); })()`);
  await c.escribir("[data-act=detalle]", "zapallin");
  await c.hasta(`document.querySelector("[data-act=cat][aria-pressed=true]")?.dataset.v === "regalos"`, "que use lo aprendido en la hoja");
  await c.clic("[data-act=cerrarHoja]");
  // Pasar algo de gasto a ingreso también se aprende.
  await c.anotar("juancho 5000");
  await c.clic("[data-act=dudaCatSel][data-v='']");
  await c.clic("[data-act=editar]");
  await c.clic("[data-act=tipo][data-v=ingreso]");
  await c.clic("[data-act=guardar]");
  await c.anotar("juancho 7000");
  await c.ve(/\+\$7\.000/);
  // Y lo que enseñó se puede ver y olvidar.
  await c.clic(".nav [data-v=mas]");
  await c.clic("[data-act=abrir][data-v=personalizacion]");
  await c.clic("[data-act=abrir][data-v=categorias]");
  await c.boton("Lo que me enseñaste");
  await c.ve(/zapallin/);
  await c.ve(/juancho/);
  await entra(c, "Lo que me enseñaste");
  await c.clic("[data-act=olvidar][data-v=zapallin]");
  await c.noVe(/zapallin/);
  await c.clic(".nav [data-v=inicio]");
  await c.anotar("zapallin 3000");
  await c.ve(/¿En qué categoría va «Zapallin»\?/);
  await c.cerrar();
});

paso("para cobrar se puede poner el alias, el CBU o el CVU", async () => {
  const c = await celu({ ancho: 320, alto: 640 });
  await c.empezar();
  await c.clic(".nav [data-v=mas]");
  const poner = async (v) => { await c.ev(`(() => { const e = document.querySelector("[data-act=miAlias]"); e.value = ${j(v)}; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); })()`); await esperar(80); };
  await poner("2850 5909 4009 0418 1352 02");
  await c.ve(/Ese CBU o CVU tiene algún número mal/);
  await entra(c, "Ajustes con el aviso del CBU");
  await poner("2850 5909 4009 0418 1352 01");
  await c.noVe(/algún número mal/);
  // Queda guardado solo con números y llega al grupo que se arma.
  await c.clic(".nav [data-v=grupos]");
  await c.clic("[data-act=nuevoGrupo]");
  assert.equal(await c.ev(`document.querySelector("[data-act=gPersona][data-k=alias]").value`), "2850590940090418135201");
  await entra(c, "Grupo nuevo");
  await c.cerrar();
});

paso("mi plata: con ingresos anotados y sin número cargado, lo primero es anotar lo que entró", async () => {
  const c = await celu();
  await c.empezar();
  await c.anotar("cobré 100000");
  await numeroEs(c, "$100.000");
  await c.boton("Me entró plata");
  const t = await c.texto();
  assert.ok(t.indexOf("¿Te entró plata?") >= 0 && t.indexOf("¿Te entró plata?") < t.indexOf("Tu plata".toUpperCase()), "«¿Te entró plata?» va arriba:\n" + t);
  await c.ve(/Según lo que anotaste, tenés\s+\$100\.000/);
  await c.noVe(/¿Cuánta plata tenés hoy\?/);
  await c.ve(/¿No coincide con lo que tenés\? Corregilo/);
  await c.clic("[data-act=volver]");
  // Con otras platas y sin la plata en pesos cargada, tocar pasa a la siguiente: el texto ya no dice «tocá para ver en qué se fue».
  const d = await celu();
  await d.empezar();
  await d.anotar("nafta 20000");
  await d.ve(/Tocá para ver en qué se fue/);
  await d.clic("[data-act=abrir][data-v=plata]");
  await d.clic("[data-act=abrir][data-v=platas]");
  await d.boton("+ Dólares");
  await d.escribir("[data-act=platCampo][data-k=monto]", "500");
  await d.clic("[data-act=plataEdGuardar]");
  await d.clic(".nav [data-v=inicio]");
  await d.clic("[data-act=plataSig]");
  await d.ve(/En «Ver el detalle» está en qué se fue/);
  await d.noVe(/Tocá para ver en qué se fue/);
  await c.cerrar();
  await d.cerrar();
});

for (const [ancho, alto] of [[320, 640], [360, 740], [375, 812]]) for (const letra of ["", "grande", "enorme"])
  paso(`nada se sale de la pantalla: ${ancho} de ancho, letra ${letra || "normal"}`, async () => {
    const c = await celu({ ancho, alto, letra });
    await c.empezar();
    await c.anotar("alquiler 1250000");
    await c.anotar("cobré 5000000");
    // Lo que alarga la pantalla: «lo de siempre» con un detalle largo, la tarjeta por pagar y sus renglones en Resumen.
    for (let i = 0; i < 5; i++) await c.anotar("cafecito con medialunas de manteca 2500");
    await c.anotar("zapatillas con crédito 80000");
    await c.anotar("pagué la visa 30000");
    await c.ve(/Lo de siempre/);
    await c.ve(/tarjeta por pagar/);
    const mide = async (donde) => {
      const r = await c.ev(`({ inner: innerWidth, sw: document.documentElement.scrollWidth, fuera: [...document.querySelectorAll("#app *")].filter((e) => { if (e.closest("svg") || e.closest(".vh")) return false; const q = e.getBoundingClientRect(); return q.width && q.right > ${ancho} + 1; }).map((e) => String(e.className || e.tagName)).slice(0, 5) })`);
      assert.ok(r.inner <= ancho + 2 && r.sw <= ancho + 2 && !r.fuera.length, donde + ": " + JSON.stringify(r));
    };
    await mide("Inicio");
    await c.clic("[data-act=verSiempre]"); await c.hasta(`!document.querySelector("[data-act=repetir]")`, "que se cierre lo de siempre");
    await mide("Inicio con lo de siempre cerrado");
    await c.clic("[data-act=verSiempre]"); await c.hasta(`!!document.querySelector("[data-act=repetir]")`, "que se abra lo de siempre");
    await c.clic(".tecard"); await mide("Resumen"); await c.clic("[data-act=volver]");
    await c.clic("[data-act=abrir][data-v=plata]"); await mide("Mi plata"); await c.clic("[data-act=volver]");
    await c.ev(`(() => { const e = document.querySelector("#rapido"); e.value = ""; e.closest("form").requestSubmit(); })()`); await esperar(150);
    await c.teclas("1250000"); await mide("Hoja de anotar"); await c.clic("[data-act=cerrarHoja]");
    for (const v of ["plan", "grupos", "mas"]) { await c.clic(`.nav [data-v=${v}]`); await mide(v); }
    await c.clic("[data-act=abrir][data-v=personalizacion]"); await mide("Personalización");
    await c.clic("[data-act=abrir][data-v=categorias]"); await mide("Categorías");
    await c.clic("[data-act=agregarCat]"); await mide("Categoría nueva");
    await c.clic("[data-act=abrir][data-v=elegirIconoCat]"); await mide("Elegir el ícono");
    await c.clic("[data-act=dibujarCat]"); await mide("Dibujar el ícono");
    await c.clic(".nav [data-v=inicio]"); await c.clic("[data-act=abrir][data-v=platas]"); await mide("Mis platas vacía");
    for (const t of ["+ Dólares", "+ USDT", "+ Inversiones"]) {
      await c.boton(t); await mide("Sumar " + t); await c.escribir("[data-act=platCampo][data-k=monto]", "12500000"); await c.clic("[data-act=plataEdGuardar]");
      await c.clic(".nav [data-v=inicio]"); await mide("Inicio con " + t); await c.clic("[data-act=abrir][data-v=platas]"); await mide("Mis platas con " + t);
    }
    await c.clic(".nav [data-v=inicio]");
    for (let i = 0; i < 5; i++) { await c.clic("[data-act=plataSig]"); await mide("Inicio, plata " + i); }
    await c.clic("[data-act=abrir][data-v=plata]"); await mide("Mi plata con todo"); await c.clic("[data-act=volver]");
    await c.boton("Ver tutorial");
    for (let i = 0; i < 6; i++) { await mide("Tutorial " + i); if (i < 5) await c.boton("Siguiente"); }
    await c.boton("¡Empezar!");
    await c.cerrar();
  });
