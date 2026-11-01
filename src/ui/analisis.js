// La pestaña Análisis de Mis cuentas: qué patrones tenés y qué podés hacer con eso.
// Cada parte aparece recién cuando hay datos suficientes. Lo que falta se muestra abajo, con cuánto le queda.
import { Art } from "../art/art.js";
import { valorPara } from "../logic/dolar.js";
import { mesAMes, loQueCambio, gastosHormiga, categoriasFuertes, serieCategoria, comprometido, loQueViene, llegadaMeta, enDolares, progreso, hayMesAMes } from "../logic/analisis.js";
import { esc } from "./pantallas.js";

export function crearVistasAnalisis(st, hoy, V) {
  const { lbl, crd } = V.ayudas;
  const { plata, nombreCat, mesTexto } = V;
  const corto = (mes) => mesTexto(mes).slice(0, 3);
  const pct = (p) => Math.round(Math.abs(p) * 100) + "%";
  const dolarHoy = () => valorPara(hoy, st.cfg.dolar.tipo, st.cotizaciones, st.cfg.dolar.manual)?.valor || 0;
  const usd = (c) => "US$ " + Math.round(c / 100).toLocaleString("es-AR");
  const leyenda = (pares) => `<div class="leyenda">${pares.map(([clase, t]) => `<span><i class="${clase}"></i>${t}</span>`).join("")}</div>`;

  // Las barras se pueden tocar: abajo aparece el monto exacto de ese mes.
  function detalle(grafico, filas) {
    const v = st.anVer?.g === grafico ? filas[st.anVer.i] : null;
    return v ? `<div class="sub an-detalle" role="status">${v}</div>` : `<div class="sub an-detalle tenue">Tocá una barra para ver el número.</div>`;
  }
  const tocar = (grafico, i, cuerpo, etiqueta, arriba = "") =>
    `<button class="col${st.anVer?.g === grafico && st.anVer.i === i ? " on" : ""}" data-act="anVer" data-v="${grafico}|${i}" aria-label="${esc(etiqueta)}"><em>${arriba}</em>${cuerpo}<small>${etiqueta.split(":")[0].slice(0, 3)}</small></button>`;
  const alto = (v, tope, h) => (tope ? Math.max(v ? 2 : 0, Math.round((v / tope) * h)) : 0);

  function bloqueCambio() {
    const c = loQueCambio(st.movs, hoy);
    if (!c) return "";
    const frase = (d, titulo, sub) => `<div class="frase">${Art.catIcon(d.categoria)}<span><b>${titulo}</b><small>${sub}</small></span></div>`;
    let h = `<div class="gcab-a">${Art.miguita("ok").replace("<svg", '<svg style="width:66px;flex:none"')}<b>Lo que cambió en ${mesTexto(c.mes).toLowerCase()}</b></div>`;
    if (c.subio) h += frase(c.subio, `${esc(nombreCat(c.subio.categoria))}: ${pct(c.subio.parte)} más que tu promedio`, `Gastaste ${plata(c.subio.monto)}. Lo normal son ${plata(c.subio.promedio)}.`);
    if (c.bajo) h += frase(c.bajo, `${esc(nombreCat(c.bajo.categoria))}: ${pct(c.bajo.parte)} menos. ¡Bien ahí!`, `Te ahorraste unos ${plata(c.bajo.promedio - c.bajo.monto)}.`);
    if (!c.subio && !c.bajo) h += `<div class="frase solo"><span><b>Un mes parejo</b><small>Tus categorías anduvieron como siempre.</small></span></div>`;
    if (c.guardo !== null && c.guardo >= 0) h += `<div class="frase solo"><span><b>Guardaste el ${pct(c.guardo)} de lo que cobraste</b>${c.promedioGuardo !== null ? `<small>Tu promedio es ${pct(c.promedioGuardo)}.</small>` : ""}</span></div>`;
    else if (c.guardo !== null) h += `<div class="frase solo"><span><b>Gastaste más de lo que cobraste</b><small>Te pasaste por ${pct(c.guardo)} de lo que entró.</small></span></div>`;
    return crd(h);
  }

  function bloqueHormiga() {
    const g = gastosHormiga(st.movs, hoy);
    if (!g) return "";
    const n = g.items.length;
    return crd(lbl("Tus gastos hormiga") + `<div class="sub">Chicos, pero se repiten. ${n === 1 ? "Este suma" : `Estos ${n === 2 ? "dos" : "tres"} suman`} <b>${plata(g.total)} por mes</b>.</div>` +
      g.items.map((x, i) => `<div class="row${i ? "" : " f"}"><span>${esc(x.detalle || nombreCat(x.categoria))}<small>${x.veces} veces en 30 días · ${plata(x.monto)}</small></span><span class="der">${plata(x.anual)}<small>por año</small></span></div>`).join(""));
  }

  function bloqueMeses() {
    if (!hayMesAMes(st.movs, hoy)) return "";
    const m = mesAMes(st.movs, hoy), tope = Math.max(...m.flatMap((x) => [x.ingresos, x.gastos]), 1);
    const textos = m.map((x) => `${mesTexto(x.mes)}${x.parcial ? " (va hasta hoy)" : ""}: entró ${plata(x.ingresos)} y salió ${plata(x.gastos)}.`);
    const barras = `<div class="barras">${m.map((x, i) => tocar("meses", i, `<span class="par"><i class="c-ing" style="height:${alto(x.ingresos, tope, 110)}px"></i><i class="c-gas" style="height:${alto(x.gastos, tope, 110)}px"></i></span>`, textos[i])).join("")}</div>`;
    const c = loQueCambio(st.movs, hoy);
    const stats = c && c.guardo !== null && c.promedioGuardo !== null ? `<div class="stats"><div><div class="sub">Guardaste en ${mesTexto(c.mes).toLowerCase()}</div><b>${c.guardo < 0 ? "0%" : pct(c.guardo)}</b></div><div><div class="sub">Tu promedio</div><b>${c.promedioGuardo < 0 ? "0%" : pct(c.promedioGuardo)}</b></div></div>` : "";
    return crd(lbl("Mes a mes") + leyenda([["c-ing", "Entró"], ["c-gas", "Salió"]]) + barras + detalle("meses", textos) + stats);
  }

  function bloqueCategoria() {
    if (!hayMesAMes(st.movs, hoy)) return "";
    const cats = categoriasFuertes(st.movs, hoy);
    if (!cats.length) return "";
    const id = cats.includes(st.anCat) ? st.anCat : cats[0];
    const s = serieCategoria(st.movs, hoy, id), tope = Math.max(...s.map((x) => x.monto), 1);
    const textos = s.map((x) => `${mesTexto(x.mes)}${x.parcial ? " (va hasta hoy)" : ""}: ${plata(x.monto)}.`);
    const conAlgo = s.filter((x) => !x.parcial && x.monto);
    const max = conAlgo.length > 1 && new Set(conAlgo.map((x) => x.monto)).size > 1 ? conAlgo.reduce((a, x) => (x.monto > a.monto ? x : a)) : null;
    return crd(lbl("Ver una categoría") + `<div class="chips apretadas">${cats.map((c) => `<button class="pp" data-act="anCat" data-v="${esc(c)}" aria-pressed="${c === id}">${esc(nombreCat(c))}</button>`).join("")}</div>` +
      `<div class="barras">${s.map((x, i) => tocar("cat", i, `<span class="par"><i class="c-gas ancha" style="height:${alto(x.monto, tope, 70)}px"></i></span>`, textos[i])).join("")}</div>` + detalle("cat", textos) +
      (max ? `<div class="sub">Tu mes más alto fue ${mesTexto(max.mes).toLowerCase()}.</div>` : ""));
  }

  function bloqueSueldo() {
    const c = comprometido(st.movs, st.fijos, st.compras, hoy, dolarHoy());
    if (!c) return "";
    const pos = (x) => Math.min(100, x);
    if (!c.ingreso) return crd(lbl("Tu sueldo ya tiene dueño") + `<div class="row f"><span><i class="pt c-fij"></i>Fijos</span><span>${plata(c.fijos)}</span></div><div class="row"><span><i class="pt c-cuo"></i>Cuotas</span><span>${plata(c.cuotas)}</span></div>` +
      `<div class="sub">Cargá lo que cobrás y te digo qué parte ya está comprometida.</div><div class="chips"><button class="pp" data-act="abrir" data-v="plata" aria-pressed="true">Cargar lo que cobrás</button></div>`);
    const pf = (c.fijos / c.ingreso) * 100, pc = (c.cuotas / c.ingreso) * 100;
    return crd(lbl("Tu sueldo ya tiene dueño") + `<div class="grande-t">El ${pct(c.parte)} ya está comprometido</div>` +
      `<div class="tira" role="img" aria-label="Fijos ${Math.round(pf)}%, cuotas ${Math.round(pc)}%">${c.fijos ? `<i class="c-fij" style="width:${pos(pf)}%"></i>` : ""}${c.cuotas ? `<i class="c-cuo" style="width:${pos(pc)}%"></i>` : ""}${c.queda > 0 ? `<i class="libre" style="flex:1"></i>` : ""}</div>` +
      `<div class="row f"><span><i class="pt c-fij"></i>Fijos</span><span>${plata(c.fijos)}</span></div><div class="row"><span><i class="pt c-cuo"></i>Cuotas</span><span>${plata(c.cuotas)}</span></div>` +
      (c.queda > 0 ? `<div class="row"><span><i class="pt libre"></i>Te queda para el resto</span><span>${plata(c.queda)}</span></div>` : `<div class="sub"><b>Tus fijos y cuotas ya superan lo que cobrás.</b></div>`));
  }

  function bloqueViene() {
    const v = loQueViene(st.fijos, st.compras, hoy, dolarHoy());
    if (!v) return "";
    const tope = Math.max(...v.map((x) => x.total), 1), max = Math.max(...v.map((x) => x.total));
    const textos = v.map((x) => `${mesTexto(x.mes)}: ${plata(x.total)} (fijos ${plata(x.fijos)}, cuotas ${plata(x.cuotas)}).`);
    const barras = `<div class="barras">${v.map((x, i) => tocar("viene", i, `<span class="pila"><i class="c-cuo" style="height:${alto(x.cuotas, tope, 100)}px"></i><i class="c-fij" style="height:${alto(x.fijos, tope, 100)}px"></i></span>`, textos[i])).join("")}</div>`;
    const pesados = v.filter((x) => x.total === max), baja = v.find((x, i) => i >= pesados.length && x.total < max);
    const nombres = pesados.slice(0, 2).map((x) => mesTexto(x.mes)).join(" y ");
    let texto = "";
    if (pesados.length < v.length) texto = `${pesados.length > 2 ? "Los próximos meses vienen" : nombres + (pesados.length > 1 ? " son los más pesados" : " es el más pesado")}${pesados.length > 2 ? " pesados" : ""}.${baja ? ` Desde ${mesTexto(baja.mes).toLowerCase()} se empieza a aflojar.` : ""}`;
    else texto = "Por ahora, todos los meses te piden lo mismo.";
    const meta = llegadaMeta(st.metas, st.movs, hoy);
    const fecha = meta && mesTexto(meta.mes).toLowerCase() + " de " + meta.mes.slice(0, 4);
    return crd(lbl("Lo que se viene") + leyenda([["c-fij", "Fijos"], ["c-cuo", "Cuotas"]]) + barras + detalle("viene", textos) + `<div class="sub">${texto}</div>` +
      (meta ? `<div class="sub"><b>Tu meta «${esc(meta.nombre)}»:</b> guardando como venís, llegás en ${fecha}.</div>` : ""));
  }

  function bloqueDolares() {
    const d = enDolares(st.movs, st.cotizaciones, st.cfg.dolar.tipo, hoy);
    if (!d) return "";
    const fs = d.filas, tp = Math.max(...fs.map((x) => x.pesos)), tu = Math.max(...fs.map((x) => x.usd));
    const titulo = d.usd >= 0.05 ? "Sí: gastás más, también en dólares." : d.usd <= -0.05 ? "En dólares, gastás menos." : d.pesos >= 0.1 ? "En pesos parece que sí. En dólares, casi lo mismo." : "Casi lo mismo, en pesos y en dólares.";
    const quePaso = (p) => (Math.abs(p) < 0.01 ? "casi nada" : (p > 0 ? "subió " : "bajó ") + pct(p));
    const textos = fs.map((x) => `${mesTexto(x.mes)}: ${plata(x.pesos)}, unos ${usd(x.usd)}.`);
    const col = (g, clase, tope, val, etiqueta) => `<div class="barras">${fs.map((x, i) => tocar(g, i, `<span class="par"><i class="${clase} ancha" style="height:${alto(val(x), tope, 70)}px"></i></span>`, textos[i], i === 0 || i === fs.length - 1 ? etiqueta(x) : "")).join("")}</div>`;
    return crd(lbl("¿De verdad gastás más?") + `<div class="grande-t">${titulo}</div>` +
      `<div class="sub mini">En pesos</div>` + col("dolP", "c-gas", tp, (x) => x.pesos, (x) => plata(x.pesos)) +
      `<div class="sub mini">En dólares</div>` + col("dolU", "c-ing", tu, (x) => x.usd, (x) => usd(x.usd)) +
      detalle(st.anVer?.g === "dolU" ? "dolU" : "dolP", textos) +
      `<div class="sub">Desde ${mesTexto(fs[0].mes).toLowerCase()}: en pesos ${quePaso(d.pesos)}, en dólares ${quePaso(d.usd)}. Usa el dólar que elegiste en Ajustes.</div>`);
  }

  function bloqueFalta(hay) {
    const p = progreso(st.movs, hoy);
    const fila = (t, sub, parte) => `<div class="prog"><span><b>${t}</b><small>${sub}</small></span>${Art.barra(parte)}</div>`;
    const dias = (n) => (n === 1 ? "Falta 1 día" : `Faltan ${n} días`);
    const meses = (n) => (n === 1 ? "Cuando cierres 1 mes más" : `Cuando cierres ${n} meses`);
    let filas = "";
    if (!gastosHormiga(st.movs, hoy)) filas += fila("Tus gastos hormiga", p.hormiga.faltan ? dias(p.hormiga.faltan) : "Cuando algo chico se repita 4 veces", p.hormiga.faltan ? p.hormiga.parte : 0.9);
    if (!loQueCambio(st.movs, hoy)) filas += fila("Lo que cambió este mes", meses(p.cambio.faltan || 1), p.cambio.parte);
    if (!hayMesAMes(st.movs, hoy)) filas += fila("Mes a mes", "Con 2 meses anotados", p.meses.parte);
    if (!filas) return "";
    return crd((hay ? lbl("Se va abriendo solo") : `<div class="empty vacio-m">${Art.miguita("ok").replace("<svg", '<svg style="width:96px"')}<b>Seguí anotando, ya casi</b><span>Con pocos días no te quiero decir cualquier cosa. Esto se va abriendo solo:</span></div>`) + filas);
  }

  function bloqueSinFijos() {
    if (comprometido(st.movs, st.fijos, st.compras, hoy, dolarHoy())) return "";
    return crd(lbl("Ya podés ver") +
      `<button class="row f rowb" data-act="planTab" data-v="fijos"><span>Tu sueldo ya tiene dueño<small>Cargá tus gastos fijos</small></span><span class="chev" aria-hidden="true">›</span></button>` +
      `<button class="row rowb" data-act="planTab" data-v="cuotas"><span>Lo que se viene<small>Cargá tus compras en cuotas</small></span><span class="chev" aria-hidden="true">›</span></button>`);
  }

  function analisis() {
    const partes = bloqueCambio() + bloqueHormiga() + bloqueMeses() + bloqueCategoria() + bloqueSueldo() + bloqueViene() + bloqueDolares();
    const hayMovs = st.movs.some((m) => m.tipo !== "ingreso");
    return partes + bloqueFalta(!!partes) + bloqueSinFijos() +
      (hayMovs ? `<button class="btn pp w alt ia" data-act="abrirIA">Copiar mis datos para preguntarle a una IA</button>` : "");
  }

  return { analisis };
}
