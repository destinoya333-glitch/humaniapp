import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-admin-passcode") !== process.env.ECODRIVE_ADMIN_PASSCODE) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const estado = req.nextUrl.searchParams.get("estado");
  let q = sb.from("eco_viajes")
    .select("id,pasajero_wa_id,chofer_id,origen_direccion,destino_direccion,distancia_km,duracion_min,tarifa_estimada,estado,solicitado_at,asignado_at,intentos_choferes")
    .order("solicitado_at", { ascending: false })
    .limit(50);
  if (estado) q = q.eq("estado", estado);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
