/**
 * POST /api/ecodrive/club/culqi-charge
 *
 * Cobra la Membresía (Club Pass anual) con Culqi — tarjeta o Yape — reusando la
 * cuenta Culqi de ActivosYA. Recibe el token generado por Culqi Checkout v4 en el
 * front y el id de la reserva ya creada (número asignado + precio esperado).
 *
 * Al aprobarse el cargo, activa la Membresía con el mismo efecto que el flujo Yape
 * manual (crea miembro + club_pass + ticket bonus + notifica por WhatsApp).
 *
 * Body: { token: string, reserva_id: string, email?: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getClubClient } from "@/lib/ecodrive/club";
import { activarPassDesdeReserva, type ReservaActivable } from "@/lib/ecodrive/club-activar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { token, reserva_id, email } = body as {
    token?: string;
    reserva_id?: string;
    email?: string;
  };

  if (!token || typeof token !== "string")
    return NextResponse.json({ error: "token requerido" }, { status: 400 });
  if (!reserva_id || typeof reserva_id !== "string")
    return NextResponse.json({ error: "reserva_id requerido" }, { status: 400 });

  const secret = process.env.CULQI_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Culqi no configurado" }, { status: 500 });

  const sb = getClubClient();

  // 1) Cargar la reserva y validar que siga vigente
  const { data: reserva } = await sb
    .from("club_reservas")
    .select("id,edicion_id,modalidad,numero_correlativo,dni,whatsapp,nombre,tipo_perfil,precio_esperado,expira_en")
    .eq("id", reserva_id)
    .maybeSingle();

  if (!reserva)
    return NextResponse.json({ error: "reserva no encontrada — volvé a empezar" }, { status: 404 });
  if (new Date(reserva.expira_en).getTime() < Date.now())
    return NextResponse.json({ error: "la reserva expiró — volvé a empezar" }, { status: 409 });

  const monto = Number(reserva.precio_esperado);
  const amountCentimos = Math.round(monto * 100);
  const emailCobro = (email && String(email).includes("@"))
    ? String(email).trim()
    : `club_${reserva.dni}@ecodriveplus.com`;

  // 2) Crear el cargo en Culqi
  let charge: {
    object?: string;
    id?: string;
    user_message?: string;
    merchant_message?: string;
    type?: string;
  };
  try {
    const culqiRes = await fetch("https://api.culqi.com/v2/charges", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amountCentimos,
        currency_code: "PEN",
        email: emailCobro,
        source_id: token,
        description: `EcoDrive+ Club — Membresía #${reserva.numero_correlativo}`,
        metadata: {
          producto: "ecodrive_club",
          reserva_id: reserva.id,
          numero_correlativo: String(reserva.numero_correlativo),
          dni: reserva.dni,
          edicion_id: reserva.edicion_id,
        },
      }),
    });
    charge = await culqiRes.json();
    const exito = culqiRes.ok && charge?.object === "charge" && !!charge?.id;
    if (!exito) {
      const msg =
        charge?.user_message ||
        charge?.merchant_message ||
        "No se pudo procesar el pago. Revisá los datos o intentá con otro método.";
      return NextResponse.json({ error: msg, culqi: charge?.type ?? null }, { status: 402 });
    }
  } catch (e) {
    console.error("[club/culqi-charge] error cargo Culqi:", e);
    return NextResponse.json({ error: "No se pudo contactar la pasarela de pago." }, { status: 502 });
  }

  // 3) Activar la Membresía (idempotente por charge.id)
  try {
    const res = await activarPassDesdeReserva({
      sb,
      req,
      reserva: reserva as ReservaActivable,
      monto,
      metodo: "culqi",
      paymentIntentId: charge.id!,
    });
    if (!res.ok) {
      // El cargo SÍ pasó pero la activación falló: no bloquear al cliente, dejar rastro.
      console.error("[club/culqi-charge] cargo OK pero activación falló:", res.error, "charge:", charge.id);
      return NextResponse.json(
        { error: "Tu pago se procesó pero hubo un problema activando la Membresía. Te contactaremos por WhatsApp.", charge_id: charge.id },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      charge_id: charge.id,
      numero_correlativo: res.numero_correlativo,
      numero_pass: res.numero_pass,
      fecha_fin: res.fecha_fin,
      duplicate: res.duplicate ?? false,
    });
  } catch (e) {
    console.error("[club/culqi-charge] error activando:", e);
    return NextResponse.json(
      { error: "Tu pago se procesó pero hubo un problema activando la Membresía. Te contactaremos por WhatsApp.", charge_id: charge.id },
      { status: 500 },
    );
  }
}
