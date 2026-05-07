import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Cliente ─────────────────────────────────────────────
export async function getOrCreateCliente(celular: string, nombre?: string) {
  const { data: existing } = await supabase
    .from("destinoya_clientes")
    .select("*")
    .eq("celular", celular)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("destinoya_clientes")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", existing.id);
    return existing;
  }

  const { data: nuevo } = await supabase
    .from("destinoya_clientes")
    .insert({ celular, nombre: nombre || null })
    .select()
    .single();
  return nuevo;
}

// ─── Conversación ────────────────────────────────────────
export async function getConversacion(celular: string) {
  const { data } = await supabase
    .from("destinoya_conversaciones")
    .select("*")
    .eq("celular", celular)
    .maybeSingle();
  return data;
}

export async function upsertConversacion(
  celular: string,
  data: Record<string, unknown>
) {
  const { data: result } = await supabase
    .from("destinoya_conversaciones")
    .upsert({ celular, ...data, updated_at: new Date().toISOString() }, { onConflict: "celular" })
    .select()
    .single();
  return result;
}

// ─── VIP ────────────────────────────────────────────────
export async function esVIP(celular: string): Promise<boolean> {
  const { data } = await supabase
    .from("destinoya_vip")
    .select("fecha_vencimiento, activo")
    .eq("celular", celular)
    .eq("activo", true)
    .maybeSingle();

  if (!data) return false;
  return new Date(data.fecha_vencimiento) > new Date();
}

export async function activarVIP(celular: string, plan: "mensual" | "anual") {
  const dias = plan === "anual" ? 365 : 30;
  const fechaVenc = new Date();
  fechaVenc.setDate(fechaVenc.getDate() + dias);

  const { data } = await supabase
    .from("destinoya_vip")
    .upsert(
      {
        celular,
        plan,
        fecha_inicio: new Date().toISOString(),
        fecha_vencimiento: fechaVenc.toISOString(),
        activo: true,
      },
      { onConflict: "celular" }
    )
    .select()
    .single();
  return data;
}

// ─── Lectura Gratuita ────────────────────────────────────
export async function yaUsoGratuita(celular: string): Promise<boolean> {
  const { data } = await supabase
    .from("destinoya_lectura_gratuita")
    .select("id")
    .eq("celular", celular)
    .maybeSingle();
  return !!data;
}

export async function marcarGratuitaUsada(celular: string) {
  await supabase
    .from("destinoya_lectura_gratuita")
    .upsert({ celular }, { onConflict: "celular" });
}

// ─── Pagos ──────────────────────────────────────────────
export async function registrarPagoPendiente(pago: {
  celular: string;
  monto: number;
  servicio: string;
  temas?: string;
  nombre1?: string;
  fecha1?: string;
  nombre2?: string;
  fecha2?: string;
}) {
  const { data } = await supabase
    .from("destinoya_pagos")
    .insert({ ...pago, estado: "esperando_pago" })
    .select()
    .single();
  return data;
}

export async function buscarPagoPendientePorCelular(celular: string) {
  const { data } = await supabase
    .from("destinoya_pagos")
    .select("*")
    .eq("celular", celular)
    .eq("estado", "esperando_pago")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function buscarPagoPendientePorMonto(monto: number, ventanaMinutos = 60) {
  const desde = new Date(Date.now() - ventanaMinutos * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("destinoya_pagos")
    .select("*")
    .eq("monto", monto)
    .eq("estado", "esperando_pago")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function acumularPago(pagoId: string, montoYape: number, operacion: string) {
  const { data: pago } = await supabase
    .from("destinoya_pagos")
    .select("monto, monto_pagado")
    .eq("id", pagoId)
    .single();

  const nuevoMontoPagado = parseFloat(pago.monto_pagado || 0) + montoYape;
  const update: Record<string, unknown> = {
    monto_pagado: nuevoMontoPagado,
    operacion,
  };

  if (nuevoMontoPagado >= parseFloat(pago.monto)) {
    update.estado = "pago_confirmado";
  }

  const { data } = await supabase
    .from("destinoya_pagos")
    .update(update)
    .eq("id", pagoId)
    .select()
    .single();
  return data;
}

// ─── Saldo ───────────────────────────────────────────────
export async function getSaldo(celular: string): Promise<number> {
  const { data } = await supabase
    .from("destinoya_saldo")
    .select("monto")
    .eq("celular", celular)
    .maybeSingle();
  return data ? parseFloat(data.monto) : 0;
}

export async function agregarSaldo(
  celular: string,
  monto: number,
  motivo: string,
  pagoId?: string
) {
  const actual = await getSaldo(celular);
  const nuevo = actual + monto;

  await supabase
    .from("destinoya_saldo")
    .upsert(
      { celular, monto: nuevo, updated_at: new Date().toISOString() },
      { onConflict: "celular" }
    );

  await supabase.from("destinoya_saldo_movimientos").insert({
    celular,
    tipo: "credito",
    monto,
    motivo,
    pago_id: pagoId,
  });

  return nuevo;
}

export async function debitarSaldo(
  celular: string,
  monto: number,
  motivo: string,
  pagoId?: string
) {
  const actual = await getSaldo(celular);
  if (actual < monto) {
    throw new Error(`Saldo insuficiente. Tienes S/${actual}, necesitas S/${monto}`);
  }
  const nuevo = actual - monto;

  await supabase
    .from("destinoya_saldo")
    .upsert(
      { celular, monto: nuevo, updated_at: new Date().toISOString() },
      { onConflict: "celular" }
    );

  await supabase.from("destinoya_saldo_movimientos").insert({
    celular,
    tipo: "debito",
    monto,
    motivo,
    pago_id: pagoId,
  });

  return nuevo;
}

export async function buscarPagoReciente(celular: string) {
  const { data } = await supabase
    .from("destinoya_pagos")
    .select("*")
    .eq("celular", celular)
    .in("estado", ["pago_confirmado", "consulta_recibida_sin_sustento"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function actualizarEstadoPago(
  pagoId: string,
  estado: string
) {
  await supabase
    .from("destinoya_pagos")
    .update({ estado })
    .eq("id", pagoId);
}

// ─── Lecturas / Consultas ───────────────────────────────
export async function guardarLectura(
  celular: string,
  servicio: string,
  lectura: string
) {
  await supabase.from("destinoya_lecturas").insert({
    celular,
    servicio,
    lectura,
  });
}

// ─── Reconsultas ────────────────────────────────────────
export async function contarReconsultas(pagoId: string): Promise<number> {
  const { count } = await supabase
    .from("destinoya_reconsultas")
    .select("*", { count: "exact", head: true })
    .eq("pago_id", pagoId);
  return count || 0;
}

export async function guardarReconsulta(
  celular: string,
  pagoId: string,
  servicio: string,
  pregunta: string,
  respuesta: string
) {
  await supabase.from("destinoya_reconsultas").insert({
    celular,
    pago_id: pagoId,
    servicio,
    pregunta,
    respuesta,
  });
}
