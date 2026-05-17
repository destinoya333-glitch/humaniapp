/**
 * Capsule deep-link signing — para que WhatsApp envíe links a /sofia-capsule
 * con HMAC que valida que el link viene de nuestro sistema y no fue manipulado.
 *
 * Formato: /sofia-capsule?topic=<topic>&difficulty=<d>&u=<userId>&exp=<unix>&sig=<hmac>
 *
 * Verificación server-side se hace en /api/sofia-capsule/from-link/route.ts.
 */
import { createHmac } from "crypto";

const SECRET = process.env.SOFIA_CAPSULE_LINK_SECRET ?? "dev-only-secret-change-me";

export type LinkPayload = {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  userId: string;
  expiresAt: number; // unix seconds
};

function payloadString(p: LinkPayload): string {
  return `${p.userId}|${p.topic}|${p.difficulty}|${p.expiresAt}`;
}

export function signCapsulePayload(p: LinkPayload): string {
  return createHmac("sha256", SECRET).update(payloadString(p)).digest("hex").slice(0, 32);
}

export function verifyCapsulePayload(p: LinkPayload, sig: string): boolean {
  if (!sig || sig.length !== 32) return false;
  if (p.expiresAt < Math.floor(Date.now() / 1000)) return false;
  return signCapsulePayload(p) === sig;
}

export function buildCapsuleLink(opts: {
  baseUrl: string;
  userId: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  ttlSeconds?: number;
}): string {
  const expiresAt = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 60 * 60 * 36); // 36h default
  const payload: LinkPayload = {
    topic: opts.topic,
    difficulty: opts.difficulty,
    userId: opts.userId,
    expiresAt,
  };
  const sig = signCapsulePayload(payload);
  const qs = new URLSearchParams({
    topic: opts.topic,
    difficulty: opts.difficulty,
    u: opts.userId,
    exp: String(expiresAt),
    sig,
  });
  return `${opts.baseUrl.replace(/\/$/, "")}/sofia-capsule?${qs.toString()}`;
}
