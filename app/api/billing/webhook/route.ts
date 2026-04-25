/**
 * POST /api/billing/webhook
 * Stripe webhook receiver — keeps mse_users.plan in sync with subscription state.
 *
 * Configure in Stripe Dashboard → Developers → Webhooks:
 *   URL: https://humaniapp.vercel.app/api/billing/webhook
 *   Events: customer.subscription.created, customer.subscription.updated,
 *           customer.subscription.deleted, checkout.session.completed
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/miss-sofia-voice/stripe";
import { getServiceClient } from "@/lib/miss-sofia-voice/auth";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid signature: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;
      if (userId && plan) {
        await supabase
          .from("mse_users")
          .update({ plan, stripe_customer_id: session.customer as string })
          .eq("id", userId);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      const plan = sub.metadata?.plan;
      if (userId && plan) {
        const newPlan = sub.status === "active" || sub.status === "trialing" ? plan : "free";
        await supabase.from("mse_users").update({ plan: newPlan }).eq("id", userId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await supabase.from("mse_users").update({ plan: "free" }).eq("id", userId);
      }
      break;
    }

    default:
      // ignore other events
      break;
  }

  return NextResponse.json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
