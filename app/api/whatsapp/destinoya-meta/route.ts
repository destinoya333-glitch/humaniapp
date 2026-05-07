/**
 * TuDestinoYa — Webhook Meta Cloud directo.
 *
 * Reemplaza forward a n8n + bot Twilio legacy. Procesa mensajes con
 * lib/destinoya/agent.ts (Claude + tools) y responde via Meta Cloud sender.
 *
 * Flujo (Meta Cloud webhook async):
 *  - GET: verify token
 *  - POST: ack inmediato, procesa en background con after()
 *  - Mensajes largos: dividir en chunks 1500 char (limite WhatsApp 1600)
 *  - Imagen: descarga Meta media -> Claude Vision (palma, sustento doc)
 *  - Audio: descarga -> placeholder por ahora (TODO Whisper)
 *  - Interactive: usa el title del button/list reply como texto
 */
import { NextResponse, after } from "next/server";
import { sendText, downloadMetaMedia } from "@/lib/destinoya/meta-cloud-sender";
import { sendDestinoFlow, type DestinoFlowKey } from "@/lib/destinoya/flow-sender";
import { procesarMensaje } from "@/lib/destinoya/agent";
import { getConversacion, supabase } from "@/lib/destinoya/db";

// Detecta intención de mensaje texto -> Flow correspondiente.
const TEXT_TO_FLOW: Array<{ pattern: RegExp; flow: DestinoFlowKey }> = [
  { pattern: /\b(menu|menú|inicio|empezar|comenzar|hola|buenas|buenos d[ií]as|buen d[ií]a)\b/i, flow: "menu" },
  { pattern: /\b(yape|yapear|yape[oó]|pago|pagar|pague|operaci[oó]n)\b/i, flow: "pago" },
  { pattern: /\b(vip|premium|ilimitado|suscripci[oó]n|membres[ií]a)\b/i, flow: "vip" },
];

function maybeMatchFlow(text: string): DestinoFlowKey | null {
  for (const { pattern, flow } of TEXT_TO_FLOW) {
    if (pattern.test(text)) return flow;
  }
  return null;
}

