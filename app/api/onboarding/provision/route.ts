import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/activosya/db";
import { getActivo } from "@/lib/activos";

export const runtime = "nodejs";

/**
 * POST /api/onboarding/provision
 * Provisiona un tenant nuevo cuando un emprendedor compra/renta un activo.
 * Body: { tenant_name, slug, contact_email, contact_phone, asset_slug, mode: "rent"|"buy",
 *         monthly_fee_pen, lead_id?, custom_domain?, city? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const required = ["tenant_name", "slug", "contact_email", "asset_slug", "mode"];
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json({ ok: false, error: `${f} required` }, { status: 400 });
      }
    }

    const activo = getActivo(body.asset_slug);
    if (!activo) {
      return NextResponse.json({ ok: false, error: "asset_slug invalid" }, { status: 400 });
    }

    // 1. Crear tenant
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("ay_tenants")
      .insert({
        name: body.tenant_name,
        slug: body.slug,
        type: body.mode === "buy" ? "owner" : "operator",
        status: "provisioning",
        contact_email: body.contact_email,
        contact_phone: body.contact_phone || null,
        custom_domain: body.custom_domain || null,
        city: body.city || null,
        country: body.country || "PE",
      })
      .select("id, slug")
      .single();
    if (tErr) {
      return NextResponse.json({ ok: false, error: `tenant create failed: ${tErr.message}` }, { status: 500 });
    }

    // 2. Crear asset assignment
    const startDate = new Date().toISOString();
    const expiryDate =
      body.mode === "rent"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { data: asset, error: aErr } = await supabaseAdmin
      .from("ay_tenant_assets")
      .insert({
        tenant_id: tenant.id,
        asset_slug: body.asset_slug,
        mode: body.mode,
        monthly_fee_pen: body.mode === "rent" ? body.monthly_fee_pen : null,
        purchase_amount_pen: body.mode === "buy" ? body.purchase_amount_pen : null,
        status: "active",
        started_at: startDate,
        expires_at: expiryDate,
      })
      .select("id")
      .single();
    if (aErr) {
      return NextResponse.json({ ok: false, error: `asset assign failed: ${aErr.message}` }, { status: 500 });
    }

    // 3. Si vino de un lead, marcarlo convertido
    if (body.lead_id) {
      await supabaseAdmin
        .from("ay_b2b_leads")
        .update({ status: "converted", converted_at: startDate, tenant_id: tenant.id })
        .eq("id", body.lead_id);
    }

    // 4. Notificar admin via Twilio TuDestinoYa (canal correcto para messaging interno)
    try {
      const adminMsg =
        `🎉 *Nuevo tenant aprovisionado*\n\n` +
        `Activo: ${activo.name}\n` +
        `Modo: ${body.mode}\n` +
        `Tenant: ${body.tenant_name} (${body.slug})\n` +
        `Email: ${body.contact_email}\n` +
        (body.mode === "rent" ? `Renta: S/.${body.monthly_fee_pen}/mes\n` : `Compra: S/.${body.purchase_amount_pen}\n`) +
        (expiryDate ? `Vence: ${expiryDate.slice(0, 10)}\n` : "") +
        `\nPróximo paso: setup técnico (dominio + Twilio + branding)`;
      const TWILIO_SID = process.env.TWILIO_DESTINOYA_SID || "";
      const TWILIO_TOKEN = process.env.TWILIO_DESTINOYA_AUTH_TOKEN || "";
      if (TWILIO_TOKEN) {
        const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString("base64");
        const params = new URLSearchParams({
          From: "whatsapp:+51961347233",
          To: "whatsapp:+51998102258",
          Body: adminMsg,
        });
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          },
        );
      }
    } catch (e) {
      console.warn("notify admin failed:", e);
    }

    return NextResponse.json({
      ok: true,
      tenant_id: tenant.id,
      tenant_slug: tenant.slug,
      asset_id: asset.id,
      mode: body.mode,
      expires_at: expiryDate,
      next_steps: [
        "Configurar custom_domain DNS si compra",
        "Provisionar Twilio subaccount para WhatsApp del tenant",
        "Sembrar branding (logo, colores) en perfil del tenant",
        "Enviar credenciales de operador via email",
      ],
    });
  } catch (e) {
    console.error("provision error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
