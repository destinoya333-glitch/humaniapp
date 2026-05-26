// TikTok Marketing API — OAuth callback
//
// Endpoint pre-construido para cuando TikTok apruebe la app EcoDrive+ Auto Post.
// Recibe el code de autorización y lo intercambia por un access_token + refresh_token.
// Los persiste en marketing_credentials (Supabase) para que los crons n8n los consuman.
//
// Flujo:
//   1. Usuario click en el link de autorización -> redirige a TikTok
//   2. TikTok pide consentimiento -> redirige aquí con ?code=...&state=...
//   3. POST a https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
//      con client_key + client_secret + code -> recibe access_token
//   4. Guarda en Supabase
//   5. Redirige a /admin/tiktok-connected o muestra ok
//
// Env vars necesarias (a setear en Vercel cuando TikTok apruebe):
//   - TIKTOK_CLIENT_KEY
//   - TIKTOK_CLIENT_SECRET
//   - TIKTOK_REDIRECT_URI (debe coincidir con la URL registrada en TikTok app)
//   - SUPABASE_SERVICE_ROLE_KEY (ya existe)
//   - NEXT_PUBLIC_SUPABASE_URL (ya existe)

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TIKTOK_TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/";

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") || "";
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `TikTok denegó la autorización: ${error}` }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ error: "Falta parámetro code" }, { status: 400 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.json(
      {
        error: "TikTok credentials not configured yet",
        hint: "Setear TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en Vercel env cuando TikTok apruebe la app",
      },
      { status: 503 },
    );
  }

  // Intercambiar code por access_token
  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    open_id?: string;
    scope?: string;
    error?: { code: number; message: string };
  };
  try {
    const r = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });
    tokenData = await r.json();
    if (!r.ok || tokenData.error) {
      return NextResponse.json(
        { error: "TikTok rechazó el code", detail: tokenData },
        { status: 400 },
      );
    }
  } catch (e) {
    return NextResponse.json({ error: "Error pidiendo token a TikTok", detail: String(e) }, { status: 500 });
  }

  // Persistir en BD
  const now = new Date();
  const accessExpiresAt = tokenData.expires_in ? new Date(now.getTime() + tokenData.expires_in * 1000) : null;
  const refreshExpiresAt = tokenData.refresh_expires_in ? new Date(now.getTime() + tokenData.refresh_expires_in * 1000) : null;

  const sb = db();
  const { error: dbErr } = await sb.from("marketing_credentials").upsert(
    {
      provider: "tiktok",
      account_ref: tokenData.open_id || "default",
      access_token: tokenData.access_token!,
      refresh_token: tokenData.refresh_token || null,
      access_expires_at: accessExpiresAt?.toISOString() || null,
      refresh_expires_at: refreshExpiresAt?.toISOString() || null,
      scope: tokenData.scope || null,
      updated_at: now.toISOString(),
    },
    { onConflict: "provider,account_ref" },
  );
  if (dbErr) {
    console.error("[tiktok/oauth/callback] no se pudo guardar token:", dbErr);
    // No bloqueamos al user — el token igual se obtuvo. Pero avisamos.
  }

  // Redirigir a una página de éxito (todavía no existe — placeholder)
  return NextResponse.redirect(new URL(`/admin/tiktok-connected?state=${encodeURIComponent(state)}`, req.url), 303);
}
