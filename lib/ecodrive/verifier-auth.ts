/**
 * Auth simple para portal verificador de entidades financieras
 * (Caja Trujillo, Caja Arequipa, Caja Huancayo, etc.).
 *
 * Credenciales se configuran via env var VERIFIER_ACCOUNTS:
 *   VERIFIER_ACCOUNTS='[{"user":"caja-trujillo","pass":"xxxx","entidad":"Caja Municipal Trujillo"}]'
 *
 * Sesion via cookie httpOnly con HMAC firmado (no requiere DB). 30 dias.
 */
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ecodrive_verifier_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export interface VerifierAccount {
  user: string;
  pass: string;
  entidad: string;
}

function getAccounts(): VerifierAccount[] {
  const raw = process.env.VERIFIER_ACCOUNTS;
  if (!raw) {
    // Fallback dev: cuenta hardcoded solo para desarrollo local
    if (process.env.NODE_ENV !== "production") {
      return [
        { user: "caja-trujillo", pass: "EcoDrive2026Trujillo", entidad: "Caja Municipal de Ahorro y Crédito de Trujillo S.A." },
      ];
    }
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as VerifierAccount[];
    return [];
  } catch {
    return [];
  }
}

function getCookieSecret(): string {
  const s = process.env.VERIFIER_COOKIE_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-do-not-use-in-prod";
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getCookieSecret()).update(payload).digest("hex");
}

export function authenticate(user: string, pass: string): VerifierAccount | null {
  const accounts = getAccounts();
  const match = accounts.find(
    (a) => a.user.trim().toLowerCase() === user.trim().toLowerCase() && a.pass === pass,
  );
  return match ?? null;
}

interface SessionToken {
  user: string;
  entidad: string;
  iat: number;
}

export async function createSession(account: VerifierAccount): Promise<void> {
  const token: SessionToken = {
    user: account.user,
    entidad: account.entidad,
    iat: Math.floor(Date.now() / 1000),
  };
  const payload = Buffer.from(JSON.stringify(token)).toString("base64url");
  const sig = sign(payload);
  const cookie = `${payload}.${sig}`;
  const store = await cookies();
  store.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionToken | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    const token = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionToken;
    if (typeof token.iat !== "number") return null;
    if (Math.floor(Date.now() / 1000) - token.iat > COOKIE_MAX_AGE) return null;
    return token;
  } catch {
    return null;
  }
}
