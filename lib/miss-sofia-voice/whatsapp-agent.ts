/**
 * Miss Sofia — WhatsApp funnel del Método Cuna.
 *
 * Reemplaza el funnel viejo (test 8 preguntas CEFR + 8 ejercicios práctica)
 * por el onboarding del Método Cuna:
 *
 *   greeting       → Sofia se presenta + propone Pacto Cuna
 *   pacto_name     → captura nombre
 *   pacto_city     → captura ciudad
 *   pacto_motiv    → captura motivación (1-5)
 *   pacto_minutes  → captura compromiso de tiempo diario (1-3)
 *   pacto_commit   → confirma compromiso 30 días silenciosos (sí/no)
 *   dia_uno_sent   → primer audio Cuna enviado, espera 👍/👎
 *   done           → empuja a app web para crear cuenta
 *   converted      → ya tiene cuenta, redirige
 *
 * Pipeline lead → app web. Conversión real arranca en /api/conversation/start.
 */
import { createClient } from "@supabase/supabase-js";
import {
  WhatsAppLead,
  appendMessage,
  getOrCreateLead,
  updateLead,
} from "./whatsapp-leads";
import { cleanTextForTTS } from "./ai/elevenlabs";
import { synthesizeForPlan } from "./ai/tts-router";
import { buildCapsuleLink } from "./capsule-link";
import { suggestedTopicsForPhase } from "./passage-engine";

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rfpmvnoaqibqiqxrmheb.supabase.co"
)
  .trim()
  .replace(/\/$/, "");

const SIGNUP_LINK_BASE = "https://activosya.com/sofia-auth/signup";
const CUNA_BUCKET = "sofia-tts";
const CUNA_DIA_UNO_PATH = "cuna/dia-1-bienvenida.mp3";

// =====================================================================
// Reply type (kept compatible with the existing webhook route)
// =====================================================================

export type AgentReply = {
  text?: string;
  mediaUrl?: string;
  templateSid?: string;
  variables?: Record<string, string>;
  practiceExerciseId?: number; // legacy field, kept for webhook backwards compat
};

// =====================================================================
// Lookup tables — short, scannable, easy to edit copy
// =====================================================================

type PactoData = {
  name?: string;
  city?: string;
  motivation?: string;
  minutes_per_day?: number;
  committed?: boolean;
};

const MOTIVATIONS: Record<string, string> = {
  "1": "Trabajo / chamba",
  "2": "Viajar al extranjero",
  "3": "Ver series/Netflix sin subs",
  "4": "Hablarle a mi familia/hijos",
  "5": "Otro",
};

const MINUTES_OPTIONS: Record<string, number> = {
  "1": 5,
  "2": 10,
  "3": 20,
};

// =====================================================================
// Greeting — pitch del Método Cuna (sin test CEFR)
// =====================================================================

const GREETING_TEXT = `Hola, soy Miss Sofia, profesora de inglés. 👋

Acá no vas a hacer un test de gramática ni vas a memorizar listas. Mi método se llama *Cuna* y es distinto: aprendes inglés como aprendiste español de niño — escuchando, viviendo, sin presión.

🎁 *Tu primera semana es gratis.* Solo necesito 2 minutos para conocerte y armar tu Pacto Cuna. ¿Empezamos?

Responde *sí* para arrancar.`;

const RESET_TEXT = `Reiniciado. 🔄

Hola, soy Miss Sofia.

Vamos a arrancar tu *Método Cuna* — aprende inglés como aprendiste español. Solo necesito 2 minutos. Responde *sí* para empezar.`;

// =====================================================================
// Helpers
// =====================================================================

function isYes(msg: string): boolean {
  return /\b(s[ií]|yes|ok|okey|dale|listo|empecemos|empezar|claro|por\s+supuesto|of\s+course|vamos|adelante|arranquemos|obvio|seguro|perfecto|excelente|por\s+favor|please|me\s+interesa|quiero|deseo|necesito|ay[uú]dame|enseña|enseñame|comencemos|continua|sigue)\b/i.test(
    msg.trim()
  );
}

function isLearningIntent(msg: string): boolean {
  return /\b(ingl[eé]s|english|aprender|estudiar|clase|lecci[oó]n|profesor|profesora|maestra|método|cuna|hablar|conversar|practicar)\b/i.test(
    msg.trim()
  );
}

