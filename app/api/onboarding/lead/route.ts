import { NextRequest, NextResponse } from "next/server";
import { createB2BLead, type B2BLead } from "@/lib/activosya/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<B2BLead>;

    if (!body.name || !body.email) {
      return NextResponse.json(
        { ok: false, error: "name and email are required" },
        { status: 400 },
      );
    }

    const url = new URL(req.url);
    const lead: B2BLead = {
      name: body.name,
      email: body.email,
      whatsapp: body.whatsapp,
      asset_interest: body.asset_interest,
      budget_range: body.budget_range,
      timing: body.timing,
      notes: body.notes,
      source: body.source || "web_form",
      utm_source: body.utm_source ?? url.searchParams.get("utm_source") ?? undefined,
      utm_medium: body.utm_medium ?? url.searchParams.get("utm_medium") ?? undefined,
      utm_campaign:
        body.utm_campaign ?? url.searchParams.get("utm_campaign") ?? undefined,
    };

    const result = await createB2BLead(lead);
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    console.error("onboarding/lead error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
