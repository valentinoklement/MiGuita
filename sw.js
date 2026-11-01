// Guarda la app para que funcione sin internet. Subir VERSION cada vez que cambia un archivo.
const VERSION = "miguita-e6-5";
const ARCHIVOS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./src/ui/styles.css", "./src/ui/app.js", "./src/ui/pantallas.js", "./src/ui/plan.js", "./src/ui/grupos.js", "./src/ui/qr.js", "./src/ui/ajustes.js", "./src/ui/bloqueo.js", "./src/ui/huella.js", "./src/ui/primera.js", "./src/vendor/qrcode.js", "./src/vendor/jsQR.js", "./src/ui/ejemplo.js", "./src/art/art.js", "./src/data/db.js",
  "./src/logic/dinero.js", "./src/logic/anotar.js", "./src/logic/categorias.js", "./src/logic/mes.js", "./src/logic/racha.js", "./src/logic/migraciones.js", "./src/logic/plan.js", "./src/logic/grupos.js", "./src/logic/cifrado.js", "./src/logic/dolar.js", "./src/logic/avisos.js",
  "./icons/icono.svg", "./icons/icono-192.png", "./icons/icono-512.png", "./icons/apple-touch-icon.png", "./icons/favicon-32.png",
  "./fonts/bricolage.woff2", "./fonts/manrope.woff2", "./fonts/caveat-brush.woff2",
];

self.addEventListener("install", (e) => {
  // cache: "reload" para no guardar copias viejas que el navegador tenga en su memoria.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // dólar y copias van directo a internet
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});

// Avisos: el servicio de avisos (se conecta al publicar) manda { titulo, texto, silencioso }.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { /* aviso sin datos */ }
  e.waitUntil(self.registration.showNotification(String(d.titulo || "MiGuita").slice(0, 60), {
    body: String(d.texto || "¿Anotaste tus gastos de hoy?").slice(0, 200), tag: "aviso", silent: !!d.silencioso, data: { url: "./#anotar" },
    actions: [{ action: "anotar", title: "Anotar" }, { action: "luego", title: "Más tarde" }],
  }));
});

// Tocar el aviso (o "Anotar") abre la app en la hoja de anotar. "Más tarde" solo lo cierra.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "luego") return;
  const url = new URL("./#anotar", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    const c = cs.find((x) => x.url.startsWith(self.registration.scope));
    return c ? c.navigate(url).then((v) => (v || c).focus()) : self.clients.openWindow(url);
  }));
});