function isNo(msg: string): boolean {
  const s = msg.trim().toLowerCase();
  return /^(no|nope|nada|paso|despu[eé]s|otro\s+d[ií]a|nah|ahorita\s+no)$/i.test(s);
}

function isResetCommand(msg: string): boolean {
  return /^(hola|menu|men[uú]|empezar|empieza|reiniciar|reset|inicio|start|nuevo|otra\s+vez|de\s+nuevo|comenzar)$/i.test(
    msg.trim()
  );
}

/**
 * Detecta cuando el usuario pide su cápsula APA — incluye:
 *  - texto exacto del botón URL del template "Abrir mi capsula"
 *  - variantes con/sin acento, mayúsculas
 *  - palabra suelta "capsula" / "cápsula"
 *  - "capsula apa", "cápsula del día", etc.
 */
function isCapsulaRequest(msg: string): boolean {
  const s = msg.trim().toLowerCase();
  if (/^abrir\s+mi\s+c[aá]psula$/i.test(s)) return true;
  if (/^c[aá]psula(\s+apa)?$/i.test(s)) return true;
  if (/c[aá]psula\s+(apa|del\s+d[ií]a|de\s+hoy|de\s+ingl[eé]s|teacher\s*poli)/i.test(s)) return true;
  if (/(abre|abrir|ver|quiero|dame|ir\s+a|empezar)\s+(mi\s+)?c[aá]psula/i.test(s)) return true;
  return false;
}

/**
 * Construye respuesta con link directo a /sofia-capsule. Si el lead tiene
 * user_id (cuenta creada en mse_users), firma el link con HMAC para
 * auto-arrancar la cápsula con un tópico fase-apropiado. Si no, manda link
 * genérico al picker.
 */
async function buildCapsulaReply(lead: WhatsAppLead): Promise<AgentReply> {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://sofia.activosya.com").replace(
    /\/$/,
    ""
  );

  // Intentar resolver user_id + phase desde mse_users + mse_student_profiles
  let userId: string | null = null;
  let phase = 0;
  try {
    const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: user } = await supabase
      .from("mse_users")
      .select("id")
      .eq("whatsapp_phone", lead.phone.startsWith("+") ? lead.phone : `+${lead.phone}`)
      .maybeSingle();
    if (user?.id) {
      userId = (user as { id: string }).id;
      const { data: profile } = await supabase
        .from("mse_student_profiles")
        .select("current_phase")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.current_phase != null) {
        phase = (profile as { current_phase: number }).current_phase;
      }
    }
  } catch (e) {
    console.error("[buildCapsulaReply lookup err]", e);
  }

  if (!userId) {
    // No tiene cuenta — mandar al picker genérico
    return plain(
      `Acá tienes tu cápsula APA:\n\n${baseUrl}/sofia-capsule\n\n` +
      `Si no tienes cuenta, te pide crearla en 30 segundos.`
    );
  }

  // Tópico fase-apropiado determinístico por día
  const suggestions = suggestedTopicsForPhase(phase as 0 | 1 | 2 | 3 | 4 | 5);
  const idx =
    (parseInt(userId.replace(/-/g, "").slice(0, 8), 16) + new Date().getDate()) %
    suggestions.length;
  const topic = suggestions[idx];
  const difficulty: "easy" | "medium" | "hard" =
    phase <= 1 ? "easy" : phase <= 3 ? "medium" : "hard";

  const link = buildCapsuleLink({
    baseUrl,
    userId,
    topic,
    difficulty,
    ttlSeconds: 60 * 60 * 36,
  });

  return plain(
    `Tu cápsula APA está lista. Hoy es sobre *${topic}* — toca el link:\n\n` +
    `${link}\n\n` +
    `Te toma 5-10 min: pasaje narrado, conversación conmigo y quiz con tus correcciones tipo Teacher Poli.`
  );
}

function pickOption(msg: string, validKeys: string[]): string | null {
  const s = msg.trim().toLowerCase();
  // Direct number "1", "2", "3"...
  for (const k of validKeys) {
    if (s === k || s.startsWith(`${k}.`) || s.startsWith(`${k})`) || s.startsWith(`${k} `)) {
      return k;
    }
  }
  return null;
}

function pactoFromLead(lead: WhatsAppLead): PactoData {
  const data = (lead.chat_data ?? {}) as PactoData;
  return data;
}

