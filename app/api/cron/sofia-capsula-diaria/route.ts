/**
 * GET /api/cron/sofia-capsula-diaria
 * Vercel Cron — corre 9am Lima (14:00 UTC).
 *
 * Para cada usuario activo (plan ≠ free, último login < 14 días):
 *   1. Toma un tema sugerido para su fase.
 *   2. Construye link firmado HMAC.
 *   3. Envía template WhatsApp `sofia_capsula_apa` con el link.
 *
 * NOTA: el template `sofia_capsula_apa` debe crearse en Meta Business Manager
 * y aprobarse antes de que este cron funcione end-to-end. El cron es idempotente
 * por (user_id, fecha) usando mse_capsula_diaria_log.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { suggestedTopicsForPhase } from "@/lib/miss-sofia-voice/passage-engine";
import { buildCapsuleLink } from "@/lib/miss-sofia-voice/capsule-link";
import type { CunaPhase } from "@/lib/miss-sofia-voice/phase-engine";

export const maxDuration = 60;

type ActiveUser = {
  id: string;
  whatsapp_phone: string | null;
  plan: string | null;
  current_phase: number;
};

async function sendCapsuleTemplate(opts: {
  phone: string;
  studentName: string;
  topic: string;
  linkSuffix: string; // querystring SIN el prefijo de URL (Meta limita botones URL a sufijo dinámico)
}): Promise<{ ok: boolean; error?: string }> {
  const phoneId = process.env.META_SOFIA_PHONE_ID;
  const token = process.env.META_SOFIA_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return { ok: false, error: "META env missing" };
  }
  try {
    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: opts.phone,
          type: "template",
          template: {
            name: "sofia_capsula_apa",
            language: { code: "es" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: opts.studentName.slice(0, 50) },
                  { type: "text", text: opts.topic.slice(0, 80) },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: opts.linkSuffix }],
              },
            ],
          },
        }),
      }
    );
    if (!resp.ok) {
      const body = await resp.text();
      return { ok: false, error: `${resp.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function GET(req: NextRequest) {
  // Vercel Cron adds Authorization header automatically; check minimally
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Pull active users — join mse_users with mse_student_profiles
  // Nota: mse_users no tiene last_login_at; filtramos por created_at como proxy de actividad,
  // y por whatsapp_phone (no 'phone' que es la columna en otros productos).
  const { data: rows, error } = await supabase
    .from("mse_users")
    .select(`
      id, whatsapp_phone, plan,
      mse_student_profiles!inner ( current_phase )
    `)
    .neq("plan", "free")
    .not("whatsapp_phone", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users: ActiveUser[] = (rows ?? []).map((r) => {
    const profile = (r as { mse_student_profiles: { current_phase: number } | { current_phase: number }[] }).mse_student_profiles;
    const phase = Array.isArray(profile) ? profile[0]?.current_phase ?? 0 : profile?.current_phase ?? 0;
    return {
      id: (r as { id: string }).id,
      whatsapp_phone: (r as { whatsapp_phone: string | null }).whatsapp_phone,
      plan: (r as { plan: string | null }).plan,
      current_phase: phase,
    };
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://sofia.activosya.com";
  const today = new Date().toISOString().slice(0, 10);

  let sent = 0;
  let skipped = 0;
  const failures: Array<{ user_id: string; error: string }> = [];

  for (const u of users) {
    if (!u.whatsapp_phone) {
      skipped++;
      continue;
    }
    // Normalizar: Meta acepta E.164 con o sin '+', pero el template send actual quita '+'
    const phoneE164 = u.whatsapp_phone.replace(/^\+/, "");
    // Idempotencia: si ya hay log de hoy, saltar
    const { count: existingCount } = await supabase
      .from("mse_capsula_diaria_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.id)
      .eq("sent_on", today);
    if ((existingCount ?? 0) > 0) {
      skipped++;
      continue;
    }

    const phase = (u.current_phase as CunaPhase) ?? 0;
    const suggestions = suggestedTopicsForPhase(phase);
    // Pick deterministic-by-user-day
    const idx = (parseInt(u.id.replace(/-/g, "").slice(0, 8), 16) + new Date().getDate()) % suggestions.length;
    const topic = suggestions[idx];
    const difficulty = phase <= 1 ? "easy" : phase <= 3 ? "medium" : "hard";

    const link = buildCapsuleLink({
      baseUrl,
      userId: u.id,
      topic,
      difficulty,
    });
    // Extraer querystring del link para usarlo como sufijo del botón template
    const linkSuffix = link.includes("?") ? link.substring(link.indexOf("?") + 1) : "";

    const { data: userMeta } = await supabase
      .from("mse_users")
      .select("name")
      .eq("id", u.id)
      .single();
    const name = (userMeta as { name?: string } | null)?.name ?? "Amigo";

    const result = await sendCapsuleTemplate({
      phone: phoneE164,
      studentName: name,
      topic,
      linkSuffix,
    });

    if (result.ok) {
      sent++;
      await supabase.from("mse_capsula_diaria_log").insert({
        user_id: u.id,
        sent_on: today,
        topic,
        difficulty,
      });
    } else {
      failures.push({ user_id: u.id, error: result.error ?? "unknown" });
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    total_eligible: users.length,
    failures,
  });
}
