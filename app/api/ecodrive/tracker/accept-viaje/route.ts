/**
 * POST /api/ecodrive/tracker/accept-viaje
 * Body: { token: string, viaje_id: string, action: "accept" | "reject" }
 *
 * Acepta o rechaza el viaje desde el PWA del chofer (sin pasar por flow Meta).
 * Si acepta: marca viaje asignado + crea tracking_session + manda template eco_chofer_asignado al pasajero.
 * Si rechaza: marca al chofer como rechazo en intentos y dispara reasignación.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferTrackerToken } from "@/lib/ecodrive/tracker-token";
import { findNearestChofer } from "@/lib/ecodrive/matching";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const GRAPH = "https://graph.facebook.com/v22.0";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function notifyPasajero(
  pasajeroWaId: string,
  viajeId: string,
  c: { nombre: string; vehiculo_marca: string; vehiculo_modelo: string; placa: string },
  etaMin: number
) {
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (!phoneId || !token) return;
  try {
    await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: pasajeroWaId,
        type: "template",
        template: {
          name: "eco_chofer_asignado",
          language: { code: "es" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: "amigo" },
                { type: "text", text: c.nombre.split(" ")[0] || "Chofer" },
                { type: "text", text: String(etaMin) },
                { type: "text", text: `${c.vehiculo_marca} ${c.vehiculo_modelo}`.trim() },
                { type: "text", text: c.placa },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: viajeId }],
            },
          ],
        },
      }),
    });
  } catch {}
}

async function notifyOtroChofer(
  viajeId: string,
  origenLat: number,
  origenLng: number,
  origenDir: string,
  destinoDir: string,
  km: number,
  tarifa: number,
  pasajeroNombre: string,
  intentosPrev: string[]
) {
  const elegido = await findNearestChofer(origenLat, origenLng, intentosPrev);
  if (!elegido) {
    const sb = db();
    await sb
      .from("eco_viajes")
      .update({ estado: "rechazado_global", cancelado_at: new Date().toISOString() })
      .eq("id", viajeId);
    return;
  }
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (phoneId && token) {
    try {
      await fetch(`${GRAPH}/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: elegido.wa_id,
          type: "template",
          template: {
            name: "eco_chofer_nuevo_viaje",
            language: { code: "es" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: pasajeroNombre.split(" ")[0] || "pasajero" },
                  { type: "text", text: origenDir.slice(0, 60) },
                  { type: "text", text: destinoDir.slice(0, 60) },
                  { type: "text", text: `${km}` },
                  { type: "text", text: `${tarifa}` },
                ],
              },
              {
                type: "button",
                sub_type: "flow",
                index: "0",
                parameters: [
                  {
                    type: "action",
                    action: { flow_token: `ecodrive:aceptar-viaje:${viajeId}` },
                  },
                ],
              },
            ],
          },
        }),
      });
    } catch {}
  }
  const sb = db();
  await sb
    .from("eco_viajes")
    .update({ intentos_choferes: [...intentosPrev, elegido.id] })
    .eq("id", viajeId);
}

export async function POST(req: Request) {
  let body: { token?: string; viaje_id?: string; action?: "accept" | "reject" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }
  const v = verifyChoferTrackerToken(body.token || "");
  if (!v.ok) {
    return NextResponse.json({ error: `token_${v.reason}` }, { status: 401, headers: noStore });
  }
  if (!body.viaje_id || !body.action) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: noStore });
  }

  const sb = db();
  const { data: viaje } = await sb
    .from("eco_viajes")
    .select(
      "id, estado, pasajero_wa_id, origen_direccion, origen_lat, origen_lng, destino_direccion, distancia_km, duracion_min, tarifa_estimada, intentos_choferes"
    )
    .eq("id", body.viaje_id)
    .maybeSingle();

  if (!viaje) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }
  const vRow = viaje as {
    id: string;
    estado: string;
    pasajero_wa_id: string;
    origen_direccion: string;
    origen_lat: number;
    origen_lng: number;
    destino_direccion: string;
    distancia_km: number;
    duracion_min: number;
    tarifa_estimada: number;
    intentos_choferes: string[];
  };

  if (
    vRow.estado === "asignado" ||
    vRow.estado === "en_curso" ||
    vRow.estado === "completado"
  ) {
    return NextResponse.json(
      { error: "viaje_ya_tomado" },
      { status: 409, headers: noStore }
    );
  }

  // Verificar que el chofer ESTÉ en la lista de intentos (fue notificado)
  if (!vRow.intentos_choferes.includes(v.choferId)) {
    return NextResponse.json(
      { error: "chofer_no_notificado" },
      { status: 403, headers: noStore }
    );
  }

  if (body.action === "accept") {
    const { data: c } = await sb
      .from("eco_choferes")
      .select("id, wa_id, nombre, vehiculo_marca, vehiculo_modelo, placa, rating, last_lat, last_lng")
      .eq("id", v.choferId)
      .maybeSingle();
    if (!c) {
      return NextResponse.json({ error: "chofer_not_found" }, { status: 404, headers: noStore });
    }
    const cc = c as {
      id: string;
      wa_id: string;
      nombre: string;
      vehiculo_marca: string;
      vehiculo_modelo: string;
      placa: string;
      rating: number | null;
      last_lat: number | null;
      last_lng: number | null;
    };

    await sb
      .from("eco_viajes")
      .update({
        estado: "asignado",
        chofer_id: v.choferId,
        chofer_wa_id: cc.wa_id,
        asignado_at: new Date().toISOString(),
      })
      .eq("id", body.viaje_id);

    await sb
      .from("eco_choferes")
      .update({ en_turno: true, updated_at: new Date().toISOString() })
      .eq("id", v.choferId);

    // Crear tracking session
    await sb.from("eco_tracking_sessions").insert({
      wa_id: vRow.pasajero_wa_id,
      chofer_nombre: cc.nombre,
      chofer_rating: cc.rating != null ? String(cc.rating) : "5.0",
      vehiculo: `${cc.vehiculo_marca} ${cc.vehiculo_modelo}`.trim(),
      placa: cc.placa,
      lat: cc.last_lat ?? -8.115,
      lng: cc.last_lng ?? -79.029,
      eta_min: vRow.duracion_min,
      distancia_km: String(vRow.distancia_km),
      estado: "En camino",
    });

    await notifyPasajero(vRow.pasajero_wa_id, body.viaje_id, cc, vRow.duracion_min);

    return NextResponse.json({ ok: true, action: "accepted" }, { headers: noStore });
  }

  if (body.action === "reject") {
    // Reasignar a otro chofer cercano
    const { data: pas } = await sb
      .from("eco_pasajeros")
      .select("nombre")
      .eq("wa_id", vRow.pasajero_wa_id)
      .maybeSingle();
    const pasajeroNombre = (pas as { nombre?: string } | null)?.nombre || "Pasajero";
    await notifyOtroChofer(
      body.viaje_id,
      vRow.origen_lat,
      vRow.origen_lng,
      vRow.origen_direccion,
      vRow.destino_direccion,
      vRow.distancia_km,
      vRow.tarifa_estimada,
      pasajeroNombre,
      vRow.intentos_choferes
    );
    return NextResponse.json({ ok: true, action: "rejected" }, { headers: noStore });
  }

  return NextResponse.json({ error: "bad_action" }, { status: 400, headers: noStore });
}
