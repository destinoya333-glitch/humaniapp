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

type ChoferEstadoRow = {
  chofer_id: number;
  telefono: string;
  lat: number | null;
  lng: number | null;
  zona: string | null;
  ultimo_ping: string | null;
};

type UsuarioRow = {
  id: number;
  nombre: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vehiculo: any;
  calificacion: number | null;
};

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
  const fulfilled = (r: any) => (r.status === "fulfilled" ? r.value?.data || [] : []);
  const viajes = fulfilled(viajesR);
  const choferesRaw = fulfilled(choferesR) as ChoferEstadoRow[];

  // Enriquecer choferes con vehiculo (color, marca, placa, modelo) y nombre
  let choferes = choferesRaw.map((c) => ({ ...c, nombre: null as string | null, vehiculo: null as unknown }));
  if (choferesRaw.length > 0) {
    const ids = choferesRaw.map((c) => c.chofer_id).filter((x): x is number => Number.isFinite(x));
    if (ids.length > 0) {
      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("id, nombre, vehiculo, calificacion")
        .in("id", ids);
      const byId = new Map<number, UsuarioRow>();
      for (const u of (usuarios as UsuarioRow[]) || []) byId.set(u.id, u);
      choferes = choferesRaw.map((c) => {
        const u = byId.get(c.chofer_id);
        return {
          ...c,
          nombre: u?.nombre ?? null,
          vehiculo: u?.vehiculo ?? null,
        };
      });
    }
  }

  const summary = {
    total: viajes.length,
    completados: viajes.filter((t: { estado: string | null }) => t.estado === "completado").length,
    cancelados: viajes.filter((t: { estado: string | null }) => t.estado === "cancelado").length,
    activos: viajes.filter((t: { estado: string | null }) =>
      ["buscando", "con_ofertas", "asignado", "en_curso"].includes(t.estado || "")
    ).length,
    choferes_online: choferes.length,
  };

  return NextResponse.json(
    { viajes, choferes, summary },
    { headers: { "Cache-Control": "no-store" } }
  );
}
