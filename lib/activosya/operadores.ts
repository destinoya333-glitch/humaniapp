/**
 * ActivosYA Franquicia — Utilidades para operadores
 *
 * Modelo aprobado 2026-05-09:
 *  - 1 operador = 1 activo + 1 plan (si quiere otro activo, otro registro)
 *  - Pago renta operador → Yape Percy 998 102 258 → MacroDroid Percy detecta
 *  - Pago alumno → Yape OPERADOR → MacroDroid OPERADOR detecta
 *  - Solo Perú V1
 */
import { randomBytes } from "crypto";
import { supabaseAdmin } from "./db";

export type Plan = "local" | "comunidad" | "lider";
export type ActivoSlug = "tudestinoya" | "miss-sofia";

export const PLANES = {
  local:     { precio_pen: 500,  max_alumnos: 30,  label: "Local" },
  comunidad: { precio_pen: 1200, max_alumnos: 100, label: "Comunidad" },
  lider:     { precio_pen: 2500, max_alumnos: 300, label: "Líder" },
} as const;

export const ACTIVOS_FRANQUICIABLES = {
  "tudestinoya": { name: "TuDestinoYa", icon: "✨" },
  "miss-sofia":  { name: "Miss Sofia",  icon: "◎" },
} as const;

export const YAPE_PERCY = "998102258";

/** Genera token criptográficamente seguro para webhook MacroDroid del operador */
export function generarMacrodroidToken(): string {
  return randomBytes(24).toString("hex"); // 48 chars
}

/** Genera referral_code legible vía función SQL */
export async function generarReferralCode(nombre: string, ciudad: string | null): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("ay_generate_referral_code", {
    p_nombre: nombre,
    p_ciudad: ciudad ?? "",
  });
  if (error) throw new Error(`generarReferralCode: ${error.message}`);
  return data as string;
}

/** Normaliza teléfono peruano a formato 51XXXXXXXXX */
export function normalizarTelefonoPE(tel: string): string | null {
  const clean = String(tel).replace(/\D/g, "");
  const final = clean.startsWith("51") ? clean : "51" + clean;
  if (!/^51\d{9}$/.test(final)) return null;
  return final;
}

/** Valida DNI peruano (8 dígitos exactos) */
export function validarDNI(dni: string): boolean {
  return /^\d{8}$/.test(String(dni).replace(/\D/g, ""));
}

export type RegistroOperadorInput = {
  nombre: string;
  dni: string;
  whatsapp_personal: string;
  email?: string | null;
  ciudad: string;
  yape_numero: string;
  plan: Plan;
  activo: ActivoSlug;
  lead_id?: number | null;
};

export type RegistroOperadorResult = {
  operador_id: string;
  referral_code: string;
  macrodroid_token: string;
  monto_renta_pen: number;
  asset_id: string;
};

/**
 * Crea operador en estado pending_onboarding (esperando pago de renta).
 * Cuando MacroDroid detecte el Yape, se activa automáticamente.
 */