async function dbg(step: string, info?: unknown) {
  try {
    await supabase.from("destinoya_debug_log").insert({
      endpoint: "destinoya-meta",
      body: step,
      parsed: info ? { info: JSON.stringify(info).slice(0, 1000) } : {},
      result: step,
    });
  } catch {}
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MetaMessage = {
  from: string;
  type: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  document?: { id?: string; mime_type?: string; filename?: string; caption?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
    nfm_reply?: { name?: string; body?: string; response_json?: string };
  };
};

// Divide texto largo respetando saltos de linea/parrafos. WhatsApp limita
// mensajes a 1600 chars; usamos 1500 con margen.
function dividirMensaje(texto: string, maxLen = 1500): string[] {
  if (texto.length <= maxLen) return [texto];

  const chunks: string[] = [];
  let resto = texto;

  while (resto.length > maxLen) {
    let cortar = resto.lastIndexOf("\n\n", maxLen);
    if (cortar < maxLen / 2) cortar = resto.lastIndexOf("\n", maxLen);
    if (cortar < maxLen / 2) cortar = resto.lastIndexOf(". ", maxLen);
    if (cortar < maxLen / 2) cortar = maxLen;

    chunks.push(resto.slice(0, cortar).trim());
    resto = resto.slice(cortar).trim();
  }
  if (resto) chunks.push(resto);
  return chunks;
}

async function sendChunked(toPhone: string, body: string): Promise<void> {
  const chunks = dividirMensaje(body, 1500);
  for (let i = 0; i < chunks.length; i++) {
    await sendText(toPhone, chunks[i]);
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

// Detecta si el ultimo turno del bot esperaba datos (post pago confirmado).
// Si si: el siguiente turno del user va a generar consulta larga (>15s) y es
// preferible enviar "Generando..." primero por UX.
function detectEsperaDatos(historial: Array<{ role: string; content: unknown }>): boolean {
  const lastAsst = [...historial].reverse().find((m) => m.role === "assistant");
  const txt = typeof lastAsst?.content === "string" ? lastAsst.content : "";
  return /pago confirmado/i.test(txt) && /(necesito|env[ií]ame|cu[eé]ntame|elige|dame)/i.test(txt);
}

async function handleMessage(m: MetaMessage): Promise<void> {
  const from = m.from;
  if (!from) return;
  const phoneE164 = `+${from.replace(/^\+/, "")}`;

  // Cargar historial
  const conversacion = await getConversacion(phoneE164);
  const historial =
    (conversacion?.messages as Array<{ role: string; content: unknown }>) || [];

  // ─── IMAGEN ─────────────────────────────────────────────────────────────
  if (m.type === "image" && m.image?.id) {
    // UX: mensaje interim mientras Claude Vision procesa
    await sendText(
      phoneE164,
      "🔮 *Analizando tu imagen...*\n\nDame unos segundos para leerla ✨"
    );

    const dl = await downloadMetaMedia(m.image.id);
    if (!dl) {
      await sendText(
        phoneE164,
        "No pude descargar tu imagen. Intenta enviarla de nuevo."
      );
      return;
    }

    const caption = m.image.caption || "";
    const respuesta = await procesarMensaje({
      telefono: phoneE164,
      mensaje: caption,
      historial,
      imageBuffer: dl.buffer,
      imageMime: dl.mime,
    });
    await sendChunked(phoneE164, respuesta);
    return;
  }

  // ─── AUDIO ──────────────────────────────────────────────────────────────
  if (m.type === "audio" && m.audio?.id) {
    // TODO Whisper. Por ahora notificar al user y procesar como texto vacio
    // (el bot puede responder "no entendi audio, escribeme").
    const respuesta = await procesarMensaje({
      telefono: phoneE164,
      mensaje: "[audio recibido — el sistema aún no transcribe audios, por favor escribe tu mensaje]",
      historial,
    });
    await sendChunked(phoneE164, respuesta);
    return;
  }

  // ─── DOCUMENTO (PDF, Word) ──────────────────────────────────────────────
  if (m.type === "document" && m.document?.id) {
    // TODO: extraccion texto PDF/Word. Por ahora caption + aviso
    const caption = m.document.caption || `[documento ${m.document.filename || "sin nombre"}]`;
    const respuesta = await procesarMensaje({
      telefono: phoneE164,
      mensaje: `${caption}\n\n[Adjuntaste un documento. El sistema aún no lo procesa automáticamente, por favor describe la consulta en texto.]`,
      historial,
    });
    await sendChunked(phoneE164, respuesta);
    return;
  }

  // ─── FLOW SUBMIT (nfm_reply) ────────────────────────────────────────────
  if (m.type === "interactive" && m.interactive?.nfm_reply) {
    const responseJson = m.interactive.nfm_reply.response_json || "{}";
    await dbg("nfm_reply", { phone: phoneE164, response_json: responseJson });
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(responseJson);
    } catch {}

    // Flow Menu submit -> servicio elegido
    const servicio = parsed.servicio as string | undefined;
    if (servicio) {
      // esoterico/profesional/rapidas -> Sub-Menu Flow con esa categoria
      if (["esoterico", "profesional", "rapidas"].includes(servicio)) {
        const r = await sendDestinoFlow({
          phone: phoneE164,
          flowKey: "submenu",
          userIdOrPhone: phoneE164,
          categoria: servicio,
        });
        await dbg("submenu_flow_send", { categoria: servicio, ok: r.ok, error: r.error });
        if (r.ok) return;
      }
      // vip -> VIP Flow
      if (servicio === "vip") {
        const r = await sendDestinoFlow({ phone: phoneE164, flowKey: "vip", userIdOrPhone: phoneE164 });
        if (r.ok) return;
      }
      // gratuita -> Continúa por chat (lectura mano única gratis)
      if (servicio === "gratuita") {
        const respuesta = await procesarMensaje({
          telefono: phoneE164, mensaje: "5", historial,
        });
        await sendChunked(phoneE164, respuesta);
        return;
      }
      // Fallback a chat
      const numeroPorServicio: Record<string, string> = {
        esoterico: "1", profesional: "2", rapidas: "3", vip: "4", gratuita: "5",
      };
      const respuesta = await procesarMensaje({
        telefono: phoneE164,
        mensaje: numeroPorServicio[servicio] || servicio,
        historial,
      });
      await sendChunked(phoneE164, respuesta);
      return;
    }

    // Sub-menu Flow submit -> sub-servicio + plan + pago registrados
    if (parsed.status === "submenu_listo") {
      const subServicio = parsed.sub_servicio as string;
      const plan = parsed.plan as string;
      const monto = parsed.monto as number;
      const categoria = parsed.categoria as string;

      // Bot pide datos de la consulta según sub-servicio
      let pedidoData = "Cuéntame qué necesitas saber con detalle.";
      if (categoria === "esoterico") {
        if (/mano/i.test(subServicio)) pedidoData = "Envíame una foto clara de tu palma derecha 🖐️";
        else if (/compatibilidad/i.test(subServicio)) pedidoData = "Necesito: Nombre1+Fecha1 nacimiento, Nombre2+Fecha2 nacimiento.";
        else if (/carta astral/i.test(subServicio)) pedidoData = "Necesito: nombre completo, fecha de nacimiento, hora de nacimiento, ciudad de nacimiento.";
        else pedidoData = "Necesito: nombre completo, fecha de nacimiento, ciudad.";
      } else if (categoria === "profesional") {
        pedidoData = `Cuéntame tu consulta de ${subServicio} con todo el detalle. ¿Tienes algún documento de apoyo (foto/PDF)? Si sí envíalos uno por uno y al final escribe "listo".`;
      } else if (categoria === "rapidas") {
        pedidoData = `Cuéntame tu situación de ${subServicio} con detalle.`;
      }

      await sendText(phoneE164,
        `📌 ${subServicio} · ${plan} · *S/${monto}*\n\n` +
        `Yapea ahora a *998 102 258* (Percy Roj*).\n\n` +
        `Cuando detectemos tu Yape, te confirmamos automático y empezamos.\n\n` +
        `Mientras yapeas, ve preparando:\n${pedidoData}`
      );
      return;
    }

    // Flow Pago / VIP submit -> ya guardado en DB por el handler. Solo confirma.
    const status = parsed.status as string | undefined;
    if (status === "pago_registrado" || status === "vip_pendiente") {
      const plan = parsed.plan as string | undefined;
      const monto = parsed.monto as number | undefined;
      await sendText(
        phoneE164,
        `✅ Pago registrado: ${plan} S/${monto}.\n\nValidaremos en minutos vía Yape. Mientras te pediré los datos para tu consulta.`
      );
      return;
    }

    // Fallback: pasar response_json crudo al bot
    const respuesta = await procesarMensaje({
      telefono: phoneE164,
      mensaje: `[flow submit] ${responseJson}`,
      historial,
    });
    await sendChunked(phoneE164, respuesta);
    return;
  }

  // ─── BOTON / LIST INTERACTIVO ───────────────────────────────────────────
  if (m.type === "interactive") {
    const text =
      m.interactive?.button_reply?.title ||
      m.interactive?.button_reply?.id ||
      m.interactive?.list_reply?.title ||
      m.interactive?.list_reply?.id ||
      "";
    if (text) {
      const respuesta = await procesarMensaje({
        telefono: phoneE164,
        mensaje: text,
        historial,
      });
      await sendChunked(phoneE164, respuesta);
    }
    return;
  }

  // ─── TEXTO ──────────────────────────────────────────────────────────────
  if (m.type === "text") {
    const text = (m.text?.body || "").trim();
    await dbg("text_msg", { phone: phoneE164, text });
    if (!text) return;

    // Detectar intent → enviar Flow
    const flowMatch = maybeMatchFlow(text);
    if (flowMatch) {
      await dbg("flow_match", { flow: flowMatch });
      const r = await sendDestinoFlow({
        phone: phoneE164,
        flowKey: flowMatch,
        userIdOrPhone: phoneE164,
      });
      await dbg("flow_send", { ok: r.ok, error: r.error, messageId: r.messageId });
      if (r.ok) return;
      // Si Flow falla, fallback al chat conversacional
      await sendText(phoneE164, "Te respondo por chat:");
    }

    if (detectEsperaDatos(historial)) {
      await sendText(
        phoneE164,
        "🔮 *Generando tu consulta...*\n\nDame unos segundos ✨"
      );
    }

    let respuesta = "";
    try {
      respuesta = await procesarMensaje({
        telefono: phoneE164,
        mensaje: text,
        historial,
      });
      await dbg("agent_ok", { len: respuesta.length, preview: respuesta.slice(0, 200) });
    } catch (e) {
      await dbg("agent_err", { msg: (e as Error).message, stack: (e as Error).stack?.slice(0, 600) });
      throw e;
    }
    try {
      await sendChunked(phoneE164, respuesta);
      await dbg("send_ok");
    } catch (e) {
      await dbg("send_err", { msg: (e as Error).message });
      throw e;
    }
    return;
  }

  // Fallback
  await sendText(
    phoneE164,
    "Recibí tu mensaje pero no lo entendí. Escribe *menu* para empezar."
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = (process.env.META_DESTINOYA_VERIFY_TOKEN ?? "").trim();
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
            value?: { messages?: MetaMessage[] };
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
            console.error("[destinoya-meta handle err]", e);
          }
        })
      );
    } catch (err) {
      console.error("[destinoya-meta webhook err]", err);
    }
  });

  return NextResponse.json({ ok: true });
}
