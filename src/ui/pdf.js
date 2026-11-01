// Lee el texto de un PDF con pdf.js (src/vendor/pdfjs), que se carga solo al importar un resumen en PDF.
// No se guarda para usar sin internet porque pesa casi 2 MB: la primera vez que se importa un PDF hace falta internet.
export async function textoDePDF(bytes) {
  const pdfjs = await import(new URL("../vendor/pdfjs/pdf.min.mjs", import.meta.url).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("../vendor/pdfjs/pdf.worker.min.mjs", import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true }).promise;
  const paginas = [];
  for (let n = 1; n <= Math.min(doc.numPages, 60); n++) {
    const c = await (await doc.getPage(n)).getTextContent();
    paginas.push(c.items.map((i) => ({ x: i.transform[4], y: i.transform[5], s: i.str })));
  }
  await doc.destroy();
  return paginas;
}
