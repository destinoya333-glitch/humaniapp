/**
 * Miss Sofia — Webhook Meta Cloud directo.
 *
 * Reemplaza el webhook Twilio (/api/whatsapp/miss-sofia/route.ts).
 * Ese archivo se queda como legacy / fallback hasta que el cutover se confirme.
 *
 * Patron identico a /api/whatsapp/eco/route.ts:
 *  - GET: verify token
 *  - POST: ack inmediato, procesa en background con after()
 *
 * Reusa la logica conversacional de processWhatsAppMessage y la captura
 * de audio para Flow #5 de processVoiceMessage en whatsapp-agent.ts. La
 * diferencia es el SENDER: ahora Meta Cloud direct en lugar de Twilio.
 */
import { NextResponse, after } from "next/server";
import {
  isStopCommand,
  isStartCommand,
  markOptOut,
  clearOptOut,
  OPT_OUT_REPLY,
  OPT_IN_REPLY,
} from "@/lib/marketing/opt-out";
import {
  processVoiceMessage,
  processWhatsAppMessage,
  getDiaUnoAudioUrl,
} from "@/lib/miss-sofia-voice/whatsapp-agent";
import {
  downloadMetaMedia,
  sendImage,
  sendText,
  sendTextWithAudio,
} from "@/lib/miss-sofia-voice/meta-cloud-sender";
import { sendSofiaFlow, type FlowKey } from "@/lib/miss-sofia-voice/flow-sender";
import { getOrCreateLead, updateLead } from "@/lib/miss-sofia-voice/whatsapp-leads";
import { getOperadorByMetaPhoneId, type OperadorContexto } from "@/lib/activosya/operadores";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://activosya.com").replace(/\/$/, "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// =============== Helper: enviar el AgentReply via Meta Cloud ===============

type AgentReply = Awaited<ReturnType<typeof processWhatsAppMessage>>;

async function deliverReply(toPhone: string, reply: AgentReply): Promise<void> {
  const text = reply.text?.trim() || "";
  const media = reply.mediaUrl?.trim() || "";

  // Caso: text + audio (Día 1 Cuna) -> 2 mensajes consecutivos
  if (text && media && /\.mp3($|\?)/i.test(media)) {
    await sendTextWithAudio(toPhone, text, media);
    return;
  }
  // Caso: text + image
  if (text && media && /\.(jpe?g|png|webp)($|\?)/i.test(media)) {
    await sendImage(toPhone, media, text.slice(0, 1024));
    return;
  }
  // Caso: solo texto
  if (text) {
    await sendText(toPhone, text);
    return;
  }
  // Caso: solo media
  if (media) {
    if (/\.mp3($|\?)/i.test(media)) {
      await sendTextWithAudio(toPhone, "🔊", media);
    } else {
      await sendImage(toPhone, media);
    }
  }
}

// =============== Helper: si bot detecta intencion -> mandar Flow ===============

const TEXT_TO_FLOW: Array<{ pattern: RegExp; flow: FlowKey }> = [
  { pattern: /\b(pago|pagar|comprar|plan|premium|regular|yapear|yape)\b/i, flow: "pago" },
  { pattern: /\b(progreso|avance|como voy|mis metricas|mi fase)\b/i, flow: "progreso" },
  { pattern: /\b(pronunciacion|pronunciar|practicar pronunciacion|test\s+pronunciacion)\b/i, flow: "pronunciacion" },
  { pattern: /\b(plan de estudio|configurar plan|cambiar horario|mi rutina)\b/i, flow: "plan-estudio" },
];

function maybeMatchFlow(text: string): FlowKey | null {
  for (const { pattern, flow } of TEXT_TO_FLOW) {
    if (pattern.test(text)) return flow;
  }
  return null;
}

// =============== Handler de un mensaje ===============

type MetaMessage = {
  from: string;
  type: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
    nfm_reply?: { name?: string; body?: string; response_json?: string };
  };
};