function plain(text: string, mediaUrl?: string): AgentReply {
  return { text, mediaUrl };
}

// =====================================================================
// Audio Día 1 — pre-generado y cacheado en bucket sofia-tts
// =====================================================================

const DIA_UNO_AUDIO_TEXT = `Hola. Soy Sofia. Welcome. Este es tu primer minuto de inglés.

Cierra los ojos. Don't translate. Just listen.

Today, you started something different. You did not study English. You started LIVING in English. Just like a baby. No pressure. No grammar. Solo escuchar.

Eso es todo por hoy. Mañana sigue tu historia. Hasta mañana.`;

/**
 * Returns the public URL of the cached "Día 1" welcome audio.
 * If the file doesn't exist in the bucket, generate it on demand with
 * ElevenLabs and upload it. Subsequent calls reuse the cached URL.
 *
 * Returns null if ElevenLabs is not configured AND the file isn't cached.
 */
export async function getDiaUnoAudioUrl(): Promise<string | null> {
  // Optimistic public URL — if file exists, this just works.
  const candidateUrl = `${SUPABASE_URL}/storage/v1/object/public/${CUNA_BUCKET}/${CUNA_DIA_UNO_PATH}`;

  try {
    const head = await fetch(candidateUrl, { method: "HEAD" });
    if (head.ok) return candidateUrl;
  } catch {
    // network blip — fall through to generation attempt
  }

  // Audio Día 1 = momento HERO → siempre ElevenLabs Sofia (la magia)
  // Si no hay ningún TTS configurado, retorna null (caller usa fallback texto).
  try {
    const tts = await synthesizeForPlan({
      text: cleanTextForTTS(DIA_UNO_AUDIO_TEXT),
      plan: "premium", // forzar hero context
      context: "hero",
    });
    if (!tts) return null;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await supabase.storage.from(CUNA_BUCKET).upload(
      CUNA_DIA_UNO_PATH,
      tts.audioBuffer,
      { contentType: tts.contentType, upsert: true }
    );
    if (error) {
      console.error("getDiaUnoAudioUrl: upload failed:", error);
      return null;
    }
    return candidateUrl;
  } catch (e) {
    console.error("getDiaUnoAudioUrl: generation failed:", e);
    return null;
  }
}

// =====================================================================
// State handlers
// =====================================================================

async function handleGreeting(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  // Sí explícito O intent claro ("quiero aprender inglés", "ayúdame con inglés", etc)
  if (isYes(msg) || isLearningIntent(msg)) {
    await updateLead(lead.phone, { chat_state: "pacto_name" });
    return plain(`Excelente. Vamos a armar tu Pacto Cuna en 4 pasos rápidos.\n\n*1/4* — ¿Cómo te llamo? Solo tu primer nombre.`);
  }
  if (isNo(msg)) {
    return plain(
      `Sin problema. Cuando quieras empezar, escríbeme y arrancamos.`
    );
  }
  // Default: re-pitch
  return plain(GREETING_TEXT);
}

async function handlePactoName(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const name = msg.trim().split(/\s+/)[0].slice(0, 30);
  if (!name || name.length < 2) {
    return plain(`Necesito un nombre. ¿Cómo te llamo?`);
  }
  const data: PactoData = { ...pactoFromLead(lead), name };
  await updateLead(lead.phone, {
    chat_state: "pacto_city",
    chat_data: data,
    name,
  });
  return plain(
    `Mucho gusto, ${name}.\n\n*2/4* — ¿De qué ciudad eres? (Lima, Trujillo, Bogotá, la que sea.)`
  );
}

async function handlePactoCity(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const name = pactoFromLead(lead).name;
  const city = msg.trim().slice(0, 50);
  if (!city || city.length < 2) {
    return plain(`${name ? name + ", " : ""}solo dime tu ciudad.`);
  }
  const data: PactoData = { ...pactoFromLead(lead), city };
  await updateLead(lead.phone, { chat_state: "pacto_motiv", chat_data: data });
  return plain(
    `Perfect.\n\n*3/4* — ¿Por qué quieres aprender inglés? Responde con un número:\n\n*1.* Trabajo\n*2.* Viajar al extranjero\n*3.* Ver series sin subtítulos\n*4.* Hablarle a mi familia/hijos\n*5.* Otro`
  );
}

