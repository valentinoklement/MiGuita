// Qué celu y qué navegador está usando la persona, para mostrarle cómo instalar la app.
export const DIRECCION = "miguita-app.pages.dev/";
// La dirección de antes: quien entra por ahí se lleva sus datos a la nueva (ver ui/mudanza.js).
export const enDireccionVieja = (host) => host === "valentinoklement.github.io";

export function queNavegador(ua = "", toques = 0, brave = false) {
  const iphone = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && toques > 1);
  const android = /Android/.test(ua);
  // Adentro de otra app (Instagram, Facebook, un visor de Android): desde ahí no se puede instalar.
  const interno = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|TikTok|; wv\)/.test(ua);
  const otro = /SamsungBrowser|EdgA|OPR\/|Firefox|FxiOS|MiuiBrowser|UCBrowser|DuckDuckGo|YaBrowser/.test(ua) || brave;
  return {
    so: iphone ? "iphone" : android ? "android" : "compu",
    interno,
    chrome: android && /Chrome\//.test(ua) && !otro && !interno,
    safari: iphone && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) && !interno,
  };
}

// El mensaje para mandarle a alguien: quien hace de «técnico» en la familia no tiene que explicar nada.
export const textoInvitacion = () => `Mirá esta app para anotar gastos. Es gratis y no pide cuenta: https://${DIRECCION}\n\nPara tenerla en el celu:\n• Android: abrila en Chrome, anotá un gasto y tocá Instalar cuando aparezca.\n• iPhone: abrila en Safari, tocá Compartir (o los ···) y elegí «Agregar a inicio».`;

// Desde iOS 26, Safari guarda «Compartir» adentro de los tres puntitos.
export const safariNuevo = (ua = "") => Number(/Version\/(\d+)/.exec(ua)?.[1] || 0) >= 26;

// El link que le pide a Android abrir la app en Chrome.
export const linkAChrome = () => `intent://${DIRECCION}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2F${encodeURIComponent(DIRECCION)};end`;
