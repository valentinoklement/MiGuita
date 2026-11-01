// Cómo habla la gente en Argentina. Es aparte de las palabras clave de cada persona (config.categorias):
// así se puede ampliar en cada versión sin tocar lo que cada uno cargó. Las de la persona siempre ganan.
export const quitarAcentos = (s) => String(s).toLowerCase().replace(/[áàä]/g, "a").replace(/[éèë]/g, "e").replace(/[íìï]/g, "i").replace(/[óòö]/g, "o").replace(/[úùü]/g, "u");

const separar = (t) => t.split(",").map((x) => x.trim()).filter(Boolean);

export const LEXICO_GASTO = {
  super: separar("super, supermercado, súper, almacen, chino, chinos, autoservicio, mayorista, changuito, compras, mercaderia, verdu, verduleria, frutas, fruta, verduras, dietetica, fiambreria, fiambre, panaderia, pan, facturas, medialunas, leche, yogur, yerba, azucar, harina, fideos, arroz, huevos, aceite, queso, jamon, galletitas, gaseosa, coca, agua mineral, soda, papas, tomate, tomates, cebolla, banana, manzana, papel higienico, detergente, lavandina, coto, dia, carrefour, jumbo, vea, disco, changomas, makro, maxiconsumo, diarco, vital, yaguar, la anonima, walmart"),
  carne: separar("carni, carniceria, carnicero, carne, asado, vacio, chorizo, chorizos, morcilla, matambre, milanesas, milanesa, nalga, peceto, tira de asado, molida, cuadril, bife, bifes, cerdo, pollo, polleria, pescado, pescaderia"),
  comida: separar("morfi, comida, delivery, pedidosya, pedidos ya, rappi, uber eats, resto, restaurante, restaurant, parrilla, bodegon, pizza, pizzas, pizzeria, empanadas, empanada, burger, hamburguesa, hamburguesas, lomito, sushi, almuerzo, cena, desayuno, merienda, cafe, cafecito, cortado, helado, heladeria, kiosco, kiosko, alfajor, golosinas, puchos, cigarrillos, mcdonalds, mc, mostaza, burger king, starbucks, havanna"),
  auto: separar("nafta, naftita, combustible, gasoil, ypf, shell, axion, puma, gnc, estacion de servicio, peaje, estacionamiento, cochera, garage, lavadero, lavado, mecanico, service, gomeria, cubiertas, repuesto, seguro del auto, seguro de auto, patente, vtv, multa, auto, moto"),
  transporte: separar("bondi, colectivo, sube, uber, cabify, didi, taxi, remis, tren, subte, micro, combi, pasaje, pasajes, peugeot"),
  gym: separar("gym, gimnasio, gimnasia, pileta, natacion, yoga, pilates, crossfit, futbol, padel, suplemento, proteina, creatina"),
  subs: separar("spotify, netflix, youtube, disney, prime, max, hbo, icloud, google one, suscripcion, paramount, star, chatgpt, canva"),
  hobbies: separar("hobby, juego, juegos, steam, playstation, xbox, nintendo, musica, instrumento, guitarra, pintura, manualidades, plantas, vivero, fotografia"),
  salidas: separar("salida, salidas, boliche, joda, entrada, entradas, recital, cine, teatro, fiesta, previa, after, karaoke, bowling, bar, pub, cerveceria, vinoteca, licoreria, birra, birrita, cerveza, chopp, pinta, porron, porrones, vino, vinito, champagne, champan, espumante, sidra, fernet, fernecito, tragos, trago, escabio, alcohol, whisky, whiskey, vodka, gin, ron, tequila, aperol, campari, gancia, vermut, cinzano, branca, cuba libre, mojito, daikiri, coctel, quilmes, brahma, stella, heineken, schneider, corona, imperial"),
  ropa: separar("ropa, zapatillas, zapatos, remera, pantalon, jean, jeans, campera, buzo, medias, peluqueria, barberia, barbero, corte de pelo, corte, manicura, perfumeria, perfume, shampoo, desodorante, crema, higiene, maquillaje"),
  salud: separar("farmacia, remedio, remedios, ibuprofeno, medico, medica, dentista, odontologo, psicologo, psicologa, terapia, kinesiologo, kine, prepaga, osde, swiss medical, galeno, medicus, obra social, analisis, laboratorio, optica, anteojos, veterinaria, veterinario"),
  regalos: separar("regalo, regalos, cumple, cumpleaños, navidad, dia de la madre, dia del padre"),
  servicios: separar("luz, edenor, edesur, gas, metrogas, naturgy, agua, aysa, internet, wifi, fibertel, telecentro, cablevision, personal, movistar, claro, celular, telefono, recarga, expensas, alquiler, limpieza, ferreteria, abl, rentas, arca, afip, monotributo, impuestos, impuesto, seguro de hogar, plomero, electricista, gasista"),
  deudas: separar("deuda, deudas, devolver, devolucion, prestamo, cuota, cuotas, tarjeta, resumen de la tarjeta"),
  edu: separar("curso, cursos, libro, libros, clase, clases, udemy, facultad, facu, colegio, escuela, jardin, cuota escolar, utiles, fotocopias, apuntes, ingles"),
};

