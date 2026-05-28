/**
 * GET /api/ecodrive/admin/incidencias
 *
 * Devuelve agregados de problemas operativos:
 *   - viajes_cancelados_48h
 *   - viajes_stuck (buscando >10min)
 *   - choferes_sin_ping (en turno, sin ping >5min)
 *   - conversaciones_flag (palabras: queja, problema, robo, incidente, accidente)
 *
 * Auth: header x-admin-passcode
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/ecodrive/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const FLAG_WORDS = ["queja", "problema", "robo", "incidente", "accidente", "estafa", "asalto"];

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sb = db();
  const now = Date.now();
  const h48 = new Date(now - 48 * 3600 * 1000).toISOString();
  const m10 = new Date(now - 10 * 60 * 1000).toISOString();
  const m5 = new Date(now - 5 * 60 * 1000).toISOString();
  const d7 = new Date(now - 7 * 24 * 3600 * 1000).toISOString();

  const [cancelados, stuck, sinPing, msgs] = await Promise.all([
    sb
      .from("viajes")
      .select("id, pasajero_telefono, origen_texto, destino_texto, precio_estimado, estado, created_at")
      .eq("estado", "cancelado")
      .gte("created_at", h48)
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("viajes")
      .select("id, pasajero_telefono, origen_texto, destino_texto, precio_estimado, estado, created_at")
      .in("estado", ["buscando", "con_ofertas"])
      .lte("created_at", m10)
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("chofer_estado")
      .select("chofer_id, telefono, zona, ultimo_ping, en_turno")
      .eq("en_turno", true)
      .lt("ultimo_ping", m5),
    sb
      .from("eco_messages")
      .select("user_phone, role, content, created_at")
      .gte("created_at", d7)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const flagged = ((msgs.data || []) as Array<{
    user_phone: string;
    role: string;
    content: string;
    created_at: string;
  }>).filter((m) => {
    if (m.role !== "user") return false;
    const txt = (m.content || "").toLowerCase();
    return FLAG_WORDS.some((w) => txt.includes(w));
  });

  return NextResponse.json({
    viajes_cancelados_48h: cancelados.data || [],
    viajes_stuck: stuck.data || [],
    choferes_sin_ping: sinPing.data || [],
    conversaciones_flag: flagged.slice(0, 50),
    counts: {
      cancelados: (cancelados.data || []).length,
      stuck: (stuck.data || []).length,
      sin_ping: (sinPing.data || []).length,
      flag: flagged.length,
    },
  });
}
