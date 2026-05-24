/**
 * TuCuentoYa — Webhook Meta Cloud directo.
 *
 * Flujo:
 *  - GET: verify token
 *  - POST: ack inmediato, procesa en background con after()
 *  - Texto / audio / imagen → procesarMensaje agente
 *  - Si agente retorna audio_pedido_id → genera cuento y envía MP3
 *
 * Multi-tenant: identifica operador por phone_id receptor (igual que destino).
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
  sendText,
  uploadAndSendMedia,
  downloadMetaMedia,
} from "@/lib/cuentoinfantil/meta-cloud-sender";
import { procesarMensaje } from "@/lib/cuentoinfantil/agent";
import { generarCuento } from "@/lib/cuentoinfantil/generator";
import {
  getConversacion,
  upsertConversacion,
  supabase,
} from "@/lib/cuentoinfantil/db";
import { verificarCapturaYape, aplicarPago } from "@/lib/cuentoinfantil/yape-verify";
import {
  getOperadorByMetaPhoneId,
  type OperadorContexto,
} from "@/lib/activosya/operadores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90; // generación cuento puede tomar 30-60s

type MetaMessage = {
  from: string;
  type: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
  image?: { id?: string; mime_type?: string; caption?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
};

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
  const chunks = dividirMensaje(body);
  for (let i = 0; i < chunks.length; i++) {
    await sendText(toPhone, chunks[i]);
    if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 400));
  }
}

/**
 * Transcribe audio de WhatsApp usando Groq Whisper (model whisper-large-v3-turbo).
 * Reusa el patrón validado en lib/miss-sofia-voice y app/api/whatsapp/choferya.
 */
async function transcribirAudio(mediaId: string): Promise<string | null> {
  const groqKey = (process.env.GROQ_API_KEY ?? "").trim();
  if (!groqKey) {
    console.error("[cuento transcribirAudio] GROQ_API_KEY no configurada");
    return null;
  }
  try {
    const dl = await downloadMetaMedia(mediaId);
    if (!dl) return null;
    const fd = new FormData();
    const blob = new Blob([new Uint8Array(dl.buffer)], {
      type: dl.mime || "audio/ogg",
    });
    fd.append("file", blob, "voice.ogg");
    fd.append(
      "model",
      process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo",
    );
    fd.append("language", "es");
    fd.append("response_format", "json");
    const r = await fetch(
      "https://api.groq.com/openai/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: fd,
      },
    );
    if (!r.ok) {
      console.error("[cuento transcribirAudio] groq HTTP", r.status);
      return null;
    }
    const j = (await r.json()) as { text?: string };
    return (j.text || "").trim() || null;
  } catch (e) {
    console.error("[cuento transcribirAudio] err", (e as Error).message);
    return null;
  }
}

