import { NextResponse } from "next/server";
import { supabase } from "@/lib/ecodrive/db";

type Params = Promise<{ viajeId: string }>;

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

type UsuarioRow = {
  id: number;
  telefono: string;
  nombre: string | null;
  foto: string | null;
  calificacion: number | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vehiculo: any;
};

type ChoferEstadoRow = {
  chofer_id: number;
  telefono: string;
  lat: number | null;
  lng: number | null;
  ultimo_ping: string | null;
};

type TrackingPingRow = {
  lat: number;
  lng: number;
  source: string | null;
  heading_deg: number | null;
  speed_kmh: number | null;
  created_at: string;
};

const noStore = { "Cache-Control": "no-store" };

// UUID v4 / generic UUID matcher (case-insensitive)
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VIAJE_SELECT =
  "id, estado, origen_lat, origen_lng, destino_lat, destino_lng, origen_texto, destino_texto, modo, precio_estimado, distancia_km, pasajero_telefono, metadata, created_at, tracking_token";

export async function GET(_req: Request, { params }: { params: Params }) {
  const { viajeId } = await params;
  const idStr = String(viajeId || "").trim();
  if (!idStr) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }

  // Acepta tanto UUID (tracking_token) como ID numerico legacy
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

  const v = viaje;
  const meta = (v.metadata && typeof v.metadata === "object" ? v.metadata : {}) as Record<
    string,
    unknown
  >;

  const choferTelefono =
    typeof meta.chofer_telefono === "string" ? (meta.chofer_telefono as string) : null;
  const choferIdMeta =
    typeof meta.chofer_id === "number"
      ? (meta.chofer_id as number)
      : typeof meta.chofer_id === "string" && Number.isFinite(Number(meta.chofer_id))
      ? Number(meta.chofer_id)
      : null;

  let chofer: {
    nombre: string | null;
    foto: string | null;
    calificacion: number | null;
    telefono: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vehiculo: any;
  } | null = null;
  let chofer_pos: {
    lat: number | null;
    lng: number | null;
    ultimo_ping: string | null;
  } | null = null;

  if (choferTelefono || choferIdMeta) {
    // 1) usuarios
    let userRow: UsuarioRow | null = null;
    if (choferTelefono) {
      const { data } = await supabase
        .from("usuarios")
        .select("id, telefono, nombre, foto, calificacion, vehiculo")
        .eq("telefono", choferTelefono)
        .maybeSingle();
      userRow = (data as UsuarioRow) || null;
    }
    if (!userRow && choferIdMeta) {
      const { data } = await supabase
        .from("usuarios")
        .select("id, telefono, nombre, foto, calificacion, vehiculo")
        .eq("id", choferIdMeta)
        .maybeSingle();
      userRow = (data as UsuarioRow) || null;
    }

    // 2) chofer_estado
    let estadoRow: ChoferEstadoRow | null = null;
    if (choferTelefono) {
      const { data } = await supabase
        .from("chofer_estado")
        .select("chofer_id, telefono, lat, lng, ultimo_ping")
        .eq("telefono", choferTelefono)
        .maybeSingle();
      estadoRow = (data as ChoferEstadoRow) || null;
    }
    if (!estadoRow && choferIdMeta) {
      const { data } = await supabase
        .from("chofer_estado")
        .select("chofer_id, telefono, lat, lng, ultimo_ping")
        .eq("chofer_id", choferIdMeta)
        .maybeSingle();
      estadoRow = (data as ChoferEstadoRow) || null;
    }

    // Vehiculo: prioriza metadata.vehiculo, luego usuarios.vehiculo
    const vehiculoMeta =
      meta.vehiculo && typeof meta.vehiculo === "object" ? (meta.vehiculo as object) : null;
    const vehiculoUser = userRow?.vehiculo && typeof userRow.vehiculo === "object" ? userRow.vehiculo : null;
    const vehiculo = vehiculoMeta || vehiculoUser || null;

    if (userRow || estadoRow || vehiculo) {
      chofer = {
        nombre: userRow?.nombre ?? null,
        foto: userRow?.foto ?? null,
        calificacion: userRow?.calificacion ?? null,
        telefono: choferTelefono ?? userRow?.telefono ?? estadoRow?.telefono ?? null,
        vehiculo,
      };
    }
    if (estadoRow) {
      chofer_pos = {
        lat: estadoRow.lat ?? null,
        lng: estadoRow.lng ?? null,
        ultimo_ping: estadoRow.ultimo_ping ?? null,
      };
    }
  }

  // ── Tracking history persistido ─────────────────────────────────────
  // viajes.id puede ser bigint en BD; lo usamos numerico para FK.
  const viajeIdNum =
    typeof v.id === "number"
      ? v.id
      : Number.isFinite(Number(v.id))
      ? Number(v.id)
      : null;

  // Insertar nuevo ping si la posicion cambio (vs ultimo registrado)
  if (viajeIdNum != null && chofer_pos?.lat != null && chofer_pos?.lng != null) {
    try {
      const { data: lastPings } = await supabase
        .from("viaje_tracking_pings")
        .select("lat, lng")
        .eq("viaje_id", viajeIdNum)
        .order("created_at", { ascending: false })
        .limit(1);
      const last = Array.isArray(lastPings) && lastPings[0] ? lastPings[0] : null;
      const lat = chofer_pos.lat;
      const lng = chofer_pos.lng;
      const changed =
        !last ||
        Math.abs(Number(last.lat) - lat) > 1e-6 ||
        Math.abs(Number(last.lng) - lng) > 1e-6;
      if (changed) {
        await supabase.from("viaje_tracking_pings").insert({
          viaje_id: viajeIdNum,
          lat,
          lng,
          source: "chofer",
        });
      }
    } catch {
      /* noop — ping log es best-effort */
    }
  }

  // Recuperar ultimos 60 pings (orden ASC para que el cliente dibuje la ruta)
  let tracking_history: Array<{
    lat: number;
    lng: number;
    source: string | null;
    heading_deg: number | null;
    speed_kmh: number | null;
    t: string;
  }> = [];
  if (viajeIdNum != null) {
    try {
      const { data: pings } = await supabase
        .from("viaje_tracking_pings")
        .select("lat, lng, source, heading_deg, speed_kmh, created_at")
        .eq("viaje_id", viajeIdNum)
        .order("created_at", { ascending: false })
        .limit(60);
      const arr = (pings as TrackingPingRow[] | null) || [];
      tracking_history = arr
        .slice()
        .reverse()
        .map((p) => ({
          lat: Number(p.lat),
          lng: Number(p.lng),
          source: p.source ?? null,
          heading_deg: p.heading_deg ?? null,
          speed_kmh: p.speed_kmh ?? null,
          t: p.created_at,
        }));
    } catch {
      tracking_history = [];
    }
  }

  return NextResponse.json(
    {
      viaje: {
        id: v.id,
        estado: v.estado,
        origen_lat: v.origen_lat,
        origen_lng: v.origen_lng,
        destino_lat: v.destino_lat,
        destino_lng: v.destino_lng,
        origen_texto: v.origen_texto,
        destino_texto: v.destino_texto,
        modo: v.modo,
        precio_estimado: v.precio_estimado,
        distancia_km: v.distancia_km,
        metadata: v.metadata,
        tracking_token: v.tracking_token,
      },
      chofer,
      chofer_pos,
      tracking_history,
    },
    { headers: noStore }
  );
}