async function handleMessage(m: MetaMessage, operador: OperadorContexto | null = null): Promise<void> {
  const tenantId = operador?.tenant_id ?? null;
  const from = m.from;
  if (!from) return;
  const phoneE164 = `+${from.replace(/^\+/, "")}`;

  // ----- Voice message -----
  if (m.type === "audio" && m.audio?.id) {
    const dl = await downloadMetaMedia(m.audio.id);
    if (!dl) {
      await sendText(phoneE164, "No pude descargar tu audio. Intenta de nuevo.");
      return;
    }
    // 1. Si está en estado pronunciation_pending → procesar como test pronunciación
    const reply = await processVoiceMessage(phoneE164, { buffer: dl.buffer, mime: dl.mime }, undefined, tenantId);
    if (reply) {
      await deliverReply(phoneE164, reply);
      return;
    }
    // 2. Caso general: transcribir con Whisper y procesar como mensaje texto
    try {
      const { whisperSTT } = await import("@/lib/miss-sofia-voice/ai/whisper");
      const u8 = new Uint8Array(dl.buffer);
      const blob = new Blob([u8], { type: dl.mime || "audio/ogg" });
      const transcription = (await whisperSTT(blob, dl.mime)).trim();
      if (!transcription) {
        await sendText(phoneE164, "🎙️ No pude entender tu audio. ¿Puedes hablar más claro o escribirlo? 😊");
        return;
      }
      // Marcar al agente que es un audio transcrito (mejora calidad respuesta)
      const augmented = `[Mensaje de voz del cliente, transcrito]: ${transcription}`;
      const fallback = await processWhatsAppMessage(phoneE164, augmented, tenantId);
      await deliverReply(phoneE164, fallback);
    } catch (e) {
      console.error("[sofia voice transcribe err]", e);
      await sendText(phoneE164, "🎙️ Tuve un problema procesando tu audio. ¿Puedes escribirlo en texto?");
    }
    return;
  }

  // ----- Texto -----
  if (m.type === "text") {
    const text = (m.text?.body || "").trim();
    const lowerText = text.toLowerCase();

    // Marketing opt-out / opt-in (prioridad sobre cualquier flow o intent).
    if (isStopCommand(text)) {
      await markOptOut(phoneE164, "sofia");
      await sendText(phoneE164, OPT_OUT_REPLY);
      return;
    }
    if (isStartCommand(text)) {
      await clearOptOut(phoneE164);
      await sendText(phoneE164, OPT_IN_REPLY);
      return;
    }

    // Caso especial: usuario dice "si" estando en greeting -> mandar Flow Pacto Cuna
    // (reemplaza la captura conversacional pacto_name -> city -> motiv -> minutes -> commit)
    const isYes = /^(s[ií]|yes|ok|okey|dale|listo|empecemos|empezar|claro|por\s+supuesto|of\s+course|vamos|adelante|arranquemos)$/i.test(text);
    if (isYes) {
      const lead = await getOrCreateLead(phoneE164);
      const greetingStates = ["greeting", "new", "", null, undefined];
      if (greetingStates.includes(lead.chat_state as string)) {
        const r = await sendSofiaFlow({
          phone: phoneE164,
          flowKey: "pacto-cuna",
          userIdOrPhone: phoneE164,
        });
        if (r.ok) {
          await updateLead(phoneE164, { chat_state: "flow_pacto_sent" });
          return;
        }
        // Si falla, fallback al funnel conversacional clasico abajo
        await sendText(phoneE164, "Tuve un problema abriendo el formulario. Vamos a hacerlo por chat.");
      }
    }

    // Si matchea intencion explicita de otro Flow (pago, progreso, etc), mandar
    const flowMatch = maybeMatchFlow(text);
    if (flowMatch) {
      const r = await sendSofiaFlow({
        phone: phoneE164,
        flowKey: flowMatch,
        userIdOrPhone: phoneE164,
      });
      if (!r.ok) {
        await sendText(phoneE164, `Tuve un problema abriendo el formulario (${r.error}). Vuelve a intentar en unos segundos.`);
      }
      return;
    }

    // Funnel conversacional Cuna (greeting / pacto fallback / dia_uno_sent / etc)
    const reply = await processWhatsAppMessage(phoneE164, text, tenantId);
    await deliverReply(phoneE164, reply);
    return;
  }

  // ----- Boton interactivo (button_reply) -----
  if (m.type === "interactive" && m.interactive?.button_reply) {
    const id = m.interactive.button_reply.id || "";
    // Si en el futuro agregamos botones tipo "abrir_flow_pago", se enrutan aqui.
    // Por ahora delegamos el title como texto al funnel.
    const text = m.interactive.button_reply.title || id;
    const reply = await processWhatsAppMessage(phoneE164, text, tenantId);
    await deliverReply(phoneE164, reply);
    return;
  }

  // ----- Submit de un Flow (nfm_reply) -----
  if (m.type === "interactive" && m.interactive?.nfm_reply) {
    const raw = m.interactive.nfm_reply.response_json || "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch {}
    const status = parsed.status as string | undefined;

    // ─── Pacto Cuna ───
    if (status === "pacto_sealed") {
      const name = (parsed.name as string) || "";
      const city = (parsed.city as string) || "";
      const motivation = (parsed.motivation as string) || "";
      const minutes = Number(parsed.minutes_per_day) || 10;
      // Meta OptIn puede mandar el committed en varios formatos:
      // - true (boolean) - el caso "ideal"
      // - "true" (string)
      // - ["yes"] (array)
      // - 1, "1", etc.
      // Cliente llegó al status pacto_sealed clickeando "Sellar Pacto" → el form
      // exigió required, así que aquí siempre fue marcado. Forzamos true.
      const committed = true;

      try {
        const r = await fetch(`${BASE_URL}/api/sofia-flows/pacto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneE164, name, city, motivation, minutes_per_day: minutes, committed }),
          cache: "no-store",
        });
        const body = (await r.json()) as { ok?: boolean; error?: string; day1_audio_url?: string };

        if (!r.ok || !body.ok) {
          console.error("[sofia pacto endpoint err]", r.status, body);
          await sendText(phoneE164, `Hubo un problema sellando tu Pacto: ${body.error || "intenta de nuevo"}.`);
          return;
        }

        const userName = name.trim().split(/\s+/)[0] || "";
        const intro =
          `🤝 *Pacto sellado${userName ? ", " + userName : ""}.*\n\n` +
          `Bienvenido a tu *Día 1 de la Fase Cuna*. 🌙\n\n` +
          `Ahora escucha esto. No traduzcas. No repitas. Solo escucha (90 segundos):`;

        // Obtener URL del audio Día 1 — la función genera el audio con TTS si no existe en Storage.
        let audioUrl: string | null = null;
        try {
          audioUrl = await getDiaUnoAudioUrl();
        } catch (e) {
          console.error("[sofia getDiaUnoAudioUrl err]", e);
        }
        if (audioUrl) {
          await sendTextWithAudio(phoneE164, intro, audioUrl);
        } else {
          // No se pudo obtener/generar audio — solo texto
          await sendText(phoneE164, intro);
          await sendText(phoneE164, `_(El audio del Día 1 te llegará en breve por separado.)_`);
        }
        await updateLead(phoneE164, { chat_state: "dia_uno_sent" }).catch(() => {});

        // 30s después: Flow Plan Estudio
        void (async () => {
          await new Promise((r) => setTimeout(r, 30_000));
          await sendText(phoneE164, "Ahora vamos a configurar tu rutina diaria — hora del audio matutino y días que practicas. Solo 30 seg.");
          await sendSofiaFlow({ phone: phoneE164, flowKey: "plan-estudio", userIdOrPhone: phoneE164 });
        })();
      } catch (e) {
        console.error("[sofia pacto_sealed err]", e);
        await sendText(phoneE164, `Tuve un problema procesando tu Pacto: ${(e as Error).message?.slice(0, 100) || "error"}. Escribe *hola* para reintentar.`);
      }
      return;
    }

    // ─── Plan Estudio ───
    if (status === "plan_saved") {
      const time = (parsed.preferred_morning_time as string) || "07:00";
      const mode = (parsed.mode as string) || "suave";
      const weekdays = parsed.weekdays;
      try {
        await fetch(`${BASE_URL}/api/sofia-flows/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phoneE164, preferred_morning_time: time, mode, weekdays }),
          cache: "no-store",
        });
      } catch {}
      await sendText(
        phoneE164,
        `✅ *Rutina configurada* — audio matutino a las *${time}*.\n\nTe llegará tu primer audio mañana en el horario elegido. Mientras tanto, sigue escuchando el de hoy. 🌙`
      );
      return;
    }

    // ─── Progreso ───
    if (status === "progress_closed") {
      await sendText(phoneE164, "💪 Sigue así — cada día cuenta. Si quieres reconsultar progreso luego, escribe *progreso*.");
      return;
    }

    // ─── Pronunciación ───
    if (status === "awaiting_audio") {
      await sendText(phoneE164, "🎤 Listo. Ahora envíame un *audio* en WhatsApp diciendo la frase. Te puntúo 0-100.");
      return;
    }

    // ─── Pago ───
    if (status === "payment_pending_validation") {
      const planBilling = (parsed.plan_billing as string) || "";
      const PRICING: Record<string, { plan: string; billing: string; monto: number; label: string }> = {
        cuna_monthly:    { plan: "regular", billing: "monthly", monto: 30,  label: "Regular Mensual" },
        cuna_yearly:     { plan: "regular", billing: "yearly",  monto: 299, label: "Regular Anual" },
        premium_monthly: { plan: "premium", billing: "monthly", monto: 89,  label: "Premium Mensual" },
        premium_yearly:  { plan: "premium", billing: "yearly",  monto: 799, label: "Premium Anual" },
      };
      const info = PRICING[planBilling];
      if (!info) {
        await sendText(phoneE164, "No reconocí el plan. Escribe *pago* y elige uno del menú.");
        return;
      }

      // Crear registro pending_validation en mse_payments
      try {
        const r = await fetch(`${BASE_URL}/api/sofia-flows/payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phoneE164,
            plan: info.plan,
            billing: info.billing,
          }),
          cache: "no-store",
        });
        const body = (await r.json()) as { ok?: boolean; error?: string; payment_id?: string };
        if (!r.ok || !body.ok) {
          console.error("[sofia /api/sofia-flows/payment err]", body);
          await sendText(phoneE164, `No pude registrar tu plan: ${body.error || "error"}. Escribe *pago* y vuelve a intentar.`);
          return;
        }
      } catch (e) {
        console.error("[sofia payment register err]", e);
        await sendText(phoneE164, "No pude registrar tu plan en este momento. Escribe *pago* y vuelve a intentar.");
        return;
      }

      await sendText(
        phoneE164,
        `✅ Plan *${info.label}* registrado.\n\nYapea ahora *S/${info.monto}* a *998 102 258* (Percy Roj*).\n\nCuando detectemos tu Yape, activamos tu plan automáticamente — no necesitas enviar voucher ni código. ✨`
      );
      return;
    }

    // Fallback
    await sendText(phoneE164, "Recibí tu respuesta. Procesando...");
    return;
  }

  // ----- Fallback -----
  await sendText(phoneE164, "Recibi tu mensaje pero no lo entiendo. Escribe *hola* para empezar.");
}

// =============== Webhook handlers ===============

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = (process.env.META_SOFIA_VERIFY_TOKEN ?? "").trim();
  if (mode === "subscribe" && token && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  after(async () => {
    try {
      const p = payload as {
        entry?: Array<{
          changes?: Array<{
            value?: {
              messages?: MetaMessage[];
              metadata?: { phone_number_id?: string; display_phone_number?: string };
            };
          }>;
        }>;
      };
      // Multi-tenant: identificar operador franquicia por phone_id receptor.
      // Si no hay match → operador = null (legacy / Percy directo).
      const messagesByOperador: Array<{ msg: MetaMessage; operador: OperadorContexto | null }> = [];
      for (const entry of p?.entry || []) {
        for (const change of entry.changes || []) {
          const phoneId = change.value?.metadata?.phone_number_id;
          const operador = phoneId ? await getOperadorByMetaPhoneId(phoneId) : null;
          for (const msg of change.value?.messages || []) {
            messagesByOperador.push({ msg, operador });
          }
        }
      }
      await Promise.all(
        messagesByOperador.map(async ({ msg, operador }) => {
          try {
            await handleMessage(msg, operador);
          } catch (e) {
            console.error("[sofia-meta handle err]", e);
          }
        })
      );
    } catch (err) {
      console.error("[sofia-meta webhook err]", err);
    }
  });

  return NextResponse.json({ ok: true });
}