async function handlePactoMotiv(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const choice = pickOption(msg, Object.keys(MOTIVATIONS));
  if (!choice) {
    return plain(`Responde con un número del 1 al 5.`);
  }
  const motivation = MOTIVATIONS[choice];
  const data: PactoData = { ...pactoFromLead(lead), motivation };
  await updateLead(lead.phone, { chat_state: "pacto_minutes", chat_data: data });
  return plain(
    `*"${motivation}"* — anotado.\n\n*4/4* — ¿Cuánto tiempo al día puedes dedicarle? Sé honesto:\n\n*1.* 5 min al día (mínimo)\n*2.* 10 min al día (recomendado)\n*3.* 20 min al día (intensivo)`
  );
}

async function handlePactoMinutes(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const choice = pickOption(msg, Object.keys(MINUTES_OPTIONS));
  if (!choice) {
    return plain(`Responde 1, 2 o 3.`);
  }
  const minutes = MINUTES_OPTIONS[choice];
  const data: PactoData = { ...pactoFromLead(lead), minutes_per_day: minutes };
  await updateLead(lead.phone, { chat_state: "pacto_commit", chat_data: data });
  const name = data.name;
  return plain(
    `${minutes} minutos al día${name ? ", " + name : ""}. Anotado.\n\n*ÚLTIMO PASO — el Pacto Cuna:*\n\nLos próximos *30 días* eres un bebé escuchando inglés. Voy a mandarte audios cortos y misiones suaves. *NO te voy a pedir que hables en inglés todavía.* Tu cerebro necesita escuchar primero, igual que escuchaste español 12 meses antes de decir "mamá".\n\n¿Te comprometes? Responde *sí* para sellar el pacto.`
  );
}

async function handlePactoCommit(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const name = pactoFromLead(lead).name;
  if (isNo(msg)) {
    return plain(
      `Sin compromiso, no hay método.\n\nSi cambias de idea, escríbeme y arrancamos.`
    );
  }
  if (!isYes(msg)) {
    return plain(`${name ? name + ", n" : "N"}ecesito un *sí* o *no* claro.`);
  }

  const data: PactoData = { ...pactoFromLead(lead), committed: true };
  await updateLead(lead.phone, {
    chat_state: "dia_uno_sent",
    chat_data: data,
    status: "test_done", // re-uses existing status enum; means "ready to convert"
  });

  const audioUrl = await getDiaUnoAudioUrl();
  const intro = `🤝 *Pacto sellado${name ? ", " + name : ""}.*\n\nBienvenido a tu *Día 1 de la Fase Cuna*. 🌙\n\nAhora escucha esto. No traduzcas. No repitas. Solo escucha (90 segundos):`;

  if (!audioUrl) {
    return plain(
      `${intro}\n\n_(Audio no disponible. Lee este texto en silencio:_ "Today you started something different. You did not study English. You started LIVING in English.")\n\nDespués responde *👍* si entendiste algo o *👎* si no. Cualquier respuesta vale.`
    );
  }

  return plain(intro, audioUrl);
}

function isSaludoRecurrente(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  return /^(hola|buenas|buenos d[ií]as|buen d[ií]a|menu|menú|hey|qu[eé] tal|como vas|sof[ií]a|hello|hi)$/i.test(t);
}

function hasPaidPlan(lead: WhatsAppLead): boolean {
  const status = String(lead.status || "");
  if (status === "paid_regular" || status === "paid_premium") return true;
  const cd = (lead.chat_data as Record<string, unknown>) || {};
  if (cd.plan === "regular" || cd.plan === "premium") {
    const until = cd.plan_active_until as string | undefined;
    if (until && new Date(until) > new Date()) return true;
  }
  return false;
}

function planLabel(lead: WhatsAppLead): string {
  const cd = (lead.chat_data as Record<string, unknown>) || {};
  const plan = cd.plan as string | undefined;
  const billing = cd.billing as string | undefined;
  const p = plan === "premium" ? "Premium" : plan === "regular" ? "Regular" : "Free";
  const b = billing === "yearly" ? "Anual" : billing === "monthly" ? "Mensual" : "";
  return `${p} ${b}`.trim();
}

