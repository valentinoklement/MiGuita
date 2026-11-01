# MiGuita

Anotá lo que gastás en 10 segundos. App web gratis e instalable (iPhone y Android), sin cuentas, sin publicidad y sin seguimiento.

## Qué hace
- Anotar gastos e ingresos rápido ("nafta 20000"), en pesos o dólares.
- Te queda, por día, resumen del mes y racha de días anotados.
- Plan: presupuestos, metas de ahorro, deudas y gastos fijos que se anotan solos.
- Grupos para dividir gastos con amigos: se comparten con un código o un QR, sin servidor.
- PIN o contraseña con los datos cifrados, copias de seguridad cifradas y avisos.

## Privacidad
- Los datos se guardan **solo en tu celu**. Este repositorio tiene el código de la app, nunca datos de nadie.
- La app solo se conecta a internet para consultar el dólar (dolarapi.com y api.bluelytics.com.ar), sin mandar ningún dato personal.
- Con PIN, los datos se cifran con AES-GCM; la clave sale del PIN con PBKDF2-SHA256 de 600.000 vueltas. Si se olvida el PIN y no hay copia, no hay forma de recuperarlos.

## Para desarrollar
- Abrir `index.html` con cualquier servidor local (por ejemplo `python -m http.server`).
- Pruebas: `npm test` (Node 20 o más; no hay dependencias que instalar).
- Licencias de terceros en `LICENCIAS/`.
