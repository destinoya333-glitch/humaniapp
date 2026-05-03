/**
 * POST /api/sofia-flows/pacto
 *
 * Receives the submit of WhatsApp Flow #1 — "Quién eres" (Pacto Cuna).
 * This Flow REPLACES the legacy CEFR placement test (we tossed CEFR).
 *
 * Body shape (from Flow data_exchange):
 *   {
 *     phone: string,                          // E.164, e.g. "+51964304268"
 *     name: string,
 *     city: string,
 *     motivation: string,                     // one of MOTIVATIONS values (Spanish label)
 *     minutes_per_day: 5 | 10 | 20,
 *     committed: boolean
 *   }
 *
 * Effect:
 *   - Upserts the lead in mse_whatsapp_leads with chat_state="dia_uno_sent"
 *     (skips the conversational funnel — Flow already captured all data)
 *   - Caches the Día 1 audio if not yet cached
 *
 * Returns:
 *   { ok, signup_url, day1_audio_url | null, lead_id }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

const SIGNUP_LINK_BASE = "https://activosya.com/sofia-auth/signup";
const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rfpmvnoaqibqiqxrmheb.supabase.co"
)
  .trim()
  .replace(/\/$/, "");
const DIA_UNO_AUDIO_PATH = "cuna/dia-1-bienvenida.mp3";

const VALID_MINUTES: ReadonlySet<number> = new Set([5, 10, 20]);

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

function dayUnoAudioUrl(): string {
  return `${SUPABASE_URL}/storage/v1/object/public/sofia-tts/${DIA_UNO_AUDIO_PATH}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const phone = normalizePhone(body.phone);
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 30) : "";
    const city = typeof body.city === "string" ? body.city.trim().slice(0, 50) : "";
    const motivation = typeof body.motivation === "string" ? body.motivation.trim().slice(0, 100) : "";
    const minutes = Number(body.minutes_per_day);
    const committed = body.committed === true;

    if (!phone) return NextResponse.json({ error: "phone required (E.164)" }, { status: 400 });
    if (!name || name.length < 2) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!city || city.length < 2) return NextResponse.json({ error: "city required" }, { status: 400 });
    if (!motivation) return NextResponse.json({ error: "motivation required" }, { status: 400 });
    if (!VALID_MINUTES.has(minutes)) {
      return NextResponse.json({ error: "minutes_per_day must be 5, 10 or 20" }, { status: 400 });
    }
    if (!committed) {
      return NextResponse.json(
        { error: "committed must be true to seal the Pacto Cuna" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const chatData = {
      name,
      city,
      motivation,
      minutes_per_day: minutes,
      committed: true,
      via_flow: true,
    };

    // Upsert the lead — if it already exists, update; if not, create.
    const { data: existing } = await supabase
      .from("mse_whatsapp_leads")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    let leadId: string;
    if (existing) {
      const { error } = await supabase
        .from("mse_whatsapp_leads")
        .update({
          name,
          chat_state: "dia_uno_sent",
          chat_data: chatData,
          status: "test_done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
      leadId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("mse_whatsapp_leads")
        .insert({
          phone,
          name,
          chat_state: "dia_uno_sent",
          chat_data: chatData,
          status: "test_done",
        })
        .select("id")
        .single();
      if (error) throw error;
      leadId = created.id;
    }

    return NextResponse.json({
      ok: true,
      lead_id: leadId,
      signup_url: `${SIGNUP_LINK_BASE}?phone=${encodeURIComponent(phone)}`,
      day1_audio_url: dayUnoAudioUrl(),
      message: `Pacto sellado, ${name}. Bienvenido a tu Fase Cuna.`,
    });
  } catch (e) {
    console.error("sofia-flows/pacto error:", e);
    return NextResponse.json(
      { error: "server_error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
