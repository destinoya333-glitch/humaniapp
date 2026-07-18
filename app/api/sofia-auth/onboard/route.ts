/**
 * POST /api/sofia-auth/onboard
 *
 * Persists onboarding data into mse_users + ensures mse_student_profiles row
 * with the Cuna Pacto (minutes_per_day + commitment) baked in.
 *
 * Body:
 *   name, age, city, country, profession, motivation, whatsapp_phone,
 *   minutes_per_day?: 5 | 10 | 20    (Cuna Pacto)
 *   committed?: boolean              (Cuna Pacto — required to start Fase 0)
 *
 * Effect:
 *   - Upserts mse_users
 *   - Ensures mse_student_profiles (defaults set current_phase=0, phase_day=1)
 *   - If minutes_per_day + committed → persists in personal_facts.cuna_study_plan
 *     and sets cuna_started_at = now() if not already set
 *   - Bridges any prior WhatsApp lead with this phone
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthedUserHybrid, getServiceClient } from "@/lib/miss-sofia-voice/auth";
import { convertLeadToUser } from "@/lib/miss-sofia-voice/whatsapp-leads";

const VALID_MINUTES: ReadonlySet<number> = new Set([5, 10, 20]);

export async function POST(req: NextRequest) {
  const authed = await getAuthedUserHybrid(req);
  if (!authed) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    age,
    city,
    country,
    profession,
    motivation,
    whatsapp_phone,
    minutes_per_day,
    committed,
  } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "name required (min 2 chars)" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const cleanedPhone = whatsapp_phone ? String(whatsapp_phone).trim() : null;

  // Defensa contra duplicate email: si ya existe un mse_users con este email
  // (cuenta vieja con auth.user_id distinto), actualizamos por email en vez
  // de crear un nuevo row. Esto previene el error duplicate key value
  // violates unique constraint "mse_users_email_key" cuando un usuario
  // se vuelve a registrar tras haber tenido cuenta previa.
  let effectiveUserId = authed.id;
  if (authed.email) {
    const { data: existingByEmail } = await supabase
      .from("mse_users")
      .select("id")
      .eq("email", authed.email)
      .maybeSingle();

    if (existingByEmail && (existingByEmail as { id: string }).id !== authed.id) {
      // Hay una cuenta vieja con este email pero distinto auth.id.
      // Re-usar el id existente para mantener FK (mse_student_profiles, etc.).
      effectiveUserId = (existingByEmail as { id: string }).id;
      const { error: updateErr } = await supabase
        .from("mse_users")
        .update({
          name: name.trim(),
          age,
          city: city || null,
          country: country || null,
          profession: profession || null,
          motivation: motivation || null,
          whatsapp_phone: cleanedPhone,
        })
        .eq("email", authed.email);
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    } else {
      // Path normal: upsert por id
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
    }
  }

  // Ensure profile exists with Cuna defaults (current_phase=0, phase_day=1).
  // Need INSERT first to know whether to set cuna_started_at.
  const { data: existingProfile } = await supabase
    .from("mse_student_profiles")
    .select("user_id, cuna_started_at, personal_facts")
    .eq("user_id", effectiveUserId)
    .maybeSingle();

  const profileUpdate: Record<string, unknown> = {};

  // Bake the Pacto Cuna into personal_facts if user committed.
  const minutes = Number(minutes_per_day);
  const validMinutes = VALID_MINUTES.has(minutes) ? minutes : null;
  if (validMinutes !== null && committed === true) {
    const existingFacts =
      (existingProfile?.personal_facts as Record<string, unknown> | null) ?? {};
    profileUpdate.personal_facts = {
      ...existingFacts,
      cuna_study_plan: {
        minutes_per_day: validMinutes,
        committed: true,
        committed_at: new Date().toISOString(),
        source: "web_onboarding",
      },
    };
    if (!existingProfile?.cuna_started_at) {
      profileUpdate.cuna_started_at = new Date().toISOString();
      profileUpdate.phase_started_at = new Date().toISOString();
    }
  }

  // IMPORTANTE: validar el error del insert/update. Antes se ignoraba, así que
  // si fallaba (FK, columna NOT NULL, etc.) el endpoint devolvía ok:true sin
  // crear el perfil → el dashboard daba 404 → la app se quedaba en "Sellando...".
  if (existingProfile) {
    if (Object.keys(profileUpdate).length > 0) {
      const { error: updErr } = await supabase
        .from("mse_student_profiles")
        .update({ ...profileUpdate, updated_at: new Date().toISOString() })
        .eq("user_id", effectiveUserId);
      if (updErr) {
        return NextResponse.json({ error: `profile_update_failed: ${updErr.message}` }, { status: 500 });
      }
    }
  } else {
    const { error: insErr } = await supabase.from("mse_student_profiles").insert({
      user_id: effectiveUserId,
      cuna_started_at: profileUpdate.cuna_started_at ?? new Date().toISOString(),
      ...profileUpdate,
    });
    if (insErr) {
      return NextResponse.json({ error: `profile_insert_failed: ${insErr.message}` }, { status: 500 });
    }
  }

  // Verificación final: el perfil DEBE quedar consultable por el id de la sesión
  // (authed.id) — que es el que la app usa para /dashboard. Si por una colisión
  // de email quedó bajo otro id, lo avisamos en vez de fingir éxito.
  if (effectiveUserId !== authed.id) {
    return NextResponse.json(
      {
        error: "account_id_mismatch",
        message:
          "Ya existe una cuenta con este correo. Inicia sesión con esa cuenta en vez de crear una nueva.",
      },
      { status: 409 }
    );
  }

  // Bridge any prior WhatsApp lead with this phone number
  let bridged: { migrated: boolean; level: string | null } = { migrated: false, level: null };
  if (cleanedPhone) {
    try {
      bridged = await convertLeadToUser({
        phone: cleanedPhone,
        user_id: effectiveUserId,
        name: name.trim(),
      });
    } catch (e) {
      console.error("WhatsApp lead bridge failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    bridged,
    cuna_pacto_sealed: validMinutes !== null && committed === true,
  });
}
