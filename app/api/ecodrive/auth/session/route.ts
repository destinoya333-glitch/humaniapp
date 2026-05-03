import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/ecodrive/auth/session — devuelve {phone} si hay sesión válida
export async function GET(req: NextRequest) {
  const token = req.cookies.get("eco_session")?.value;
  if (!token) return NextResponse.json({ authenticated: false });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await sb
    .from("eco_sessions")
    .select("phone, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!data) return NextResponse.json({ authenticated: false });
  if (new Date(data.expires_at) < new Date()) return NextResponse.json({ authenticated: false, expired: true });

  await sb.from("eco_sessions").update({ last_seen_at: new Date().toISOString() }).eq("token", token);
  return NextResponse.json({ authenticated: true, phone: data.phone });
}

// POST /api/ecodrive/auth/session (logout)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("eco_session")?.value;
  if (token) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    await sb.from("eco_sessions").delete().eq("token", token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("eco_session");
  return res;
}