function bienvenidaPagado(lead: WhatsAppLead): string {
  const name = (lead.name as string)?.split(/\s+/)[0] || "";
  const label = planLabel(lead);
  return (
    `¡Hola${name ? " " + name : ""}! 👋\n\n` +
    `💎 *Plan ${label} activo* — tienes acceso a todas las clases.\n\n` +
    `🎯 *¿Qué quieres hacer ahora?*\n` +
    `• Escribe *practica* — empezamos sesión live de inglés\n` +
    `• Escribe *audio* — tu siguiente lección Cuna\n` +
    `• Escribe *progreso* — ver cómo vas\n` +
    `• Escribe *pronunciacion* — test de pronunciación\n\n` +
    `O escríbeme cualquier cosa en *inglés o español* y conversamos. Cada conversación es tu lección. ✨`
  );
}

function bienvenidaRecurrente(name: string | undefined): string {
  const n = name ? `, ${name}` : "";
  return (
    `¡Hola${n}! 👋 Qué bueno tenerte de vuelta.\n\n` +
    `¿Qué quieres hacer hoy?\n\n` +
    `🎧 Escribe *continuar* — siguiente lección de tu Fase Cuna\n` +
    `💎 Escribe *pago* — activa tu plan completo (Regular S/39 o Premium S/89)\n` +
    `📊 Escribe *progreso* — ver cómo vas\n` +
    `🎤 Escribe *pronunciacion* — practicar tu pronunciación\n` +
    `⚙️ Escribe *plan* — configurar tu rutina diaria\n\n` +
    `O hazme cualquier pregunta sobre el método ✨`
  );
}

async function handleDiaUnoSent(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const trimmed = msg.trim();
  const name = pactoFromLead(lead).name;

  // Cliente recurrente: si dice "hola"/"menu" en lugar de 👍/👎, dar bienvenida
  if (isSaludoRecurrente(trimmed)) {
    return plain(bienvenidaRecurrente(name));
  }

  const isPositive = /👍|listo|ok|s[ií]|entend[ií]|me\s+gust[oó]/i.test(trimmed);
  const isNegative = /👎|no\s+entend[ií]|nada|complicado|dif[ií]cil/i.test(trimmed);
  const link = `${SIGNUP_LINK_BASE}?phone=${encodeURIComponent(lead.phone)}`;

  if (!isPositive && !isNegative) {
    return plain(
      `Solo *👍* o *👎*. Cualquiera vale — es tu primer día.\n\n` +
      `Si quieres ver opciones, escribe *menu*.`
    );
  }

  const reaction = isPositive
    ? `Excelente. Tu cerebro YA empezó a calibrar el inglés. No te diste cuenta, pero algo cambió hoy.`
    : `Perfect.${name ? " " + name + "," : ""} eso significa que tu cerebro está empezando desde cero — exactamente donde queremos. En 30 días vas a entender ese mismo audio sin esfuerzo.`;

  await updateLead(lead.phone, { chat_state: "done" });

  return plain(
    `${reaction}\n\n💎 Para seguir y desbloquear tu novela personal (donde TÚ eres el protagonista), tienes 2 caminos:\n\n` +
    `1️⃣ Activa tu plan por WhatsApp — escribe *pago* y eliges plan (S/39 mensual)\n` +
    `2️⃣ Crea cuenta web (opcional) para ver dashboard:\n${link}\n\n` +
    `Escribe *menu* para volver al comienzo.`
  );
}

