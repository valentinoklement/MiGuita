// Pantalla para traer los gastos desde el resumen de Mercado Pago u otra billetera o banco.
import { Art } from "../art/art.js";
import { esc } from "./pantallas.js";

export const ICONO_BILLETERA = '<path d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7l12-4v4"/><circle cx="16.5" cy="14" r="1.3"/>';

export function crearVistaImportar(st, V) {
  const { back, hdr, lbl, crd, chips } = V.ayudas;
  const paso = (n, t) => `<div class="srow${n === 1 ? " f" : ""}"><span class="stn">${n}</span><span class="rt"><b>${t}</b></span></div>`;

  return function importar() {
    const im = st.imp;
    let h = back("Inicio") + hdr("Billeteras y bancos", "Traé tus gastos solos") +
      crd(`<div class="crow"><span class="billetera" aria-hidden="true">${Art.icono(ICONO_BILLETERA)}</span><div class="cr"><b class="pregunta">¿Por qué no se conecta sola?</b>` +
        `<div class="sub">Mercado Pago y los bancos no dejan que otras apps entren a tu cuenta para mirar tus pagos. Es por seguridad, y en Argentina todavía no hay una forma oficial de compartir esos datos.</div></div></div>` +
        `<div class="sub"><b>Lo que sí podés hacer:</b> bajar el resumen de tus movimientos y traerlo acá. MiGuita lo lee y anota cada gasto con su categoría, sin que tengas que escribir nada.</div>`);
    if (!im.movs.length) {
      h += crd(lbl("Cómo bajar el resumen de Mercado Pago") +
          paso(1, "Entrá a Mercado Pago (es más fácil desde la compu)") +
          paso(2, "Andá a la sección «Reportes»") +
          paso(3, "Generá el «Resumen de cuenta» del mes y bajalo (sale en PDF)") +
          paso(4, "Elegí ese PDF acá abajo") +
          `<div class="hint">Usá el «Resumen de cuenta»: el de liquidaciones o transacciones es para quienes venden y no trae tus gastos. También sirve el resumen de otras billeteras o bancos en PDF, Excel o CSV.</div>`) +
        `<label class="btn pp w subir">${im.leyendo ? "Leyendo…" : "Elegir el archivo del resumen"}<input type="file" data-act="impArchivo" accept=".pdf,.csv,.xlsx,.txt,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Elegir el archivo del resumen"></label>` +
        (im.error ? `<div class="msg" role="alert">${esc(im.error)}</div>` : "") +
        `<div class="hint">El archivo se lee en tu celu y no se manda a ningún lado. Si volvés a traer el mismo resumen, lo ya anotado no se repite.</div>`;
      return h;
    }
    const visibles = im.movs.filter((m) => (!im.soloGastos || m.tipo === "gasto") && (!im.sinTransf || !m.transferencia));
    const hayTransf = im.movs.some((m) => m.transferencia && (!im.soloGastos || m.tipo === "gasto"));
    const elegidos = visibles.filter((m) => im.elegidos.has(m.id));
    h += chips("impSolo", [["si", "Solo gastos"], ["no", "Gastos e ingresos"]], im.soloGastos ? "si" : "no", "Qué traer") +
      (hayTransf ? lbl("Transferencias a personas") + chips("impTransf", [["dejar", "Traerlas"], ["sacar", "Sacarlas"]], im.sinTransf ? "sacar" : "dejar", "Transferencias") +
        `<div class="hint">Sacalas si son pases entre tus cuentas o plata que no gastaste.</div>` : "") +
      lbl("¿Con qué pagaste?") + chips("impMedio", st.cfg.medios.filter((m) => !m.oculto).map((m) => [m.id, m.nombre]), im.medio, "Medio de pago") +
      crd(lbl(`Encontramos ${visibles.length} ${visibles.length === 1 ? "movimiento nuevo" : "movimientos nuevos"}`) +
        (visibles.length ? visibles.slice(0, 300).map((m, i) =>
          `<button class="row rowb${i ? "" : " f"}" data-act="impElegir" data-v="${esc(m.id)}" aria-pressed="${im.elegidos.has(m.id)}"><span><span class="tilde">${im.elegidos.has(m.id) ? "✓" : ""}</span>${esc(m.detalle)}<small>${esc(V.nombreCat(m.categoria))} · ${m.fecha.split("-").reverse().join("/")}</small></span>` +
          `<span class="${m.tipo === "gasto" ? "neg" : "pos"}">${V.plata(m.tipo === "gasto" ? -m.monto : m.monto, { signo: true })}</span></button>`).join("") :
          `<div class="empty"><span>No hay movimientos nuevos para traer.</span></div>`) +
        `<div class="hint">Tocá un movimiento para sacarlo o volver a ponerlo. Si después le cambiás la categoría en Movimientos, MiGuita lo aprende y la próxima vez ya viene bien.</div>`) +
      (elegidos.length ? `<button class="btn pp w" data-act="impAnotar">Anotar ${elegidos.length} ${elegidos.length === 1 ? "movimiento" : "movimientos"}</button>` : "") +
      `<button class="btn pp w alt" data-act="impOtro">Elegir otro archivo</button>`;
    return h;
  };
}
