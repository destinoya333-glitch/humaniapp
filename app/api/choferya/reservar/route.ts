import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizarTelefonoPE } from "@/lib/activosya/operadores";
import { issueReservaToken } from "@/lib/activosya/choferya-token";

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

async function notifyChoferDeReserva(
  choferWa: string,
  choferNombre: string,
  reservaId: string,
  pasajero: string,
  fecha: string,
  hora: string,
  origen: string,
  destino: string,
  precio: number
): Promise<void> {
  if (!META_TOKEN) return;

  const confirmarToken = issueReservaToken(reservaId, "confirmar");
  const rechazarToken = issueReservaToken(reservaId, "rechazar");
  const confirmarUrl = `https://activosya.com/api/choferya/confirmar/${confirmarToken}`;
  const rechazarUrl = `https://activosya.com/api/choferya/rechazar/${rechazarToken}`;

  // Texto plano por ahora — cuando el template choferya_nueva_reserva esté
  // aprobado por Meta (Sprint TC-6) cambiamos a template con quick_reply.
  const fechaLabel = new Date(fecha).toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const body =
    `🚖 *Nueva reserva TuChoferYa*\n\n` +
    `Pasajero: ${pasajero}\n` +
    `Fecha: ${fechaLabel} · ${hora}\n` +
    (origen ? `Origen: ${origen}\n` : "") +
    (destino ? `Destino: ${destino}\n` : "") +
    `Precio acordado: S/. ${precio}\n\n` +
    `*Confirmar:* ${confirmarUrl}\n` +
    `*Rechazar:* ${rechazarUrl}\n\n` +
    `_Tienes 60 minutos para responder. Si no respondes, queda pendiente._`;

  try {
    await fetch(`https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: choferWa,
        type: "text",
        text: { body },
      }),
    });
  } catch (e) {
    console.error("[choferya/reservar notif err]", (e as Error).message);
  }
}

/**
 * POST /api/choferya/reservar
 * Body: { slug, pasajero_nombre, pasajero_wa_id, fecha_viaje, hora_viaje,
 *         origen_direccion?, destino_direccion?, precio_id?, precio_pen,
 *         notas?, source? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      slug,
      pasajero_nombre,
      pasajero_wa_id,
      fecha_viaje,
      hora_viaje,
      origen_direccion,
      destino_direccion,
      precio_id,
      precio_pen,
      notas,
      source,
    } = body;

    if (!slug) return NextResponse.json({ error: "slug requerido" }, { status: 400 });
    if (!pasajero_nombre || pasajero_nombre.trim().length < 2)
      return NextResponse.json({ error: "Nombre del pasajero requerido" }, { status: 400 });

    const waNorm = normalizarTelefonoPE(pasajero_wa_id || "");
    if (!waNorm) return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });

    if (!fecha_viaje || !hora_viaje)
      return NextResponse.json({ error: "Fecha y hora requeridas" }, { status: 400 });

    const precioNum = Number(precio_pen);
    if (!Number.isFinite(precioNum) || precioNum < 0)
      return NextResponse.json({ error: "Precio inválido" }, { status: 400 });

    const sb = db();

    // 1. Buscar chofer por slug
    const { data: chofer, error: errChofer } = await sb
      .from("eco_choferes")
      .select("id, nombre, wa_id, choferya_active, choferya_subscription_until")
      .eq("choferya_slug", slug)
      .eq("status", "approved")
      .maybeSingle();

    if (errChofer || !chofer)
      return NextResponse.json({ error: "Chofer no encontrado" }, { status: 404 });

    if (!chofer.choferya_active)
      return NextResponse.json({ error: "Chofer no disponible" }, { status: 409 });

    if (
      chofer.choferya_subscription_until &&
      new Date(chofer.choferya_subscription_until) < new Date()
    ) {
      return NextResponse.json({ error: "Suscripción del chofer vencida" }, { status: 409 });
    }

    // 2. Crear reserva
    const { data: reserva, error: errInsert } = await sb
      .from("choferya_reservas")
      .insert({
        chofer_id: chofer.id,
        pasajero_wa_id: waNorm,
        pasajero_nombre: pasajero_nombre.trim(),
        fecha_viaje,
        hora_viaje,
        origen_direccion: origen_direccion?.trim() || null,
        destino_direccion: destino_direccion?.trim() || null,
        precio_id: precio_id || null,
        precio_pen: precioNum,
        notas: notas?.trim() || null,
        source: source || "web",
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (errInsert || !reserva)
      return NextResponse.json(
        { error: `Crear reserva: ${errInsert?.message || "?"}` },
        { status: 500 }
      );

    // 3. Notificar al chofer (background — no bloquea respuesta)
    notifyChoferDeReserva(
      chofer.wa_id,
      chofer.nombre,
      reserva.id,
      pasajero_nombre.trim(),
      fecha_viaje,
      hora_viaje,
      origen_direccion?.trim() || "",
      destino_direccion?.trim() || "",
      precioNum
    ).catch((e) => console.error("[choferya/reservar notif bg]", e));

    return NextResponse.json({
      ok: true,
      reserva_id: reserva.id,
      chofer_nombre: chofer.nombre,
      estado: "pendiente",
      mensaje: `Reserva enviada. ${chofer.nombre.split(" ")[0]} debe confirmarla en su WhatsApp.`,
    });
  } catch (e) {
    const msg = (e as Error).message || "Error";
    console.error("[/api/choferya/reservar]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
