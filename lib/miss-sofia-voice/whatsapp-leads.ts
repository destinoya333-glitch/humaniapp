/**
 * WhatsApp leads — usuarios que entran al funnel via WhatsApp antes de
 * registrarse en la web app.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: SupabaseClient<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): SupabaseClient<any> {
  if (_supabase) return _supabase;
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _supabase;
}

export type WhatsAppLead = {
  id: string;
  phone: string;
  name: string | null;
  level_detected: string | null;
  test_results: Record<string, unknown>;
  status: "new" | "test_in_progress" | "test_done" | "converted";
  converted_user_id: string | null;
  chat_state: string;
  chat_messages: Array<{ role: "user" | "assistant"; content: string }>;
  chat_data: Record<string, unknown>;
};

export async function getOrCreateLead(phone: string): Promise<WhatsAppLead> {
  const existing = await db()
    .from("mse_whatsapp_leads")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (existing.data) return existing.data as unknown as WhatsAppLead;

  const created = await db()
    .from("mse_whatsapp_leads")
    .insert({ phone, status: "new", chat_state: "greeting" })
    .select()
    .single();
  if (created.error) throw created.error;
  return created.data as unknown as WhatsAppLead;
}

export async function updateLead(
  phone: string,
  updates: Partial<WhatsAppLead>
): Promise<void> {
  await db()
    .from("mse_whatsapp_leads")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("phone", phone);
}

export async function appendMessage(
  phone: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const lead = await getOrCreateLead(phone);
  const msgs = [...lead.chat_messages, { role, content }];
  // Cap history at last 30 messages
  const trimmed = msgs.slice(-30);
  await db()
    .from("mse_whatsapp_leads")
    .update({ chat_messages: trimmed, updated_at: new Date().toISOString() })
    .eq("phone", phone);
}

/**
 * Convert a lead into a registered user — called when the user signs up
 * on the web with their WhatsApp number. Migrates name and detected level
 * to the new mse_users + mse_student_profiles records.
 */
export async function convertLeadToUser(opts: {
  phone: string;
  user_id: string;
  name: string;
}): Promise<{ migrated: boolean; level: string | null }> {
  const { data: lead } = await db()
    .from("mse_whatsapp_leads")
    .select("*")
    .eq("phone", opts.phone)
    .maybeSingle();

  if (!lead) return { migrated: false, level: null };

  // Mark lead as converted
  await db()
    .from("mse_whatsapp_leads")
    .update({
      status: "converted",
      converted_user_id: opts.user_id,
      updated_at: new Date().toISOString(),
    })
    .eq("phone", opts.phone);

  // If lead already had detected level, push it to the student profile
  const detected = lead.level_detected as string | null;
  if (detected) {
    await db()
      .from("mse_student_profiles")
      .upsert(
        {
          user_id: opts.user_id,
          current_level: detected,
          cefr_estimate: detected,
        },
        { onConflict: "user_id" }
      );
  }

  return { migrated: true, level: detected };
}
