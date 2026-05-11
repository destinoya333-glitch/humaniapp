/**
 * TuCuentoYa — Capa de acceso a BD.
 *
 * Multi-tenant: tenantId opcional atribuye el cliente al operador franquicia
 * (NULL = cliente directo Percy / master).
 */
import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ═════════════════════════════════════════════════════════
// CLIENTES
// ═════════════════════════════════════════════════════════
export type Hijo = {
  nombre: string;
  edad?: number;
  genero?: "m" | "f" | "otro";
};

export type ClienteCuento = {
  id: string;
  celular: string;
  nombre?: string;
  nombre_papa?: string;
  rol?: "papa" | "mama" | "abuelo" | "abuela" | "tio" | "otro";
  nombres_hijos: Hijo[];
  plan: "gratis" | "suelto" | "estrella" | "magico";
  wallet_balance: number;
  cuentos_bonus_restantes: number;
  tenant_id?: string | null;
  created_at: string;
  last_seen: string;
};

export async function getOrCreateCliente(
  celular: string,
  tenantId?: string | null,
  nombre?: string,
): Promise<ClienteCuento> {
  const { data: existing } = await supabase
    .from("tci_clientes")
    .select("*")
    .eq("celular", celular)
    .maybeSingle();

  if (existing) {
    const update: Record<string, unknown> = { last_seen: new Date().toISOString() };
    if (tenantId && !existing.tenant_id) update.tenant_id = tenantId;
    await supabase.from("tci_clientes").update(update).eq("id", existing.id);
    return { ...existing, ...update };
  }

  const { data: nuevo } = await supabase
    .from("tci_clientes")
    .insert({
      celular,
      nombre: nombre || null,
      tenant_id: tenantId ?? null,
      nombres_hijos: [],
      plan: "gratis",
      wallet_balance: 0,
      cuentos_bonus_restantes: 0,
    })
    .select()
    .single();
  return nuevo;
}

export async function actualizarCliente(
  celular: string,
  patch: Partial<ClienteCuento>,
): Promise<void> {
  await supabase.from("tci_clientes").update(patch).eq("celular", celular);
}

// ═════════════════════════════════════════════════════════
// CONVERSACIÓN (máquina de estados)
// ═════════════════════════════════════════════════════════
export type EstadoConv =
  | "inicio"
  | "recolectando_hijo"
  | "recolectando_escenario"
  | "recolectando_duracion"
  | "confirmando_pedido"
  | "esperando_pago"
  | "generando"
  | "entregado";

export type Conversacion = {
  celular: string;
  estado: EstadoConv;
  contexto: Record<string, unknown>;
  ultimo_mensaje_at: string;
  updated_at: string;
};

export async function getConversacion(celular: string): Promise<Conversacion | null> {
  const { data } = await supabase
    .from("tci_conversaciones")
    .select("*")
    .eq("celular", celular)
    .maybeSingle();
  return data;
}

export async function upsertConversacion(
  celular: string,
  patch: Partial<Conversacion>,
): Promise<void> {
  await supabase.from("tci_conversaciones").upsert(
    {
      celular,
      ...patch,
      ultimo_mensaje_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "celular" },
  );
}

export async function resetConversacion(celular: string): Promise<void> {
  await supabase.from("tci_conversaciones").upsert(
    {
      celular,
      estado: "inicio",
      contexto: {},
      ultimo_mensaje_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "celular" },
  );
}

// ═════════════════════════════════════════════════════════
// PEDIDOS
// ═════════════════════════════════════════════════════════
export type Pedido = {
  id: string;
  cliente_id: string;
  celular: string;
  duracion_min: 2 | 3 | 5;
  escenario: string;
  personajes: Array<{ nombre: string; rol_en_cuento?: string; descripcion?: string }>;
  prompt_input?: string;
  claude_text?: string;
  audio_url?: string;
  pdf_url?: string;
  monto: number;
  fuente_pago:
    | "wallet"
    | "yape_directo"
    | "vip_estrella"
    | "vip_magico"
    | "bonus"
    | "gratis";
  status: "pendiente" | "pagado" | "generando" | "entregado" | "fallido";
  created_at: string;
  entregado_at?: string;
};

export async function crearPedido(
  pedido: Omit<Pedido, "id" | "status" | "created_at">,
): Promise<Pedido> {
  const { data } = await supabase
    .from("tci_pedidos")
    .insert({ ...pedido, status: "pendiente" })
    .select()
    .single();
  return data;
}

export async function actualizarPedido(
  id: string,
  patch: Partial<Pedido>,
): Promise<void> {
  if (patch.status === "entregado" && !patch.entregado_at) {
    patch.entregado_at = new Date().toISOString();
  }
  await supabase.from("tci_pedidos").update(patch).eq("id", id);
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const { data } = await supabase.from("tci_pedidos").select("*").eq("id", id).maybeSingle();
  return data;
}

