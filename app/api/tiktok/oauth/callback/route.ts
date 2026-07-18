// TikTok OAuth callback — Display API v2 (open.tiktokapis.com)
//
// Recibe el ?code de TikTok, lo intercambia por access_token + refresh_token
// y los guarda en marketing_credentials (red='tiktok') para que el cron de
// marketing-sync lea las métricas de los videos.
//
// Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REDIRECT_URI

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return NextResponse.json({ error: `TikTok denegó: ${error}` }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Falta code" }, { status: 400 });

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (!clientKey || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "Faltan TIKTOK_CLIENT_KEY/SECRET/REDIRECT_URI" }, { status: 503 });
  }

  // Display API exige application/x-www-form-urlencoded
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  let t: any;
  try {
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    t = await r.json();
    if (!r.ok || t.error) {
      return NextResponse.json({ error: "TikTok rechazó el code", detail: t }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Error pidiendo token", detail: String(e) }, { status: 500 });
  }

  const now = Date.now();
  const accessExpiresAt = t.expires_in ? new Date(now + t.expires_in * 1000).toISOString() : null;
  const refreshExpiresAt = t.refresh_expires_in ? new Date(now + t.refresh_expires_in * 1000).toISOString() : null;

  // Esquema existente: provider / account_ref / access_expires_at / refresh_expires_at / scope
  const { error: dbErr } = await db()
    .from("marketing_credentials")
    .upsert(
      {
        provider: "tiktok",
        account_ref: t.open_id || "default",
        access_token: t.access_token,
        refresh_token: t.refresh_token || null,
        access_expires_at: accessExpiresAt,
        refresh_expires_at: refreshExpiresAt,
        scope: t.scope || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider,account_ref" },
    );
  if (dbErr) console.error("[tiktok/callback] guardar token:", dbErr.message);

  return NextResponse.redirect(new URL(`/admin/marketing?tiktok=${dbErr ? "error" : "ok"}`, req.url), 303);
}
