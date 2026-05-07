/**
 * GET  — Valida token, devuelve nombre del pasajero
 * POST — Recibe origen/destino lat/lng y crea eco_viajes + matchea chofer
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { findNearestChofer } from "@/lib/ecodrive/matching";
import { sendPushToChofer } from "@/lib/ecodrive/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
type Params = Promise<{ token: string }>;

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function loadToken(token: string) {
  const sb = db();
  const { data } = await sb
    .from("eco_pedir_viaje_tokens")
    .select("token, wa_id, pasajero_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return { ok: false as const, code: "invalid" };
  const t = data as {
    token: string;
    wa_id: string;
    pasajero_id: string | null;
    used_at: string | null;
    expires_at: string;
  };
  if (t.used_at) return { ok: false as const, code: "used" };
  if (new Date(t.expires_at).getTime() < Date.now())
    return { ok: false as const, code: "expired" };
  return { ok: true as const, token: t };
}

export async function GET(_req: Request, { params }: { params: Params }) {
  const { token } = await params;
  const r = await loadToken(token);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.code }, { status: 200, headers: noStore });
  }
  const sb = db();
  const { data: pasList } = await sb
    .from("eco_pasajeros")
    .select("nombre, status, created_at")
    .eq("wa_id", r.token.wa_id)
    .order("created_at", { ascending: false });
  const approved = ((pasList || []) as Array<{ nombre: string; status: string }>).find(
    (x) => x.status === "approved"
  );
  return NextResponse.json(
    {
      ok: true,
      pasajero_nombre: approved?.nombre || null,
      expires_at_ms: new Date(r.token.expires_at).getTime(),
    },
    { headers: noStore }
  );
}

export async function POST(req: Request, { params }: { params: Params }) {
  const { token } = await params;
  const r = await loadToken(token);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.code }, { status: 200, headers: noStore });
  }
  let body: {
    origen_lat?: number;
    origen_lng?: number;
    origen_direccion?: string;
    destino_lat?: number;
    destino_lng?: number;
    destino_direccion?: string;
    distancia_km?: number;
    duracion_min?: number;
    tarifa_estimada?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const required = [
    "origen_lat",
    "origen_lng",
    "destino_lat",
    "destino_lng",
    "tarifa_estimada",
  ] as const;
  for (const k of required) {
    if (typeof (body as Record<string, unknown>)[k] !== "number") {
      return NextResponse.json(
        { ok: false, error: `missing_${k}` },
        { status: 400, headers: noStore }
      );
    }
  }

  const sb = db();

  // Verificar pasajero aprobado (puede haber duplicados legacy + nuevo, prioriza approved más reciente)
  const { data: pasList } = await sb
    .from("eco_pasajeros")
    .select("id, nombre, status, created_at")
    .eq("wa_id", r.token.wa_id)
    .order("created_at", { ascending: false });

  const rows = (pasList || []) as Array<{ id: string; nombre: string; status: string }>;
  const p = rows.find((row) => row.status === "approved") || null;
  if (!p) {
    return NextResponse.json(
      { ok: false, error: "pasajero_not_approved" },
      { status: 403, headers: noStore }
    );
  }

  // Matching PRIMERO: si no hay chofer disponible, fallar antes de crear viaje y antes de marcar token usado.
  // Así el usuario puede reintentar con el mismo link.
  const elegido = await findNearestChofer(body.origen_lat!, body.origen_lng!, []);

  if (!elegido) {
    return NextResponse.json(
      { ok: false, error: "no_choferes_cercanos" },
      { status: 200, headers: noStore }
    );
  }

  // Hay chofer → crear viaje
  const { data: viaje, error: insErr } = await sb
    .from("eco_viajes")
    .insert({
      pasajero_wa_id: r.token.wa_id,
      pasajero_id: p.id,
      origen_direccion: body.origen_direccion || `${body.origen_lat},${body.origen_lng}`,
      origen_lat: body.origen_lat,
      origen_lng: body.origen_lng,
      destino_direccion: body.destino_direccion || `${body.destino_lat},${body.destino_lng}`,
      destino_lat: body.destino_lat,
      destino_lng: body.destino_lng,
      distancia_km: body.distancia_km ?? null,
      duracion_min: body.duracion_min ?? null,
      tarifa_estimada: body.tarifa_estimada,
      estado: "solicitado",
    })
    .select("id")
    .single();

  if (insErr || !viaje) {
    return NextResponse.json(
      { ok: false, error: "db_error" },
      { status: 500, headers: noStore }
    );
  }
  const viajeId = (viaje as { id: string }).id;

  // Marcar token usado AHORA que hay viaje + chofer
  await sb
    .from("eco_pedir_viaje_tokens")
    .update({ used_at: new Date().toISOString(), viaje_id: viajeId })
    .eq("token", token);

  // Notificar via template + mensaje texto backup
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const tokenWa = process.env.ECODRIVE_META_ACCESS_TOKEN;
  let templateOk = false;
  let templateError: string | null = null;
  if (phoneId && tokenWa) {
    try {
      const tplResp = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenWa}`, "Content-Type": "application/json" },
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
                  { type: "text", text: p.nombre.split(" ")[0] || "pasajero" },
                  { type: "text", text: (body.origen_direccion || "").slice(0, 60) },
                  { type: "text", text: (body.destino_direccion || "").slice(0, 60) },
                  { type: "text", text: String(body.distancia_km ?? 0) },
                  { type: "text", text: String(body.tarifa_estimada) },
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
      const tplJson = await tplResp.json();
      templateOk = tplResp.ok;
      if (!tplResp.ok) {
        templateError = JSON.stringify(tplJson).slice(0, 300);
      }
    } catch (e) {
      templateError = (e as Error).message;
    }

    // Backup: mensaje texto al chofer (vibra/notifica aunque template tarde)
    try {
      await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenWa}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: elegido.wa_id,
          type: "text",
          text: {
            body:
              `🚖 *Nuevo viaje EcoDrive+*\n\n` +
              `Pasajero: ${p.nombre.split(" ")[0]}\n` +
              `De: ${(body.origen_direccion || "").slice(0, 50)}\n` +
              `A: ${(body.destino_direccion || "").slice(0, 50)}\n` +
              `Distancia: ${body.distancia_km ?? 0} km · Ganancia: S/ ${body.tarifa_estimada}\n\n` +
              `Mira el botón "Ver y aceptar" arriba para tomar el viaje. O abre tu tracker GPS para recibir la alarma.`,
          },
        }),
      });
    } catch {}
  }

  // Web Push notification al chofer (se superpone tipo inDrive si está suscrito)
  let pushOk = 0;
  let pushFail = 0;
  try {
    const pushRes = await sendPushToChofer(elegido.id, {
      title: "🚖 Nuevo viaje EcoDrive+",
      body: `${p.nombre.split(" ")[0]} → ${(body.destino_direccion || "").slice(0, 40)} · S/ ${body.tarifa_estimada}`,
      url: "/track-chofer",
      tag: `eco-viaje-${viajeId}`,
      vibrate: [400, 200, 400, 200, 600],
      requireInteraction: true,
    });
    pushOk = pushRes.ok;
    pushFail = pushRes.fail;
  } catch (e) {
    pushFail = -1;
    console.error("[push send err]", e);
  }

  // Log diagnóstico
  await sb.from("wa_flow_health").insert({
    endpoint_url: "pedir-viaje/asignar",
    status_code: templateOk ? 200 : 500,
    duration_ms: 0,
    error: templateOk
      ? `template chofer enviado a ${elegido.wa_id} (viaje ${viajeId}) | push ok=${pushOk} fail=${pushFail}`
      : `template fail: ${templateError} | wa=${elegido.wa_id} | push ok=${pushOk} fail=${pushFail}`,
  });

  await sb
    .from("eco_viajes")
    .update({ estado: "buscando", intentos_choferes: [elegido.id] })
    .eq("id", viajeId);

  return NextResponse.json(
    { ok: true, viaje_id: viajeId, estado: "buscando" },
    { headers: noStore }
  );
}
