/**
 * TuChoferYa — Utilidades para suscripciones de choferes independientes
 *
 * Modelo aprobado 2026-05-11:
 *  - 1 chofer = 1 plan (basico/pro/elite) sobre eco_choferes existente
 *  - Pago renta chofer → Yape Percy 998 102 258 → MacroDroid Percy detecta
 *  - Pago de pasajero → Yape DIRECTO al chofer (NO pasa por sistema)
 *  - Pre-requisito: chofer ya aprobado en eco_choferes (IA Claude Vision)
 *  - Solo Perú V1
 */
import { supabaseAdmin } from "./db";
import { generarMacrodroidToken, normalizarTelefonoPE } from "./operadores";

export type PlanChoferYa = "basico" | "pro" | "elite";

export const PLANES_CHOFERYA = {
  basico: { precio_pen: 39,  label: "Básico", features: ["pagina_personal", "qr", "sello_verificado", "tarifas_planas"] },
  pro:    { precio_pen: 79,  label: "Pro",    features: ["basico", "bot_ia_eco", "tarifa_dinamica", "lista_espera", "audio_personalizado"] },
  elite:  { precio_pen: 149, label: "Élite",  features: ["pro", "multi_chofer", "ads_directorio", "capacitacion", "auto_backup"] },
} as const;

export const YAPE_PERCY = "998102258";

/** Montos válidos de renta TuChoferYa (para detectar en MacroDroid) */
export const MONTOS_CHOFERYA = [39, 79, 149] as const;

export function planByMonto(monto: number): PlanChoferYa | null {
  if (monto === 39) return "basico";
  if (monto === 79) return "pro";
  if (monto === 149) return "elite";
  return null;
}

export type RegistroChoferYaInput = {
  /** wa_id del chofer (51XXXXXXXXX, debe coincidir con eco_choferes.wa_id) */
  wa_id: string;
  plan: PlanChoferYa;
  /** slug opcional propuesto (se genera si no viene) */
  slug?: string;
  bio?: string;
  zonas?: string[];
};

export type RegistroChoferYaResult =
  | {
      ok: true;
      requires_inscription: false;
      chofer_id: string;
      nombre: string;
      slug: string;
      monto_renta_pen: number;
      tenant_id: string;
      macrodroid_token: string;
    }
  | {
      ok: true;
      requires_inscription: true;
      reason: "no_existe_en_eco_choferes" | "no_aprobado";
      message: string;
    };

/**
 * Crea suscripción TuChoferYa en estado pending_onboarding.
 * Pre-requisito: chofer ya aprobado en eco_choferes.
 * Si NO existe → indicar que primero debe completar inscripción.
 */
export async function registrarChoferYa(input: RegistroChoferYaInput): Promise<RegistroChoferYaResult> {
  const plan = PLANES_CHOFERYA[input.plan];
  if (!plan) throw new Error("Plan inválido (basico|pro|elite)");

  const waId = normalizarTelefonoPE(input.wa_id);
  if (!waId) throw new Error("WhatsApp inválido");

  // 1) Verificar que el chofer existe en eco_choferes y está aprobado
  const { data: chofer, error: errChofer } = await supabaseAdmin
    .from("eco_choferes")
    .select("id, nombre, dni, status, choferya_active, choferya_subscription_until")
    .eq("wa_id", waId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errChofer) throw new Error(`lookup chofer: ${errChofer.message}`);
  if (!chofer) {
    return {
      ok: true,
      requires_inscription: true,
      reason: "no_existe_en_eco_choferes",
      message: "Primero completa tu inscripción como chofer (DNI + licencia + SOAT + foto del auto).",
    };
  }
  if (chofer.status !== "approved") {
    return {
      ok: true,
      requires_inscription: true,
      reason: "no_aprobado",
      message:
        chofer.status === "pending"
          ? "Tu inscripción está en revisión. Te avisamos en 24h."
          : "Tu inscripción fue rechazada. Contacta soporte.",
    };
  }
  if (chofer.choferya_active && chofer.choferya_subscription_until && new Date(chofer.choferya_subscription_until) >= new Date()) {
    throw new Error("Ya tienes una suscripción TuChoferYa activa");
  }

  // 2) Generar slug si no vino
  let slug = input.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") || "";
  if (!slug) {
    const { data: gen } = await supabaseAdmin.rpc("choferya_generate_slug", {
      p_nombre: chofer.nombre,
      p_ciudad: null,
    });
    slug = (gen as string) || `chofer-${waId.slice(-4)}`;
  } else {
    // Verificar único
    const { data: clash } = await supabaseAdmin
      .from("eco_choferes")
      .select("id")
      .eq("choferya_slug", slug)
      .neq("id", chofer.id)
      .maybeSingle();
    if (clash) {
      // Generar uno único basado en el propuesto
      const { data: gen } = await supabaseAdmin.rpc("choferya_generate_slug", {
        p_nombre: slug,
        p_ciudad: null,
      });
      slug = (gen as string) || `${slug}-${waId.slice(-4)}`;
    }
  }

  // 3) Crear tenant en ay_tenants (type='chofer_independiente', pending_onboarding)
  const macrodroidToken = generarMacrodroidToken();
  const tenantSlug = `cho-${slug}`.slice(0, 60);

  const { data: tenant, error: errTenant } = await supabaseAdmin
    .from("ay_tenants")
    .insert({
      type: "chofer_independiente",
      name: chofer.nombre,
      slug: tenantSlug,
      legal_name: chofer.nombre,
      country: "PE",
      whatsapp_phone: waId,
      whatsapp_personal: waId,
      dni: chofer.dni,
      yape_numero: waId, // chofer cobra a SUS pasajeros en su propio Yape (su WhatsApp)
      macrodroid_token: macrodroidToken,
      plan: input.plan,
      monthly_fee_pen: plan.precio_pen,
      status: "pending_onboarding",
    })
    .select("id")
    .single();

  if (errTenant || !tenant) throw new Error(`crear tenant choferya: ${errTenant?.message}`);

  // 4) Reservar slug + zonas + bio en eco_choferes (sin activar aún)
  await supabaseAdmin
    .from("eco_choferes")
    .update({
      choferya_slug: slug,
      choferya_plan: input.plan,
      choferya_bio: input.bio || null,
      choferya_zonas: input.zonas && input.zonas.length > 0 ? input.zonas : null,
      choferya_tenant_id: tenant.id,
      // choferya_active queda FALSE hasta detectar pago
    })
    .eq("id", chofer.id);

  return {
    ok: true,
    requires_inscription: false,
    chofer_id: chofer.id,
    nombre: chofer.nombre || "Chofer",
    slug,
    monto_renta_pen: plan.precio_pen,
    tenant_id: tenant.id,
    macrodroid_token: macrodroidToken,
  };
}

