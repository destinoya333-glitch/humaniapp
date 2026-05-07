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
  processVoiceMessage,
  processWhatsAppMessage,
} from "@/lib/miss-sofia-voice/whatsapp-agent";
import {
  downloadMetaMedia,
  sendImage,
  sendText,
  sendTextWithAudio,
} from "@/lib/miss-sofia-voice/meta-cloud-sender";
import { sendSofiaFlow, type FlowKey } from "@/lib/miss-sofia-voice/flow-sender";
import { getOrCreateLead, updateLead } from "@/lib/miss-sofia-voice/whatsapp-leads";

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

async function handleMessage(m: MetaMessage): Promise<void> {
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
    const reply = await processVoiceMessage(phoneE164, { buffer: dl.buffer, mime: dl.mime });
    if (reply) {
      await deliverReply(phoneE164, reply);
      return;
    }
    // Si no es pronunciation pending, fallback texto vacio (lo procesa funnel normal)
    const fallback = await processWhatsAppMessage(phoneE164, "");
    await deliverReply(phoneE164, fallback);
    return;
  }

  // ----- Texto -----
  if (m.type === "text") {
    const text = (m.text?.body || "").trim();
    const lowerText = text.toLowerCase();

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
    const reply = await processWhatsAppMessage(phoneE164, text);
    await deliverReply(phoneE164, reply);
    return;
  }

  // ----- Boton interactivo (button_reply) -----
  if (m.type === "interactive" && m.interactive?.button_reply) {
    const id = m.interactive.button_reply.id || "";
    // Si en el futuro agregamos botones tipo "abrir_flow_pago", se enrutan aqui.
    // Por ahora delegamos el title como texto al funnel.
    const text = m.interactive.button_reply.title || id;
    const reply = await processWhatsAppMessage(phoneE164, text);
    await deliverReply(phoneE164, reply);
    return;
  }

  // ----- Submit de un Flow (nfm_reply) -----
  // El data_exchange real ya lo procesamos en /api/whatsapp-flows/webhook.
  // Aqui inspeccionamos el response_json para responder con el mensaje correcto.
  if (m.type === "interactive" && m.interactive?.nfm_reply) {
    const raw = m.interactive.nfm_reply.response_json || "{}";
    let parsed: { status?: string; amount_pen?: number } = {};
    try { parsed = JSON.parse(raw); } catch {}

    if (parsed.status === "payment_pending_validation") {
      const monto = parsed.amount_pen;
      const montoTxt = monto ? `S/${monto}` : "el monto exacto";
      await sendText(
        phoneE164,
        `Plan registrado.\n\n` +
        `Yapea ahora *${montoTxt}* a *998 102 258* (Percy Roj*).\n\n` +
        `Cuando detectemos tu Yape activamos tu plan automaticamente — no necesitas enviar voucher ni codigo.`
      );
      return;
    }
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
            };
          }>;
        }>;
      };
      const messages: MetaMessage[] = [];
      for (const entry of p?.entry || []) {
        for (const change of entry.changes || []) {
          for (const msg of change.value?.messages || []) {
            messages.push(msg);
          }
        }
      }
      await Promise.all(
        messages.map(async (m) => {
          try {
            await handleMessage(m);
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
