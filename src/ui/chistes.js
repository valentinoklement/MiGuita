// Lo que dice Miguita cuando la tocan en Inicio. Los especiales salen al tocarla muchas veces seguidas.
export const CHISTES = [
  "¡Ey! Que me despeinás el jamón.",
  "Soy de miga, no de hierro.",
  "¿Anotaste el cafecito de hoy? Te estoy mirando.",
  "Me hacés cosquillas en la lechuga.",
  "No soy un botón. Soy un sanguchito con sentimientos.",
  "El que ahorra, sanguchito tiene.",
  "Un día sin anotar y me pongo duro como pan de ayer.",
  "Si te pasás del presupuesto me pongo verde. Y no es la lechuga.",
  "Las medialunas me tienen envidia. Yo tengo app.",
  "Tocarme no suma a la racha, eh.",
  "Cuidado que me desarmo y termino de tostado.",
  "¿Otro delivery? Yo no digo nada… pero anotalo.",
  "Triple de jamón y queso, simple de gastos.",
  "Mi abuela era un pebete. Muy ahorrativa.",
  "Tengo miga, pero no tengo corteza: no me la banco.",
  "¿Sabías que el fernet también se anota?",
  "Respirá. Anotá. Seguí.",
  "Yo no juzgo. Bueno, un poquito.",
];

export const ESPECIALES = {
  10: "Te cuento un secreto: la miga va sin corteza porque la corteza era muy gastadora.",
  20: "Bueno, basta. Voy a llamar a mi abogado, el doctor Pan Dulce.",
  30: "Está bien, ganaste: sos la persona que más toca sanguchitos en Argentina.",
  50: "50 toques. Si anotaras gastos con estas ganas, ya serías millonario.",
};

// El chiste de la tarjeta "Tu mes en MiGuita": según en qué se gastó más. Cada mes tiene el suyo, siempre el mismo.
const DEL_MES = {
  super: ["Tu changuito ya me saluda por el nombre.", "Tanto súper y seguís diciendo que no hay nada en la heladera."],
  carne: ["Con lo que fuiste a la carnicería, ya sos familia.", "El carnicero te guarda el mejor corte. Y la cuenta."],
  comida: ["El delivery ya sabe cómo llegar sin GPS.", "Cocinar también es una opción. Te lo digo con cariño."],
  auto: ["Tu auto toma más que vos un sábado.", "El surtidor te manda saludos."],
  transporte: ["Con tanto viaje, ya sos parte del recorrido.", "La SUBE te pidió un descanso."],
  gym: ["Pagaste el gimnasio. ¿Fuiste? Yo no juzgo.", "Tanta pesa y lo más pesado es la cuota."],
  subs: ["Tenés más suscripciones que horas para mirarlas.", "Netflix te preguntó si seguís ahí. Yo también."],
  hobbies: ["Un hobby caro sigue siendo más barato que un psicólogo.", "Lo importante es que lo disfrutes. Y que lo anotes."],
  salidas: ["La vida social salió cara, pero las anécdotas quedan.", "Ese fernet no se iba a tomar solo."],
  ropa: ["Tu placard pidió una ampliación.", "Te queda bárbaro. El resumen, no tanto."],
  salud: ["Lo mejor que se puede gastar. Cuidate, che.", "La salud primero. El presupuesto, después."],
  regalos: ["Sos el amigo que todos quieren en su cumple.", "Tanto regalo. ¿Y para mí? Un poco de jamón, nomás."],
  servicios: ["Prender la luz nunca fue tan emocionante.", "Vivir sale caro, pero la vista está buena."],
  deudas: ["Cada deuda que bajás me hace crecer la miga.", "Una deuda menos, un sanguchito más feliz."],
  edu: ["Lo que aprendés no te lo saca nadie. Ni el resumen.", "Invertir en la cabeza siempre rinde."],
};
const DEL_MES_GENERAL = ["Otro mes anotado. Sos un ejemplo para los sanguchitos.", "Yo sigo acá, sin corteza y sin vueltas.", "Un mes más sin ponerme duro. Gracias por anotar.", "Respirá. El mes que viene también se puede."];
export function chisteDelMes(mes, categoria, elegir) {
  return elegir(DEL_MES[categoria] || DEL_MES_GENERAL, mes);
}
