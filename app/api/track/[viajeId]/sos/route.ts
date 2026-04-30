import { NextResponse } from "next/server";
import { supabase } from "@/lib/ecodrive/db";

type Params = Promise<{ viajeId: string }>;

const ADMIN_PHONE = "51998102258";
const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const noStore = { "Cache-Control": "no-store" };

const VIAJE_SELECT =
  "id, estado, origen_lat, origen_lng, destino_lat, destino_lng, origen_texto, destino_texto, modo, precio_estimado, distancia_km, pasajero_telefono, metadata, created_at, tracking_token";

type ViajeRow = {
  id: number | string;
  estado: string | null;
  origen_lat: number | null;
  origen_lng: number | null;
  destino_lat: number | null;
  destino_lng: number | null;
  origen_texto: string | null;
  destino_texto: string | null;
  modo: string | null;
  precio_estimado: number | null;
  distancia_km: number | null;
  pasajero_telefono: string | null;
  tracking_token: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  created_at: string;
};

type ChoferEstadoRow = {
  chofer_id: number;
  telefono: string;
  lat: number | null;
  lng: number | null;
  ultimo_ping: string | null;
};

function normalizePhone(p: string): string {
  return p.replace(/^\+/, "").replace(/^whatsapp:/, "").replace(/[^0-9]/g, "");
}

async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  const phoneId = process.env.ECODRIVE_META_PHONE_ID;
  const token = process.env.ECODRIVE_META_ACCESS_TOKEN;
  if (!phoneId || !token) return false;
  try {
    const res = await fetch(`${META_GRAPH_BASE}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhone(to),
        type: "text",
        text: { preview_url: false, body },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request, { params }: { params: Params }) {
  const { viajeId } = await params;
  const idStr = String(viajeId || "").trim();
  if (!idStr) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }

  type SosBody = { lat?: number | null; lng?: number | null; message?: string };
  let body: SosBody = {};
  try {
    body = (await req.json()) as SosBody;
  } catch {
    body = {};
  }
  const pasajeroLat =
    typeof body.lat === "number" && Number.isFinite(body.lat) ? body.lat : null;
  const pasajeroLng =
    typeof body.lng === "number" && Number.isFinite(body.lng) ? body.lng : null;
  const userMessage =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim().slice(0, 200)
      : "SOS desde tracking web";

  let viaje: ViajeRow | null = null;
  if (UUID_RE.test(idStr)) {
    const { data } = await supabase
      .from("viajes")
      .select(VIAJE_SELECT)
      .eq("tracking_token", idStr)
      .maybeSingle();
    viaje = (data as ViajeRow) || null;
  } else {
    const idNum = Number(idStr);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
    }
    const { data } = await supabase
      .from("viajes")
      .select(VIAJE_SELECT)
      .eq("id", idNum)
      .maybeSingle();
    viaje = (data as ViajeRow) || null;
  }
  if (!viaje) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }

  const meta =
    (viaje.metadata && typeof viaje.metadata === "object"
      ? viaje.metadata
      : {}) as Record<string, unknown>;

  const choferTelefono =
    typeof meta.chofer_telefono === "string" ? (meta.chofer_telefono as string) : null;
  const choferIdMeta =
    typeof meta.chofer_id === "number"
      ? (meta.chofer_id as number)
      : typeof meta.chofer_id === "string" && Number.isFinite(Number(meta.chofer_id))
      ? Number(meta.chofer_id)
      : null;
  const choferNombre =
    typeof meta.chofer_nombre === "string" ? (meta.chofer_nombre as string) : null;

  // Pos chofer (best-effort)
  let chPos: ChoferEstadoRow | null = null;
  if (choferTelefono) {
    const { data } = await supabase
      .from("chofer_estado")
      .select("chofer_id, telefono, lat, lng, ultimo_ping")
      .eq("telefono", choferTelefono)
      .maybeSingle();
    chPos = (data as ChoferEstadoRow) || null;
  }
  if (!chPos && choferIdMeta) {
    const { data } = await supabase
      .from("chofer_estado")
      .select("chofer_id, telefono, lat, lng, ultimo_ping")
      .eq("chofer_id", choferIdMeta)
      .maybeSingle();
    chPos = (data as ChoferEstadoRow) || null;
  }

  const pasajeroMapsUrl =
    pasajeroLat != null && pasajeroLng != null
      ? `https://maps.google.com/?q=${pasajeroLat},${pasajeroLng}`
      : null;
  const choferMapsUrl =
    chPos?.lat != null && chPos?.lng != null
      ? `https://maps.google.com/?q=${chPos.lat},${chPos.lng}`
      : null;

  const lines = [
    "🆘 *SOS PASAJERO* — EcoDrive+",
    `Viaje #${viaje.id} · estado: ${viaje.estado || "?"}`,
    `Pasajero: ${viaje.pasajero_telefono || "?"}`,
    `Chofer: ${choferNombre || "?"} (${choferTelefono || "?"})`,
    "",
    `📝 Mensaje: ${userMessage}`,
    "",
    pasajeroMapsUrl
      ? `📍 Pasajero ahora: ${pasajeroMapsUrl}`
      : "📍 Pasajero ahora: (sin geolocalización)",
    choferMapsUrl
      ? `🚗 Chofer último ping: ${choferMapsUrl}`
      : "🚗 Chofer: sin posición registrada",
    "",
    `🗺️ Tracking: https://ecodriveplus.com/track/${
      viaje.tracking_token || viaje.id
    }`,
    "",
    "⚡ Llamar al pasajero AHORA.",
  ];
  const adminMsg = lines.join("\n");

  const sentToAdmin = await sendWhatsAppText(ADMIN_PHONE, adminMsg);

  // Persistir en notifications (best-effort)
  try {
    await supabase.from("notifications").insert({
      user_phone: ADMIN_PHONE,
      tipo: "sos_pasajero",
      titulo: `SOS viaje #${viaje.id}`,
      cuerpo: adminMsg,
      estado: sentToAdmin ? "enviada" : "pendiente",
      enviada_at: sentToAdmin ? new Date().toISOString() : null,
      metadata: {
        viaje_id: viaje.id,
        tracking_token: viaje.tracking_token,
        pasajero_telefono: viaje.pasajero_telefono,
        pasajero_lat: pasajeroLat,
        pasajero_lng: pasajeroLng,
        chofer_telefono: choferTelefono,
        chofer_lat: chPos?.lat ?? null,
        chofer_lng: chPos?.lng ?? null,
        message: userMessage,
        source: "tracking_web",
      },
    });
  } catch {
    /* noop */
  }

  // Registrar ping del pasajero como source='pasajero'
  if (pasajeroLat != null && pasajeroLng != null) {
    try {
      const viajeIdNum =
        typeof viaje.id === "number"
          ? viaje.id
          : Number.isFinite(Number(viaje.id))
          ? Number(viaje.id)
          : null;
      if (viajeIdNum != null) {
        await supabase.from("viaje_tracking_pings").insert({
          viaje_id: viajeIdNum,
          lat: pasajeroLat,
          lng: pasajeroLng,
          source: "pasajero_sos",
        });
      }
    } catch {
      /* noop */
    }
  }

  return NextResponse.json(
    {
      ok: true,
      sent_admin: sentToAdmin,
      viaje_id: viaje.id,
    },
    { headers: noStore }
  );
}
