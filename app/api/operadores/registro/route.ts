import { NextRequest, NextResponse } from "next/server";
import {
  registrarOperador,
  validarDNI,
  normalizarTelefonoPE,
  PLANES,
  ACTIVOS_FRANQUICIABLES,
  YAPE_PERCY,
  type Plan,
  type ActivoSlug,
} from "@/lib/activosya/operadores";

const META_PHONE_ID = "1044803088721236"; // EcoDrive+ canal genérico para outbound de plataforma
const META_TOKEN = process.env.ECODRIVE_META_ACCESS_TOKEN || "";
const ADMIN_PHONE = "51998102258"; // Percy

async function sendWhatsApp(to: string, body: string): Promise<string | null> {
  if (!META_TOKEN) return null;
  try {
    const r = await fetch(`https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    if (!r.ok) {
      console.error("[registro WA send err]", await r.text());
      return null;
    }
    const j = await r.json();
    return j?.messages?.[0]?.id ?? null;
  } catch (e) {
    console.error("[registro WA send exception]", (e as Error).message);
    return null;
  }
}

/**
 * POST /api/operadores/registro
 *
 * Registro completo del operador franquicia. Tras completar este registro,
 * el operador queda en pending_onboarding hasta que pague la renta a Yape Percy
 * y MacroDroid lo detecte (via /api/destinoya/madrodroid → activación auto).
 *
 * Body:
 *   nombre, dni, whatsapp_personal, email?, ciudad,
 *   yape_numero (donde COBRA al alumno),
 *   plan: "local" | "comunidad" | "lider",
 *   activo: "tudestinoya" | "miss-sofia",
 *   lead_id?: number
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      nombre,
      dni,
      whatsapp_personal,
      email,
      ciudad,
      yape_numero,
      plan,
      activo,
      lead_id,
    } = body;

    // Validaciones
    if (!nombre || nombre.trim().length < 3) {
      return NextResponse.json({ error: "Nombre completo requerido" }, { status: 400 });
    }
    if (!validarDNI(dni)) {
      return NextResponse.json({ error: "DNI inválido (debe tener 8 dígitos)" }, { status: 400 });
    }
    if (!normalizarTelefonoPE(whatsapp_personal)) {
      return NextResponse.json({ error: "WhatsApp inválido (formato 9XXXXXXXX)" }, { status: 400 });
    }
    if (!normalizarTelefonoPE(yape_numero)) {
      return NextResponse.json({ error: "Yape inválido (formato 9XXXXXXXX)" }, { status: 400 });
    }
    if (!ciudad || ciudad.trim().length < 2) {
      return NextResponse.json({ error: "Ciudad requerida" }, { status: 400 });
    }
    if (!PLANES[plan as Plan]) {
      return NextResponse.json({ error: "Plan inválido (local|comunidad|lider)" }, { status: 400 });
    }
    if (!ACTIVOS_FRANQUICIABLES[activo as ActivoSlug]) {
      return NextResponse.json({ error: "Activo inválido (tudestinoya|miss-sofia)" }, { status: 400 });
    }

    // Crear operador (status pending_onboarding)
    const result = await registrarOperador({
      nombre: nombre.trim(),
      dni,
      whatsapp_personal,
      email: email?.trim() || null,
      ciudad: ciudad.trim(),
      yape_numero,
      plan: plan as Plan,
      activo: activo as ActivoSlug,
      lead_id: lead_id ?? null,
    });

    const planInfo = PLANES[plan as Plan];
    const activoInfo = ACTIVOS_FRANQUICIABLES[activo as ActivoSlug];
    const whatsappFinal = normalizarTelefonoPE(whatsapp_personal)!;

    // WhatsApp al operador con instrucciones de pago
    const opMsg =
      `🎉 *¡Bienvenido a ActivosYA, ${nombre.split(" ")[0]}!*\n\n` +
      `Tu cuenta de operador franquicia está casi lista. Solo falta tu primera renta:\n\n` +
      `${activoInfo.icon} *Activo:* ${activoInfo.name}\n` +
      `📦 *Plan:* ${planInfo.label} (${planInfo.max_alumnos} alumnos)\n` +
      `💰 *Renta mensual:* S/. ${planInfo.precio_pen}\n\n` +
      `*Para activar tu cuenta hazlo HOY:*\n` +
      `1️⃣ Yapea *S/. ${planInfo.precio_pen}* a:\n` +
      `   📱 *${YAPE_PERCY}*\n` +
      `   👤 Percy R.\n\n` +
      `2️⃣ En el detalle del Yape escribe tu primer nombre: *${nombre.split(" ")[0].toUpperCase()}*\n\n` +
      `3️⃣ En cuanto detectemos tu pago (1-2 minutos) te llegará un mensaje con:\n` +
      `   ✅ Tu link único de referidos\n` +
      `   ✅ Tu webhook MacroDroid\n` +
      `   ✅ Material de marketing listo para usar\n` +
      `   ✅ Acceso a tu panel de operador\n\n` +
      `_Esta renta se cobra el día 1 de cada mes. Cancela cuando quieras._\n\n` +
      `🚀 ActivosYA — Franquicia Digital`;

    const wamid = await sendWhatsApp(whatsappFinal, opMsg);

    // Notificar a Percy
    const adminMsg =
      `🆕 *Nuevo operador registrado — esperando pago*\n\n` +
      `Nombre: ${nombre}\n` +
      `DNI: ${dni}\n` +
      `WhatsApp: ${whatsappFinal}\n` +
      `Yape (cobra alumnos): ${normalizarTelefonoPE(yape_numero)}\n` +
      `Ciudad: ${ciudad}\n` +
      `Plan: ${planInfo.label} — S/. ${planInfo.precio_pen}\n` +
      `Activo: ${activoInfo.name}\n\n` +
      `Referral: ${result.referral_code}\n` +
      `Operador ID: ${result.operador_id}\n\n` +
      `_Esperando Yape S/. ${planInfo.precio_pen} en tu 998 102 258 con detalle "${nombre.split(" ")[0].toUpperCase()}"._`;

    await sendWhatsApp(ADMIN_PHONE, adminMsg);

    return NextResponse.json({
      ok: true,
      operador_id: result.operador_id,
      referral_code: result.referral_code,
      monto_renta_pen: result.monto_renta_pen,
      yape_destino: YAPE_PERCY,
      whatsapp_enviado: !!wamid,
      mensaje:
        `Cuenta creada. Yapea S/. ${planInfo.precio_pen} a ${YAPE_PERCY} ` +
        `con tu nombre como referencia para activar.`,
    });
  } catch (e: unknown) {
    const msg = (e as Error).message || "Error";
    console.error("[/api/operadores/registro]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
