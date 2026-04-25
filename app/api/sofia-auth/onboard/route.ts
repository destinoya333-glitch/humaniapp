/**
 * POST /api/sofia-auth/onboard
 * Persists onboarding data into mse_users + ensures mse_student_profiles row.
 * Also bridges any pre-existing WhatsApp lead to this user.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServiceClient } from "@/lib/miss-sofia-voice/auth";
import { convertLeadToUser } from "@/lib/miss-sofia-voice/whatsapp-leads";

export async function POST(req: NextRequest) {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json();
  const { name, age, city, country, profession, motivation, whatsapp_phone } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "name required (min 2 chars)" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const cleanedPhone = whatsapp_phone ? String(whatsapp_phone).trim() : null;

  // Upsert mse_users keyed by id (auth user id)
  const { error: userErr } = await supabase
    .from("mse_users")
    .upsert(
      {
        id: authed.id,
        email: authed.email,
        name: name.trim(),
        age,
        city: city || null,
        country: country || null,
        profession: profession || null,
        motivation: motivation || null,
        whatsapp_phone: cleanedPhone,
        plan: "free",
      },
      { onConflict: "id" }
    );
  if (userErr) {
    return NextResponse.json({ error: userErr.message }, { status: 500 });
  }

  // Ensure profile exists
  await supabase
    .from("mse_student_profiles")
    .upsert({ user_id: authed.id }, { onConflict: "user_id", ignoreDuplicates: true });

  // Bridge any prior WhatsApp lead with this phone number
  let bridged: { migrated: boolean; level: string | null } = { migrated: false, level: null };
  if (cleanedPhone) {
    try {
      bridged = await convertLeadToUser({
        phone: cleanedPhone,
        user_id: authed.id,
        name: name.trim(),
      });
    } catch (e) {
      console.error("WhatsApp lead bridge failed:", e);
    }
  }

  return NextResponse.json({ ok: true, bridged });
}
