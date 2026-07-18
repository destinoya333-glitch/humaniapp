// Inicia la conexión OAuth con TikTok (Display API v2).
// Abre /api/tiktok/oauth/start en el navegador (logueado en TikTok) y te lleva
// a la pantalla de autorización de TikTok. Al aceptar, vuelve al callback.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";

export async function GET(req: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;
  if (!clientKey || !redirectUri) {
    return NextResponse.json({ error: "Faltan TIKTOK_CLIENT_KEY/REDIRECT_URI" }, { status: 503 });
  }
  // Permite probar distintos scopes con ?scope=... (default: los 3 de métricas)
  const scope = req.nextUrl.searchParams.get("scope") || "user.info.basic,user.info.stats,video.list";
  const params = new URLSearchParams({
    client_key: clientKey,
    scope,
    response_type: "code",
    redirect_uri: redirectUri,
    state: "ecodrive",
  });
  return NextResponse.redirect(`${AUTH_URL}?${params.toString()}`, 302);
}
