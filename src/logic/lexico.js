// Cómo habla la gente en Argentina. Es aparte de las palabras clave de cada persona (config.categorias):
// así se puede ampliar en cada versión sin tocar lo que cada uno cargó. Las de la persona siempre ganan.
//
// ANTES DE SUMAR UNA PALABRA: correr `npm test`. tests/frases.test.mjs lee una lista larga de frases y compara cómo se
// entendían antes con cómo se entienden ahora (tests/frases.json). Si una palabra nueva cambia una frase que andaba, la prueba
// falla y muestra cuál. Si el cambio es el que se quería, se acepta con `npm run frases`. Además avisa si una palabra quedó
// en dos categorías o si choca con una palabra de plata («palitos», «verdes», «luca»).
export const quitarAcentos = (s) => String(s).toLowerCase().replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");

const separar = (t) => t.split(",").map((x) => x.trim()).filter(Boolean);

export const LEXICO_GASTO = {
  super: separar("super, supermercado, súper, almacen, chino, chinos, autoservicio, mayorista, changuito, compras, mercaderia, dietetica, fiambreria, fiambre, leche, yogur, yerba, azucar, harina, fideos, arroz, huevos, aceite, queso, jamon, galletitas, gaseosa, coca, agua mineral, soda, jugo, jugos, papel higienico, detergente, lavandina, coto, dia, carrefour, jumbo, vea, disco, changomas, makro, maxiconsumo, diarco, vital, yaguar, la anonima, walmart"),
  carne: separar("carni, carniceria, carnicero, carne, carne picada, carne molida, picada comun, picada especial, asado, vacio, chorizo, chorizos, morcilla, matambre, milanesas, milanesa, nalga, peceto, tira de asado, molida, cuadril, bife, bifes, cerdo, pollo, polleria, pescado, pescaderia"),
  verduleria: separar("verdu, verduleria, verdulero, verdulera, fruteria, frutas, fruta, verduras, verdura, papa, papas, batata, batatas, tomate, tomates, cherry, cebolla, cebollas, cebolla de verdeo, verdeo, lechuga, rucula, acelga, espinaca, zanahoria, zanahorias, zapallo, zapallos, zapallito, zapallitos, calabaza, berenjena, berenjenas, morron, morrones, pimiento, ajo, ajos, choclo, choclos, pepino, pepinos, remolacha, brocoli, coliflor, repollo, palta, paltas, limon, limones, naranja, naranjas, mandarina, mandarinas, pomelo, pomelos, banana, bananas, manzana, manzanas, pera, peras, durazno, duraznos, ciruela, ciruelas, uva, uvas, frutilla, frutillas, sandia, melon, anana, kiwi, cereza, cerezas, damasco, damascos, perejil, albahaca"),
  panaderia: separar("panaderia, panadero, panadera, pan, panes, pancito, pancitos, pan lactal, pebete, pebetes, figazza, figazzas, figacita, figacitas, fugazza, tortita, tortitas, tortita negra, tortitas negras, torta negra, masita, masitas, masas finas, masas secas, facturas, facturita, facturitas, medialuna, medialunas, media luna, medias lunas, vigilantes, bolas de fraile, bola de fraile, berlinesa, berlinesas, cañoncito, cañoncitos, sacramentos, suspiros, cremona, cremonas, criollos, criollitos, criollitas, bizcocho, bizcochos, bizcochito, bizcochitos, bizcochuelo, galleta, galletas, grisin, grisines, budin, budines, pastafrola, pasta frola, pasta flora, torta, tortas, churro, churros, sanguche de miga, sanguches de miga, sandwich de miga, sandwiches de miga, sanguchito de miga, sanguchitos de miga, pepa, pepas, rosca, roscas, scon, scones, muffin, muffins, brownie, brownies, prepizza, prepizzas, pan dulce"),
  comida: separar("morfi, comida, delivery, pedidosya, pedidos ya, rappi, uber eats, resto, restaurante, restaurant, parrilla, bodegon, pizza, pizzas, pizzeria, empanadas, empanada, burger, hamburguesa, hamburguesas, lomito, sushi, almuerzo, cena, desayuno, merienda, cafe, cafecito, cortado, helado, heladeria, kiosco, kiosko, alfajor, golosinas, puchos, cigarrillos, mcdonalds, mc, mostaza, burger king, starbucks, havanna, tarta, tartas, licuado, sanguche, sandwich, pancho, panchos, choripan"),
  auto: separar("nafta, naftita, combustible, gasoil, ypf, shell, axion, puma, gnc, estacion de servicio, peaje, estacionamiento, cochera, garage, lavadero, lavado, mecanico, service, gomeria, cubiertas, repuesto, seguro del auto, seguro de auto, patente, vtv, multa, auto, moto"),
  transporte: separar("bondi, colectivo, sube, uber, cabify, didi, taxi, remis, tren, subte, micro, combi, pasaje, pasajes, peugeot"),
  gym: separar("gym, gimnasio, gimnasia, pileta, natacion, yoga, pilates, crossfit, futbol, padel, suplemento, proteina, creatina"),
  subs: separar("spotify, netflix, youtube, disney, prime, max, hbo, icloud, google one, suscripcion, paramount, star, chatgpt, canva"),
  hobbies: separar("hobby, juego, juegos, steam, playstation, xbox, nintendo, musica, instrumento, guitarra, pintura, manualidades, plantas, vivero, fotografia, apuesta, apuestas, quiniela, loteria, casino, bingo, raspadita, telekino, quini"),
  salidas: separar("salida, salidas, boliche, joda, entrada, entradas, recital, cine, teatro, fiesta, previa, after, karaoke, bowling, bar, pub, cerveceria, vinoteca, licoreria, birra, birrita, cerveza, chopp, pinta, porron, porrones, vino, vinito, champagne, champan, espumante, sidra, fernet, fernecito, tragos, trago, escabio, alcohol, whisky, whiskey, vodka, gin, ron, tequila, aperol, campari, gancia, vermut, cinzano, branca, cuba libre, mojito, daikiri, coctel, quilmes, brahma, stella, heineken, schneider, corona, imperial, papas fritas, papita, papitas, papas con cheddar, papas cheddar, papas rusticas, papas noisette, picada, picadita, mani, manies, nachos, palitos salados, chizitos, doritos, lays, pringles, snack, snacks, hielo, birras, birrazas, cervecita, cervecitas, lata de birra, latita, ipa, stout, honey, chela, pintas, tirada, patagonia, andes, budweiser, isenbeck, warsteiner, amstel, miller, stella artois, malbec, cabernet, torrontes, vino tinto, vino blanco, clerico, ferne, fernandito, coca con fernet, speed, red bull, energizante, energizantes, gin tonic, smirnoff, absolut, jager, jagger, jagermeister, baileys, licor, amargo, amarguito, caipirinha, caipi, caipiroska, negroni, spritz, shot, shots, chupito, chupitos, pisco, cubata, escabiar"),
  viajes: separar("viaje, viajes, vacaciones, turismo, hotel, hoteles, hostel, hostal, alojamiento, airbnb, cabaña, cabañas, apart hotel, booking, despegar, almundo, vuelo, vuelos, avion, pasaje de avion, pasajes de avion, pasaje en avion, aereo, aerolineas, aerolineas argentinas, flybondi, jetsmart, latam, aeropuerto, tasa aeroportuaria, valija, equipaje, excursion, excursiones, camping, carpa, seguro de viaje, asistencia al viajero"),
  ropa: separar("ropa, zapatillas, zapatos, remera, pantalon, jean, jeans, campera, buzo, medias, peluqueria, barberia, barbero, corte de pelo, corte, manicura, perfumeria, perfume, shampoo, desodorante, crema, higiene, maquillaje"),
  salud: separar("farmacia, remedio, remedios, ibuprofeno, medico, medica, dentista, odontologo, psicologo, psicologa, terapia, kinesiologo, kine, prepaga, osde, swiss medical, galeno, medicus, obra social, analisis, laboratorio, optica, anteojos, consulta, consulta medica, consultorio, bono de consulta, bono medico, coseguro, copago, clinica, sanatorio, hospital, guardia, pediatra, oculista, nutricionista, vacuna, vacunas"),
  regalos: separar("regalo, regalos, cumple, cumpleaños, navidad, dia de la madre, dia del padre"),
  servicios: separar("luz, edenor, edesur, gas, metrogas, naturgy, agua, aysa, internet, wifi, fibertel, telecentro, cablevision, personal, movistar, claro, celular, telefono, recarga, expensas, alquiler, limpieza, abl, rentas, arca, afip, monotributo, impuestos, impuesto, seguro de hogar, banco, comision bancaria, mantenimiento de cuenta, contador, contadora, abogado, abogada, escribano, escribana, gestor, gestoria"),
  deudas: separar("deuda, deudas, devolver, devolvi, devolucion, prestamo, cuota, cuotas"),
  tarjeta: separar("tarjeta, resumen de la tarjeta, resumen de tarjeta, pago de tarjeta, pago de la tarjeta, pago tarjeta, minimo de la tarjeta, pago minimo, visa, mastercard, master, amex, american express, cabal, naranja x, tarjeta naranja, cuota naranja, resumen naranja, pago naranja"),
  edu: separar("curso, cursos, libro, libros, clase, clases, udemy, facultad, facu, colegio, escuela, jardin, cuota escolar, utiles, fotocopias, apuntes, ingles"),
  trabajo: separar("herramienta, herramientas, herramientas de trabajo, insumo, insumos, material, materiales, taladro, amoladora, soldadora, destornillador, destornilladores, martillo, pinza, pinzas, llave inglesa, lijadora, atornillador, caja de herramientas, ropa de trabajo, uniforme de trabajo, guantes de trabajo, botines de seguridad, para el laburo, para el trabajo, para laburar, para trabajar, coworking, tornillos, clavos, cartucho, toner, resma"),
  mascotas: separar("mascota, mascotas, veterinaria, veterinario, perro, perra, perrito, gato, gata, gatito, alimento balanceado, balanceado, alimento del perro, alimento del gato, alimento para perros, alimento para gatos, comida del perro, comida del gato, comida para perros, comida para gatos, piedritas, piedras sanitarias, pipeta, antipulgas, correa, peluqueria canina, guarderia canina, paseador, paseadora, petshop, pet shop, castracion, vacuna del perro, vacuna del gato, vacunas del perro, vacunas del gato"),
  casa: separar("para la casa, cosas de la casa, cosas para la casa, hogar, ferreteria, mueble, muebles, muebleria, colchon, sabanas, toallas, almohada, almohadas, cortinas, bazar, vajilla, ollas, sarten, electrodomestico, electrodomesticos, heladera, lavarropas, microondas, aire acondicionado, ventilador, estufa, termotanque, calefon, lampara, lamparas, foco, focos, plomero, electricista, gasista, albañil, pintor, cerrajero, cerrajeria, copia de llave, arreglo, arreglos, cemento, ladrillos, pintureria, latex, easy, sodimac, mudanza"),
};

