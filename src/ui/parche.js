// Actualiza la pantalla cambiando solo lo que cambió. Así no se pierde lo que se está escribiendo, ni el foco, ni el lugar donde estabas.
// Lo que sigue igual se deja como está; lo que cambia se ajusta y lo que aparece o desaparece se agrega o se saca alrededor de lo demás.

const firma = (n) => n.nodeType !== 1 ? "#" + n.nodeType :
  n.nodeName + "|" + (n.id || n.getAttribute("data-form") || n.getAttribute("data-guia") || "") + "|" + (n.classList[0] || "") + "|" + (esCampo(n) ? datosDeCampo(n) : "");
const esCampo = (n) => n.nodeName === "INPUT" || n.nodeName === "TEXTAREA" || n.nodeName === "SELECT";
// Dos campos son el mismo solo si son para lo mismo: nunca se reutiliza uno con lo que se escribió en otro.
const datosDeCampo = (n) => ["data-act", "data-k", "data-i", "type", "aria-label"].map((k) => n.getAttribute(k) || "").join("|");

function atributos(a, b) {
  for (const { name, value } of b.attributes) if (a.getAttribute(name) !== value) a.setAttribute(name, value);
  for (const { name } of [...a.attributes]) if (!b.hasAttribute(name) && !(name === "style" && a.classList.contains("pp"))) a.removeAttribute(name);
}

function nodo(a, b) {
  if (a.nodeType !== 1) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
  if (a.nodeName === "VIDEO") return; // la cámara sigue andando
  const enFoco = a === document.activeElement;
  atributos(a, b);
  if (a.nodeName === "INPUT") {
    if (!enFoco && a.type !== "file" && b.hasAttribute("value") && a.value !== b.getAttribute("value")) a.value = b.getAttribute("value");
    return;
  }
  if (a.nodeName === "TEXTAREA") {
    if (a.defaultValue !== b.defaultValue) a.defaultValue = b.defaultValue;
    if (!enFoco && a.value !== b.defaultValue) a.value = b.defaultValue;
    return;
  }
  hijos(a, b);
  if (a.nodeName === "SELECT" && !enFoco) {
    const elegida = [...b.options].findIndex((o) => o.hasAttribute("selected"));
    a.selectedIndex = Math.max(0, elegida);
  }
}

// Cuáles de lo viejo siguen estando en lo nuevo, sin cambiar el orden (la subsecuencia común más larga).
function emparejar(viejos, nuevos, pares) {
  const fv = viejos.map(firma), fn = nuevos.map(firma), n = fv.length, m = fn.length;
  const tabla = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    tabla[i][j] = fv[i] === fn[j] ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (fv[i] === fn[j]) { pares.set(nuevos[j], viejos[i]); i++; j++; }
    else if (tabla[i + 1][j] >= tabla[i][j + 1]) i++;
    else j++;
  }
}

function hijos(a, b) {
  const viejos = [...a.childNodes], nuevos = [...b.childNodes], pares = new Map();
  let ini = 0, fv = viejos.length, fn = nuevos.length;
  while (ini < fv && ini < fn && firma(viejos[ini]) === firma(nuevos[ini])) { pares.set(nuevos[ini], viejos[ini]); ini++; }
  while (fv > ini && fn > ini && firma(viejos[fv - 1]) === firma(nuevos[fn - 1])) { fv--; fn--; pares.set(nuevos[fn], viejos[fv]); }
  // Listas larguísimas que cambiaron enteras: se reemplazan, para no trabar el celu buscando parecidos.
  if (fv > ini && fn > ini && (fv - ini) * (fn - ini) <= 250000) emparejar(viejos.slice(ini, fv), nuevos.slice(ini, fn), pares);
  const siguen = new Set(pares.values());
  for (const v of viejos) if (!siguen.has(v)) v.remove();
  let cursor = a.firstChild;
  for (const n of nuevos) {
    const v = pares.get(n);
    if (v) { nodo(v, n); cursor = v.nextSibling; }
    else a.insertBefore(n, cursor);
  }
}

// Para las pruebas: que lo que quedó en pantalla sea exactamente lo que se quería dibujar.
function verificar(raiz, html) {
  const quedo = raiz.cloneNode(true), esperado = raiz.cloneNode(false);
  esperado.innerHTML = html;
  quedo.querySelectorAll(".pp[style]").forEach((e) => { if (e.getAttribute("style").startsWith("--dl:")) e.removeAttribute("style"); });
  if (quedo.isEqualNode(esperado)) return;
  // Se anota el primer lugar donde difieren, para poder encontrarlo.
  let a = quedo, b = esperado;
  for (;;) {
    const i = [...a.childNodes].findIndex((n, k) => !b.childNodes[k] || !n.isEqualNode(b.childNodes[k]));
    if (i < 0 || !a.childNodes[i].childNodes.length || !b.childNodes[i]?.childNodes.length) { (globalThis.__miguitaDiferencias ||= []).push((a.childNodes[i]?.outerHTML || a.outerHTML).slice(0, 300) + " ≠ " + (b.childNodes[i]?.outerHTML || b.outerHTML).slice(0, 300)); return; }
    [a, b] = [a.childNodes[i], b.childNodes[i]];
  }
}

export function parchar(raiz, html) {
  try {
    const t = document.createElement("template");
    t.innerHTML = html;
    hijos(raiz, t.content);
    if (globalThis.__miguitaVerificar) verificar(raiz, html);
  } catch (e) {
    // Si algo sale mal, se dibuja de cero: nunca una pantalla a medias.
    raiz.innerHTML = html;
    if (globalThis.__miguitaVerificar) (globalThis.__miguitaDiferencias ||= []).push("error: " + e.message);
  }
}
