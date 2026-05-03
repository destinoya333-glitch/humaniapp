/**
 * Twilio Content API helper — sends messages using approved Content Templates
 * (quick-reply buttons, list pickers, media, etc). Required for native
 * interactive WhatsApp UX.
 */

const TWILIO_SID = (process.env.TWILIO_SOFIA_ACCOUNT_SID ?? "").trim();
const TWILIO_TOK = (process.env.TWILIO_SOFIA_AUTH_TOKEN ?? "").trim();
const TWILIO_FROM = (process.env.TWILIO_SOFIA_FROM ?? "").trim(); // "whatsapp:+51977100718"

export const TEMPLATE_SIDS = {
  TEST_QUESTION: (process.env.TWILIO_TEMPLATE_TEST_QUESTION ?? "").trim(),
  PRACTICE: (process.env.TWILIO_TEMPLATE_PRACTICE ?? "").trim(),
  GREETING: (process.env.TWILIO_TEMPLATE_GREETING ?? "").trim(),
};

export function isTwilioConfigured(): boolean {
  return Boolean(TWILIO_SID && TWILIO_TOK && TWILIO_FROM);
}

/**
 * Sends a Content Template message (with quick-reply buttons / media).
 * Returns the message SID.
 */
export async function sendContentTemplate(opts: {
  toPhone: string; // "+51964304268"
  contentSid: string;
  variables: Record<string, string>;
}): Promise<string> {
  if (!isTwilioConfigured()) {
    throw new Error("Twilio Sofia subaccount env vars not set");
  }
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOK}`).toString("base64");
  const to = opts.toPhone.startsWith("whatsapp:")
    ? opts.toPhone
    : `whatsapp:${opts.toPhone}`;

  const body = new URLSearchParams({
    From: TWILIO_FROM,
    To: to,
    ContentSid: opts.contentSid,
    ContentVariables: JSON.stringify(opts.variables),
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio Content send failed: ${res.status} ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as { sid: string };
  return data.sid;
}

/**
 * Sends a plain text or media message via API (when no template needed).
 */
export async function sendPlainMessage(opts: {
  toPhone: string;
  body?: string;
  mediaUrl?: string;
}): Promise<string> {
  if (!isTwilioConfigured()) {
    throw new Error("Twilio Sofia subaccount env vars not set");
  }
  const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOK}`).toString("base64");
  const to = opts.toPhone.startsWith("whatsapp:")
    ? opts.toPhone
    : `whatsapp:${opts.toPhone}`;

  const body = new URLSearchParams({
    From: TWILIO_FROM,
    To: to,
  });
  if (opts.body) body.set("Body", opts.body);
  if (opts.mediaUrl) body.set("MediaUrl", opts.mediaUrl);

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio plain send failed: ${res.status} ${err.slice(0, 300)}`);
  }
  const data = (await res.json()) as { sid: string };
  return data.sid;
}