export const LEXICO_INGRESO = {
  sueldo: separar("sueldo, salario, aguinaldo, jubilacion, jornal, quincena, recibo, me pagaron el sueldo, me pago el sueldo, me deposito el sueldo, me depositaron el sueldo"),
  extra: separar("la changa, freelance, extra, changa, changuita, venta, vendi, vendimos, honorarios, factura, propina, propinas, bono, comision, laburo, cliente, gane, ganamos"),
  regalo_in: separar("me regalaron, me regalo, regalo recibido, recibi de regalo"),
  otros_in: separar("me pago, reintegro, devolucion, asignacion, auh, beca"),
};

// Palabras que dicen que entró plata.
const P = (t) => new RegExp("(^|[^a-zñ])(" + t + ")($|[^a-zñ])");
// Estas dicen que entró, salvo que nombren algo en lo que se gasta: "me llegó la luz, 20 mil" es un gasto.
export const ES_SUMAR = P("sumame|sumale|sumar|suma|sumemos|ingresame|ingresa|acreditame|acredita|cargame plata|me llego|me llegaron|me cayo|me cayeron");
export const ES_INGRESO = P("sumame|sumale|sumar|suma|sumemos|ingresame|ingresa|acreditame|acredita|cargame plata|me llego|me llegaron|me cayo|me cayeron|me reintegraron|me reintegro|me acreditaron|me acredito|me ingresaron|a favor|sueldo|salario|aguinaldo|jubilacion|cobr[eo]|cobramos|ingreso|ingresaron|recibi|recibimos|gane|ganamos|entro|entraron|me entro|me entraron|me pagaron|me pago|me depositaron|me deposito|me transfirieron|me transfirio|me pasaron|me paso|me devolvieron|me devolvio|me regalaron|me regalo|me dio|me dieron|me mando|me mandaron|me giro|me giraron|me presto|me prestaron|regalo recibido|recibi de regalo|changa|changuita|vendi|vendimos|reintegro|propina|propinas|quincena");
// Palabras que dicen que salió plata. Se miran primero: "me cobró el plomero" y "le pasé a mi hermana" son gastos.
export const ES_GASTO = P("restame|restale|restar|resta|sacame|saca|sacale|descontame|descontale|descontá|desconta|quitame|quita|me robaron|se me fue|se me fueron|me cobr(o|aron)|me sacaron|me debitaron|me descontaron|le (pase|pague|di|dimos|dio|transferi|mande|deposite|preste|devolvi|gire|compre|regale)|gaste|gastamos|me gaste|pague|pagamos|compre|compramos|deje|saque|aboné|abone|perdi");
// Si entró o salió plata, según cómo está dicho. Sin ninguna pista, es un gasto.
export const tipoDe = (plano) => (ES_GASTO.test(plano) ? "gasto" : ES_INGRESO.test(plano) ? "ingreso" : "gasto");