export const LEXICO_INGRESO = {
  sueldo: separar("sueldo, salario, aguinaldo, jubilacion, jornal, quincena, recibo, me pagaron el sueldo, me pago el sueldo, me deposito el sueldo, me depositaron el sueldo"),
  extra: separar("trabajo, trabaje, la changa, freelance, extra, changa, changuita, venta, vendi, vendimos, honorarios, factura, propina, propinas, bono, bonos, comision, comisiones, laburo, cliente, gane, ganamos"),
  regalo_in: separar("me regalaron, me regalo, regalo recibido, recibi de regalo"),
  otros_in: separar("me pago, reintegro, devolucion, asignacion, asignaciones, asignacion familiar, auh, beca, becas"),
};

// Palabras que sirven de pista solo si no hay otra más clara: marcas que también son un apellido, un lugar o una palabra común
// («farmacia patagonia», «almuerzo del día»), y palabras de pago que acompañan a cualquier cosa («cuota del gimnasio», «tarjeta SUBE»).
// Solas, siguen valiendo: «patagonia 5000» va a Salidas y «cuota 30000» a Deudas.
// Las marcas de tarjeta también: «zapatillas visa 80000» son zapatillas pagadas con la Visa; «visa 150000» sola es el pago de la tarjeta.
export const DEBILES = new Set(separar("patagonia, andes, miller, corona, imperial, honey, stella, quilmes, brahma, schneider, branca, speed, shot, shots, amargo, tirada, pinta, pintas, after, max, star, prime, dia, vea, disco, vital, puma, service, lavado, personal, claro, corte, crema, mc, mostaza, clase, clases, ingles, cuota, cuotas, tarjeta, compras, consulta, easy, sodimac, hogar, material, materiales, perro, perra, gato, gata, banco, juego, juegos, visa, mastercard, master, amex, cabal, viaje, viajes, aeropuerto, vacaciones, turismo"));