async function handleDone(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const trimmed = msg.trim();
  const name = pactoFromLead(lead).name;
  const link = `${SIGNUP_LINK_BASE}?phone=${encodeURIComponent(lead.phone)}`;

  // Cliente recurrente: si dice hola/menu, dar bienvenida con opciones
  if (isSaludoRecurrente(trimmed)) {
    return plain(bienvenidaRecurrente(name));
  }

  // "practica", "empezar", "ahora", "audio", "leccion" → arrancar sesión live
  if (/^(practica|practicar|empezar|empezamos|ahora|audio|lecci[oó]n|sesi[oó]n|arrancar|comenzar|listo|si|s[ií]\b)$/i.test(trimmed)) {
    return plain(
      `🎧 ${name ? "*" + name + "*, " : ""}vamos con tu sesión live de hoy.\n\n` +
      `Escríbeme *cualquier cosa en inglés* — una frase, una pregunta, lo que se te ocurra. Yo te corrijo y conversamos.\n\n` +
      `Ejemplo:\n_"Hi Sofia, today I went to the supermarket"_\n\n` +
      `O en español si te trabas. Yo te ayudo a traducirlo. ✨`
    );
  }

  // "continuar" → siguiente día
  if (/^continuar$/i.test(trimmed)) {
    return plain(
      `🎧 Tu próximo audio llega mañana en tu horario.\n\n` +
      `Si quieres practicar AHORA, escribe *practica* o solo escríbeme algo en inglés y conversamos.`
    );
  }

  // "reiniciar"
  if (/^reiniciar$/i.test(trimmed)) {
    await updateLead(lead.phone, { chat_state: "greeting", chat_data: {} });
    return plain(`Listo, empezamos de nuevo. Escribe *hola* para arrancar tu Pacto Cuna.`);
  }

  // Default: si lead tiene nombre, dar bienvenida; si no, ofrecer link
  if (name) {
    return plain(bienvenidaRecurrente(name));
  }
  return plain(
    `Tu Fase Cuna está lista.\n\nEscribe *menu* para ver opciones, *pago* para activar tu plan, o crea cuenta web acá:\n${link}`
  );
}

async function handleConverted(lead: WhatsAppLead, _msg: string): Promise<AgentReply> {
  return plain(
    `Hola. Ya tienes tu cuenta. Tus sesiones de voz Cuna están aquí:\n\nhttps://activosya.com/sofia-chat\n\nNos vemos.`
  );
}

/**
 * Handler para clientes con plan Regular o Premium activo.
 * No los pasa por el funnel gratis.
 */
async function handlePaidUser(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const trimmed = msg.trim();
  const name = (lead.name as string)?.split(/\s+/)[0] || "";

  // Saludo / menu — bienvenida con opciones
  if (isSaludoRecurrente(trimmed)) {
    return plain(bienvenidaPagado(lead));
  }

  // Comandos rápidos
  if (/^(practica|practicar|empezar|empezamos|ahora|arrancar|comenzar)$/i.test(trimmed)) {
    return plain(
      `🎧 ${name ? "*" + name + "*, " : ""}vamos con tu sesión live de inglés.\n\n` +
      `Escríbeme *cualquier cosa en inglés* — una frase, una pregunta, una historia. Yo te respondo en inglés (más despacio si necesitas), te corrijo y conversamos.\n\n` +
      `Ejemplo:\n_"Hi Sofia, today I went to the supermarket"_\n\n` +
      `O en español si te trabas. Te ayudo a traducirlo. ✨`
    );
  }

  if (/^audio$/i.test(trimmed)) {
    return plain(
      `🎧 Tu próximo audio Cuna llega *mañana en tu horario configurado*.\n\n` +
      `Si quieres practicar AHORA, escribe *practica* o solo escríbeme algo en inglés.`
    );
  }

  if (/^progreso$/i.test(trimmed)) {
    return plain(
      `📊 *Tu progreso* — voy a mostrar el dashboard.\n\n` +
      `(Próximamente: panel completo en activosya.com/sofia-chat)`
    );
  }

  if (/^pronunciaci[oó]n$/i.test(trimmed)) {
    return plain(
      `🎤 *Test de pronunciación*\n\n` +
      `Repite esta frase en inglés grabándola como audio:\n\n` +
      `_"Hello, my name is ${name || "Sofia"}, and I want to practice English every day."_\n\n` +
      `Envíame el audio cuando estés listo. Te puntúo 0-100.`
    );
  }

  // Default: pasar al modelo Claude para conversación libre con corrección
  // (el master-prompt ya tiene reglas de Sofia)
  try {
    const conv = await fetchConversationMessages(lead.phone, 10);
    conv.push({ role: "user", content: msg });
    const { callMissSofia } = await import("./ai/claude");
    const reply = await callMissSofia(conv);
    return plain(reply || "Cuéntame más, te escucho 👂✨");
  } catch (e) {
    console.error("[handlePaidUser claude err]", e);
    return plain(
      `${name ? name + ", " : ""}escríbeme algo en inglés y te respondo. O escribe *menu* para ver opciones.`
    );
  }
}

