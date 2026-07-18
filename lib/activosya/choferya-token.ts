/**
 * HMAC-signed tokens para confirmar/rechazar reservas TuChoferYa
 * sin requerir login. El chofer recibe un link único en su WhatsApp
 * cuando le llega una reserva nueva.
 *
 * Patrón clonado de lib/ecodrive/tracker-token.ts.
 */
import { createHmac } from "node:crypto";

const SECRET =
  process.env.CHOFERYA_TOKEN_SECRET ||
  process.env.ECODRIVE_TRACKER_SECRET ||
  process.env.ECODRIVE_ADMIN_PASSCODE ||
  "choferya-fallback-please-set-CHOFERYA_TOKEN_SECRET";

const DEFAULT_TTL_HOURS = 72;

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

/**
 * Token de acción sobre una reserva específica.
 * action ∈ 'confirmar' | 'rechazar' | 'completar' | 'panel'
 */
export function issueReservaToken(
  reservaId: string,
  action: "confirmar" | "rechazar" | "completar" | "panel",
  ttlHours = DEFAULT_TTL_HOURS
): string {
  const expiresAtMs = Date.now() + ttlHours * 3600_000;
  const payload = `${reservaId}.${action}.${expiresAtMs}`;
  const sig = sign(payload);
  return `${b64url(Buffer.from(payload, "utf8"))}.${sig}`;
}

export type VerifyResult =
  | { ok: true; reservaId: string; action: string; expiresAtMs: number }
  | { ok: false; reason: "format" | "signature" | "expired" };

export function verifyReservaToken(token: string): VerifyResult {
  if (!token) return { ok: false, reason: "format" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "format" };
  const [encPayload, sig] = parts;
  let payload: string;
  try {
    payload = fromB64url(encPayload).toString("utf8");
  } catch {
    return { ok: false, reason: "format" };
  }
  const expected = sign(payload);
  if (expected !== sig) return { ok: false, reason: "signature" };
  const [reservaId, action, exp] = payload.split(".");
  if (!reservaId || !action || !exp) return { ok: false, reason: "format" };
  const expiresAtMs = Number(exp);
  if (!Number.isFinite(expiresAtMs)) return { ok: false, reason: "format" };
  if (Date.now() > expiresAtMs) return { ok: false, reason: "expired" };
  return { ok: true, reservaId, action, expiresAtMs };
}

/**
 * Token persistente del chofer para login al panel mi.choferya
 * (TTL larguísimo, regenerable). Igual al patrón eco tracker-token.
 */
export function issueChoferPanelToken(choferId: string, ttlDays = 365): string {
  const expiresAtMs = Date.now() + ttlDays * 24 * 3600_000;
  const payload = `panel.${choferId}.${expiresAtMs}`;
  const sig = sign(payload);
  return `${b64url(Buffer.from(payload, "utf8"))}.${sig}`;
}

export function verifyChoferPanelToken(token: string):
  | { ok: true; choferId: string; expiresAtMs: number }
  | { ok: false; reason: "format" | "signature" | "expired" } {
  if (!token) return { ok: false, reason: "format" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "format" };
  const [encPayload, sig] = parts;
  let payload: string;
  try {
    payload = fromB64url(encPayload).toString("utf8");
  } catch {
    return { ok: false, reason: "format" };
  }
  const expected = sign(payload);
  if (expected !== sig) return { ok: false, reason: "signature" };
  const [tag, choferId, exp] = payload.split(".");
  if (tag !== "panel" || !choferId || !exp) return { ok: false, reason: "format" };
  const expiresAtMs = Number(exp);
  if (!Number.isFinite(expiresAtMs)) return { ok: false, reason: "format" };
  if (Date.now() > expiresAtMs) return { ok: false, reason: "expired" };
  return { ok: true, choferId, expiresAtMs };
}