// Después de estas palabras viene un detalle de lo anterior, no otra cosa: «helado de frutilla» es helado, «gin con pepino» es gin,
// «remís a la farmacia» es remís. Solo cuenta si antes hay otra palabra con categoría («kilo de papa» sigue siendo papa).
export const UNEN = /(?:^|\s)(?:de|del|con|sabor|sabor a|al|a|para|en|por|sin)(?:\s+(?:el|la|los|las|un|una|unos|unas|mi|mis|su|sus|lo))?\s*$/;

// «Papá» no es una papa. Con tilde siempre es el padre; sin tilde, solo cuando se nota: «mi papa», «a papa», «para papa», «papa me pasó».
export const sinFamilia = (s) => String(s).replace(/(^|[^a-zñáéíóú])pap[áÁ](?![a-zñáéíóú])/gi, "$1padre")
  .replace(/(^|\s)(mi|a|para)\s+papa(?=\s|$)/gi, "$1$2 padre").replace(/(^|\s)papa(?=\s+(me|y mam[aá]|y yo)(\s|$))/gi, "$1padre");

// Palabras que dicen que entró plata.
const P = (t) => new RegExp("(^|[^a-zñ])(" + t + ")($|[^a-zñ])");
// Estas dicen que entró, salvo que nombren algo en lo que se gasta: "me llegó la luz, 20 mil" es un gasto.
export const ES_SUMAR = P("sumame|sumale|sumar|suma|sumemos|ingresame|ingresa|acreditame|acredita|cargame plata|me llego|me llegaron|me cayo|me cayeron");
// Si lo que llegó o se suma es plata, es plata que entró aunque después nombre a alguien o algo: «me llegó plata de papá».
export const ES_PLATA = P("plata|guita|dinero|efectivo|una transferencia|un giro|mosca|lana");
export const ES_INGRESO = P("sumame|sumale|sumar|suma|sumemos|ingresame|ingresa|acreditame|acredita|cargame plata|me llego|me llegaron|me cayo|me cayeron|me reintegraron|me reintegro|me acreditaron|me acredito|me ingresaron|a favor|sueldo|salario|aguinaldo|jubilacion|cobr[eo]|cobramos|ingreso|ingresaron|recibi|recibimos|gane|ganamos|entro|entraron|me entro|me entraron|me pagaron|me pago|me depositaron|me deposito|me transfirieron|me transfirio|me pasaron|me paso|me devolvieron|me devolvio|me regalaron|me regalo|me dio|me dieron|me mando|me mandaron|me giro|me giraron|me presto|me prestaron|regalo recibido|recibi de regalo|changa|changuita|vendi|vendimos|reintegro|propina|propinas|quincena|auh|beca|becas|asignacion|asignaciones|jornal");
// Estas palabras son plata que entra cuando van solas («bono 50000», «comisión por ventas»), pero son un gasto cuando se le pagan
// a alguien: «comisión del banco», «honorarios del contador», «bono de consulta».
export const INGRESO_DUDOSO = P("bono|bonos|comision|comisiones|honorarios");
export const SE_LE_PAGA_A = P("banco|bancaria|bancarias|bancario|cuenta|mantenimiento|tarjeta|transferencia|mercado pago|mercadopago|contador|contadora|abogado|abogada|escribano|escribana|escribania|gestor|gestoria|despachante|inmobiliaria|administracion|administrador|consorcio|medico|medica|consulta|consultorio|dentista|odontologo|psicologo|psicologa|kinesiologo|veterinario|veterinaria|clinica|sanatorio|colegio|escuela|cooperadora|contribucion|colaboracion|club|arquitecto|arquitecta|martillero");
// Palabras que dicen que salió plata. Se miran primero: "me cobró el plomero" y "le pasé a mi hermana" son gastos.
export const ES_GASTO = P("restame|restale|restar|resta|sacame|saca|sacale|descontame|descontale|descontá|desconta|quitame|quita|me robaron|se me fue|se me fueron|me cobr(o|aron)|me sacaron|me debitaron|me descontaron|le (pase|pague|di|dimos|dio|transferi|mande|deposite|preste|devolvi|gire|compre|regale)|gaste|gastamos|me gaste|pague|pagamos|compre|compramos|deje|saque|aboné|abone|perdi");
// Si entró o salió plata, según cómo está dicho. Sin ninguna pista, es un gasto.
export function tipoDe(plano) {
  if (ES_GASTO.test(plano)) return "gasto";
  if (ES_INGRESO.test(plano)) return "ingreso";
  return INGRESO_DUDOSO.test(plano) && !SE_LE_PAGA_A.test(plano) ? "ingreso" : "gasto";
}
// ¿El texto dice de alguna forma si entró o salió plata? Si no dice nada, vale lo que la persona enseñó.
export const hayPista = (plano) => ES_GASTO.test(plano) || ES_INGRESO.test(plano) || INGRESO_DUDOSO.test(plano);