async function handleMessage(
  m: MetaMessage,
  operador: OperadorContexto | null = null,
): Promise<void> {
  const from = m.from;
  if (!from) return;
  const phoneE164 = `+${from.replace(/^\+/, "")}`;

  // ─── IMAGEN: probablemente captura Yape ─────────────────────────
  if (m.type === "image" && m.image?.id) {
    await sendText(phoneE164, "🦮 Revisando tu Yape... dame unos segundos ✨");
    const dl = await downloadMetaMedia(m.image.id);
    if (!dl) {
      await sendText(phoneE164, "No pude descargar tu imagen. Intenta enviarla de nuevo.");
      return;
    }
    const yape = await verificarCapturaYape(dl.buffer, dl.mime);
    if (!yape.detectado) {
      await sendText(
        phoneE164,
        `No pude verificar tu Yape: ${yape.motivo_rechazo ?? "captura no válida"}.\n\nIntenta enviarme una captura clara de la pantalla de confirmación Yape.`,
      );
      return;
    }
    if (yape.destinatario_ok === false) {
      await sendText(
        phoneE164,
        `⚠️ El destinatario no coincide. Asegúrate de yapear a *998 102 258* (Percy Roj*).`,
      );
      return;
    }
    if (!yape.monto || yape.monto <= 0) {
      await sendText(phoneE164, `No pude leer el monto del Yape. Intenta otra captura.`);
      return;
    }

    const aplicado = await aplicarPago({
      celular: phoneE164,
      monto: yape.monto,
      referencia: yape.referencia,
    });
    await sendText(phoneE164, aplicado.mensaje);

    // Si tras aplicar pago hay un pedido pendiente esperando, dispararlo
    if (aplicado.ok && aplicado.tipo === "cuento_suelto") {
      const conv = await getConversacion(phoneE164);
      const ctx = (conv?.contexto ?? {}) as Record<string, unknown>;
      if (ctx.duracion && ctx.escenario && ctx.hijo) {
        // Re-procesar como confirmación
        await upsertConversacion(phoneE164, { estado: "confirmando_pedido" });
        const r = await procesarMensaje({ telefono: phoneE164, mensaje: "sí", operador });
        if (r.reply) await sendChunked(phoneE164, r.reply);
        if (r.audio_pedido_id) {
          await generarYEnviarCuento({
            phone: phoneE164,
            pedido_id: r.audio_pedido_id,
            ctxConv: ctx,
          });
        }
      }
    }
    return;
  }

  // ─── AUDIO (Whisper transcription via Groq) ─────────────────────
  if (m.type === "audio" && m.audio?.id) {
    const transcript = await transcribirAudio(m.audio.id);
    if (!transcript) {
      await sendText(
        phoneE164,
        "🦮 No pude entender tu audio. Intenta de nuevo o escríbeme el texto.",
      );
      return;
    }
    await sendText(phoneE164, `🎙️ Te oí decir: _"${transcript.slice(0, 200)}"_`);
    const r = await procesarMensaje({
      telefono: phoneE164,
      mensaje: transcript,
      operador,
    });
    if (r.reply) await sendChunked(phoneE164, r.reply);
    if (r.audio_pedido_id) {
      const conv = await getConversacion(phoneE164);
      const ctxConv = (conv?.contexto ?? {}) as Record<string, unknown>;
      await generarYEnviarCuento({
        phone: phoneE164,
        pedido_id: r.audio_pedido_id,
        ctxConv,
      });
    }
    return;
  }

  // ─── INTERACTIVO (botones / listas) ────────────────────────────
  if (m.type === "interactive") {
    const text =
      m.interactive?.button_reply?.title ||
      m.interactive?.button_reply?.id ||
      m.interactive?.list_reply?.title ||
      m.interactive?.list_reply?.id ||
      "";
    if (text) {
      const r = await procesarMensaje({ telefono: phoneE164, mensaje: text, operador });
      if (r.reply) await sendChunked(phoneE164, r.reply);
      if (r.audio_pedido_id) {
        const conv = await getConversacion(phoneE164);
        const ctxConv = (conv?.contexto ?? {}) as Record<string, unknown>;
        await generarYEnviarCuento({
          phone: phoneE164,
          pedido_id: r.audio_pedido_id,
          ctxConv,
        });
      }
    }
    return;
  }

  // ─── TEXTO ──────────────────────────────────────────────────────
  if (m.type === "text") {
    const text = (m.text?.body || "").trim();
    if (!text) return;

    // Marketing opt-out / opt-in (prioridad sobre cualquier otro intent).
    if (isStopCommand(text)) {
      await markOptOut(phoneE164, "cuento");
      await sendText(phoneE164, OPT_OUT_REPLY);
      return;
    }
    if (isStartCommand(text)) {
      await clearOptOut(phoneE164);
      await sendText(phoneE164, OPT_IN_REPLY);
      return;
    }

    const r = await procesarMensaje({ telefono: phoneE164, mensaje: text, operador });
    if (r.reply) await sendChunked(phoneE164, r.reply);
    if (r.audio_pedido_id) {
      const conv = await getConversacion(phoneE164);
      const ctxConv = (conv?.contexto ?? {}) as Record<string, unknown>;
      await generarYEnviarCuento({
        phone: phoneE164,
        pedido_id: r.audio_pedido_id,
        ctxConv,
      });
    }
    return;
  }

  // Fallback
  await sendText(phoneE164, "🦮 No entendí ese mensaje. Escribe *menú* para empezar.");
}

