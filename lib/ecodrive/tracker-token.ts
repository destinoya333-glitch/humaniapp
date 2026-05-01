// HMAC-signed tokens for the chofer PWA tracker.
// Format: base64url(payload).base64url(signature)
//   payload = `${chofer_id}.${expires_at_ms}`
//   signature = HMAC-SHA256(payload, ECODRIVE_TRACKER_SECRET)
//
// The endpoint validates: signature OK + not expired + chofer_estado.en_turno = true.
// No DB table needed for tokens.

import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.ECODRIVE_TRACKER_SECRET ||
  process.env.ECODRIVE_ADMIN_PASSCODE ||
  "ecodrive-fallback-please-set-ECODRIVE_TRACKER_SECRET";

const DEFAULT_TTL_HOURS = 16;

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = (4 - (s.length % 4)) % 4;
  const norm = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
  return Buffer.from(norm, "base64");
}

function sign(payload: string): string {
  return b64url(createHmac("sha256", SECRET).update(payload).digest());
}

export function issueChoferTrackerToken(choferId: number, ttlHours = DEFAULT_TTL_HOURS): string {
  const expiresAtMs = Date.now() + ttlHours * 3600_000;
  const payload = `${choferId}.${expiresAtMs}`;
  const sig = sign(payload);
  return `${b64url(Buffer.from(payload, "utf8"))}.${sig}`;
}

export type VerifyResult =
  | { ok: true; choferId: number; expiresAtMs: number }
  | { ok: false; reason: "format" | "signature" | "expired" };

export function verifyChoferTrackerToken(token: string): VerifyResult {
  if (!token || typeof token !== "string") return { ok: false, reason: "format" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "format" };
  const [encPayload, sig] = parts;

  let payloadStr: string;
  try {
    payloadStr = fromB64url(encPayload).toString("utf8");
  } catch {
    return { ok: false, reason: "format" };
  }

  const sub = payloadStr.split(".");
  if (sub.length !== 2) return { ok: false, reason: "format" };
  const choferId = Number(sub[0]);
  const expiresAtMs = Number(sub[1]);
  if (!Number.isFinite(choferId) || !Number.isFinite(expiresAtMs)) {
    return { ok: false, reason: "format" };
  }

  const expectedSig = sign(payloadStr);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature" };
  }

  if (Date.now() > expiresAtMs) return { ok: false, reason: "expired" };
  return { ok: true, choferId, expiresAtMs };
}
