# MiGuita

Anotá lo que gastás en 10 segundos. App web gratis e instalable (iPhone y Android), sin cuentas, sin publicidad y sin seguimiento.

## Qué hace
- Anotar gastos e ingresos rápido ("nafta 20000"), en pesos o dólares.
- Te queda, por día, resumen del mes y racha de días anotados.
- Plan: presupuestos, metas de ahorro, deudas y gastos fijos que se anotan solos.
- Grupos para dividir gastos con amigos: conectados con un código corto (todos ven lo mismo al instante) o con una copia por código o QR.
- PIN o contraseña con los datos cifrados, copias de seguridad cifradas y avisos con la app cerrada.
- Compras en cuotas con seguimiento por tarjeta, y «Tu mes en MiGuita» para compartir.

## Privacidad
- Los datos se guardan **solo en tu celu**. Este repositorio tiene el código de la app, nunca datos de nadie.
- La app se conecta a internet para consultar el dólar (dolarapi.com y api.bluelytics.com.ar), sin mandar ningún dato personal.
- Los grupos conectados pasan por un servidor propio en Cloudflare (su código está en la carpeta `servidor/`). Viajan y se guardan cifrados (AES-GCM) con una clave que sale del código del grupo: el servidor no puede leerlos. Quien tenga el código puede ver y anotar en el grupo. Un grupo sin uso por más de 13 meses se borra del servidor.
- Los avisos con la app cerrada son opcionales. Si se activan, el servidor guarda solo a dónde mandar el aviso (la dirección que da el navegador), los horarios elegidos, la zona horaria y el último día que se anotó algo, para no avisar si ya anotaste. Nunca montos ni movimientos, y el texto del aviso va cifrado para ese celu. Al apagarlos se borra todo.
- «Usar en otro dispositivo» es opcional: conecta el celu y la compu con un código de 16 letras, sin mail ni contraseña. Los datos viajan por el mismo servidor, cifrados con una clave que sale de ese código. El tema, el PIN y los avisos quedan en cada dispositivo.
- Con PIN, los datos se cifran con AES-GCM; la clave sale del PIN con PBKDF2-SHA256 de 600.000 vueltas. Si se olvida el PIN y no hay copia, no hay forma de recuperarlos.

## Para desarrollar
- Abrir `index.html` con cualquier servidor local (por ejemplo `python -m http.server`).
- Pruebas: `npm test` (Node 20 o más; no hay dependencias que instalar).
- Licencias de terceros en `LICENCIAS/`.
