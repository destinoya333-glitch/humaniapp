/**
 * POST /api/billing/checkout
 * Body: { plan: "pro" | "elite" }
 * Creates a Stripe Checkout session and returns the URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser, getServiceClient } from "@/lib/miss-sofia-voice/auth";
import { getPriceId, getStripe, PlanId, PLANS } from "@/lib/miss-sofia-voice/stripe";

export async function POST(req: NextRequest) {
  const authed = await getAuthedUser();
  if (!authed) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const { plan } = await req.json();
  if (!plan || !(plan in PLANS)) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const stripe = getStripe();
  const supabase = getServiceClient();

  // Find or create Stripe customer
  const { data: dbUser } = await supabase
    .from("mse_users")
    .select("id, email, name, stripe_customer_id")
    .eq("id", authed.id)
    .single();

  let customerId = dbUser?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser?.email ?? authed.email,
      name: dbUser?.name ?? undefined,
      metadata: { user_id: authed.id },
    });
    customerId = customer.id;
    await supabase
      .from("mse_users")
      .update({ stripe_customer_id: customerId })
      .eq("id", authed.id);
  }

  const origin = req.nextUrl.origin;
  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: getPriceId(plan as PlanId), quantity: 1 }],
    success_url: `${origin}/sofia-chat?upgraded=1`,
    cancel_url: `${origin}/upgrade?canceled=1`,
    metadata: { user_id: authed.id, plan },
    subscription_data: {
      metadata: { user_id: authed.id, plan },
    },
  });

  return NextResponse.json({ url: checkout.url });
}
