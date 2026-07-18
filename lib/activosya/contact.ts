// Public contact channels for activosya.com. Set NEXT_PUBLIC_LEAD_WHATSAPP in
// Vercel to the dedicated advisor chip in E.164 without "+" (e.g. "51XXXXXXXXX").
// While empty, callers fall back to email and the form keeps leads in Supabase only.
export const LEAD_WHATSAPP_E164 = (process.env.NEXT_PUBLIC_LEAD_WHATSAPP ?? "").trim();
export const LEAD_EMAIL = "contacto@activosya.com";
export const LEAD_EMAIL_MAILTO = `mailto:${LEAD_EMAIL}`;

// Per-product operational chips (Meta Cloud). These are the bots end users talk to,
// distinct from the B2B advisor chip above.
export const DESTINO_WA_E164 = "51980423754";
export const ECODRIVE_WA_E164 = "51994810242";

export function getLeadWaUrl(text?: string): string | null {
  if (!LEAD_WHATSAPP_E164) return null;
  return waUrl(LEAD_WHATSAPP_E164, text);
}

export function getLeadWaDisplay(): string | null {
  if (!LEAD_WHATSAPP_E164) return null;
  return formatE164(LEAD_WHATSAPP_E164);
}

export function waUrl(e164: string, text?: string): string {
  const base = `https://wa.me/${e164}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

function formatE164(e164: string): string {
  const m = e164.match(/^(\d{2})(\d{3})(\d{3})(\d{3})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${e164}`;
}
