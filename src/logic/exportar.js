// Exportar los movimientos para abrir en Excel (o Google Sheets).
// CSV con punto y coma, coma decimal y marca BOM: así Excel en castellano lo abre bien con un doble clic.

const celda = (v, esNumero) => {
  let s = String(v ?? "");
  // Que un texto no pueda ser una fórmula (un detalle que empiece con "=" no se ejecuta en Excel). Los montos no se tocan.
  if (!esNumero && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const numero = (centavos) => (centavos / 100).toFixed(2).replace(".", ",");

export function movimientosCSV(movs, nombreCat, nombreMedio) {
  const filas = [["Fecha", "Tipo", "Detalle", "Categoría", "Medio de pago", "Monto en pesos", "Monto en dólares", "Dólar usado"]];
  for (const x of [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.ts - b.ts)) {
    const signo = x.tipo === "ingreso" ? 1 : -1;
    filas.push([
      x.fecha.split("-").reverse().join("/"),
      x.tipo === "ingreso" ? "Ingreso" : "Gasto",
      x.detalle || "",
      nombreCat(x.categoria),
      nombreMedio(x.medio) || "",
      numero(signo * x.monto),
      x.usd ? numero(signo * x.usd.monto) : "",
      x.usd ? numero(x.usd.valor) : "",
    ]);
  }
  return "﻿" + filas.map((f, n) => f.map((v, i) => celda(v, n > 0 && i >= 5)).join(";")).join("\r\n") + "\r\n";
}
