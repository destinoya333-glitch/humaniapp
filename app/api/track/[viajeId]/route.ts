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

const noStore = { "Cache-Control": "no-store" };

export async function GET(_req: Request, { params }: { params: Params }) {
  const { viajeId } = await params;
  const idStr = String(viajeId || "").trim();
  if (!idStr) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }

  // viajes.id es numérico — intentamos parsear; si no, devolver 404
  const idNum = Number(idStr);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }

  const { data: viaje, error: viajeErr } = await supabase
    .from("viajes")
    .select(
      "id, estado, origen_lat, origen_lng, destino_lat, destino_lng, origen_texto, destino_texto, modo, precio_estimado, distancia_km, pasajero_telefono, metadata, created_at"
    )
    .eq("id", idNum)
    .maybeSingle();

  if (viajeErr || !viaje) {
    return NextResponse.json({ error: "viaje_not_found" }, { status: 404, headers: noStore });
  }

  const v = viaje as ViajeRow;
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
      },
      chofer,
      chofer_pos,
    },
    { headers: noStore }
  );
}
