# MiGuita

Anotá lo que gastás en 10 segundos. App web gratis e instalable (iPhone y Android), sin cuentas, sin publicidad y sin seguimiento.

Se usa en https://miguita-app.pages.dev

## Qué hace
- Anotar gastos e ingresos rápido ("nafta 20000"), en pesos o dólares.
- Te queda, por día, resumen del mes y racha de días anotados.
- Mis cuentas: topes, metas de ahorro, deudas y gastos fijos que se anotan solos.
- Grupos para dividir gastos con amigos: conectados con un código corto (todos ven lo mismo al instante) o con una copia por código o QR.
- PIN o contraseña con los datos cifrados, copias de seguridad cifradas y avisos con la app cerrada.
- Compras en cuotas con seguimiento por tarjeta, y «Tu mes en MiGuita» para compartir.

## Privacidad
- Los datos se guardan **solo en tu celu**. Este repositorio tiene el código de la app, nunca datos de nadie.
- La app se conecta a internet para consultar el dólar (dolarapi.com y api.bluelytics.com.ar), sin mandar ningún dato personal.
- Los grupos conectados pasan por un servidor propio en Cloudflare (su código está en la carpeta `servidor/`). Viajan y se guardan cifrados (AES-GCM) con una clave que sale del código del grupo: el servidor no puede leerlos. Quien tenga el código puede ver y anotar en el grupo. Un grupo sin uso por más de 13 meses se borra del servidor.
- Los avisos con la app cerrada son opcionales. Si se activan, el servidor guarda solo a dónde mandar el aviso (la dirección que da el navegador), los horarios elegidos, la zona horaria y el último día que se anotó algo, para no avisar si ya anotaste. Nunca montos ni movimientos, y el texto del aviso va cifrado para ese celu. Al apagarlos se borra todo.
- Los comentarios que se mandan desde la app se guardan sin cifrar en el mismo servidor: el texto, el nombre que se ponga y el tipo de celu.
- «Usar en otro dispositivo» es opcional: conecta el celu y la compu con un código de 16 letras, sin mail ni contraseña. Los datos viajan por el mismo servidor, cifrados con una clave que sale de ese código. El tema, el PIN y los avisos quedan en cada dispositivo.
- La app cuenta de forma anónima cuántas personas la abren, la instalan y la siguen usando a la semana y al mes: solo totales por mes, una vez por celu, sin identificadores y sin nada de lo que se anota. Se apaga en Ajustes › Privacidad.
- Con PIN, los datos se cifran con AES-GCM; la clave sale del PIN con PBKDF2-SHA256 de 600.000 vueltas. Si se olvida el PIN y no hay copia, no hay forma de recuperarlos.

## Para desarrollar
- Abrir `index.html` con cualquier servidor local (por ejemplo `python -m http.server`).
- Pruebas: `npm test` (Node 20 o más; no hay dependencias que instalar). Recorridos completos en un Chrome de verdad: `npm run recorridos`. Si agregás palabras al vocabulario y cambia cómo se lee alguna frase de `tests/frases.txt`, `npm test` lo avisa; si era lo que querías, `npm run frases` lo acepta.
- Licencias de terceros en `LICENCIAS/`.