export async function registrarOperador(input: RegistroOperadorInput): Promise<RegistroOperadorResult> {
  const plan = PLANES[input.plan];
  if (!plan) throw new Error("Plan inválido");

  const dniClean = String(input.dni).replace(/\D/g, "");
  const whatsappFinal = normalizarTelefonoPE(input.whatsapp_personal);
  const yapeFinal = normalizarTelefonoPE(input.yape_numero);
  if (!whatsappFinal || !yapeFinal) throw new Error("Teléfono inválido");

  // Verificar duplicados (DNI o WhatsApp ya registrados)
  const { data: existente } = await supabaseAdmin
    .from("ay_tenants")
    .select("id, status")
    .or(`dni.eq.${dniClean},whatsapp_personal.eq.${whatsappFinal}`)
    .eq("type", "operador")
    .maybeSingle();

  if (existente) {
    throw new Error(
      existente.status === "active"
        ? "Ya tienes una cuenta activa con ese DNI/WhatsApp"
        : "Ya hay un registro pendiente con ese DNI/WhatsApp — completa el pago"
    );
  }

  // Generar identificadores únicos
  const referralCode = await generarReferralCode(input.nombre, input.ciudad);
  const macrodroidToken = generarMacrodroidToken();
  const slug = referralCode.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  // INSERT tenant operador (status pending_onboarding hasta detectar Yape renta)
  const { data: tenant, error: errTenant } = await supabaseAdmin
    .from("ay_tenants")
    .insert({
      type: "operador",
      name: input.nombre,
      slug: `op-${slug}-${randomBytes(2).toString("hex")}`,
      legal_name: input.nombre,
      country: "PE",
      city: input.ciudad,
      billing_email: input.email ?? null,
      whatsapp_phone: whatsappFinal,
      status: "pending_onboarding",
      dni: dniClean,
      whatsapp_personal: whatsappFinal,
      yape_numero: yapeFinal,
      macrodroid_token: macrodroidToken,
      referral_code: referralCode,
      plan: input.plan,
      monthly_fee_pen: plan.precio_pen,
      max_alumnos: plan.max_alumnos,
    })
    .select("id")
    .single();

  if (errTenant || !tenant) throw new Error(`No se pudo crear operador: ${errTenant?.message}`);

  // INSERT asset (status pending hasta activar)
  const { data: asset, error: errAsset } = await supabaseAdmin
    .from("ay_tenant_assets")
    .insert({
      tenant_id: tenant.id,
      asset_slug: input.activo,
      mode: "rent",
      monthly_fee_pen: plan.precio_pen,
      started_at: new Date().toISOString().slice(0, 10),
      status: "paused", // se activa cuando paga renta
    })
    .select("id")
    .single();

  if (errAsset || !asset) {
    // rollback manual del tenant
    await supabaseAdmin.from("ay_tenants").delete().eq("id", tenant.id);
    throw new Error(`No se pudo crear asset: ${errAsset?.message}`);
  }

  // Si viene de un lead, vincular
  if (input.lead_id) {
    await supabaseAdmin
      .from("operadores_leads")
      .update({
        converted_tenant_id: tenant.id,
        estado: "registered",
      })
      .eq("id", input.lead_id);
  }

  return {
    operador_id: tenant.id,
    referral_code: referralCode,
    macrodroid_token: macrodroidToken,
    monto_renta_pen: plan.precio_pen,
    asset_id: asset.id,
  };
}

/**
 * Busca un operador en pending_onboarding cuyo monto de renta coincida
 * con un Yape entrante (detectado por MacroDroid de Percy).
 * Ventana: últimos N minutos desde el registro.
 */
export async function buscarOperadorPendientePorMontoRenta(
  monto: number,
  ventanaMinutos: number = 240, // 4 horas para que el operador alcance a Yapear
  nombreRemitente?: string | null,
): Promise<{ id: string; name: string; whatsapp_personal: string; plan: Plan } | null> {
  const desde = new Date(Date.now() - ventanaMinutos * 60 * 1000).toISOString();

  let q = supabaseAdmin
    .from("ay_tenants")
    .select("id, name, whatsapp_personal, plan, dni")
    .eq("type", "operador")
    .eq("status", "pending_onboarding")
    .eq("monthly_fee_pen", monto)
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data, error } = await q;
  if (error || !data || data.length === 0) return null;

  // Si tenemos nombre del remitente Yape, intentar match por nombre primero
  if (nombreRemitente && data.length > 1) {
    const norm = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const remNorm = norm(nombreRemitente);
    const matchPorNombre = data.find((op) => {
      const opPrimerNombre = norm(op.name.split(" ")[0]);
      return remNorm.includes(opPrimerNombre) || opPrimerNombre.includes(remNorm.split(" ")[0]);
    });
    if (matchPorNombre) return matchPorNombre as typeof data[0] & { plan: Plan };
  }

  // Sino, el más reciente
  return data[0] as typeof data[0] & { plan: Plan };
}

/**
 * Datos del operador necesarios para que el bot Sofia/Destino sepa
 * a quién atribuir conversaciones, alumnos y pagos, y qué Yape mostrar.
 */
