/**
 * Web Push helpers para EcoDrive+ choferes.
 * Usa lib `web-push` server-side.
 */
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT || "mailto:eco@ecodriveplus.com";
  if (!pub || !priv) return;
  webpush.setVapidDetails(sub, pub, priv);
  configured = true;
}

export type PushPayload = {
  title?: string;
  body?: string;
  icon?: string;
  url?: string;
  tag?: string;
  vibrate?: number[];
  requireInteraction?: boolean;
};

/**
 * Manda push notification a TODAS las suscripciones del chofer.
 * Si una falla con 410/404, la borra (suscripción expirada).
 */
export async function sendPushToChofer(
  choferId: string,
  payload: PushPayload
): Promise<{ ok: number; fail: number }> {
  configure();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: 0, fail: 0 };
  const sb = createClient(url, key);

  const { data: subs } = await sb
    .from("eco_chofer_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("chofer_id", choferId);

  let ok = 0;
  let fail = 0;
  for (const s of (subs || []) as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>) {
    try {
      await webpush.sendNotification(
        {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 }
      );
      ok++;
    } catch (e: unknown) {
      fail++;
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        // Suscripción expirada — borrar
        await sb.from("eco_chofer_push_subscriptions").delete().eq("id", s.id);
      }
    }
  }
  return { ok, fail };
}
