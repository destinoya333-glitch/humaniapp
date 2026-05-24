/**
 * Webhook ActivosYA Central (Meta Cloud).
 *
 * Modos:
 *  - CEO mode (sender = Percy 51998102258): comandos dashboard
 *  - B2B mode (cualquier otro): venta de franquicia
 *
 * Verify token: META_ACTIVOSYA_VERIFY_TOKEN
 * Phone ID:     META_ACTIVOSYA_PHONE_ID
 * Access token: META_ACTIVOSYA_ACCESS_TOKEN
 */
import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ejecutarComandoCEO } from "@/lib/activosya-central/comandos-ceo";
import { procesarMensajeB2B } from "@/lib/activosya-central/agent-b2b";
import {
  isStopCommand,
  isStartCommand,
  markOptOut,
  clearOptOut,
  OPT_OUT_REPLY,
  OPT_IN_REPLY,
} from "@/lib/marketing/opt-out";
import { notifyError } from "@/lib/activosya-central/notify";
import { despacharGrafico } from "@/lib/activosya-central/graficos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PERCY_PHONE = "51998102258";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function sendImage(to: string, imageUrl: string, caption: string): Promise<void> {
  const token = process.env.META_ACTIVOSYA_ACCESS_TOKEN;
  const phoneId = process.env.META_ACTIVOSYA_PHONE_ID;
  if (!token || !phoneId) return;
  await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { link: imageUrl, caption },
    }),
  });
}

async function sendText(to: string, body: string): Promise<void> {
  const token = process.env.META_ACTIVOSYA_ACCESS_TOKEN;
  const phoneId = process.env.META_ACTIVOSYA_PHONE_ID;
  if (!token || !phoneId) {
    console.warn("[activosya] no env vars");
    return;
  }
  // Split en chunks de 4000 chars (límite WA)
  const chunks: string[] = [];
  for (let i = 0; i < body.length; i += 3800) chunks.push(body.slice(i, i + 3800));
  for (const chunk of chunks) {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: chunk, preview_url: false },
      }),
    });
  }
}

// ====================================================
// VERIFY (Meta GET)
// ====================================================
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.META_ACTIVOSYA_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// ====================================================
// RECEIVE (Meta POST)
// ====================================================
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Procesar después del response (after() permite que la función siga viva en Vercel)
  after(async () => {
    try {
      await procesarEvento(body);
    } catch (e) {
      console.error("[activosya] processing err:", e);
      await notifyError({ servicio: "activosya", error: e as Error });
    }
  });
  return NextResponse.json({ ok: true });
}

async function procesarEvento(body: unknown): Promise<void> {
  const entries = (body as { entry?: Array<{ changes?: Array<{ value?: { messages?: unknown[]; contacts?: unknown[] } }> }> }).entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      const messages = (value as { messages?: unknown[] }).messages ?? [];
      const contacts = (value as { contacts?: Array<{ profile?: { name?: string } }> }).contacts ?? [];
      const nombrePerfil = contacts[0]?.profile?.name ?? null;
      for (const m of messages) {
        await procesarMensaje(m as Record<string, unknown>, nombrePerfil);
      }
    }
  }
}

async function procesarMensaje(m: Record<string, unknown>, nombreContacto: string | null): Promise<void> {
  const from = String(m.from || "");
  const tipo = m.type as string;
  if (!from) return;
  const phoneE164 = `+${from.replace(/^\+/, "")}`;
  const senderNormalizado = from.startsWith("51") ? from : `51${from}`;
  const esCEO = senderNormalizado === PERCY_PHONE;

  let texto = "";
  if (tipo === "text") {
    texto = String((m.text as { body?: string })?.body || "").trim();
  } else if (tipo === "interactive") {
    const inter = m.interactive as { button_reply?: { id?: string }; list_reply?: { id?: string } };
    texto = inter.button_reply?.id || inter.list_reply?.id || "";
  } else if (tipo === "button") {
    texto = String((m.button as { payload?: string; text?: string })?.payload || (m.button as { text?: string })?.text || "");
  } else if (tipo === "audio") {
    // TODO: integrar Whisper si Percy quiere comandos por voz
    await sendText(from, "🎙️ Por ahora solo respondo a texto. Manda el comando escrito.");
    return;
  } else {
    return; // ignoramos imágenes/docs por ahora
  }
  if (!texto) return;

  // Marketing opt-out / opt-in (tiene prioridad sobre cualquier otro intent).
  if (tipo === "text" && isStopCommand(texto)) {
    await markOptOut(senderNormalizado, "activosya");
    await sendText(from, OPT_OUT_REPLY);
    return;
  }
  if (tipo === "text" && isStartCommand(texto)) {
    await clearOptOut(senderNormalizado);
    await sendText(from, OPT_IN_REPLY);
    return;
  }

  const supabase = db();

  // Cargar/crear conv
  const { data: conv } = await supabase.from("ay_conv").select("*").eq("phone", phoneE164).maybeSingle();
  const historial = ((conv?.chat_messages as unknown as { role: "user" | "assistant"; content: string }[]) ?? []).slice(-20);

  let respuesta = "";

  // ─── CEO MODE ───
  if (esCEO) {
    // Comando /grafico devuelve imagen
    if (/^\/?grafico\b/i.test(texto)) {
      const arg = texto.replace(/^\/?grafico\s*/i, "");
      const r = await despacharGrafico(arg);
      if (typeof r === "string") {
        respuesta = r;
      } else {
        // Enviar imagen + caption y persistir conv
        await sendImage(from, r.url, r.caption);
        await db().from("ay_conv").upsert({
          phone: phoneE164,
          modo: "ceo",
          chat_messages: [
            ...historial,
            { role: "user" as const, content: texto },
            { role: "assistant" as const, content: `[grafico] ${r.caption}` },
          ].slice(-30),
          ultimo_mensaje_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "phone" });
        return;
      }
    } else {
      const cmd = await ejecutarComandoCEO(texto);
      if (cmd) {
        respuesta = cmd;
      } else {
        respuesta =
          `🏢 *ActivosYA — Modo CEO*\n\n` +
          `Comandos disponibles:\n` +
          `📊 /reporte hoy | semana | mes | historico\n` +
          `💰 /ventas [servicio]\n` +
          `🚨 /alertas\n` +
          `👤 /clientes [hoy|semana]\n` +
          `📈 /resumen — vista panorámica\n` +
          `📊 /grafico — ingresos por servicio (default 7 días)\n` +
          `📊 /grafico tendencia — line chart 14 días\n` +
          `📊 /grafico eventos — distribución torta\n\n` +
          `_Te enviaré notificaciones automáticas de yapes, leads y errores de los bots._`;
      }
    }
  }
  // ─── B2B MODE ───
  else {
    try {
      respuesta = await procesarMensajeB2B({
        phone: phoneE164,
        nombre: nombreContacto,
        mensaje: texto,
        historial,
      });
    } catch (e) {
      console.error("[b2b] err:", e);
      respuesta = "Disculpa, tuve un inconveniente. Déjame un momento e intento de nuevo. 🙏";
    }
  }

  // Persistir conv
  const newHistorial = [
    ...historial,
    { role: "user" as const, content: texto },
    { role: "assistant" as const, content: respuesta },
  ].slice(-30);
  await supabase.from("ay_conv").upsert(
    {
      phone: phoneE164,
      modo: esCEO ? "ceo" : "b2b",
      chat_messages: newHistorial,
      ultimo_mensaje_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "phone" },
  );

  await sendText(from, respuesta);
}
