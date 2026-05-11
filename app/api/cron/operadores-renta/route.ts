/**
 * GET /api/cron/operadores-renta
 *
 * Vercel cron diario (configurado en vercel.json @ 9:00 UTC = 4:00 AM Lima).
 *
 * Ciclo de vida de la renta del operador franquicia:
 *   - T-3 días antes:  recordatorio temprano por WhatsApp
 *   - T0 día vencimiento: aviso urgente "yapea hoy"
 *   - T+7 vencida:     suspensión automática (status='paused')
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`
 *       Vercel lo envía automáticamente si CRON_SECRET está en env vars.
 *
 * El job es idempotente: si ya envió el T-3 hoy, no lo manda otra vez.
 * El control se hace por la fecha_proxima_renta que comparamos contra hoy.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const META_PHONE_ID = "1044803088721236"; // EcoDrive+ canal genérico de plataforma
const META_TOKEN = process.env.ECODRIVE_META_ACCESS_TOKEN || "";
const ADMIN_WA = "51998102258";
const YAPE_PERCY = "998 102 258";

// Suspensión: cuántos días después de la fecha_proxima_renta sin pago se suspende.
const DIAS_GRACIA = 7;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function sendWA(to: string, body: string): Promise<void> {
  if (!META_TOKEN || !to) return;
  try {
    await fetch(`https://graph.facebook.com/v22.0/${META_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
  } catch (e) {
    console.error("[cron operadores-renta sendWA]", (e as Error).message);
  }
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    timeZone: "America/Lima",
  });
}

function dateOnlyISO(d: Date): string {
  // YYYY-MM-DD en hora Lima (UTC-5)
  const limaOffset = -5 * 60; // minutos
  const localMs = d.getTime() + (d.getTimezoneOffset() + limaOffset) * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hoy = new Date();
  const hoyStr = dateOnlyISO(hoy);
  const en3DiasStr = dateOnlyISO(addDays(hoy, 3));
  const limiteSuspensionStr = dateOnlyISO(addDays(hoy, -DIAS_GRACIA));

  const stats = {
    t_minus_3_enviados: 0,
    t_zero_enviados: 0,
    suspendidos: 0,
    errores: [] as string[],
  };

  // ─── T-3: recordatorio temprano (3 días antes del vencimiento) ──────────
  {
    const { data: operadores, error } = await supabase
      .from("ay_tenants")
      .select("id, name, whatsapp_personal, plan, monthly_fee_pen, fecha_proxima_renta")
      .eq("type", "operador")
      .eq("status", "active")
      .eq("fecha_proxima_renta", en3DiasStr);

    if (error) stats.errores.push(`t-3 query: ${error.message}`);

    for (const op of operadores || []) {
      const proxFmt = fmtDate(new Date(op.fecha_proxima_renta!));
      const msg =
        `🔔 *Recordatorio amistoso, ${op.name.split(" ")[0]}*\n\n` +
        `Tu renta de operador ActivosYA vence el *${proxFmt}* (en 3 días).\n\n` +
        `💰 Monto: *S/. ${op.monthly_fee_pen}*\n` +
        `📱 Yapea a: *${YAPE_PERCY}* (Percy R.)\n` +
        `📝 Detalle Yape: tu primer nombre\n\n` +
        `_En cuanto detectemos el pago, tu cuenta queda renovada 30 días más sin que tengas que avisarnos._\n\n` +
        `🚀 ActivosYA`;
      await sendWA(op.whatsapp_personal!, msg);
      stats.t_minus_3_enviados++;
    }
  }

  // ─── T0: día de vencimiento ─────────────────────────────────────────────
  {
    const { data: operadores, error } = await supabase
      .from("ay_tenants")
      .select("id, name, whatsapp_personal, plan, monthly_fee_pen, fecha_proxima_renta")
      .eq("type", "operador")
      .eq("status", "active")
      .eq("fecha_proxima_renta", hoyStr);

    if (error) stats.errores.push(`t0 query: ${error.message}`);

    for (const op of operadores || []) {
      const limite = fmtDate(addDays(hoy, DIAS_GRACIA));
      const msg =
        `⏰ *${op.name.split(" ")[0]}, hoy vence tu renta*\n\n` +
        `Tu renta mensual de S/. ${op.monthly_fee_pen} vence *HOY*.\n\n` +
        `Yapea ahora a:\n` +
        `📱 *${YAPE_PERCY}*\n` +
        `👤 Percy R.\n` +
        `📝 Detalle: tu primer nombre\n\n` +
        `Tienes ${DIAS_GRACIA} días de gracia (hasta el ${limite}). Si no detectamos el pago para esa fecha, tu cuenta se suspende automáticamente y tus alumnos dejan de poder usar el servicio.\n\n` +
        `_Si ya pagaste hoy, ignora este mensaje — el sistema confirma en 1-2 minutos cuando MacroDroid detecta tu Yape._`;
      await sendWA(op.whatsapp_personal!, msg);
      stats.t_zero_enviados++;
    }
  }

  // ─── T+gracia: suspensión automática ────────────────────────────────────
  {
    const { data: operadores, error } = await supabase
      .from("ay_tenants")
      .select("id, name, whatsapp_personal, plan, monthly_fee_pen, fecha_proxima_renta")
      .eq("type", "operador")
      .eq("status", "active")
      .lt("fecha_proxima_renta", limiteSuspensionStr);

    if (error) stats.errores.push(`suspension query: ${error.message}`);

    for (const op of operadores || []) {
      // Pausar tenant
      const { error: errUpd } = await supabase
        .from("ay_tenants")
        .update({
          status: "paused",
          suspended_at: new Date().toISOString(),
          suspended_reason: "renta_vencida_auto_cron",
        })
        .eq("id", op.id);

      if (errUpd) {
        stats.errores.push(`suspender ${op.id}: ${errUpd.message}`);
        continue;
      }

      // Pausar todos los assets del operador (status='paused')
      await supabase
        .from("ay_tenant_assets")
        .update({ status: "paused" })
        .eq("tenant_id", op.id);

      // Notificar al operador
      const venc = fmtDate(new Date(op.fecha_proxima_renta!));
      const msg =
        `🚨 *Cuenta suspendida automáticamente*\n\n` +
        `${op.name.split(" ")[0]}, no detectamos tu pago de renta vencida el ${venc}.\n\n` +
        `Tu cuenta queda *pausada*:\n` +
        `❌ Tus alumnos no pueden usar el servicio\n` +
        `❌ Tus links de referido siguen funcionando pero los nuevos clientes no son atendidos por el bot\n\n` +
        `*Para reactivarla:*\n` +
        `1️⃣ Yapea S/. ${op.monthly_fee_pen} a ${YAPE_PERCY}\n` +
        `2️⃣ El sistema te reactiva automáticamente al detectar el Yape\n` +
        `3️⃣ Si pasaron más de 30 días, escríbenos por WhatsApp para evaluar\n\n` +
        `_Tus alumnos que ya pagaron mantienen su acceso pendiente hasta tu reactivación._`;
      await sendWA(op.whatsapp_personal!, msg);

      stats.suspendidos++;
    }

    if (stats.suspendidos > 0) {
      await sendWA(
        ADMIN_WA,
        `🚨 *Cron renta — ${stats.suspendidos} operador(es) suspendidos hoy*\n\n` +
          `Por renta no pagada > ${DIAS_GRACIA} días.\n` +
          `Revisa /admin/operadores`,
      );
    }
  }

  // Resumen al admin si hubo actividad
  if (stats.t_minus_3_enviados + stats.t_zero_enviados + stats.suspendidos > 0 || stats.errores.length > 0) {
    await sendWA(
      ADMIN_WA,
      `📊 *Cron operadores-renta ejecutado*\n\n` +
        `T-3 enviados: ${stats.t_minus_3_enviados}\n` +
        `T0 enviados: ${stats.t_zero_enviados}\n` +
        `Suspendidos: ${stats.suspendidos}\n` +
        (stats.errores.length ? `❌ Errores: ${stats.errores.length}\n${stats.errores.slice(0, 3).join("\n")}` : ""),
    );
  }

  return NextResponse.json({
    ok: true,
    fecha: hoyStr,
    ...stats,
  });
}
