// Servidor de los grupos de MiGuita (Cloudflare Workers + Durable Objects).
// Guarda cada grupo como una caja cifrada que solo se abre con el código del grupo: acá no se puede leer nada.
// Rutas:
//   GET  /g/<id>      → { v, datos }  (404 si no existe)        pide "Authorization: Bearer <token>"
//   PUT  /g/<id>      ← { v, datos }  v = versión que tenía quien manda; si no coincide → 409 con lo actual
//   GET  /g/<id>/ws   WebSocket: avisa { v } cada vez que alguien guarda (no manda datos)
// Buzón de comentarios de la prueba: POST /buzon ← { tipo, texto, nombre, version, aparato } · GET /buzon con la clave del dueño.
// Audio a texto: POST /voz ← el audio tal cual → { texto }. Se pasa a texto en el momento y no se guarda en ningún lado.
// Y los avisos con la app cerrada (la clave privada es un secreto de Cloudflare, nunca está en el repositorio):
//   PUT    /a/<id>         ← { sub, zona, plan, anoto, silencio }  activa o pone al día los avisos de un dispositivo (ver avisos.js)
//   POST   /a/<id>/probar  manda un aviso de prueba
//   DELETE /a/<id>         apaga los avisos y borra todo lo de ese dispositivo
// El token sale del código del grupo; acá se guarda solo su huella (SHA-256), nunca el token ni el código.
import { DurableObject } from "cloudflare:workers";
import { validar, proximoAviso, queAvisar, mandar, DESCANSO } from "./avisos.js";

const ORIGENES = ["https://valentinoklement.github.io", "http://localhost:8123", "http://127.0.0.1:8123"];
const MAX_DATOS = 1_500_000; // ~1,5 MB por grupo
const VENCE = 400 * 864e5;   // un grupo sin uso por más de ~13 meses se borra solo
const MAX_AUDIO = 3_000_000; // ~3 MB: sobra para el minuto y medio que deja grabar la app
// Le da pistas de cómo hablamos, para que escriba "lucas" y no otra cosa. No se manda a la persona ni se guarda.
const PISTA = "Gasté 15 mil de nafta, 10 lucas de birra, un palo de alquiler, 8 mil en el súper y 20 dólares en Netflix. Me pasaron 20 lucas, cobré el sueldo y le transferí 5 mil a mi hermana.";

function aBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const cors = (origen) => ({
  "Access-Control-Allow-Origin": ORIGENES.includes(origen) ? origen : ORIGENES[0],
  "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
});
const json = (cuerpo, estado, origen) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(origen) } });

