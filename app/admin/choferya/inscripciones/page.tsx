/**
 * Panel admin /admin/choferya/inscripciones
 *
 * Para Percy: ver y aprobar manualmente choferes que se inscribieron en
 * /se-choferya y están en estado pending_onboarding.
 * Cuando Percy aprueba: crea registro en eco_choferes (si no existe),
 * activa choferya_active=true con el plan, manda opMsg al chofer.
 *
 * Auth: passcode ACTIVOSYA_ADMIN_PASSCODE en cookie.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/activosya/db";
import { issueChoferPanelToken } from "@/lib/activosya/choferya-token";
import { PLANES_CHOFERYA, YAPE_PERCY } from "@/lib/activosya/choferya";

const COOKIE = "activosya_admin";
const PATH = "/admin/choferya/inscripciones";

const META_TOKEN =
  process.env.META_CHOFERYA_ACCESS_TOKEN ||
  process.env.ECODRIVE_META_ACCESS_TOKEN ||
  "";
const META_PHONE_ID =
  process.env.META_CHOFERYA_PHONE_ID || "1044803088721236";

// ============== AUTH ==============================================
async function isAuthorized(): Promise<boolean> {
  const expected = process.env.ACTIVOSYA_ADMIN_PASSCODE;
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === expected;
}

async function loginAction(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.ACTIVOSYA_ADMIN_PASSCODE;
  const submitted = String(formData.get("p") || "");
  if (expected && submitted === expected) {
    const c = await cookies();
    c.set(COOKIE, expected, { httpOnly: true, sameSite: "lax", path: "/", secure: true });
  }
  redirect(PATH);
}

async function logoutAction(): Promise<void> {
  "use server";
  const c = await cookies();
  c.delete({ name: COOKIE, path: "/" });
  redirect(PATH);
}

// ============== HELPERS ===========================================
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
    console.error("[admin choferya sendWA]", (e as Error).message);
  }
}

// ============== ACTIONS ===========================================
async function aprobarChoferAction(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.ACTIVOSYA_ADMIN_PASSCODE;
  const c = await cookies();
  if (!expected || c.get(COOKIE)?.value !== expected) redirect(PATH);

  const tenantId = String(formData.get("tenant_id") || "");
  const waId = String(formData.get("wa_id") || "");
  const nombre = String(formData.get("nombre") || "").trim() || "Chofer";
  const plan = String(formData.get("plan") || "basico") as
    | "basico"
    | "pro"
    | "elite";
  const dni = String(formData.get("dni") || "").trim() || null;
  const slug = String(formData.get("slug") || "").trim();

  if (!tenantId || !waId) {
    console.error("[aprobarChofer] faltan tenant_id o wa_id");
    redirect(PATH);
  }

  const planInfo = PLANES_CHOFERYA[plan];
  if (!planInfo) redirect(PATH);

  const ahora = new Date();
  const proxima = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
  const proximaISO = proxima.toISOString().slice(0, 10);

  // 1) Buscar/crear chofer en eco_choferes
  let choferRecord = await supabaseAdmin
    .from("eco_choferes")
    .select("id, nombre, status")
    .eq("wa_id", waId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let choferId: string;
  let choferNombre: string;
  if (choferRecord.data) {
    choferId = choferRecord.data.id;
    choferNombre = choferRecord.data.nombre || nombre;
    await supabaseAdmin
      .from("eco_choferes")
      .update({
        status: "approved",
        nombre,
        dni: dni || undefined,
        approved_at: ahora.toISOString(),
        approved_by: "admin_manual",
        choferya_active: true,
        choferya_plan: plan,
        choferya_slug: slug || null,
        choferya_subscription_until: proximaISO,
        choferya_tenant_id: tenantId,
      })
      .eq("id", choferId);
  } else {
    // Crear chofer minimal en eco_choferes
    const placaPlaceholder = `PEND-${waId.slice(-4)}`;
    const ins = await supabaseAdmin
      .from("eco_choferes")
      .insert({
        wa_id: waId,
        nombre,
        dni: dni || null,
        placa: placaPlaceholder,
        vehiculo_marca: "—",
        vehiculo_modelo: "—",
        vehiculo_anio: "—",
        vehiculo_color: "—",
        status: "approved",
        approved_at: ahora.toISOString(),
        approved_by: "admin_manual",
        choferya_active: true,
        choferya_plan: plan,
        choferya_slug: slug || null,
        choferya_subscription_until: proximaISO,
        choferya_tenant_id: tenantId,
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) {
      console.error("[aprobarChofer] insertar eco_choferes:", ins.error?.message);
      redirect(PATH);
    }
    choferId = ins.data.id;
    choferNombre = nombre;
  }

  // 2) Activar tenant
  const { data: tenantUpdated } = await supabaseAdmin
    .from("ay_tenants")
    .update({
      status: "active",
      name: nombre,
      dni: dni || undefined,
      ultima_renta_pagada_at: ahora.toISOString(),
      fecha_proxima_renta: proximaISO,
    })
    .eq("id", tenantId)
    .select("macrodroid_token, monthly_fee_pen")
    .single();

  // 3) Registrar pago manual
  await supabaseAdmin.from("ay_operador_pagos").insert({
    tenant_id: tenantId,
    tipo: "renta_a_percy",
    monto_pen: planInfo.precio_pen,
    yape_operacion: `ADMIN-MANUAL-${Date.now().toString().slice(-6)}`,
    yape_nombre_origen: "admin_manual",
    detectado_via: "manual",
    fecha_pago: ahora.toISOString(),
    validado: true,
    metadata: { approved_by: "percy_admin_panel" },
  });

  // 4) Mensaje al chofer (opMsg de bienvenida + panel)
  const panelToken = issueChoferPanelToken(choferId);
  const panelUrl = `https://mi.choferya.activosya.com/?token=${panelToken}`;
  const venceLabel = proxima.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
  });
  const primerNombre = choferNombre.split(" ")[0];

  const opMsg =
    `🎉 *¡TuChoferYa ACTIVADO, ${primerNombre}!*\n\n` +
    `Tu cuenta está lista. Plan ${planInfo.label} activo hasta el ${venceLabel} 📅\n\n` +
    `*🔗 Tu página pública:*\n` +
    `https://chofer.activosya.com/c/${slug || "tu-perfil"}\n\n` +
    `*🛠️ Tu panel personal:*\n${panelUrl}\n\n` +
    `*Primeros pasos (10 min):*\n` +
    `1️⃣ Configura tus tarifas planas (Centro→Aeropuerto, etc.)\n` +
    `2️⃣ Define tus horarios disponibles por día\n` +
    `3️⃣ Descarga tu QR y pégalo en el auto\n` +
    `4️⃣ Pídele a tus pasajeros frecuentes que reserven por ahí\n\n` +
    `_Tus pasajeros te yapearán 100% a tu cuenta. Sin comisión por viaje. Tu renta de S/. ${planInfo.precio_pen} se cobra el día 1 de cada mes._\n\n` +
    `🚀 TuChoferYa — Tu propia agencia de taxi`;
  await sendWA(waId, opMsg);

  revalidatePath(PATH);
}

async function rechazarChoferAction(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.ACTIVOSYA_ADMIN_PASSCODE;
  const c = await cookies();
  if (!expected || c.get(COOKIE)?.value !== expected) redirect(PATH);

  const tenantId = String(formData.get("tenant_id") || "");
  const waId = String(formData.get("wa_id") || "");
  const motivo = String(formData.get("motivo") || "Documentación insuficiente").trim();

  if (!tenantId) redirect(PATH);

  await supabaseAdmin
    .from("ay_tenants")
    .update({
      status: "cancelled",
      suspended_at: new Date().toISOString(),
      suspended_reason: `rechazado_admin: ${motivo}`,
    })
    .eq("id", tenantId);

  if (waId) {
    await sendWA(
      waId,
      `Hola, lamentamos informarte que tu solicitud para TuChoferYa no fue aprobada.\n\n` +
        `Motivo: ${motivo}\n\n` +
        `Si crees que es un error, escríbenos respondiendo a este chat.`
    );
  }

  revalidatePath(PATH);
}

// ============== PAGE ==============================================
type TenantPending = {
  id: string;
  name: string;
  whatsapp_personal: string;
  dni: string | null;
  plan: string;
  monthly_fee_pen: number;
  status: string;
  created_at: string;
};

export default async function ChoferyaInscripcionesPage() {
  if (!(await isAuthorized())) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <form action={loginAction} className="space-y-4 w-80">
          <h1 className="text-2xl font-bold text-center">Admin Inscripciones TuChoferYa</h1>
          <input
            type="password"
            name="p"
            placeholder="Passcode"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-400"
            autoFocus
          />
          <button
            type="submit"
            className="w-full rounded-full bg-orange-500 hover:bg-orange-400 text-black font-medium py-3"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const { data } = await supabaseAdmin
    .from("ay_tenants")
    .select("id, name, whatsapp_personal, dni, plan, monthly_fee_pen, status, created_at")
    .eq("type", "chofer_independiente")
    .in("status", ["pending_onboarding", "active"])
    .order("created_at", { ascending: false })
    .limit(50);

  const tenants: TenantPending[] = (data || []) as TenantPending[];
  const pending = tenants.filter((t) => t.status === "pending_onboarding");
  const active = tenants.filter((t) => t.status === "active");

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Inscripciones TuChoferYa</h1>
            <p className="text-white/60 text-sm mt-1">
              {pending.length} pendientes · {active.length} activos
            </p>
          </div>
          <form action={logoutAction}>
            <button className="text-sm text-white/60 hover:text-white">Salir</button>
          </form>
        </header>

        <nav className="text-sm mb-6 flex gap-3">
          <Link href="/admin/operadores" className="text-white/60 hover:text-orange-400">
            ← Operadores
          </Link>
          <Link href="/admin/ecodrive/choferes" className="text-white/60 hover:text-orange-400">
            EcoDrive Choferes
          </Link>
        </nav>

        {/* Pendientes */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-3">
            Pendientes de aprobación ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="text-white/50 text-sm">No hay inscripciones pendientes.</p>
          ) : (
            <ul className="space-y-4">
              {pending.map((t) => (
                <li
                  key={t.id}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-lg">{t.name}</div>
                      <div className="text-xs text-white/50 mt-0.5">
                        WhatsApp: {t.whatsapp_personal}
                        {t.dni ? ` · DNI: ${t.dni}` : ""}
                      </div>
                      <div className="text-xs text-white/50">
                        Inscrito{" "}
                        {new Date(t.created_at).toLocaleString("es-PE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-500/30 text-amber-200">
                      Plan {t.plan?.toUpperCase()} · S/.{t.monthly_fee_pen}
                    </span>
                  </div>

                  <form
                    action={aprobarChoferAction}
                    className="grid sm:grid-cols-2 gap-2 mt-4"
                  >
                    <input type="hidden" name="tenant_id" value={t.id} />
                    <input type="hidden" name="wa_id" value={t.whatsapp_personal} />
                    <input
                      type="text"
                      name="nombre"
                      defaultValue={t.name}
                      placeholder="Nombre completo"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      name="dni"
                      defaultValue={t.dni || ""}
                      placeholder="DNI (8 dígitos)"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      name="slug"
                      placeholder="slug (ej: carlos-trujillo)"
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                    <select
                      name="plan"
                      defaultValue={t.plan || "basico"}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="basico">Básico (S/.39)</option>
                      <option value="pro">Pro (S/.79)</option>
                      <option value="elite">Élite (S/.149)</option>
                    </select>
                    <button
                      type="submit"
                      className="sm:col-span-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-medium py-2 mt-2"
                    >
                      ✓ Aprobar y activar TuChoferYa
                    </button>
                  </form>

                  <details className="mt-3">
                    <summary className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
                      Rechazar inscripción
                    </summary>
                    <form action={rechazarChoferAction} className="mt-2 flex gap-2">
                      <input type="hidden" name="tenant_id" value={t.id} />
                      <input type="hidden" name="wa_id" value={t.whatsapp_personal} />
                      <input
                        type="text"
                        name="motivo"
                        placeholder="Motivo del rechazo"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="px-4 rounded-full bg-red-500/30 hover:bg-red-500/50 text-red-200 text-sm"
                      >
                        Rechazar
                      </button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Activos */}
        {active.length > 0 ? (
          <section>
            <h2 className="text-xl font-semibold mb-3">
              Activos ({active.length})
            </h2>
            <ul className="space-y-2">
              {active.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-white/50">
                      {t.whatsapp_personal} · Plan {t.plan?.toUpperCase()}
                    </div>
                  </div>
                  <span className="text-xs text-emerald-300 bg-emerald-500/20 px-2 py-1 rounded-full">
                    Activo
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-12 text-xs text-white/40">
          Recuerda: para activar, el chofer debe haber enviado por chat las 5 fotos
          (DNI, licencia, SOAT, foto auto, selfie). Revisa visualmente antes de aprobar.
        </p>
      </div>
    </main>
  );
}
