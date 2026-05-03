/**
 * GET /api/sofia-auth/dev-bypass?email=...&password=...
 *
 * Emergency server-side login that sets the session cookies directly,
 * bypassing the broken client-side login form. Use only for testing.
 *
 * Behavior:
 *   1. Reads email + password from query params
 *   2. Calls supabase.auth.signInWithPassword via server client
 *   3. Cookies get set automatically (createServerClient cookie adapter)
 *   4. Redirects to /sofia-chat
 *
 * Security note: the password is in the URL — DO NOT use in production with
 * real users. This is for Percy to bypass the form bug while we debug it.
 * Delete this file after the form is fixed.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const password = req.nextUrl.searchParams.get("password");
  const next = req.nextUrl.searchParams.get("next") ?? "/sofia-chat";

  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password query params required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json(
      { error: "signin_failed", message: error.message },
      { status: 401 }
    );
  }

  // Cookies are now set on the response. Redirect to the target page.
  return NextResponse.redirect(new URL(next, req.url));
}
