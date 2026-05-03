import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/operadores/lead-captura
// Body: { nombre, telefono, email?, ciudad?, activo_interes?, plan_interes?, comentario?, utm_* }
// Captura un lead de operador desde la landing /se-operador
// y le envía mensaje de bienvenida por WhatsApp.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { nombre, telefono, email, ciudad, activo_interes, plan_interes, comentario, fuente, utm_campaign, utm_source, utm_medium } = body;

    if (!nombre || !telefono) {
      return NextResponse.json({ error: "nombre y telefono requeridos" }, { status: 400 });
    }

    // Normalizar teléfono
    const phoneClean = String(telefono).replace(/\D/g, "");
    const phoneFinal = phoneClean.startsWith("51") ? phoneClean : "51" + phoneClean;
    if (!/^51\d{9}$/.test(phoneFinal)) {
      return NextResponse.json({ error: "Teléfono inválido. Formato: 9XXXXXXXX" }, { status: 400 });
    }

    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Insertar lead
    const { data: lead, error } = await sb
      .from("operadores_leads")
      .insert({
        nombre,
        telefono: phoneFinal,
        email,
        ciudad,
        activo_interes: activo_interes || "miss-sofia",
        plan_interes: plan_interes || "no-decidido",
        comentario,
        fuente: fuente || "web",
        utm_campaign,
        utm_source,
        utm_medium,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enviar WhatsApp de bienvenida usando token Meta Cloud (canal EcoDrive+ por ahora, el más genérico)
    const META_PHONE = "1044803088721236";
    const META_TOKEN = process.env.ECODRIVE_META_ACCESS_TOKEN || "";

    const msg =
      `¡Hola ${nombre}! 👋\n\n` +
      `Recibimos tu interés de ser operador *Miss Sofia* en ActivosYA.\n\n` +
      `Te explico el modelo en 3 puntos:\n\n` +
      `📚 Vendes acceso a Sofia (curso de inglés con IA) en tu zona\n` +
      `💰 Tus alumnos pagan a TU Yape directo\n` +
      `📈 Tú renta mensual fija a nosotros, ganancia neta tuya: S/. 1,800-4,500/mes\n\n` +
      `Te contactaré en menos de 24h para resolver tus dudas y empezar.\n\n` +
      `🌐 activosya.com/se-operador\n\n` +
      `_Equipo ActivosYA_`;

    let waSent = false;
    try {
      const r = await fetch(`https://graph.facebook.com/v22.0/${META_PHONE}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneFinal,
          type: "text",
          text: { body: msg },
        }),
      });
      if (r.ok) {
        const data = await r.json();
        const wamid = data?.messages?.[0]?.id;
        await sb.from("operadores_leads").update({ whatsapp_msg_id: wamid }).eq("id", lead.id);
        waSent = true;
      }
    } catch {}

    // Notificar a Percy admin
    try {
      const adminMsg =
        `🎯 *Nuevo lead operador*\n\n` +
        `Nombre: ${nombre}\n` +
        `Teléfono: ${phoneFinal}\n` +
        `Ciudad: ${ciudad || "—"}\n` +
        `Activo: ${activo_interes || "miss-sofia"}\n` +
        `Plan: ${plan_interes || "no-decidido"}\n` +
        `Fuente: ${fuente || "web"}\n` +
        `${comentario ? `Comentario: ${comentario}\n` : ""}` +
        `\nLead ID: ${lead.id}`;
      await fetch(`https://graph.facebook.com/v22.0/${META_PHONE}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: "51998102258",
          type: "text",
          text: { body: adminMsg },
        }),
      });
    } catch {}

    return NextResponse.json({ ok: true, lead_id: lead.id, whatsapp_enviado: waSent });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
