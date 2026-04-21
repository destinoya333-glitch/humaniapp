import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getTenant(whatsappNumber: string) {
  const { data } = await supabase
    .from("sofia_tenants")
    .select("*")
    .eq("whatsapp_number", whatsappNumber)
    .eq("activo", true)
    .single();
  return data;
}

export async function getOrCreateAlumno(tenantId: string, telefono: string) {
  const { data: existing } = await supabase
    .from("sofia_alumnos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("telefono", telefono)
    .single();
  if (existing) return existing;
  const { data } = await supabase
    .from("sofia_alumnos")
    .insert({ tenant_id: tenantId, telefono, estado: "prospecto" })
    .select()
    .single();
  return data;
}

export async function getAlumno(tenantId: string, telefono: string) {
  const { data } = await supabase
    .from("sofia_alumnos")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("telefono", telefono)
    .single();
  return data;
}

export async function actualizarAlumno(alumnoId: string, updates: Record<string, unknown>) {
  const { data } = await supabase
    .from("sofia_alumnos")
    .update(updates)
    .eq("id", alumnoId)
    .select()
    .single();
  return data;
}

export async function getConversacion(tenantId: string, telefono: string) {
  const { data } = await supabase
    .from("sofia_conversaciones")
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
    .from("sofia_conversaciones")
    .upsert(
      { tenant_id: tenantId, telefono, ...updates, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,telefono" }
    )
    .select()
    .single();
  return data;
}

export async function crearTest(tenantId: string, alumnoId: string) {
  const { data } = await supabase
    .from("sofia_tests")
    .insert({ tenant_id: tenantId, alumno_id: alumnoId })
    .select()
    .single();
  return data;
}

export async function guardarResultadoTest(
  testId: string,
  puntaje: number,
  nivelResultado: string,
  respuestas: unknown[]
) {
  const { data } = await supabase
    .from("sofia_tests")
    .update({ puntaje, nivel_resultado: nivelResultado, respuestas, completado: true })
    .eq("id", testId)
    .select()
    .single();
  return data;
}

export async function registrarPago(pago: Record<string, unknown>) {
  const { data } = await supabase
    .from("sofia_pagos")
    .insert(pago)
    .select()
    .single();
  return data;
}
