import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabase } from "@/lib/ecodrive/db";

const COOKIE = "ecodrive_admin";

async function isAuthorized(): Promise<boolean> {
  const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === expected;
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [viajesR, choferesR] = await Promise.allSettled([
    supabase
      .from("viajes")
      .select("id, origen_lat, origen_lng, destino_lat, destino_lng, estado, modo, precio_estimado, created_at, origen_texto, destino_texto, pasajero_telefono")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("chofer_estado")
      .select("chofer_id, telefono, lat, lng, zona, ultimo_ping")
      .eq("en_turno", true),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = (r: any) => (r.status === "fulfilled" ? r.value?.data || [] : []);
  const viajes = v(viajesR);
  const choferes = v(choferesR);

  // Agregar por estado
  const summary = {
    total: viajes.length,
    completados: viajes.filter((t: { estado: string | null }) => t.estado === "completado").length,
    cancelados: viajes.filter((t: { estado: string | null }) => t.estado === "cancelado").length,
    activos: viajes.filter((t: { estado: string | null }) => ["buscando", "con_ofertas", "asignado", "en_curso"].includes(t.estado || "")).length,
    choferes_online: choferes.length,
  };

  return NextResponse.json({ viajes, choferes, summary }, {
    headers: { "Cache-Control": "no-store" },
  });
}
