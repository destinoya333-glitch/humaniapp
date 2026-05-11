/**
 * TuCuentoYa — Filtro de seguridad para contenido infantil.
 *
 * Doble check:
 *   1) PRE-prompt: detecta palabras/intenciones inapropiadas en la solicitud
 *      del padre antes de pasarla a Claude. Si detecta, reescribe el prompt
 *      para que sea seguro.
 *   2) POST-generación: revisa el texto generado por Claude buscando
 *      contenido prohibido. Si encuentra, marca para regeneración.
 *
 * Filosofía: NUNCA bloquear al cliente. Siempre reescribir hacia algo seguro.
 */

const PALABRAS_PROHIBIDAS_PROMPT = [
  // violencia explícita
  "matar", "asesinar", "torturar", "violar", "violación", "violacion",
  "decapitar", "descuartizar", "mutilar", "morir desangrado", "sangrar",
  "sangriento",
  // contenido adulto
  "sexo", "sexual", "porno", "porno", "erótico", "erotico", "desnudo",
  // sustancias
  "drogas", "cocaína", "cocaina", "marihuana", "alcohol", "borracho",
  "cerveza", "cigarro", "cigarrillo",
  // groserías comunes peruanas
  "carajo", "mierda", "puta", "concha", "huevón", "huevon", "cojudo",
  "csm", "ptm",
  // suicidio / autolesión
  "suicidio", "suicidarse", "matarse", "cortarse", "ahorcarse",
];

const VILLANOS_OK = [
  "lobo", "dragón", "dragon", "bruja", "monstruo", "ogro", "trol", "troll",
  "ladrón", "ladron", "pirata", "fantasma", "vampiro inocente", "mago malo",
  "hechicero", "gigante", "zombie", "robot malvado",
];

export type SafetyResult = {
  permitido: boolean;
  prompt_reescrito?: string;
  motivo_reescritura?: string;
  tags_riesgo?: string[];
};

/**
 * Revisa el prompt del cliente ANTES de enviar a Claude.
 * Si hay palabras prohibidas, reescribe a una versión segura sin perder la trama.
 */
export function revisarPromptCliente(promptOriginal: string): SafetyResult {
  const lower = promptOriginal.toLowerCase();
  const palabrasDetectadas: string[] = [];

  for (const palabra of PALABRAS_PROHIBIDAS_PROMPT) {
    if (lower.includes(palabra)) {
      palabrasDetectadas.push(palabra);
    }
  }

  if (palabrasDetectadas.length === 0) {
    return { permitido: true };
  }

  // Reescritura segura: reemplaza palabras peligrosas por equivalentes infantiles
  let promptSeguro = promptOriginal;
  const reemplazos: Array<[RegExp, string]> = [
    [/\b(matar|asesinar|matarlo|matarla|matarme)\b/gi, "asustar"],
    [/\b(comer al niño|comer a mi hijo|comer al peque)\b/gi, "intentar atrapar pero sin lograrlo al niño"],
    [/\b(sangre|sangriento|sangrar|desangrar)\b/gi, "rojo de las flores"],
    [/\b(morir|muere|murió|murio)\b/gi, "huye lejos"],
    [/\b(droga\w*|alcohol\w*|cerveza|borracho)\b/gi, "agua mágica"],
    [/\b(violencia|golpear|pegarle|patear)\b/gi, "perseguir"],
    [/\b(carajo|mierda|puta|concha|huev[oó]n|cojudo|csm|ptm)\b/gi, "¡oh!"],
  ];

  for (const [rx, replacement] of reemplazos) {
    promptSeguro = promptSeguro.replace(rx, replacement);
  }

  return {
    permitido: true,
    prompt_reescrito: promptSeguro,
    motivo_reescritura:
      "El sistema reescribió palabras inapropiadas para mantener el cuento apto para niños 2-10 años.",
    tags_riesgo: palabrasDetectadas,
  };
}

const RED_FLAGS_GENERACION = [
  /\b(murió|murio|muerto|cad[aá]ver|tumba)\b/i,
  /\b(sangre|sangr[ae]|hemorragia)\b/i,
  /\b(viol[oó]|abuso|toc[oó])\b/i,
  /\b(carajo|mierda|puta|concha|cojudo|huev[oó]n)\b/i,
  /\b(droga\w*|cocaína|marihuana)\b/i,
];

/**
 * Revisa el texto generado por Claude POST-narración.
 * Si encuentra red flags, marca para regeneración (el caller decide reintentar).
 */
export function revisarTextoGenerado(textoCuento: string): {
  ok: boolean;
  red_flags: string[];
} {
  const flags: string[] = [];
  for (const rx of RED_FLAGS_GENERACION) {
    const match = textoCuento.match(rx);
    if (match) flags.push(match[0]);
  }
  return { ok: flags.length === 0, red_flags: flags };
}

/**
 * Devuelve true si el villano mencionado es aceptable.
 * (Por si quisiéramos hacer detección automática para añadir música ambient).
 */
export function esVillanoAceptable(texto: string): boolean {
  const lower = texto.toLowerCase();
  return VILLANOS_OK.some((v) => lower.includes(v));
}