async function huella(texto) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Compara sin dar pistas por el tiempo que tarda.
function iguales(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export default {
  async fetch(pedido, env) {
    const origen = pedido.headers.get("Origin") || "";
    if (pedido.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origen) });
    const ruta = new URL(pedido.url).pathname;
    // Tope por conexión: frena a quien quiera agotar el servidor. Es holgado para el uso normal.
    const ip = pedido.headers.get("CF-Connecting-IP") || "";
    if (env.LIMITE && !(await env.LIMITE.limit({ key: ip })).success) return json({ error: "demasiados pedidos" }, 429, origen);
    if (ruta === "/buzon") {
      const buzon = env.BUZON.get(env.BUZON.idFromName("principal"));
      if (pedido.method === "GET") {
        const t = /^Bearer (.+)$/.exec(pedido.headers.get("Authorization") || "")?.[1];
        if (!env.BUZON_CLAVE || !iguales(t || "", env.BUZON_CLAVE)) return json({ error: "falta el permiso" }, 401, origen);
        return json({ comentarios: await buzon.todos() }, 200, origen);
      }
      if (pedido.method !== "POST") return json({ error: "método" }, 405, origen);
      if (env.LIMITE_BUZON && !(await env.LIMITE_BUZON.limit({ key: ip })).success) return json({ error: "demasiados" }, 429, origen);
      const texto = await pedido.text();
      if (texto.length > 4000) return json({ error: "demasiado grande" }, 413, origen);
      let c = null; try { c = JSON.parse(texto); } catch { /* queda null */ }
      const t = String(c?.texto ?? "").trim();
      if (t.length < 3) return json({ error: "mal formado" }, 400, origen);
      const ok = await buzon.guardar({ tipo: ["idea", "error", "otro"].includes(c.tipo) ? c.tipo : "otro", texto: t.slice(0, 1500), nombre: String(c.nombre ?? "").trim().slice(0, 40), version: String(c.version ?? "").slice(0, 30), aparato: String(c.aparato ?? "").slice(0, 120) });
      return json(ok ? {} : { error: "lleno" }, ok ? 200 : 507, origen);
    }
    if (ruta === "/voz") {
      if (pedido.method !== "POST") return json({ error: "método" }, 405, origen);
      if (!ORIGENES.includes(origen)) return json({ error: "origen" }, 403, origen);
      if (env.LIMITE_VOZ && !(await env.LIMITE_VOZ.limit({ key: ip })).success) return json({ error: "demasiados" }, 429, origen);
      if (Number(pedido.headers.get("Content-Length") || 0) > MAX_AUDIO) return json({ error: "demasiado grande" }, 413, origen);
      const bytes = new Uint8Array(await pedido.arrayBuffer());
      if (bytes.length > MAX_AUDIO) return json({ error: "demasiado grande" }, 413, origen);
      if (bytes.length < 200) return json({ error: "mal formado" }, 400, origen);
      try {
        const r = await env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio: aBase64(bytes), language: "es", task: "transcribe", initial_prompt: PISTA });
        return json({ texto: String(r?.text ?? "").trim().slice(0, 2000) }, 200, origen);
      } catch { return json({ error: "no se pudo" }, 503, origen); }
    }
    const a = /^\/a\/([0-9a-f]{32})(\/probar)?$/.exec(ruta);
    if (a) {
      const metodo = a[2] ? "POST" : pedido.method;
      if (pedido.method !== metodo || !["PUT", "POST", "DELETE"].includes(metodo)) return json({ error: "método" }, 405, origen);
      const token = /^Bearer ([0-9a-f]{32})$/.exec(pedido.headers.get("Authorization") || "")?.[1];
      if (!token) return json({ error: "falta el permiso" }, 401, origen);
      let cuerpo = null;
      if (metodo === "PUT") {
        const texto = await pedido.text();
        if (texto.length > 4000) return json({ error: "demasiado grande" }, 413, origen);
        try { cuerpo = validar(JSON.parse(texto)); } catch { /* queda null */ }
        if (!cuerpo) return json({ error: "mal formado" }, 400, origen);
      }
      const r = await env.AVISOS.get(env.AVISOS.idFromName(a[1])).atender(metodo, await huella(token), cuerpo);
      return json(r.cuerpo, r.estado, origen);
    }
    const m = /^\/g\/([0-9a-f]{32})(\/ws)?$/.exec(ruta);
    if (!m) return json({ error: "no existe" }, 404, origen);
    const grupo = env.GRUPOS.get(env.GRUPOS.idFromName(m[1]));
    if (m[2]) {
      if (pedido.headers.get("Upgrade") !== "websocket") return json({ error: "solo websocket" }, 426, origen);
      if (origen && !ORIGENES.includes(origen)) return json({ error: "origen" }, 403, origen);
      return grupo.fetch(pedido);
    }
    if (!["GET", "PUT"].includes(pedido.method)) return json({ error: "método" }, 405, origen);
    const token = /^Bearer ([0-9a-f]{32})$/.exec(pedido.headers.get("Authorization") || "")?.[1];
    if (!token) return json({ error: "falta el permiso" }, 401, origen);
    let cuerpo = null;
    if (pedido.method === "PUT") {
      const texto = await pedido.text();
      if (texto.length > MAX_DATOS + 200) return json({ error: "demasiado grande" }, 413, origen);
      try { cuerpo = JSON.parse(texto); } catch { return json({ error: "mal formado" }, 400, origen); }
      if (!Number.isInteger(cuerpo?.v) || cuerpo.v < 0 || typeof cuerpo.datos !== "string" || !/^[A-Za-z0-9_-]+$/.test(cuerpo.datos))
        return json({ error: "mal formado" }, 400, origen);
    }
    const r = await grupo.atender(pedido.method, await huella(token), cuerpo);
    return json(r.cuerpo, r.estado, origen);
  },
};

