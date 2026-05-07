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

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") || "pending";
  const { data, error } = await db()
    .from("eco_pasajeros")
    .select("id,wa_id,nombre,dni,edad,status,created_at,approved_at,rejection_reason")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json()) as { id: string; action: "approve" | "reject" | "suspend"; reason?: string };
  if (!body.id || !body.action) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.action === "approve") {
    update.status = "approved";
    update.approved_at = new Date().toISOString();
    update.approved_by = "admin";
    update.rejection_reason = null;
  } else if (body.action === "reject") {
    update.status = "rejected";
    update.rejection_reason = body.reason || "Sin razon especificada";
  } else if (body.action === "suspend") {
    update.status = "suspended";
    update.rejection_reason = body.reason || "Sin razon";
  }

  const { error } = await db().from("eco_pasajeros").update(update).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
