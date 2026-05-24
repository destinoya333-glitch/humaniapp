/**
 * GET /api/ecodrive/admin/export?type=viajes|comisiones|transacciones|choferes&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Devuelve CSV. Auth: query ?p=PASSCODE (para que se pueda descargar de un <a>).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(req: NextRequest): boolean {
  const p = req.nextUrl.searchParams.get("p");
  const header = req.headers.get("x-admin-passcode");
  const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
  return !!expected && (p === expected || header === expected);
}
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function toCsv(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const head = headers.map(csvEscape).join(",");
  const lines = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","));
  return [head, ...lines].join("\n");
}

function rangeDefaults(req: NextRequest) {
  const today = new Date();
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const from = req.nextUrl.searchParams.get("from") || firstOfMonth.toISOString().slice(0, 10);
  const to = req.nextUrl.searchParams.get("to") || today.toISOString().slice(0, 10);
  // inclusive: to + 23:59:59
  const fromIso = new Date(from + "T00:00:00Z").toISOString();
  const toIso = new Date(to + "T23:59:59Z").toISOString();
  return { from, to, fromIso, toIso };
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const type = (req.nextUrl.searchParams.get("type") || "viajes").toLowerCase();
  const { from, to, fromIso, toIso } = rangeDefaults(req);
  const sb = db();

  let csv = "";
  let filename = `${type}-${from}-a-${to}.csv`;

  if (type === "viajes") {
    const { data } = await sb
      .from("viajes")
      .select(
        "id, created_at, pasajero_telefono, chofer_telefono, origen_texto, destino_texto, modo, estado, precio_estimado, distancia_km"
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true });
    csv = toCsv((data || []) as Array<Record<string, unknown>>, [
      "id",
      "created_at",
      "pasajero_telefono",
      "chofer_telefono",
      "origen_texto",
      "destino_texto",
      "modo",
      "estado",
      "precio_estimado",
      "distancia_km",
    ]);
  } else if (type === "comisiones") {
    const { data } = await sb
      .from("comisiones_pendientes")
      .select(
        "id, viaje_id, chofer_telefono, monto_comision, service_fee, estado, created_at, cobrado_at"
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true });
    csv = toCsv((data || []) as Array<Record<string, unknown>>, [
      "id",
      "viaje_id",
      "chofer_telefono",
      "monto_comision",
      "service_fee",
      "estado",
      "created_at",
      "cobrado_at",
    ]);
  } else if (type === "transacciones") {
    const { data } = await sb
      .from("wallet_transactions")
      .select("id, created_at, telefono, tipo, monto, saldo_despues, descripcion")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true });
    csv = toCsv((data || []) as Array<Record<string, unknown>>, [
      "id",
      "created_at",
      "telefono",
      "tipo",
      "monto",
      "saldo_despues",
      "descripcion",
    ]);
  } else if (type === "choferes") {
    const { data } = await sb
      .from("eco_choferes")
      .select(
        "id, wa_id, nombre, dni, edad, zona_principal, vehiculo_marca, vehiculo_modelo, vehiculo_anio, placa, status, rating, created_at, approved_at"
      )
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: true });
    csv = toCsv((data || []) as Array<Record<string, unknown>>, [
      "id",
      "wa_id",
      "nombre",
      "dni",
      "edad",
      "zona_principal",
      "vehiculo_marca",
      "vehiculo_modelo",
      "vehiculo_anio",
      "placa",
      "status",
      "rating",
      "created_at",
      "approved_at",
    ]);
  } else {
    return NextResponse.json({ error: "unknown_type" }, { status: 400 });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
