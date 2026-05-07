/**
 * POST: chofer envia ping de ubicacion (lat/lng/accuracy)
 * GET: health check del PWA antes de empezar a postear
 *
 * Schema nuevo: usa eco_choferes (uuid) y eco_viajes (uuid).
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferTrackerToken } from "@/lib/ecodrive/tracker-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const PROXIMIDAD_M = 800;

async function sendWAText(to: string, body: string): Promise<void> {
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN || "";
  const phoneId = process.env.ECODRIVE_META_PHONE_ID || "";
  if (!token || !phoneId) return;
  try {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
  } catch {}
}

async function checkProximityAndNotify(
  choferId: string,
  choferWaId: string,
  lat: number,
  lng: number
): Promise<void> {
  const sb = db();
  const { data: viajes } = await sb
    .from("eco_viajes")
    .select("id, origen_lat, origen_lng, destino_lat, destino_lng, destino_direccion, notas")
    .eq("chofer_id", choferId)
    .in("estado", ["asignado", "en_curso"])
    .order("solicitado_at", { ascending: false })
    .limit(1);

  const v = (Array.isArray(viajes) && viajes[0]) || null;
  if (!v) return;
  if (!v.origen_lat || !v.origen_lng) return;

  // Track flag para no enviar dos veces (lo guardamos en notas o usamos columna nueva)
  // Por simplicidad: marcar con prefijo "[link_destino_enviado] " en notas
  if (v.notas && v.notas.includes("[link_destino_enviado]")) return;

  const dist = distanceMeters(
    { lat, lng },
    { lat: Number(v.origen_lat), lng: Number(v.origen_lng) }
  );
  if (dist > PROXIMIDAD_M) return;

  await sb
    .from("eco_viajes")
    .update({ notas: `[link_destino_enviado] ${v.notas || ""}`.trim() })
    .eq("id", v.id);

  if (v.destino_lat && v.destino_lng) {
    const linkDest = `https://www.google.com/maps/dir/?api=1&destination=${v.destino_lat},${v.destino_lng}&travelmode=driving`;
    const msg =
      `📍 *Estás a ${Math.round(dist)}m del pasajero*\n\n` +
      `Cuando suba al carro y arranquen, sigue al destino:\n\n` +
      `🎯 *${v.destino_direccion || "Destino"}*\n${linkDest}\n\n` +
      `Cuando termines escribe *viaje completado*.`;
    await sendWAText(choferWaId, msg);
  }
}

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
  const accuracy =
    typeof body.accuracy === "number" ? body.accuracy : Number(body.accuracy) || null;

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

  const sb = db();
  const { data: chofer } = await sb
    .from("eco_choferes")
    .select("id, wa_id, en_turno, status")
    .eq("id", v.choferId)
    .maybeSingle();

  if (!chofer) {
    return NextResponse.json({ error: "chofer_not_found" }, { status: 404, headers: noStore });
  }
  const c = chofer as {
    id: string;
    wa_id: string;
    en_turno: boolean;
    status: string;
  };
  if (c.status !== "approved") {
    return NextResponse.json({ error: "chofer_not_approved" }, { status: 403, headers: noStore });
  }
  if (!c.en_turno) {
    return NextResponse.json({ error: "chofer_off_turno" }, { status: 409, headers: noStore });
  }

  const nowIso = new Date().toISOString();
  await sb
    .from("eco_choferes")
    .update({
      last_lat: lat,
      last_lng: lng,
      last_ping: nowIso,
      last_accuracy_m: accuracy ? Math.round(accuracy) : null,
      updated_at: nowIso,
    })
    .eq("id", c.id);

  // Insertar ping en historial si hay viaje activo
  const { data: viajeActivo } = await sb
    .from("eco_viajes")
    .select("id")
    .eq("chofer_id", c.id)
    .in("estado", ["asignado", "en_curso"])
    .order("solicitado_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (viajeActivo) {
    await sb.from("eco_viaje_tracking_pings").insert({
      viaje_id: (viajeActivo as { id: string }).id,
      chofer_id: c.id,
      lat,
      lng,
      accuracy_m: accuracy ? Math.round(accuracy) : null,
      source: "pwa",
    });
  }

  // Proximidad → link destino (no bloquea)
  checkProximityAndNotify(c.id, c.wa_id, lat, lng).catch(() => {});

  return NextResponse.json(
    { ok: true, chofer_id: c.id, ts: nowIso, expires_at_ms: v.expiresAtMs },
    { headers: noStore }
  );
}

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