async function fetchConversationMessages(
  phone: string,
  limit: number,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const lead = await getOrCreateLead(phone);
  const msgs = Array.isArray(lead.chat_messages) ? lead.chat_messages : [];
  return msgs
    .slice(-limit)
    .filter((m): m is { role: "user" | "assistant"; content: string } =>
      typeof m === "object" && m !== null && (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
    );
}

// =====================================================================
// Main entry — process one WhatsApp message and return reply
// =====================================================================

export async function processWhatsAppMessage(
  phone: string,
  userMessage: string,
  tenantId: string | null = null
): Promise<AgentReply> {
  const lead = await getOrCreateLead(phone, tenantId);

  // ⚡ Detección temprana: usuario pidió su cápsula APA (botón del template
  // o texto manual "capsula"). Responde con el link directo sin importar
  // el estado del lead. Esto evita que Sofia conversational se confunda
  // con "cápsula del tiempo" u otras malinterpretaciones.
  if (isCapsulaRequest(userMessage)) {
    await appendMessage(phone, "user", userMessage);
    const reply = await buildCapsulaReply(lead);
    await appendMessage(phone, "assistant", reply.text ?? "");
    return reply;
  }

  // Hard reset — pero NUNCA si el cliente tiene plan pagado activo
  if (isResetCommand(userMessage) && lead.status !== "converted" && !hasPaidPlan(lead)) {
    await updateLead(phone, {
      status: "new",
      chat_state: "greeting",
      chat_data: {},
      level_detected: null,
      test_results: {},
    });
    await appendMessage(phone, "user", userMessage);
    const reply = plain(RESET_TEXT);
    await appendMessage(phone, "assistant", reply.text ?? "");
    return reply;
  }

  if (lead.status === "converted") {
    await appendMessage(phone, "user", userMessage);
    const reply = await handleConverted(lead, userMessage);
    await appendMessage(phone, "assistant", reply.text ?? "");
    return reply;
  }

  // ⭐ Cliente con plan pagado activo: NO entrar al funnel free
  if (hasPaidPlan(lead)) {
    await appendMessage(phone, "user", userMessage);
    const reply = await handlePaidUser(lead, userMessage);
    await appendMessage(phone, "assistant", reply.text ?? "[media]");
    return reply;
  }

  await appendMessage(phone, "user", userMessage);

  let reply: AgentReply;
  const state = lead.chat_state || "greeting";

  switch (state) {
    case "greeting":
    case "new":
      reply = await handleGreeting(lead, userMessage);
      break;
    case "pacto_name":
      reply = await handlePactoName(lead, userMessage);
      break;
    case "pacto_city":
      reply = await handlePactoCity(lead, userMessage);
      break;
    case "pacto_motiv":
      reply = await handlePactoMotiv(lead, userMessage);
      break;
    case "pacto_minutes":
      reply = await handlePactoMinutes(lead, userMessage);
      break;
    case "pacto_commit":
      reply = await handlePactoCommit(lead, userMessage);
      break;
    case "dia_uno_sent":
      reply = await handleDiaUnoSent(lead, userMessage);
      break;
    case "done":
      reply = await handleDone(lead, userMessage);
      break;
    default:
      // Unknown state (e.g. legacy q1, practice_X) → reset to greeting
      await updateLead(phone, {
        chat_state: "greeting",
        chat_data: {},
      });
      reply = await handleGreeting({ ...lead, chat_state: "greeting" }, userMessage);
  }

  await appendMessage(phone, "assistant", reply.text ?? "[media]");
  return reply;
}

// =====================================================================
// Voice message handler — captura audios entrantes (Twilio MediaUrl0).
// Caso de uso #1: el Flow #5 (pronunciacion) deja flag
// `personal_facts.cuna_pronunciation_pending` con la frase target. Cuando
// llega el siguiente voice message, descargamos audio Twilio (Basic Auth con
// TWILIO_SOFIA_*), llamamos POST /api/sofia-flows/pronunciation, respondemos
// con score + feedback, limpiamos el flag.
//
// Si no hay flag pendiente, retornamos null para que el webhook caiga al
// flujo conversacional normal (texto vacio o transcripcion en otra iteracion).
// =====================================================================

const SOFIA_FLOWS_BASE = (
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://activosya.com"
).replace(/\/$/, "");

async function findUserIdByPhone(phone: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("mse_users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function getPronunciationPending(
  userId: string
): Promise<{ target_phrase: string; started_at: string } | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("mse_student_profiles")
    .select("personal_facts")
    .eq("user_id", userId)
    .maybeSingle();
  const facts = (data as { personal_facts?: Record<string, unknown> } | null)
    ?.personal_facts as Record<string, unknown> | undefined;
  const flag = facts?.cuna_pronunciation_pending as
    | { target_phrase?: string; started_at?: string }
    | undefined;
  if (!flag?.target_phrase || !flag?.started_at) return null;
  return { target_phrase: flag.target_phrase, started_at: flag.started_at };
}

async function clearPronunciationPending(userId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from("mse_student_profiles")
    .select("personal_facts")
    .eq("user_id", userId)
    .maybeSingle();
  const facts = ((data as { personal_facts?: Record<string, unknown> } | null)
    ?.personal_facts ?? {}) as Record<string, unknown>;
  delete facts.cuna_pronunciation_pending;
  await supabase
    .from("mse_student_profiles")
    .update({ personal_facts: facts })
    .eq("user_id", userId);
}

// Twilio eliminado 2026-05-10. Cuando processVoiceMessage recibe un mediaUrl
// (path legacy), ya NO hay Auth Twilio para descargarlo. Retornamos null y el
// caller debe pasar buffer directo (Meta Cloud webhook ya lo descarga).
async function downloadTwilioMedia(
  _mediaUrl: string,
): Promise<{ buffer: Buffer; mime: string } | null> {
  return null;
}

/**
 * Procesa un voice message entrante. Retorna AgentReply si manejamos el caso
 * (ej: pronunciation pending), o null si el caller debe caer al flujo normal.
 *
 * `audioInput` admite dos formas:
 *  - Twilio (legacy): pasar el `mediaUrl` y `_mediaContentType` (descargara
 *    via Basic Auth Twilio).
 *  - Meta Cloud: pasar `{ buffer, mime }` con el audio ya descargado por el
 *    webhook (porque Meta Cloud entrega media via media_id + URL temporal).
 */
export async function processVoiceMessage(
  phone: string,
  mediaUrlOrBuffer: string | { buffer: Buffer; mime: string },
  _mediaContentType?: string,
  tenantId: string | null = null
): Promise<AgentReply | null> {
  await getOrCreateLead(phone, tenantId); // asegura row existe + atribuye a operador si llega de uno

  const userId = await findUserIdByPhone(phone);
  if (!userId) return null;

  const pending = await getPronunciationPending(userId);
  if (!pending) return null;

  let audio: { buffer: Buffer; mime: string } | null = null;
  if (typeof mediaUrlOrBuffer === "string") {
    audio = await downloadTwilioMedia(mediaUrlOrBuffer);
  } else {
    audio = mediaUrlOrBuffer;
  }
  if (!audio) {
    return plain(
      "No pude descargar tu audio. Vuelve a intentarlo en unos segundos."
    );
  }

  await appendMessage(phone, "user", "[voice message para pronunciacion]");

  try {
    const r = await fetch(`${SOFIA_FLOWS_BASE}/api/sofia-flows/pronunciation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        target_phrase: pending.target_phrase,
        audio_base64: audio.buffer.toString("base64"),
        audio_mime: audio.mime,
      }),
      cache: "no-store",
    });
    const body = (await r.json()) as {
      score?: number;
      transcription?: string;
      target_phrase?: string;
      feedback_es?: string;
      error?: string;
    };

    await clearPronunciationPending(userId);

    if (!r.ok || typeof body.score !== "number") {
      const reply = plain(
        body.error
          ? `No pude evaluar el audio (${body.error}). Intenta de nuevo abriendo el test.`
          : "No pude evaluar el audio. Intenta de nuevo abriendo el test."
      );
      await appendMessage(phone, "assistant", reply.text ?? "");
      return reply;
    }

    const text =
      `📊 Score: *${body.score}/100*\n\n` +
      `Tu audio: "${body.transcription || "(no audible)"}"\n` +
      `Frase target: "${body.target_phrase}"\n\n` +
      `${body.feedback_es ?? ""}`;
    const reply = plain(text);
    await appendMessage(phone, "assistant", reply.text ?? "");
    return reply;
  } catch (e) {
    console.error("[processVoiceMessage pronunciation]", (e as Error).message);
    const reply = plain("Error al evaluar el audio. Intenta de nuevo.");
    await appendMessage(phone, "assistant", reply.text ?? "");
    return reply;
  }
}
