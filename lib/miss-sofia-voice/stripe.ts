/**
 * Stripe client + plan definitions.
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
  return _stripe;
}

export type PlanId = "pro" | "elite";

export const PLANS: Record<PlanId, { name: string; pricePEN: number; priceIdEnv: string }> = {
  pro: {
    name: "Miss Sofia Pro",
    pricePEN: 49,
    priceIdEnv: "STRIPE_PRICE_PRO",
  },
  elite: {
    name: "Miss Sofia Elite",
    pricePEN: 99,
    priceIdEnv: "STRIPE_PRICE_ELITE",
  },
};

export function getPriceId(plan: PlanId): string {
  const id = process.env[PLANS[plan].priceIdEnv];
  if (!id) throw new Error(`${PLANS[plan].priceIdEnv} not set in env`);
  return id;
}