/**
 * Busca un chofer TuChoferYa en pending_onboarding cuyo monto coincida con un
 * Yape entrante. Llamado desde MacroDroid Percy.
 */
export async function buscarChoferYaPendientePorMontoRenta(
  monto: number,
  ventanaMinutos: number = 240,
  nombreRemitente?: string | null
): Promise<{
  tenant_id: string;
  chofer_id: string;
  name: string;
  whatsapp_personal: string;
  plan: PlanChoferYa;
  slug: string;
} | null> {
  const desde = new Date(Date.now() - ventanaMinutos * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("ay_tenants")
    .select("id, name, whatsapp_personal, plan, dni")
    .eq("type", "chofer_independiente")
    .eq("status", "pending_onboarding")
    .eq("monthly_fee_pen", monto)
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) return null;

  let elegido = data[0];
  if (nombreRemitente && data.length > 1) {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const remNorm = norm(nombreRemitente);
    const matchPorNombre = data.find((t) => {
      const primer = norm((t.name || "").split(" ")[0] || "");
      return primer.length > 0 && (remNorm.includes(primer) || primer.includes(remNorm.split(" ")[0]));
    });
    if (matchPorNombre) elegido = matchPorNombre;
  }

  // Buscar el chofer asociado al tenant
  const { data: chofer } = await supabaseAdmin
    .from("eco_choferes")
    .select("id, choferya_slug")
    .eq("choferya_tenant_id", elegido.id)
    .maybeSingle();

  if (!chofer) return null;

  return {
    tenant_id: elegido.id,
    chofer_id: chofer.id,
    name: elegido.name,
    whatsapp_personal: elegido.whatsapp_personal!,
    plan: elegido.plan as PlanChoferYa,
    slug: chofer.choferya_slug || "",
  };
}

/**
 * Activa una suscripción TuChoferYa tras detectar Yape de renta.
 * Setea choferya_active=true + subscription_until=+30d, registra pago.
 */
export async function activarChoferYaPorPagoRenta(params: {
  tenant_id: string;
  chofer_id: string;
  monto_pen: number;
  yape_operacion: string;
  yape_remitente_nombre?: string | null;
}): Promise<{ activated: boolean; subscription_until: string; macrodroid_token: string }> {
  const hoy = new Date();
  const proxima = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
  const proximaISO = proxima.toISOString().slice(0, 10);

  // Activar tenant
  const { data: tenant, error: errTenant } = await supabaseAdmin
    .from("ay_tenants")
    .update({
      status: "active",
      ultima_renta_pagada_at: hoy.toISOString(),
      fecha_proxima_renta: proximaISO,
    })
    .eq("id", params.tenant_id)
    .select("macrodroid_token")
    .single();

  if (errTenant || !tenant) throw new Error(`activar tenant choferya: ${errTenant?.message}`);

  // Activar capa choferya en eco_choferes
  await supabaseAdmin
    .from("eco_choferes")
    .update({
      choferya_active: true,
      choferya_subscription_until: proximaISO,
    })
    .eq("id", params.chofer_id);

  // Registrar pago
  await supabaseAdmin.from("ay_operador_pagos").insert({
    tenant_id: params.tenant_id,
    tipo: "renta_a_percy",
    monto_pen: params.monto_pen,
    yape_operacion: params.yape_operacion,
    yape_nombre_origen: params.yape_remitente_nombre ?? null,
    detectado_via: "macrodroid",
    fecha_pago: hoy.toISOString(),
    validado: true,
  });

  return {
    activated: true,
    subscription_until: proximaISO,
    macrodroid_token: tenant.macrodroid_token,
  };
}