// ═════════════════════════════════════════════════════════
// VIP
// ═════════════════════════════════════════════════════════
export type PlanVIP = "estrella_mensual" | "magico_mensual" | "estrella_anual" | "magico_anual";

export const CAP_VIP: Record<PlanVIP, number> = {
  estrella_mensual: 20,
  magico_mensual: 50,
  estrella_anual: 20,
  magico_anual: 50,
};

export const PRECIO_VIP: Record<PlanVIP, number> = {
  estrella_mensual: 18,
  magico_mensual: 30,
  estrella_anual: 180,
  magico_anual: 300,
};

export async function getVIPActivo(celular: string): Promise<{
  activo: boolean;
  plan?: PlanVIP;
  cuentos_disponibles?: number;
  cap_cuentos_mes?: number;
  fecha_vencimiento?: string;
} | null> {
  const { data } = await supabase
    .from("tci_vip")
    .select("*")
    .eq("celular", celular)
    .eq("activo", true)
    .order("fecha_vencimiento", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { activo: false };
  if (new Date(data.fecha_vencimiento) <= new Date()) {
    return { activo: false };
  }
  return {
    activo: true,
    plan: data.plan as PlanVIP,
    cuentos_disponibles: Math.max(0, data.cap_cuentos_mes - data.cuentos_used_mes),
    cap_cuentos_mes: data.cap_cuentos_mes,
    fecha_vencimiento: data.fecha_vencimiento,
  };
}

export async function activarVIP(opts: {
  celular: string;
  plan: PlanVIP;
  monto_pagado: number;
  yape_ref?: string;
}): Promise<void> {
  const esAnual = opts.plan.endsWith("_anual");
  const dias = esAnual ? 365 : 30;
  const fechaVenc = new Date();
  fechaVenc.setDate(fechaVenc.getDate() + dias);

  await supabase.from("tci_vip").insert({
    celular: opts.celular,
    plan: opts.plan,
    cap_cuentos_mes: CAP_VIP[opts.plan],
    cuentos_used_mes: 0,
    mes_reset_at: new Date().toISOString(),
    fecha_inicio: new Date().toISOString(),
    fecha_vencimiento: fechaVenc.toISOString(),
    activo: true,
    monto_pagado: opts.monto_pagado,
    yape_ref: opts.yape_ref ?? null,
  });

  await actualizarCliente(opts.celular, {
    plan: opts.plan.startsWith("magico") ? "magico" : "estrella",
  });
}

export async function consumirCuentoVIP(celular: string): Promise<boolean> {
  const { data: vip } = await supabase
    .from("tci_vip")
    .select("*")
    .eq("celular", celular)
    .eq("activo", true)
    .order("fecha_vencimiento", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!vip) return false;
  if (vip.cuentos_used_mes >= vip.cap_cuentos_mes) return false;

  await supabase
    .from("tci_vip")
    .update({ cuentos_used_mes: vip.cuentos_used_mes + 1 })
    .eq("id", vip.id);
  return true;
}

// ═════════════════════════════════════════════════════════
// CUENTOS GENERADOS (métricas de costo)
// ═════════════════════════════════════════════════════════
export async function registrarMetricaCuento(opts: {
  pedido_id: string;
  prompt_used: string;
  claude_tokens_in: number;
  claude_tokens_out: number;
  azure_chars: number;
  duracion_audio_seg?: number;
  costo_real_usd?: number;
  regeneraciones?: number;
}): Promise<void> {
  await supabase.from("tci_cuentos_generados").insert({
    pedido_id: opts.pedido_id,
    prompt_used: opts.prompt_used,
    claude_tokens_in: opts.claude_tokens_in,
    claude_tokens_out: opts.claude_tokens_out,
    azure_chars: opts.azure_chars,
    duracion_audio_seg: opts.duracion_audio_seg ?? null,
    costo_real_usd: opts.costo_real_usd ?? null,
    regeneraciones: opts.regeneraciones ?? 0,
  });
}

// ═════════════════════════════════════════════════════════
// PERSONAJES recurrentes
// ═════════════════════════════════════════════════════════
export async function guardarPersonaje(opts: {
  cliente_id: string;
  nombre: string;
  rol?: string;
  edad?: number;
  genero?: "m" | "f" | "otro";
  descripcion?: string;
}): Promise<void> {
  await supabase.from("tci_personajes").insert(opts);
}

export async function listarPersonajesCliente(
  cliente_id: string,
): Promise<
  Array<{ nombre: string; rol?: string; edad?: number; genero?: string; descripcion?: string }>
> {
  const { data } = await supabase
    .from("tci_personajes")
    .select("nombre, rol, edad, genero, descripcion")
    .eq("cliente_id", cliente_id);
  return data ?? [];
}
