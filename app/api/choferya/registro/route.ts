import { NextRequest, NextResponse } from "next/server";
import {
  registrarChoferYa,
  PLANES_CHOFERYA,
  YAPE_PERCY,
  type PlanChoferYa,
} from "@/lib/activosya/choferya";
import { normalizarTelefonoPE } from "@/lib/activosya/operadores";

// Canal usado para outbound mientras el chip TuChoferYa propio no esté live.
// Cuando META_CHOFERYA_PHONE_ID exista, conmutamos a ése.
const META_TOKEN =
  process.env.META_CHOFERYA_ACCESS_TOKEN || process.env.ECODRIVE_META_ACCESS_TOKEN || "";
const META_PHONE_ID =
  process.env.META_CHOFERYA_PHONE_ID || "1044803088721236"; // fallback genérico mientras se configura phone propio
const ADMIN_PHONE = "51998102258";

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
      console.error("[choferya/registro WA send err]", await r.text());
      return null;
    }
    const j = await r.json();
    return j?.messages?.[0]?.id ?? null;
  } catch (e) {
    console.error("[choferya/registro WA send exception]", (e as Error).message);
    return null;
  }
}

async function sendChoferInscriptionInvite(waId: string, plan: string): Promise<void> {
  // Hasta que tengamos flow Meta propio TuChoferYa para inscripcion, el equipo
  // toma manualmente los documentos del chofer. Mensaje neutro sin mencion a
  // otras marcas.
  const msg =
    `🚖 *Bienvenido a TuChoferYa*\n\n` +
    `Recibimos tu solicitud para el *Plan ${plan.toUpperCase()}*. Para activar tu cuenta necesitamos verificar tu identidad y documentos:\n\n` +
    `📄 DNI vigente (foto frontal)\n` +
    `🪪 Licencia de conducir vigente\n` +
    `📋 SOAT del vehículo en regla\n` +
    `🚗 Foto del auto con placa visible\n` +
    `🤳 Selfie tuya\n\n` +
    `*Envía las 5 fotos por este mismo chat.* Cuando estén las 5, nuestro equipo las verifica y activamos tu cuenta TuChoferYa al instante.\n\n` +
    `Tiempo estimado de respuesta: *menos de 1 hora* en horario laboral (8am-10pm Lima).\n\n` +
    `🚀 TuChoferYa — Tu propia agencia de taxi`;
  await sendWhatsApp(waId, msg);
}

/**
 * POST /api/choferya/registro
 *
 * Body:
 *   wa_id  · 9XXXXXXXX o 51XXXXXXXXX
 *   plan   · "basico" | "pro" | "elite"
 *   slug?  · ej "carlos-trujillo" (si no, se genera del nombre)
 *   bio?   · texto libre
 *   zonas? · ["Trujillo Centro","Huanchaco"]
 *
 * Flujo:
 *   1. Si el chofer NO está en eco_choferes (o no aprobado) → dispara
 *      template flow inscripción y responde `requires_inscription:true`.
 *   2. Si está aprobado → crea tenant en pending_onboarding + WhatsApp
 *      con instrucciones Yape S/.39/79/149.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { wa_id, plan, slug, bio, zonas } = body as {
      wa_id?: string;
      plan?: string;
      slug?: string;
      bio?: string;
      zonas?: string[];
    };

    const waNorm = normalizarTelefonoPE(wa_id || "");
    if (!waNorm) {
      return NextResponse.json({ error: "WhatsApp inválido (formato 9XXXXXXXX)" }, { status: 400 });
    }
    if (!plan || !PLANES_CHOFERYA[plan as PlanChoferYa]) {
      return NextResponse.json({ error: "Plan inválido (basico|pro|elite)" }, { status: 400 });
    }

    const result = await registrarChoferYa({
      wa_id: waNorm,
      plan: plan as PlanChoferYa,
      slug,
      bio,
      zonas,
    });

    // Caso 1: chofer no existe / no aprobado → instrucciones inscripción
    if (result.requires_inscription) {
      await sendChoferInscriptionInvite(waNorm, plan as PlanChoferYa);
      return NextResponse.json({
        ok: true,
        requires_inscription: true,
        reason: result.reason,
        message: result.message,
      });
    }

    // Caso 2: ya aprobado → mensaje pago renta
    const planInfo = PLANES_CHOFERYA[plan as PlanChoferYa];
    const primerNombre = (result.nombre || "Chofer").split(" ")[0];
    const opMsg =
      `🚖 *¡Bienvenido a TuChoferYa, ${primerNombre}!*\n\n` +
      `Tu cuenta está casi lista. Solo falta tu primera renta:\n\n` +
      `📦 *Plan ${planInfo.label}* — S/. ${planInfo.precio_pen}/mes\n` +
      `🔗 Tu página: chofer.activosya.com/c/${result.slug}\n\n` +
      `*Activa HOY:*\n` +
      `1️⃣ Yapea *S/. ${planInfo.precio_pen}* a:\n` +
      `   📱 *${YAPE_PERCY}*\n` +
      `   👤 Percy R.\n\n` +
      `2️⃣ En el detalle escribe: *TuChoferYa*\n\n` +
      `3️⃣ En 1-2 min te llegará:\n` +
      `   ✅ Tu link al panel\n` +
      `   ✅ Tu QR para pasajeros\n` +
      `   ✅ Tarjeta digital\n` +
      `   ✅ Acceso al editor de precios y horarios\n\n` +
      `_Sin contratos. Cancela cuando quieras. Tus pasajeros te pagan 100% directo a tu Yape._\n\n` +
      `🚀 TuChoferYa — Tu propia agencia de taxi`;

    const wamid = await sendWhatsApp(waNorm, opMsg);

    // Notif Percy
    const adminMsg =
      `🆕 *Nuevo chofer TuChoferYa — esperando pago*\n\n` +
      `Nombre: ${result.nombre}\n` +
      `WhatsApp: ${waNorm}\n` +
      `Plan: ${planInfo.label} — S/. ${planInfo.precio_pen}\n` +
      `Slug: ${result.slug}\n\n` +
      `_Esperando Yape S/. ${planInfo.precio_pen} en 998 102 258 con detalle "TuChoferYa"._`;

    // Notif a Percy via ActivosYA central
    try {
      const { notifyActivosYA } = await import("@/lib/activosya-central/notify");
      await notifyActivosYA({
        tipo: "lead_b2b",
        servicio: "choferya",
        cliente_nombre: result.nombre,
        cliente_phone: waNorm,
        detalle: { plan: planInfo.label, precio: planInfo.precio_pen, slug: result.slug, estado: "esperando_yape" },
      });
    } catch (e) {
      // fallback legacy
      await sendWhatsApp(ADMIN_PHONE, adminMsg);
    }

    return NextResponse.json({
      ok: true,
      requires_inscription: false,
      chofer_id: result.chofer_id,
      tenant_id: result.tenant_id,
      slug: result.slug,
      monto_renta_pen: result.monto_renta_pen,
      yape_destino: YAPE_PERCY,
      whatsapp_enviado: !!wamid,
      mensaje: `Cuenta creada. Yapea S/. ${planInfo.precio_pen} a ${YAPE_PERCY} con detalle "TuChoferYa" para activar.`,
    });
  } catch (e: unknown) {
    const msg = (e as Error).message || "Error";
    console.error("[/api/choferya/registro]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
