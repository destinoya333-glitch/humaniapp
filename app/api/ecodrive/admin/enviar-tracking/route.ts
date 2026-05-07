/**
 * Sprint 4 — Inicia un tracking real para un pasajero.
 * 1. Crea registro en eco_tracking_sessions
 * 2. Envia template eco_tracking_invite_v2 con flow_token = ecodrive:tracking-viaje:<session_id>
 *
 * Auth: header x-admin-passcode debe coincidir con ECODRIVE_ADMIN_PASSCODE.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  wa_id: string;            // numero pasajero, ej "51998102258"
  chofer_nombre: string;
  chofer_rating?: string;
  vehiculo: string;
  placa: string;
  lat: number;
  lng: number;
  eta_min?: number;
  distancia_km?: string;
  estado?: string;
};

export async function POST(req: NextRequest) {
  const passcode = req.headers.get("x-admin-passcode");
  if (passcode !== process.env.ECODRIVE_ADMIN_PASSCODE) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.wa_id || !body.chofer_nombre || !body.vehiculo || !body.placa) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "lat_lng_required" }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: session, error: insErr } = await sb
    .from("eco_tracking_sessions")
    .insert({
      wa_id: body.wa_id,
      chofer_nombre: body.chofer_nombre,
      chofer_rating: body.chofer_rating || "5.0",
      vehiculo: body.vehiculo,
      placa: body.placa,
      lat: body.lat,
      lng: body.lng,
      eta_min: body.eta_min ?? 5,
      distancia_km: body.distancia_km || "0.5",
      estado: body.estado || "En camino",
    })
    .select("id")
    .single();

  if (insErr || !session) {
    return NextResponse.json(
      { error: "db_error", detail: insErr?.message },
      { status: 500 }
    );
  }

  const sessionId = session.id as string;
  const phoneId = process.env.ECODRIVE_META_PHONE_ID!;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN!;
  const flowToken = `ecodrive:tracking-viaje:${sessionId}`;

  const payload = {
    messaging_product: "whatsapp",
    to: body.wa_id,
    type: "template",
    template: {
      name: "eco_tracking_invite_v2",
      language: { code: "es" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "viajero" },
            { type: "text", text: body.chofer_nombre },
            { type: "text", text: String(body.eta_min ?? 5) },
            { type: "text", text: body.vehiculo },
            { type: "text", text: body.placa },
          ],
        },
        {
          type: "button",
          sub_type: "flow",
          index: "0",
          parameters: [
            {
              type: "action",
              action: { flow_token: flowToken },
            },
          ],
        },
      ],
    },
  };

  const metaResp = await fetch(
    `https://graph.facebook.com/v22.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const metaJson = await metaResp.json();

  if (!metaResp.ok) {
    return NextResponse.json(
      { error: "meta_send_failed", detail: metaJson },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    session_id: sessionId,
    flow_token: flowToken,
    meta_message_id: metaJson?.messages?.[0]?.id,
  });
}
