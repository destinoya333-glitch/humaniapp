import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getTenant(whatsappNumber: string) {
  const { data } = await supabase
    .from("pol_tenants")
    .select("*")
    .eq("whatsapp_number", whatsappNumber)
    .eq("activo", true)
    .single();
  return data;
}

export async function getMenu(tenantId: string) {
  const { data } = await supabase
    .from("pol_categorias")
    .select(`
      id, nombre, orden,
      pol_productos (id, nombre, descripcion, precio, disponible, orden)
    `)
    .eq("tenant_id", tenantId)
    .eq("activo", true)
    .order("orden");
  return data;
}

export async function getDeliveryTarifas(tenantId: string) {
  const { data } = await supabase
    .from("pol_delivery_tarifas")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("activo", true)
    .order("km_desde");
  return data;
}

export async function getOrCreateCliente(tenantId: string, telefono: string) {
  const { data: existing } = await supabase
    .from("pol_clientes")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("telefono", telefono)
    .single();
  if (existing) return existing;
  const { data } = await supabase
    .from("pol_clientes")
    .insert({ tenant_id: tenantId, telefono })
    .select()
    .single();
  return data;
}

export async function getConversacion(tenantId: string, telefono: string) {
  const { data } = await supabase
    .from("pol_conversaciones")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("telefono", telefono)
    .single();
  return data;
}

export async function upsertConversacion(
  tenantId: string,
  telefono: string,
  updates: Record<string, unknown>
) {
  const { data } = await supabase
    .from("pol_conversaciones")
    .upsert(
      { tenant_id: tenantId, telefono, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,telefono" }
    )
    .select()
    .single();
  return data;
}

export async function crearPedido(pedido: Record<string, unknown>) {
  const { data } = await supabase
    .from("pol_pedidos")
    .insert(pedido)
    .select()
    .single();
  return data;
}

export async function crearPedidoItems(items: Record<string, unknown>[]) {
  const { data } = await supabase
    .from("pol_pedido_items")
    .insert(items)
    .select();
  return data;
}

export async function actualizarEstadoPedido(
  pedidoId: string,
  estado: string,
  extra?: Record<string, unknown>
) {
  const { data } = await supabase
    .from("pol_pedidos")
    .update({ estado, ...extra })
    .eq("id", pedidoId)
    .select()
    .single();
  return data;
}

export async function getTelegramGrupo(tenantId: string, tipo: string) {
  const { data } = await supabase
    .from("pol_telegram_grupos")
    .select("chat_id")
    .eq("tenant_id", tenantId)
    .eq("tipo", tipo)
    .eq("activo", true)
    .single();
  return data?.chat_id;
}
