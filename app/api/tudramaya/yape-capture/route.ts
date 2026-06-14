/**
 * POST /api/tudramaya/yape-capture  (multipart/form-data)
 *
 * El cliente sube la captura del Yape; Claude Vision (reusado de TuCuentoYa)
 * valida monto + destinatario + operación. Si el monto coincide con el tier,
 * se registra el pago y se otorga el acceso.
 *
 * Campos: captura (File), user_id, serie_id, tier, episodio?, celular?
 *
 * Nota: el Yape también puede confirmarse solo vía MacroDroid (sin captura);
 * esta ruta es el respaldo manual cuando el auto-detect no llega.
 */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/tudramaya/db";
import { otorgarAcceso } from "@/lib/tudramaya/accesos";
import { PRECIOS, type Tier } from "@/lib/tudramaya/precios";
import { verificarCapturaYape } from "@/lib/cuentoinfantil/yape-verify";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("captura") as File | null;
    const user_id = (form.get("user_id") as string | null) || null;
    const serie_id = (form.get("serie_id") as string | null) || null;
    const tier = (form.get("tier") as string | null) || null;
    const celular = (form.get("celular") as string | null) || null;
    const episodioRaw = (form.get("episodio") as string | null) || null;
    const episodio = episodioRaw ? parseInt(episodioRaw, 10) : null;

    if (!file) return NextResponse.json({ error: "captura requerida" }, { status: 400 });
    if (!serie_id) return NextResponse.json({ error: "serie_id requerido" }, { status: 400 });
    if (!tier || !(tier in PRECIOS)) return NextResponse.json({ error: "tier inválido" }, { status: 400 });

    const esperado = PRECIOS[tier as Tier];
    const buf = Buffer.from(await file.arrayBuffer());

    // Validar la captura con Claude Vision
    const res = await verificarCapturaYape(buf, file.type || "image/jpeg");
    if (!res.detectado) {
      return NextResponse.json({ ok: false, error: res.motivo_rechazo ?? "La captura no es un Yape válido." }, { status: 422 });
    }
    if (res.destinatario_ok === false) {
      return NextResponse.json({ ok: false, error: "El Yape no fue enviado al número correcto." }, { status: 422 });
    }
    if (res.monto == null || Math.abs(res.monto - esperado) > 0.5) {
      return NextResponse.json(
        { ok: false, error: `El monto de la captura (S/${res.monto ?? "?"}) no coincide con S/${esperado}.` },
        { status: 422 }
      );
    }

    // Idempotencia por número de operación
    if (res.referencia) {
      const { data: ya } = await supabase
        .from("tdy_pagos")
        .select("id")
        .eq("referencia", res.referencia)
        .limit(1)
        .maybeSingle();
      if (ya) {
        return NextResponse.json({ ok: true, ya_procesado: true });
      }
    }

    // Registrar el pago validado
    const { data: pago } = await supabase
      .from("tdy_pagos")
      .insert({
        user_id,
        celular,
        serie_id,
        tier,
        episodio,
        monto_esperado: esperado,
        monto_pagado: res.monto,
        metodo: "yape",
        estado: "validado",
        referencia: res.referencia ?? null,
        validado_por: "claude_vision",
        validado: true,
        validado_at: new Date().toISOString(),
        metadata: { fecha_yape: res.fecha ?? null },
      })
      .select("id")
      .single();

    // Otorgar el acceso
    if (user_id) {
      await otorgarAcceso({
        userId: user_id,
        serieId: serie_id,
        tier: tier as Tier,
        episodio,
        origen: "yape",
        pagoId: pago?.id ?? null,
      });
    }

    return NextResponse.json({ ok: true, tier, referencia: res.referencia ?? null });
  } catch (e) {
    console.error("tudramaya yape-capture error:", e);
    return NextResponse.json({ error: "server_error", message: (e as Error).message }, { status: 500 });
  }
}
