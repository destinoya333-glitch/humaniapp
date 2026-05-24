/**
 * GET  /api/ecodrive/admin/config?key=tarifas  -> lee valor JSON
 * PUT  /api/ecodrive/admin/config              -> upsert { key, value }
 *
 * Auth: header x-admin-passcode
 *
 * Si la tabla eco_admin_config no existe aun, GET devuelve defaults
 * (aplicar migration 20260524_eco_admin_config.sql para persistencia).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(req: NextRequest): boolean {
  return req.headers.get("x-admin-passcode") === process.env.ECODRIVE_ADMIN_PASSCODE;
}
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DEFAULTS: Record<string, unknown> = {
  tarifas: {
    banderazo: 4.5,
    por_km: 1.2,
    por_min: 0.15,
    minimo: 5.0,
    tipos: {
      estandar: { label: "EcoEstandar", multiplicador: 1.0 },
      vip: { label: "EcoVIP", multiplicador: 1.4 },
      xl: { label: "EcoXL", multiplicador: 1.5 },
      auto_nuevo: { label: "EcoAutoNuevo", multiplicador: 1.2 },
    },
    hora_pico: {
      enabled: false,
      multiplicador: 1.25,
      horas: ["07:00-09:30", "17:30-20:00"],
    },
    comision_pct: 6.3,
    service_fee: 0.5,
  },
};

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = req.nextUrl.searchParams.get("key") || "tarifas";
  try {
    const { data, error } = await db()
      .from("eco_admin_config")
      .select("value, updated_at, updated_by")
      .eq("key", key)
      .maybeSingle();
    if (error) {
      // tabla no existe u otro error -> defaults
      return NextResponse.json({
        key,
        value: DEFAULTS[key] ?? null,
        source: "defaults",
        warning: error.message,
      });
    }
    return NextResponse.json({
      key,
      value: data?.value ?? DEFAULTS[key] ?? null,
      updated_at: data?.updated_at ?? null,
      updated_by: data?.updated_by ?? null,
      source: data ? "db" : "defaults",
    });
  } catch (e) {
    return NextResponse.json({
      key,
      value: DEFAULTS[key] ?? null,
      source: "defaults",
      warning: String(e),
    });
  }
}

export async function PUT(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { key: string; value: unknown };
  if (!body.key || body.value === undefined) {
    return NextResponse.json({ error: "key_and_value_required" }, { status: 400 });
  }
  const { error } = await db()
    .from("eco_admin_config")
    .upsert(
      {
        key: body.key,
        value: body.value,
        updated_at: new Date().toISOString(),
        updated_by: "admin",
      },
      { onConflict: "key" }
    );
  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: "Aplica supabase/migrations/20260524_eco_admin_config.sql",
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
