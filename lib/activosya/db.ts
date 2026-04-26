import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim().replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { persistSession: false } },
);

export type B2BLead = {
  name: string;
  email: string;
  whatsapp?: string;
  asset_interest?: string;
  budget_range?: string;
  timing?: string;
  notes?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export async function createB2BLead(lead: B2BLead) {
  const { data, error } = await supabaseAdmin
    .from("ay_b2b_leads")
    .insert({ ...lead, source: lead.source || "web_form", status: "new" })
    .select("id")
    .single();
  if (error) throw new Error(`createB2BLead failed: ${error.message}`);
  return data;
}
