// =====================================================================
// Ventana de Publicidad — Lector de Google Analytics 4 (Data API v1beta)
//
// Lee conversiones/tráfico de la web vía una cuenta de servicio.
// Firma su propio JWT (sin librerías de Google) y pide reportes.
//
// Env:
//   GA4_SERVICE_ACCOUNT_JSON  → el JSON completo de la cuenta de servicio
//   GA4_PROPERTY_ID           → ej. "537740523"
//
// Si no hay credenciales, las funciones devuelven null sin romper.
// =====================================================================
import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

type ServiceAccount = { client_email: string; private_key: string };

function getSA(): ServiceAccount | null {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (j.client_email && j.private_key) return j;
  } catch {
    /* ignore */
  }
  return null;
}

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

// Cache simple del access token en memoria del proceso.
let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(sa.private_key).toString("base64url")}`;

  try {
    const r = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const j = await r.json();
    if (!j.access_token) {
      console.warn("[marketing/ga4] token fail:", JSON.stringify(j).slice(0, 150));
      return null;
    }
    cachedToken = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    return j.access_token;
  } catch (e) {
    console.error("[marketing/ga4] token error:", (e as Error).message);
    return null;
  }
}

export type GA4Summary = {
  usuarios: number;
  sesiones: number;
  vistas: number;
  conversiones: number;
  porCanal: { canal: string; usuarios: number; sesiones: number }[];
  rango: string;
};

const num = (v: unknown) => Number(v) || 0;

/** Resumen de tráfico/conversiones de los últimos N días. null si no hay credenciales. */
export async function fetchGA4Summary(days = 28): Promise<GA4Summary | null> {
  const sa = getSA();
  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!sa || !propertyId) return null;
  const token = await getAccessToken(sa);
  if (!token) return null;

  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  try {
    // Totales
    const totRes = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        dateRanges,
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "conversions" },
        ],
      }),
    });
    const tot = await totRes.json();
    if (tot.error) {
      console.warn("[marketing/ga4] runReport:", tot.error.message?.slice(0, 100));
      return null;
    }
    const mv = tot.rows?.[0]?.metricValues ?? [];

    // Por canal de adquisición
    const chRes = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        dateRanges,
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 8,
      }),
    });
    const ch = await chRes.json();
    const porCanal = (ch.rows ?? []).map((r: any) => ({
      canal: r.dimensionValues?.[0]?.value ?? "—",
      usuarios: num(r.metricValues?.[0]?.value),
      sesiones: num(r.metricValues?.[1]?.value),
    }));

    return {
      usuarios: num(mv[0]?.value),
      sesiones: num(mv[1]?.value),
      vistas: num(mv[2]?.value),
      conversiones: num(mv[3]?.value),
      porCanal,
      rango: `últimos ${days} días`,
    };
  } catch (e) {
    console.error("[marketing/ga4] fetch error:", (e as Error).message);
    return null;
  }
}
