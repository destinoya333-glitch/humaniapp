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
  return /\b(s[ií]|yes|ok|okey|dale|listo|empecemos|empezar|claro|por\s+supuesto|of\s+course|vamos|adelante|arranquemos)\b/i.test(
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
async function getDiaUnoAudioUrl(): Promise<string | null> {
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
  if (isYes(msg)) {
    await updateLead(lead.phone, { chat_state: "pacto_name" });
    return plain(`Excelente.\n\n*1/4* — ¿Cómo te llamo? Solo tu primer nombre.`);
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

async function handleDiaUnoSent(lead: WhatsAppLead, msg: string): Promise<AgentReply> {
  const trimmed = msg.trim();
  const isPositive = /👍|listo|ok|s[ií]|entend[ií]|me\s+gust[oó]/i.test(trimmed);
  const isNegative = /👎|no\s+entend[ií]|nada|complicado|dif[ií]cil/i.test(trimmed);

  const name = pactoFromLead(lead).name;
  const link = `${SIGNUP_LINK_BASE}?phone=${encodeURIComponent(lead.phone)}`;

  if (!isPositive && !isNegative) {
    return plain(
      `Solo *👍* o *👎*. Cualquiera vale — es tu primer día.`
    );
  }

  const reaction = isPositive
    ? `Excelente. Tu cerebro YA empezó a calibrar el inglés. No te diste cuenta, pero algo cambió hoy.`
    : `Perfect.${name ? " " + name + "," : ""} eso significa que tu cerebro está empezando desde cero — exactamente donde queremos. En 30 días vas a entender ese mismo audio sin esfuerzo.`;

  await updateLead(lead.phone, { chat_state: "done" });

  return plain(
    `${reaction}\n\nPara seguir tu Fase Cuna y desbloquear tu novela personal (donde TÚ eres el protagonista), crea tu cuenta acá:\n\n${link}\n\nLa primera semana es 100% gratis.`
  );
}

async function handleDone(lead: WhatsAppLead, _msg: string): Promise<AgentReply> {
  const link = `${SIGNUP_LINK_BASE}?phone=${encodeURIComponent(lead.phone)}`;
  return plain(
    `Tu Fase Cuna está lista.\n\nCrea tu cuenta acá para seguir:\n${link}\n\nO escríbeme *reiniciar* si quieres empezar de nuevo el Pacto.`
  );
}

async function handleConverted(lead: WhatsAppLead, _msg: string): Promise<AgentReply> {
  return plain(
    `Hola. Ya tienes tu cuenta. Tus sesiones de voz Cuna están aquí:\n\nhttps://activosya.com/sofia-chat\n\nNos vemos.`
  );
}

// =====================================================================
// Main entry — process one WhatsApp message and return reply
// =====================================================================

export async function processWhatsAppMessage(
  phone: string,
  userMessage: string
): Promise<AgentReply> {
  const lead = await getOrCreateLead(phone);

  // Hard reset
  if (isResetCommand(userMessage) && lead.status !== "converted") {
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

const TWILIO_SOFIA_SID = (process.env.TWILIO_SOFIA_ACCOUNT_SID ?? "").trim();
const TWILIO_SOFIA_TOK = (process.env.TWILIO_SOFIA_AUTH_TOKEN ?? "").trim();

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

async function downloadTwilioMedia(
  mediaUrl: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!TWILIO_SOFIA_SID || !TWILIO_SOFIA_TOK) return null;
  try {
    const auth = Buffer.from(`${TWILIO_SOFIA_SID}:${TWILIO_SOFIA_TOK}`).toString("base64");
    const r = await fetch(mediaUrl, {
      headers: { Authorization: `Basic ${auth}` },
      redirect: "follow",
      cache: "no-store",
    });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = r.headers.get("content-type") ?? "audio/ogg";
    return { buffer: buf, mime };
  } catch (e) {
    console.error("[downloadTwilioMedia]", (e as Error).message);
    return null;
  }
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
  _mediaContentType?: string
): Promise<AgentReply | null> {
  await getOrCreateLead(phone); // asegura row existe

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
