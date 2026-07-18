/**
 * ActivosYA Central — sistema de notificaciones cross-bot.
 *
 * Cada bot (Destino/Sofia/Cuento/Eco/ChoferYa) llama notifyActivosYA(...)
 * cuando ocurre un evento relevante. La función:
 *   1. Persiste el evento en ay_eventos
 *   2. Envía WhatsApp a Percy con mensaje corto
 *
 * Uso típico:
 *   await notifyActivosYA({
 *     tipo: "yape_confirmado",
 *     servicio: "destinoya",
 *     monto: 9.00,
 *     cliente_phone: "+51987654321",
 *     cliente_nombre: "Juan Pérez",
 *     detalle: { servicio_pedido: "Asesoría Legal", op: "12345" },
 *   });
 */
import { createClient } from "@supabase/supabase-js";

const PERCY_PHONE = "51998102258"; // Tu WhatsApp para alertas

export type EventoTipo =
  | "yape_confirmado"
  | "cliente_nuevo"
  | "error_bot"
  | "lead_b2b"
  | "cuento_generado"
  | "consulta_vip"
  | "plan_activado"
  | "plan_renovado"
  | "plan_vencido"
  | "referido"
  | "feedback";

export type Servicio =
  | "destinoya"
  | "sofia"
  | "cuento"
  | "ecodrive"
  | "choferya"
  | "activosya"
  | "sistema";

export type NotifyOptions = {
  tipo: EventoTipo;
  servicio: Servicio;
  monto?: number;
  cliente_phone?: string;
  cliente_nombre?: string;
  detalle?: Record<string, unknown>;
  mensaje_corto?: string; // override del auto-formato
  silencioso?: boolean; // solo loguea, no manda WA
};

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function emojiServicio(s: Servicio): string {
  return (
    {
      destinoya: "🔮",
      sofia: "🎓",
      cuento: "🦮",
      ecodrive: "🚗",
      choferya: "🧑‍✈️",
      activosya: "🏢",
      sistema: "⚙️",
    }[s] || "📊"
  );
}

function emojiTipo(t: EventoTipo): string {
  return (
    {
      yape_confirmado: "💵",
      cliente_nuevo: "🆕",
      error_bot: "🚨",
      lead_b2b: "💼",
      cuento_generado: "📖",
      consulta_vip: "👑",
      plan_activado: "✅",
      plan_renovado: "🔁",
      plan_vencido: "⏰",
      referido: "🤝",
      feedback: "💬",
    }[t] || "🔔"
  );
}

function formatMensaje(opts: NotifyOptions): string {
  if (opts.mensaje_corto) return opts.mensaje_corto;
  const eS = emojiServicio(opts.servicio);
  const eT = emojiTipo(opts.tipo);
  const lines = [`${eT}${eS} *${opts.tipo.replace(/_/g, " ").toUpperCase()}*`];
  if (opts.servicio) lines.push(`Servicio: ${opts.servicio}`);
  if (opts.monto !== undefined) lines.push(`Monto: S/${opts.monto.toFixed(2)}`);
  if (opts.cliente_nombre) lines.push(`Cliente: ${opts.cliente_nombre}`);
  if (opts.cliente_phone) lines.push(`Tel: ${opts.cliente_phone}`);
  if (opts.detalle && Object.keys(opts.detalle).length > 0) {
    const det = Object.entries(opts.detalle)
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
      .join(" · ");
    lines.push(`📋 ${det}`);
  }
  return lines.join("\n");
}

async function enviarWA(phone: string, body: string): Promise<void> {
  const token = process.env.META_ACTIVOSYA_ACCESS_TOKEN || process.env.META_DESTINOYA_ACCESS_TOKEN;
  const phoneId = process.env.META_ACTIVOSYA_PHONE_ID;
  if (!token || !phoneId) {
    console.warn("[notifyActivosYA] WA no configurado, skipping send");
    return;
  }
  try {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body, preview_url: false },
      }),
    });
  } catch (e) {
    console.error("[notifyActivosYA] WA send error:", (e as Error).message);
  }
}

export async function notifyActivosYA(opts: NotifyOptions): Promise<{ ok: boolean; event_id?: string }> {
  const supabase = db();
  const mensaje = formatMensaje(opts);

  // Auto-extraer monto si no viene explícito pero el mensaje contiene "S/X"
  let monto = opts.monto;
  if (monto === undefined || monto === null) {
    // Matches "S/3", "S/. 3", "S/3.00", "S/ 9.90", etc
    const match = (opts.mensaje_corto ?? mensaje).match(/S\/[.\s]*(\d+(?:[.,]\d+)?)/);
    if (match) monto = parseFloat(match[1].replace(",", "."));
  }
  // Extraer cliente_nombre del mensaje también si no viene
  let cliente_nombre = opts.cliente_nombre;
  if (!cliente_nombre) {
    const m = (opts.mensaje_corto ?? mensaje).match(/(?:Cliente|L[ií]der|Nombre):\s*([^\n]{2,60})/i);
    if (m) cliente_nombre = m[1].trim();
  }

  const { data, error } = await supabase
    .from("ay_eventos")
    .insert({
      tipo: opts.tipo,
      servicio: opts.servicio,
      monto: monto ?? null,
      cliente_phone: opts.cliente_phone ?? null,
      cliente_nombre: cliente_nombre ?? null,
      detalle: opts.detalle ?? {},
      mensaje_corto: mensaje,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[notifyActivosYA] DB error:", error.message);
    return { ok: false };
  }

  if (!opts.silencioso) {
    await enviarWA(PERCY_PHONE, mensaje);
    await supabase
      .from("ay_eventos")
      .update({ notificado: true, notificado_at: new Date().toISOString() })
      .eq("id", data.id);
  }

  return { ok: true, event_id: data.id };
}

/**
 * Helper para errores - los formatea con stack trace truncado.
 */
export async function notifyError(opts: {
  servicio: Servicio;
  error: Error | string;
  contexto?: string;
}): Promise<void> {
  const errMsg = opts.error instanceof Error ? opts.error.message : String(opts.error);
  const stack = opts.error instanceof Error ? opts.error.stack?.split("\n").slice(0, 3).join("\n") : "";
  await notifyActivosYA({
    tipo: "error_bot",
    servicio: opts.servicio,
    detalle: {
      error: errMsg.slice(0, 200),
      stack: stack?.slice(0, 300),
      ctx: opts.contexto?.slice(0, 200),
    },
  });
}
