/**
 * POST /api/ecodrive/push/subscribe
 * Body: { token: string, subscription: PushSubscription }
 * Guarda la suscripción del browser para futuro push.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyChoferTrackerToken } from "@/lib/ecodrive/tracker-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: {
    token?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const v = verifyChoferTrackerToken(body.token || "");
  if (!v.ok) {
    return NextResponse.json({ error: `token_${v.reason}` }, { status: 401 });
  }
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "bad_subscription" }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upsert por endpoint (UNIQUE)
  const ua = req.headers.get("user-agent") || null;
  const { error } = await sb
    .from("eco_chofer_push_subscriptions")
    .upsert(
      {
        chofer_id: v.choferId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: ua,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
