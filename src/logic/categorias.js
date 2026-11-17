// Categorías y medios de pago por defecto, generales para cualquier persona en Argentina.
// Cada uno tiene un id fijo: los movimientos guardan el id, así renombrar no rompe nada.
// La persona puede renombrar, ocultar, agregar y sumar palabras clave (se guarda en config).

export const GASTO = [
  ["super", "Súper/almacén", ["super", "súper", "almacen", "almacén", "chino", "dietetica", "dietética", "mercado", "coto", "dia", "carrefour", "jumbo", "vea", "disco", "changomas", "la anonima", "la anónima", "makro", "vital"]],
  ["carne", "Carnicería", ["carni", "carnicería", "carniceria", "pollo", "carne", "cuadril", "bife", "cerdo", "asado", "pescaderia", "pescadería"]],
  ["verduleria", "Verdulería", ["verdu", "verduleria", "verdulería", "fruta", "verdura"]],
  ["panaderia", "Panadería", ["panaderia", "panadería", "pan", "facturas", "medialunas", "tortitas", "masitas"]],
  ["comida", "Comer afuera", ["delivery", "pedidosya", "rappi", "resto", "restaurant", "pizza", "empanadas", "burger", "hamburguesa", "sushi", "almuerzo", "cena", "café", "cafe", "helado", "kiosco", "golosina", "mcdonalds", "mostaza"]],
  ["auto", "Nafta/auto", ["nafta", "combustible", "ypf", "shell", "axion", "puma", "gnc", "estacion", "estación", "peaje", "estacionamiento", "lavado", "mecanico", "mecánico", "auto", "gomeria", "gomería", "seguro del auto", "patente", "vtv"]],
  ["transporte", "Transporte", ["colectivo", "bondi", "sube", "uber", "cabify", "didi", "taxi", "remis", "tren", "subte", "micro"]],
  ["gym", "Gimnasio", ["gym", "gimnasio", "gimnasia", "pileta", "yoga", "pilates", "suplemento", "proteina", "proteína", "creatina"]],
  ["subs", "Suscripciones", ["spotify", "netflix", "youtube", "disney", "prime", "max", "icloud", "google one", "suscripcion", "suscripción", "paramount", "star+"]],
  ["hobbies", "Hobbies", ["hobby", "juego", "steam", "playstation", "xbox", "nintendo", "musica", "música", "instrumento", "pintura", "manualidades", "plantas", "fotografia", "fotografía"]],
  ["salidas", "Salidas", ["salida", "boliche", "entrada", "recital", "cine", "teatro", "fiesta", "previa", "bar", "birra", "cerveza", "vino", "fernet", "trago"]],
  ["viajes", "Viajes", ["viaje", "vacaciones", "hotel", "alojamiento", "hostel", "vuelo", "pasaje de avión"]],
  ["ropa", "Ropa/personal", ["ropa", "zapatillas", "remera", "pantalon", "pantalón", "peluqueria", "peluquería", "corte", "perfumeria", "perfumería", "higiene", "maquillaje"]],
  ["salud", "Salud", ["farmacia", "remedio", "medico", "médico", "dentista", "psicologo", "psicólogo", "obra social", "prepaga", "analisis", "análisis", "optica", "óptica"]],
  ["regalos", "Regalos", ["regalo", "cumple", "cumpleaños"]],
  ["servicios", "Servicios", ["luz", "gas", "agua", "internet", "celular", "telefono", "teléfono", "recarga", "expensas", "alquiler", "limpieza", "abl"]],
  ["deudas", "Deudas", ["deuda", "devolver", "prestamo", "préstamo", "cuota"]],
  // Pagar el resumen de la tarjeta. Las marcas (visa, mastercard…) están en lexico.js y no acá: así, si alguien se arma
  // su propia «Tarjeta Visa» con la palabra «visa», gana la suya.
  ["tarjeta", "Pago de tarjeta", ["tarjeta", "resumen de la tarjeta"]],
  ["edu", "Educación", ["curso", "libro", "clase", "udemy", "facultad", "colegio", "cuota escolar", "utiles", "útiles"]],
  ["trabajo", "Trabajo/insumos", ["herramientas", "insumos", "materiales"]],
  ["mascotas", "Mascotas", ["veterinaria", "alimento balanceado", "mascota"]],
  ["casa", "Casa/hogar", ["ferreteria", "ferretería", "muebles", "bazar", "arreglos"]],
  ["otros", "Otros", []],
];
// Las que se sumaron después de que la app ya estaba en uso: la migración se las agrega a quien ya la usaba (ver migraciones.js).
export const NUEVAS_V10 = ["trabajo", "mascotas", "casa", "tarjeta", "viajes"];
// Si la persona ya se había armado una con alguno de estos nombres, esa es la suya: no se le suma otra igual.
export const TAMBIEN_SE_LLAMA = { tarjeta: ["tarjeta", "tarjetas", "tarjeta de credito", "pago tarjeta", "pago de la tarjeta"], viajes: ["viaje", "vacaciones", "turismo"] };

export const INGRESO = [
  ["extra", "Trabajo/changas", ["trabajo", "laburo", "freelance", "extra", "changa", "venta", "honorarios", "bono"]],
  ["sueldo", "Sueldo", ["sueldo", "salario"]],
  ["regalo_in", "Regalo recibido", ["regalo"]],
  ["otros_in", "Otros ingresos", []],
];

export const MEDIOS = [["debito", "Débito"], ["efectivo", "Efectivo"], ["mp", "Billetera virtual"], ["credito", "Crédito"], ["transferencia", "Transferencia"], ["cripto", "Cripto"]];

// La billetera que usa cada persona: es el nombre del medio "mp". Si no eligió ninguna, queda el nombre general.
export const BILLETERA_GENERAL = "Billetera virtual";
export const BILLETERAS = ["Mercado Pago", "Ualá", "MODO", "Naranja X", "Personal Pay", "Cuenta DNI"];
export function ponerBilletera(medios, nombre) {
  const n = String(nombre ?? "").trim().slice(0, 30);
  return medios.map((m) => (m.id === "mp" ? { ...m, nombre: n || BILLETERA_GENERAL, oculto: n ? false : m.oculto } : m));
}

// La última de cada lista es la de "no sé": no se puede ocultar y es la que se usa si nada coincide.
export const RESPALDO = { gasto: "otros", ingreso: "otros_in" };

export function categoriasIniciales() {
  const armar = (lista) => lista.map(([id, nombre, claves]) => ({ id, nombre, claves: [...claves], oculta: false }));
  return { gasto: armar(GASTO), ingreso: armar(INGRESO) };
}

export function mediosIniciales() {
  return MEDIOS.map(([id, nombre]) => ({ id, nombre, oculto: false }));
}

// Para adivinar al anotar: [[id, claves]], con la de respaldo al final.
export function paraAdivinar(cats, tipo) {
  const lista = cats[tipo].filter((c) => !c.oculta && c.id !== RESPALDO[tipo]).map((c) => [c.id, c.claves]);
  return [...lista, [RESPALDO[tipo], []]];
}

export function buscar(cats, id) {
  return cats.gasto.find((c) => c.id === id) || cats.ingreso.find((c) => c.id === id) || null;
}
