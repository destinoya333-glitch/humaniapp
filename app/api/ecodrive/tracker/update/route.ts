import { NextResponse } from "next/server";
import { supabase } from "@/lib/ecodrive/db";
import { verifyChoferTrackerToken } from "@/lib/ecodrive/tracker-token";

const noStore = { "Cache-Control": "no-store" };

// Distancia en metros (haversine)
function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const PROXIMIDAD_M = 800; // dispara link destino si chofer está a ≤800m del origen del pasajero

async function sendWAText(to: string, body: string): Promise<void> {
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN || process.env.META_WA_TOKEN || "";
  const phoneId = process.env.ECODRIVE_META_PHONE_ID || process.env.META_PHONE_ID || "";
  if (!token || !phoneId) return; // silently skip si no hay credenciales
  try {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
  } catch {
    /* ignore network errors */
  }
}

// Verifica si el chofer está cerca del origen de su viaje activo y dispara link al destino
async function checkProximityAndNotify(choferId: number, lat: number, lng: number): Promise<void> {
  const { data: viajes } = await supabase
    .from("viajes")
    .select("id, origen_lat, origen_lng, destino_lat, destino_lng, destino_texto, metadata")
    .eq("chofer_id", choferId)
    .in("estado", ["asignado", "en_curso"])
    .order("created_at", { ascending: false })
    .limit(1);

  const v = (Array.isArray(viajes) && viajes[0]) || null;
  if (!v) return;
  const meta = (v.metadata && typeof v.metadata === "object" ? v.metadata : {}) as Record<string, unknown>;
  if (meta.link_destino_enviado === true) return; // ya se mandó
  if (!v.origen_lat || !v.origen_lng) return;

  const dist = distanceMeters(
    { lat, lng },
    { lat: Number(v.origen_lat), lng: Number(v.origen_lng) }
  );
  if (dist > PROXIMIDAD_M) return;

  // Marcar como enviado ANTES de notificar para evitar dobles envíos
  await supabase
    .from("viajes")
    .update({
      metadata: {
        ...(meta || {}),
        link_destino_enviado: true,
        link_destino_enviado_at: new Date().toISOString(),
      },
    })
    .eq("id", v.id);

  // Buscar teléfono del chofer
  const { data: chofer } = await supabase
    .from("usuarios")
    .select("telefono")
    .eq("id", choferId)
    .maybeSingle();
  const tel = chofer?.telefono || null;
  if (!tel) return;

  if (v.destino_lat && v.destino_lng) {
    const linkDest = `https://www.google.com/maps/dir/?api=1&destination=${v.destino_lat},${v.destino_lng}&travelmode=driving`;
    const msg =
      `📍 *Estás a ${Math.round(dist)}m del pasajero*\n\n` +
      `Apenas suba al carro y arranquen, ya tienes el link al destino:\n\n` +
      `🎯 *${v.destino_texto || "Destino"}*\n${linkDest}\n\n` +
      `Cuando termines el viaje escribe *viaje completado* para cobrar.`;
    await sendWAText(tel, msg);
  }
}

// POST body:
//   { token: string, lat: number, lng: number, accuracy?: number, heading?: number, speed?: number }
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "bad_coords" }, { status: 400, headers: noStore });
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "bad_coords_range" }, { status: 400, headers: noStore });
  }

  const v = verifyChoferTrackerToken(token);
  if (!v.ok) {
    return NextResponse.json({ error: `token_${v.reason}` }, { status: 401, headers: noStore });
  }

  // Solo actualiza si el chofer aún está en turno
  const { data: estado } = await supabase
    .from("chofer_estado")
    .select("id, chofer_id, en_turno")
    .eq("chofer_id", v.choferId)
    .maybeSingle();

  if (!estado) {
    return NextResponse.json({ error: "chofer_estado_missing" }, { status: 404, headers: noStore });
  }
  if (!estado.en_turno) {
    return NextResponse.json({ error: "chofer_off_turno" }, { status: 409, headers: noStore });
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("chofer_estado")
    .update({ lat, lng, ultimo_ping: nowIso, updated_at: nowIso })
    .eq("id", estado.id);

  if (upErr) {
    return NextResponse.json({ error: "update_failed", detail: upErr.message }, { status: 500, headers: noStore });
  }

  // Proximidad → link destino automatico (no bloquea respuesta)
  checkProximityAndNotify(v.choferId, lat, lng).catch(() => {});

  return NextResponse.json(
    { ok: true, chofer_id: v.choferId, ts: nowIso, expires_at_ms: v.expiresAtMs },
    { headers: noStore }
  );
}

// GET para health check del PWA antes de empezar a postear
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const v = verifyChoferTrackerToken(token);
  if (!v.ok) {
    return NextResponse.json({ error: `token_${v.reason}` }, { status: 401, headers: noStore });
  }
  return NextResponse.json(
    { ok: true, chofer_id: v.choferId, expires_at_ms: v.expiresAtMs },
    { headers: noStore }
  );
}
