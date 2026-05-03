/**
 * GET /api/sofia-daily-cron
 *
 * Modelo C híbrido — envía mensaje matutino diario por WhatsApp a usuarios con
 * `whatsapp_phone` configurado. El mensaje saluda y previsualiza el tema del día.
 *
 * Configurar en Vercel Cron (vercel.json):
 *   {
 *     "crons": [
 *       { "path": "/api/sofia-daily-cron", "schedule": "0 11 * * *" }
 *     ]
 *   }
 *  (11:00 UTC = 06:00 Lima)
 *
 * Header `Authorization: Bearer ${CRON_SECRET}` requerido para evitar abuso.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/miss-sofia-voice/auth";

const TWILIO_SOFIA_ACCOUNT_SID = process.env.TWILIO_SOFIA_ACCOUNT_SID;
const TWILIO_SOFIA_AUTH_TOKEN = process.env.TWILIO_SOFIA_AUTH_TOKEN;
const TWILIO_SOFIA_FROM = process.env.TWILIO_SOFIA_FROM;

function getDayName(): string {
  return [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][new Date().getDay()];
}

function dailyGreeting(name: string, dayName: string, topic: string, sessionType: string): string {
  const motivators = [
    "Vamos por hoy",
    "Te toca hoy",
    "Empecemos el día",
    "Listo para hoy",
  ];
  const m = motivators[Math.floor(Math.random() * motivators.length)];
  const sessionLabel = {
    introduction: "intro de la semana 📚",
    guided_roleplay: "roleplay guiado 🎭",
    free_conversation: "conversación libre 💬",
    error_reinforcement: "repaso de errores 🎯",
    advanced_roleplay: "roleplay avanzado 🚀",
    weekly_exam: "examen de la semana 🏆",
    reflection: "reflexión + preview 🌱",
  }[sessionType] ?? sessionType;

  return `Buenos días, ${name}. ☀️\n\n${m}: hoy es ${dayName} y vamos con ${sessionLabel}.\n\nTema: *${topic}*\n\nCuando estés listo, entra a tu sesión: https://activosya.com/sofia-chat\n\n— Sofia`;
}

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  if (!TWILIO_SOFIA_ACCOUNT_SID || !TWILIO_SOFIA_AUTH_TOKEN || !TWILIO_SOFIA_FROM) {
    console.warn("Twilio Sofia env vars not set, skipping WhatsApp");
    return false;
  }
  const auth = Buffer.from(
    `${TWILIO_SOFIA_ACCOUNT_SID}:${TWILIO_SOFIA_AUTH_TOKEN}`
  ).toString("base64");

  const params = new URLSearchParams({
    From: TWILIO_SOFIA_FROM,
    To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
    Body: body,
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SOFIA_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );
  return res.ok;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const dayName = getDayName();

  const { data: users } = await supabase
    .from("mse_users")
    .select(
      "id, name, whatsapp_phone, mse_student_profiles!inner(current_level, current_week)"
    )
    .not("whatsapp_phone", "is", null);

  if (!users || users.length === 0) {
    return NextResponse.json({ sent: 0, message: "no users with whatsapp configured" });
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const u of users as Array<{
    id: string;
    name: string;
    whatsapp_phone: string;
    mse_student_profiles:
      | { current_level: string; current_week: number }
      | { current_level: string; current_week: number }[];
  }>) {
    const profile = Array.isArray(u.mse_student_profiles)
      ? u.mse_student_profiles[0]
      : u.mse_student_profiles;
    if (!profile) continue;

    // Lookup today's curriculum
    const { data: week } = await supabase
      .from("mse_curriculum_weeks")
      .select("id, topic")
      .eq("level", profile.current_level)
      .eq("week_number", profile.current_week)
      .maybeSingle();
    if (!week) continue;

    const { data: daily } = await supabase
      .from("mse_curriculum_daily_sessions")
      .select("session_type")
      .eq("week_id", week.id)
      .eq("day_name", dayName)
      .maybeSingle();
    if (!daily) continue;

    const message = dailyGreeting(u.name, dayName, week.topic, daily.session_type);
    try {
      const ok = await sendWhatsApp(u.whatsapp_phone, message);
      if (ok) sent++;
      else failed++;
    } catch (e) {
      failed++;
      errors.push(`${u.id}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ sent, failed, total: users.length, errors });
}