async function generarYEnviarCuento(opts: {
  phone: string;
  pedido_id: string;
  ctxConv: Record<string, unknown>;
}): Promise<void> {
  // Idempotencia: si el pedido ya tiene audio_url, NO regenerar — solo reenviar
  try {
    const { supabase } = await import("@/lib/cuentoinfantil/db");
    const { data: existente } = await supabase
      .from("tci_pedidos")
      .select("audio_url, claude_titulo, texto_cuento, duracion_min, personajes")
      .eq("id", opts.pedido_id)
      .maybeSingle();
    if (existente?.audio_url) {
      const personajes = Array.isArray(existente.personajes) ? existente.personajes : [];
      const protagonista = (personajes[0] as { nombre?: string })?.nombre || "tu peque";
      const r = await fetch(existente.audio_url);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        await uploadAndSendMedia({
          to: opts.phone,
          buffer: buf,
          mimeType: "audio/mpeg",
          filename: `cuento-${protagonista}.mp3`,
        });
      } else {
        await sendText(opts.phone, `🦮 Tu cuento: ${existente.audio_url}`);
      }
      if (existente.claude_titulo || existente.texto_cuento) {
        await sendText(
          opts.phone,
          `🎉 *${existente.claude_titulo ?? "Cuento de " + protagonista}*\n\n` +
            `${(existente.texto_cuento ?? "").slice(0, 800)}\n\n` +
            `_Para otro cuento escribe *menú*. Tu historial: *mis cuentos*._`,
        );
      }
      return;
    }
  } catch (e) {
    console.error("[generarYEnviarCuento idempotencia]", (e as Error).message);
    // Si falla la verificación, sigue con generación normal
  }

  const hijo = opts.ctxConv.hijo as { nombre: string; edad?: number; genero?: "m" | "f" };
  const escenario = opts.ctxConv.escenario as string;
  const duracion = opts.ctxConv.duracion as 2 | 3 | 5;
  const rol = (opts.ctxConv.rol_pidiente as
    | "papa"
    | "mama"
    | "abuelo"
    | "abuela"
    | "tio"
    | "otro") ?? "papa";

  try {
    const gen = await generarCuento({
      pedido_id: opts.pedido_id,
      contexto: {
        duracion_min: duracion,
        hijo,
        acompanantes: [{ nombre: rol, rol }],
        escenario,
        prompt_original: escenario,
      },
      mezclar_ambient: false, // activar cuando ffmpeg esté configurado
    });

    if (!gen.ok) {
      await sendText(
        opts.phone,
        `😔 Tuve un problema generando tu cuento: ${gen.error ?? "error desconocido"}.\n\nEscribe *menú* para reintentar.`,
      );
      return;
    }

    // Descargar el MP3 y enviar como mensaje audio
    if (gen.audio_url) {
      const r = await fetch(gen.audio_url);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        await uploadAndSendMedia({
          to: opts.phone,
          buffer: buf,
          mimeType: "audio/mpeg",
          filename: `${gen.titulo ?? "cuento"}.mp3`,
        });
      } else {
        // Fallback: enviar link directo
        await sendText(opts.phone, `🦮 Tu cuento: ${gen.audio_url}`);
      }
    }

    await sendText(
      opts.phone,
      `🎉 *${gen.titulo}*\n\n${gen.texto_cuento?.slice(0, 800) ?? ""}\n\n` +
        `_Para otro cuento, escribe *menú*_ 🦮`,
    );

    await upsertConversacion(opts.phone, { estado: "entregado" });
  } catch (e) {
    await sendText(opts.phone, `Tuve un problema: ${(e as Error).message.slice(0, 200)}`);
  }
}

// ─── GET: verify webhook Meta ──────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = (process.env.META_CUENTO_VERIFY_TOKEN ?? "").trim();
  if (mode === "subscribe" && token && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// ─── POST: recibir mensajes ─────────────────────────────────────
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
            console.error("[cuento-meta handle err]", e);
            try {
              await supabase.from("tci_pedidos").insert({
                celular: msg.from,
                duracion_min: 0,
                escenario: `[webhook error] ${(e as Error).message.slice(0, 200)}`,
                personajes: [],
                monto: 0,
                fuente_pago: "gratis",
                status: "fallido",
              });
            } catch {}
          }
        }),
      );
    } catch (err) {
      console.error("[cuento-meta webhook err]", err);
    }
  });

  return NextResponse.json({ ok: true });
}
