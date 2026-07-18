import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizarTelefonoPE } from "@/lib/activosya/operadores";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * POST /api/choferya/calificar
 * Body: { reserva_id, pasajero_wa_id, estrellas (1-5), comentario? }
 *
 * El pasajero solo puede calificar reservas COMPLETADAS donde su wa_id matchee.
 * UNIQUE en reserva_id evita doble calificación.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reserva_id, pasajero_wa_id, estrellas, comentario } = body;

    if (!reserva_id) return NextResponse.json({ error: "reserva_id requerido" }, { status: 400 });

    const waNorm = normalizarTelefonoPE(pasajero_wa_id || "");
    if (!waNorm) return NextResponse.json({ error: "WhatsApp inválido" }, { status: 400 });

    const est = Number(estrellas);
    if (!Number.isInteger(est) || est < 1 || est > 5)
      return NextResponse.json({ error: "Estrellas 1-5" }, { status: 400 });

    const sb = db();

    // Validar que la reserva existe, está completada, y el wa_id matchea
    const { data: reserva } = await sb
      .from("choferya_reservas")
      .select("id, chofer_id, pasajero_wa_id, estado")
      .eq("id", reserva_id)
      .maybeSingle();

    if (!reserva) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
    if (reserva.pasajero_wa_id !== waNorm)
      return NextResponse.json({ error: "Esta reserva no es tuya" }, { status: 403 });
    if (reserva.estado !== "completada")
      return NextResponse.json(
        { error: "Solo se califican viajes completados" },
        { status: 409 }
      );

    const { error: errCalif } = await sb.from("choferya_calificaciones").insert({
      chofer_id: reserva.chofer_id,
      reserva_id: reserva.id,
      pasajero_wa_id: waNorm,
      estrellas: est,
      comentario: (comentario || "").toString().trim().slice(0, 500) || null,
    });

    if (errCalif) {
      // Si chocó por UNIQUE (ya calificó), tratarlo como 409
      if (errCalif.message?.includes("duplicate") || errCalif.code === "23505") {
        return NextResponse.json({ error: "Ya calificaste esta reserva" }, { status: 409 });
      }
      return NextResponse.json({ error: errCalif.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
