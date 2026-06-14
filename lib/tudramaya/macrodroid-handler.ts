/**
 * TuDramaYa — handler MacroDroid para auto-detectar el Yape.
 *
 * Lo llama el router /api/destinoya/madrodroid cuando llega un Yape cuyo monto
 * corresponde a TuDramaYa (S/1, S/3.30, S/12). Se evalúa ANTES que TuCuentoYa
 * para que el S/3.30 no sea absorbido por la tolerancia ±0.50 del cuento.
 *
 * Matching: un pago `tdy_pagos` en estado 'pendiente' (método yape/macrodroid),
 * reciente (<20 min) y con monto_esperado igual al monto del Yape.
 * Idempotencia por número de operación.
 */
import { supabase } from "./db";
import { otorgarAcceso } from "./accesos";
import { MONTOS_TDY, type Tier } from "./precios";

export type ResultadoTDY = {
  matched: boolean;
  action?: string;
  user_id?: string | null;
  detail?: string;
};

type PagoPendiente = {
  id: string;
  user_id: string | null;
  serie_id: string;
  tier: Tier;
  episodio: number | null;
  monto_esperado: number;
};

export async function procesarYapeTuDramaYa(opts: {
  monto: number;
  operacion: string;
}): Promise<ResultadoTDY> {
  const { monto, operacion } = opts;

  // Solo montos de TuDramaYa
  if (!MONTOS_TDY.some((m) => Math.abs(m - monto) <= 0.05)) {
    return { matched: false };
  }

  // Idempotencia: si esta operación ya fue procesada, no cobrar de nuevo.
  if (operacion) {
    const { data: ya } = await supabase
      .from("tdy_pagos")
      .select("id")
      .eq("referencia", operacion)
      .limit(1)
      .maybeSingle();
    if (ya) return { matched: false };
  }

  // Buscar pago pendiente con ese monto, reciente.
  const desde = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { data: pendientes } = await supabase
    .from("tdy_pagos")
    .select("id, user_id, serie_id, tier, episodio, monto_esperado")
    .eq("estado", "pendiente")
    .in("metodo", ["yape", "macrodroid"])
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(20);

  const pago = (pendientes as PagoPendiente[] | null ?? []).find(
    (p) => Math.abs(Number(p.monto_esperado) - monto) <= 0.05
  );

  // Sin match estricto → dejar pasar al resto del router (no es de TuDramaYa).
  if (!pago) return { matched: false };

  // Validar el pago.
  await supabase
    .from("tdy_pagos")
    .update({
      estado: "validado",
      validado: true,
      validado_por: "macrodroid",
      validado_at: new Date().toISOString(),
      monto_pagado: monto,
      referencia: operacion,
      metodo: "macrodroid",
    })
    .eq("id", pago.id);

  // Otorgar el acceso.
  if (pago.user_id) {
    await otorgarAcceso({
      userId: pago.user_id,
      serieId: pago.serie_id,
      tier: pago.tier,
      episodio: pago.episodio,
      origen: "macrodroid",
      pagoId: pago.id,
    });
  }

  return {
    matched: true,
    action: "acceso_otorgado",
    user_id: pago.user_id,
    detail: `tier=${pago.tier}${pago.episodio ? ` cap=${pago.episodio}` : ""}`,
  };
}
