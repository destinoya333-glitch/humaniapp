import { NextRequest } from "next/server";
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
    console.error("[rechazar send err]", (e as Error).message);
  }
}

async function handleReject(token: string) {
  const v = verifyReservaToken(token);
  if (!v.ok || v.action !== "rechazar") {
    return new Response(html("Link inválido o expirado", "#ef4444"), {
      status: 400,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const sb = db();
  const { data: reserva } = await sb
    .from("choferya_reservas")
    .select("id, pasajero_wa_id, pasajero_nombre, fecha_viaje, hora_viaje, estado, chofer_id")
    .eq("id", v.reservaId)
    .maybeSingle();

  if (!reserva) {
    return new Response(html("Reserva no encontrada", "#ef4444"), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (reserva.estado !== "pendiente") {
    return new Response(
      html(`Esta reserva ya está ${reserva.estado}.`, "#fb923c"),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  await sb
    .from("choferya_reservas")
    .update({
      estado: "rechazada",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "chofer",
    })
    .eq("id", reserva.id);

  // Avisar al pasajero (texto suave, sin culpar al chofer)
  const { data: chofer } = await sb
    .from("eco_choferes")
    .select("nombre")
    .eq("id", reserva.chofer_id)
    .maybeSingle();

  const fechaLabel = new Date(reserva.fecha_viaje).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  await sendWhatsApp(
    reserva.pasajero_wa_id,
    `Hola ${reserva.pasajero_nombre.split(" ")[0]}, ` +
      `${chofer?.nombre.split(" ")[0] || "el chofer"} no puede atender tu reserva del ${fechaLabel} ${reserva.hora_viaje}.\n\n` +
      `Encuentra otros choferes verificados aquí:\n` +
      `https://chofer.activosya.com/choferya/buscar`
  );

  return new Response(html("Reserva rechazada. Le avisamos al pasajero.", "#fb923c"), {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handleReject(token);
}
export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handleReject(token);
}

function html(msg: string, color: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>TuChoferYa</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{max-width:480px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:32px;text-align:center}
h1{color:${color};margin:0 0 16px}p{color:rgba(255,255,255,.7);line-height:1.6}</style></head>
<body><div class="card"><h1>OK</h1><p>${msg}</p></div></body></html>`;
}