export type OperadorContexto = {
  tenant_id: string;
  name: string;
  yape_numero: string;          // 51XXXXXXXXX
  yape_display: string;          // "9XX XXX XXX" formato amigable
  whatsapp_personal: string;
  referral_code: string;
  plan: Plan;
};

/**
 * Dado el phone_id receptor de un webhook Meta Cloud, devuelve los datos
 * del operador franquicia dueño de ese número. Si no hay match → null
 * (legacy / operación central de Percy).
 */
export async function getOperadorByMetaPhoneId(phoneId: string): Promise<OperadorContexto | null> {
  const { data: asset, error } = await supabaseAdmin
    .from("ay_tenant_assets")
    .select("tenant_id, status, ay_tenants!inner(id, name, yape_numero, whatsapp_personal, referral_code, plan, status, type)")
    .eq("meta_phone_id", phoneId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !asset) return null;
  const t = (Array.isArray(asset.ay_tenants) ? asset.ay_tenants[0] : asset.ay_tenants) as {
    id: string;
    name: string;
    yape_numero: string | null;
    whatsapp_personal: string | null;
    referral_code: string | null;
    plan: Plan | null;
    status: string;
    type: string;
  } | null;

  if (!t || t.status !== "active" || t.type !== "operador") return null;
  if (!t.yape_numero || !t.referral_code || !t.plan) return null;

  // Yape display: 998102258 -> "998 102 258"
  const last9 = t.yape_numero.startsWith("51") ? t.yape_numero.slice(2) : t.yape_numero;
  const display = `${last9.slice(0, 3)} ${last9.slice(3, 6)} ${last9.slice(6, 9)}`;

  return {
    tenant_id: t.id,
    name: t.name,
    yape_numero: t.yape_numero,
    yape_display: display,
    whatsapp_personal: t.whatsapp_personal!,
    referral_code: t.referral_code,
    plan: t.plan,
  };
}

/**
 * Activa el operador tras detectar pago de renta vía MacroDroid.
 * - Status active
 * - Activa todos sus assets pending
 * - Registra pago en ay_operador_pagos
 * - Setea fecha_proxima_renta = +30 días
 * Devuelve { activated, asset_slugs } para usar en mensaje de bienvenida.
 */
export async function activarOperadorPorPagoRenta(params: {
  operador_id: string;
  monto_pen: number;
  yape_operacion: string;
  yape_remitente_nombre?: string | null;
}): Promise<{ activated: boolean; asset_slugs: string[]; macrodroid_token: string; referral_code: string }> {
  const hoy = new Date();
  const proxima = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { data: tenant, error: errTenant } = await supabaseAdmin
    .from("ay_tenants")
    .update({
      status: "active",
      ultima_renta_pagada_at: hoy.toISOString(),
      fecha_proxima_renta: proxima.toISOString().slice(0, 10),
    })
    .eq("id", params.operador_id)
    .select("macrodroid_token, referral_code")
    .single();

  if (errTenant || !tenant) throw new Error(`activar tenant: ${errTenant?.message}`);

  // Activar todos sus assets
  const { data: assets } = await supabaseAdmin
    .from("ay_tenant_assets")
    .update({
      status: "active",
      setup_completed_at: hoy.toISOString(),
    })
    .eq("tenant_id", params.operador_id)
    .select("asset_slug");

  // Registrar pago
  await supabaseAdmin.from("ay_operador_pagos").insert({
    tenant_id: params.operador_id,
    tipo: "renta_a_percy",
    monto_pen: params.monto_pen,
    yape_operacion: params.yape_operacion,
    yape_nombre_origen: params.yape_remitente_nombre ?? null,
    detectado_via: "macrodroid",
    fecha_pago: hoy.toISOString(),
    validado: true,
  });

  // Marcar lead como convertido si existe
  await supabaseAdmin
    .from("operadores_leads")
    .update({ converted_at: hoy.toISOString(), estado: "converted" })
    .eq("converted_tenant_id", params.operador_id);

  return {
    activated: true,
    asset_slugs: (assets ?? []).map((a) => a.asset_slug),
    macrodroid_token: tenant.macrodroid_token,
    referral_code: tenant.referral_code,
  };
}
