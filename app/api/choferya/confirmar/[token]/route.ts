import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyReservaToken } from "@/lib/activosya/choferya-token";

const META_TOKEN =
  process.env.META_CHOFERYA_ACCESS_TOKEN || process.env.ECODRIVE_META_ACCESS_TOKEN || "";
const META_PHONE_ID =
  process.env.META_CHOFERYA_PHONE_ID || "1044803088721236";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!META_TOKEN) return;
  try {
    await fetch(`https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
  } catch (e) {
    console.error("[confirmar send err]", (e as Error).message);
  }
}

function yapeDisplay(num: string | null): string {
  if (!num) return "";
  const last9 = num.startsWith("51") ? num.slice(2) : num;
  return `${last9.slice(0, 3)} ${last9.slice(3, 6)} ${last9.slice(6, 9)}`;
}

/**
 * GET /api/choferya/confirmar/[token]
 *
 * Confirma una reserva pendiente. Token HMAC firmado (TTL 72h).
 * Devuelve página HTML simple porque el chofer entra desde un link
 * WhatsApp, no es API JSON.
 */
async function handleConfirm(token: string) {
  const v = verifyReservaToken(token);
  if (!v.ok) {
    return new Response(htmlError("Link inválido o expirado"), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  if (v.action !== "confirmar") {
    return new Response(htmlError("Token de otro tipo"), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const sb = db();
  const { data: reserva } = await sb
    .from("choferya_reservas")
    .select(
      "id, chofer_id, pasajero_wa_id, pasajero_nombre, fecha_viaje, hora_viaje, origen_direccion, destino_direccion, precio_pen, estado"
    )
    .eq("id", v.reservaId)
    .maybeSingle();

  if (!reserva) {
    return new Response(htmlError("Reserva no encontrada"), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (reserva.estado !== "pendiente") {
    return new Response(
      htmlInfo(
        `Esta reserva ya está ${reserva.estado}. No requiere acción.`,
        "Estado actual"
      ),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const { data: chofer } = await sb
    .from("eco_choferes")
    .select("nombre, yape_celular, wa_id")
    .eq("id", reserva.chofer_id)
    .maybeSingle();

  // Actualizar a confirmada
  await sb
    .from("choferya_reservas")
    .update({ estado: "confirmada", confirmed_at: new Date().toISOString() })
    .eq("id", reserva.id);

  // Avisar al pasajero con el Yape del chofer
  if (chofer) {
    const yapeDisp = yapeDisplay(chofer.yape_celular);
    const fechaLabel = new Date(reserva.fecha_viaje).toLocaleDateString("es-PE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
    const msg =
      `🚖 *${chofer.nombre} confirmó tu reserva*\n\n` +
      `📅 ${fechaLabel} · ${reserva.hora_viaje}\n` +
      (reserva.origen_direccion ? `📍 Origen: ${reserva.origen_direccion}\n` : "") +
      (reserva.destino_direccion ? `🏁 Destino: ${reserva.destino_direccion}\n` : "") +
      `💰 Precio: *S/. ${reserva.precio_pen}*\n\n` +
      (yapeDisp
        ? `*Yape al chofer:*\n📱 ${yapeDisp}\n👤 ${chofer.nombre}\n\n`
        : `_El chofer te dará su Yape antes del viaje._\n\n`) +
      `_Para cualquier coordinación, escríbele directo al ${chofer.wa_id}._\n\n` +
      `🚀 TuChoferYa`;
    await sendWhatsApp(reserva.pasajero_wa_id, msg);
  }

  return new Response(
    htmlInfo(
      `Reserva confirmada. Le avisamos al pasajero y le dimos tu Yape para que te pague.`,
      "✅ Listo"
    ),
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handleConfirm(token);
}
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handleConfirm(token);
}

function htmlPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} · TuChoferYa</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
  .card{max-width:480px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:32px;text-align:center}
  h1{margin:0 0 16px;color:#fb923c}
  p{margin:0;color:rgba(255,255,255,.7);line-height:1.6}
  a{display:inline-block;margin-top:24px;padding:12px 24px;background:#f97316;color:#000;border-radius:999px;text-decoration:none;font-weight:600}
</style></head><body>
<div class="card">${body}<a href="https://chofer.activosya.com">TuChoferYa</a></div>
</body></html>`;
}

function htmlInfo(msg: string, title = "Listo"): string {
  return htmlPage(title, `<h1>${title}</h1><p>${msg}</p>`);
}

function htmlError(msg: string): string {
  return htmlPage("Error", `<h1>Algo no cuadra</h1><p>${msg}</p>`);
}
