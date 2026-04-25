/**
 * GET /api/sofia-auth/me
 * Returns the authenticated user_id and onboarding status for the client UI.
 * Used so client components don't need to know auth internals.
 */
import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/miss-sofia-voice/auth";

export async function GET() {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ authenticated: false }, { status: 200 });
  return NextResponse.json({
    authenticated: true,
    user_id: authed.id,
    email: authed.email,
    needsOnboarding: authed.needsOnboarding,
  });
}