export class Grupo extends DurableObject {
  async atender(metodo, llave, cuerpo) {
    const s = this.ctx.storage;
    const [guardada, v, datos] = await Promise.all([s.get("llave"), s.get("v"), s.get("datos")]);
    if (guardada && !iguales(guardada, llave)) return { estado: 403, cuerpo: { error: "código incorrecto" } };
    if (metodo === "GET") {
      if (!guardada) return { estado: 404, cuerpo: { error: "no existe" } };
      return { estado: 200, cuerpo: { v, datos } };
    }
    const actual = guardada ? v : 0;
    if (cuerpo.v !== actual) return { estado: 409, cuerpo: { v: actual, datos: datos ?? null } };
    const nueva = actual + 1;
    await s.put({ llave, v: nueva, datos: cuerpo.datos });
    await s.setAlarm(Date.now() + VENCE);
    for (const ws of this.ctx.getWebSockets()) { try { ws.send(JSON.stringify({ v: nueva })); } catch { /* ya cerrado */ } }
    return { estado: 200, cuerpo: { v: nueva } };
  }

  async fetch() {
    const [cliente, servidor] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(servidor);
    const v = (await this.ctx.storage.get("v")) || 0;
    servidor.send(JSON.stringify({ v }));
    return new Response(null, { status: 101, webSocket: cliente });
  }

  webSocketMessage(ws, msg) { if (msg === "ping") ws.send("pong"); }
  webSocketClose(ws, codigo) { try { ws.close(codigo, "chau"); } catch { /* ya cerrado */ } }

  async alarm() { await this.ctx.storage.deleteAll(); }
}

// Un dispositivo con avisos activados. Se despierta solo a la hora de cada aviso.
export class Aviso extends DurableObject {
  async atender(metodo, llave, cuerpo) {
    const s = this.ctx.storage, guardada = await s.get("llave");
    if (guardada && !iguales(guardada, llave)) return { estado: 403, cuerpo: { error: "código incorrecto" } };
    if (metodo === "DELETE") { await s.deleteAlarm(); await s.deleteAll(); return { estado: 200, cuerpo: {} }; }
    if (metodo === "POST") {
      const e = await s.get("e");
      if (!e) return { estado: 404, cuerpo: { error: "no existe" } };
      return { estado: 200, cuerpo: { estado: await this.enviar(e, "Así te van a llegar los avisos de MiGuita.") } };
    }
    const e = { ...cuerpo, visto: Date.now() };
    await s.put({ llave, e });
    await this.programar(e);
    return { estado: 200, cuerpo: {} };
  }

  async programar(e) {
    const ahora = Date.now(), quieto = ahora - e.visto > DESCANSO;
    await this.ctx.storage.setAlarm((!quieto && proximoAviso(e.plan, e.zona, ahora)) || ahora + DESCANSO);
  }

  // Si el celu ya no existe (desinstaló la app, por ejemplo), se borra todo.
  async enviar(e, texto) {
    const estado = await mandar(e, texto, JSON.parse(this.env.VAPID_PRIVADA), this.env.VAPID_PUBLICA);
    if (estado === 404 || estado === 410) { await this.ctx.storage.deleteAlarm(); await this.ctx.storage.deleteAll(); }
    return estado;
  }

  async alarm() {
    const e = await this.ctx.storage.get("e");
    if (!e) return;
    if (Date.now() - e.visto > VENCE) { await this.ctx.storage.deleteAll(); return; }
    const texto = queAvisar(e, Date.now());
    try { if (texto && await this.enviar(e, texto) === 410) return; } catch { /* sigue: ya llegará el próximo */ }
    if (await this.ctx.storage.get("e")) await this.programar(e);
  }
}

// Los comentarios de la prueba. Sin direcciones de internet ni datos de la cuenta: solo lo que la persona mandó.
export class Buzon extends DurableObject {
  async guardar(c) {
    const s = this.ctx.storage, n = (await s.get("n")) || 0;
    if (n >= 5000) return false;
    await s.put({ n: n + 1, ["c" + String(n).padStart(6, "0")]: { ...c, ts: Date.now() } });
    return true;
  }
  async todos() { return [...(await this.ctx.storage.list({ prefix: "c" })).values()]; }
}
