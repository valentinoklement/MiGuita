// Genera los PNG del ícono a partir de icons/icono.svg con Chrome sin ventana.
// Uso: node tools/generar-iconos.cjs   (necesita Google Chrome instalado)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const raiz = path.join(__dirname, "..");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const svg = fs.readFileSync(path.join(raiz, "icons", "icono.svg"), "utf8");

// Página de un solo uso: el SVG en línea para que el "$" use la tipografía de la app.
const pagina = path.join(raiz, "tools", "icono.html");
fs.writeFileSync(pagina, `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:"Bricolage Grotesque";src:url(../fonts/bricolage.woff2) format("woff2");font-weight:200 800}
html,body{margin:0;overflow:hidden;background:#F4AE3D}svg{display:block;width:100vw;height:100vh}</style>${svg}`);

const TAMANOS = { "icono-512.png": 512, "icono-192.png": 192, "apple-touch-icon.png": 180, "favicon-32.png": 32 };
for (const [nombre, lado] of Object.entries(TAMANOS)) {
  const salida = path.join(raiz, "icons", nombre);
  // Chrome no achica la ventana por debajo de cierto tamaño: se dibuja a 512 y se escala la captura.
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--virtual-time-budget=2000", "--window-size=512,512", `--force-device-scale-factor=${lado / 512}`, `--screenshot=${salida}`, "file:///" + pagina.replace(/\\/g, "/")], { stdio: "ignore" });
  console.log(nombre, fs.statSync(salida).size, "bytes");
}
fs.unlinkSync(pagina);
