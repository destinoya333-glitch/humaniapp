/**
 * Panel admin /admin/operadores
 *
 * Pantalla SOLO para Percy (master) para gestionar operadores franquicia.
 * Función principal: vincular el phone_id de Meta Cloud al asset de cada
 * operador después de agregar manualmente su chip al WABA en Meta Business Suite.
 *
 * Auth: passcode env var ACTIVOSYA_ADMIN_PASSCODE + cookie httpOnly (mismo
 * patrón que /admin/ecodrive).
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/activosya/db";
import { ACTIVOS_FRANQUICIABLES, PLANES, type Plan, type ActivoSlug } from "@/lib/activosya/operadores";

const COOKIE = "activosya_admin";
const PATH = "/admin/operadores";

const META_TOKEN = process.env.ECODRIVE_META_ACCESS_TOKEN || "";

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

// ============== ACTIONS ===========================================
async function vincularPhoneAction(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.ACTIVOSYA_ADMIN_PASSCODE;
  const c = await cookies();
  if (!expected || c.get(COOKIE)?.value !== expected) redirect(PATH);

  const assetId = String(formData.get("asset_id") || "");
  const tenantId = String(formData.get("tenant_id") || "");
  const phoneId = String(formData.get("meta_phone_id") || "").trim();
  const wabaId = String(formData.get("meta_waba_id") || "").trim();

  if (!assetId || !tenantId || !phoneId) return;

  // Validar contra Graph API que el phone_id existe y obtener display
  let displayPhone: string | null = null;
  let verifiedName: string | null = null;
  try {
    const r = await fetch(
      `https://graph.facebook.com/v22.0/${phoneId}?fields=display_phone_number,verified_name&access_token=${META_TOKEN}`,
    );
    if (r.ok) {
      const data = await r.json();
      displayPhone = data.display_phone_number ?? null;
      verifiedName = data.verified_name ?? null;
    }
  } catch (e) {
    console.error("[vincularPhone Meta lookup]", (e as Error).message);
  }

  if (!displayPhone) {
    // Phone_id inválido — no vincular
    redirect(`${PATH}?error=invalid_phone_id&phone_id=${phoneId}`);
  }

  await supabaseAdmin
    .from("ay_tenant_assets")
    .update({
      meta_phone_id: phoneId,
      meta_waba_id: wabaId || null,
      meta_phone_display: displayPhone,
      setup_completed_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  // Notificar al operador
  const { data: tenant } = await supabaseAdmin
    .from("ay_tenants")
    .select("name, whatsapp_personal, referral_code")
    .eq("id", tenantId)
    .single();

  if (tenant?.whatsapp_personal && META_TOKEN) {
    const body =
      `🎉 *¡Tu WhatsApp Business está activo!*\n\n` +
      `Hola ${tenant.name.split(" ")[0]}, conectamos tu chip a Meta Cloud:\n` +
      `📱 *${displayPhone}*\n` +
      `${verifiedName ? `✓ Verificado como: ${verifiedName}\n` : ""}` +
      `\nA partir de AHORA, cualquier alumno que escriba a tu número será atendido automáticamente por el bot de tu activo. Tú solo te enfocas en captar clientes.\n\n` +
      `🔗 Comparte tu link: https://activosya.com/r/${tenant.referral_code}\n\n` +
      `🚀 ¡A vender!`;
    try {
      await fetch(`https://graph.facebook.com/v22.0/1044803088721236/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: tenant.whatsapp_personal,
          type: "text",
          text: { body },
        }),
      });
    } catch {}
  }

  revalidatePath(PATH);
  redirect(`${PATH}?ok=vinculado&display=${encodeURIComponent(displayPhone || "")}`);
}

async function suspenderAction(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.ACTIVOSYA_ADMIN_PASSCODE;
  const c = await cookies();
  if (!expected || c.get(COOKIE)?.value !== expected) redirect(PATH);

  const tenantId = String(formData.get("tenant_id") || "");
  const reason = String(formData.get("reason") || "manual_admin");
  if (!tenantId) return;

  await supabaseAdmin
    .from("ay_tenants")
    .update({
      status: "paused",
      suspended_at: new Date().toISOString(),
      suspended_reason: reason,
    })
    .eq("id", tenantId);

  revalidatePath(PATH);
}

async function reactivarAction(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.ACTIVOSYA_ADMIN_PASSCODE;
  const c = await cookies();
  if (!expected || c.get(COOKIE)?.value !== expected) redirect(PATH);

  const tenantId = String(formData.get("tenant_id") || "");
  if (!tenantId) return;

  await supabaseAdmin
    .from("ay_tenants")
    .update({
      status: "active",
      suspended_at: null,
      suspended_reason: null,
    })
    .eq("id", tenantId);

  revalidatePath(PATH);
}

// ============== TYPES =============================================
type AssetRow = {
  id: string;
  tenant_id: string;
  asset_slug: ActivoSlug;
  status: string;
  meta_phone_id: string | null;
  meta_phone_display: string | null;
  setup_completed_at: string | null;
};

type OperadorRow = {
  id: string;
  name: string;
  city: string | null;
  whatsapp_personal: string | null;
  yape_numero: string | null;
  referral_code: string | null;
  plan: Plan | null;
  monthly_fee_pen: number | null;
  status: string;
  fecha_proxima_renta: string | null;
  ultima_renta_pagada_at: string | null;
  created_at: string;
  suspended_reason: string | null;
};

// ============== HELPERS UI ========================================
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return "—";
  }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    active: { color: "emerald", label: "Activo" },
    pending_onboarding: { color: "amber", label: "Esperando pago" },
    paused: { color: "orange", label: "Suspendido" },
    cancelled: { color: "red", label: "Cancelado" },
  };
  const { color, label } = map[status] ?? { color: "zinc", label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-${color}-500/10 border border-${color}-500/30 text-${color}-400`}>
      {label}
    </span>
  );
}

// ============== PAGE ==============================================
export default async function OperadoresAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; display?: string; phone_id?: string }>;
}) {
  if (!(await isAuthorized())) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white grid place-items-center px-6">
        <form action={loginAction} className="w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center">Admin · Operadores</h1>
          <p className="text-sm text-zinc-500 text-center">Pasamos el control de la franquicia.</p>
          <input
            type="password"
            name="p"
            placeholder="Passcode"
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 outline-none focus:border-amber-500/50 transition"
            autoFocus
          />
          <button type="submit" className="w-full px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const params = await searchParams;

  // Cargar operadores con sus assets
  const { data: tenantsRaw } = await supabaseAdmin
    .from("ay_tenants")
    .select(
      "id, name, city, whatsapp_personal, yape_numero, referral_code, plan, monthly_fee_pen, status, fecha_proxima_renta, ultima_renta_pagada_at, created_at, suspended_reason",
    )
    .eq("type", "operador")
    .order("created_at", { ascending: false });

  const tenants = (tenantsRaw || []) as OperadorRow[];

  let assets: AssetRow[] = [];
  if (tenants.length > 0) {
    const ids = tenants.map((t) => t.id);
    const { data } = await supabaseAdmin
      .from("ay_tenant_assets")
      .select("id, tenant_id, asset_slug, status, meta_phone_id, meta_phone_display, setup_completed_at")
      .in("tenant_id", ids);
    assets = (data || []) as AssetRow[];
  }

  // Counters
  const total = tenants.length;
  const activos = tenants.filter((t) => t.status === "active").length;
  const pendientesPago = tenants.filter((t) => t.status === "pending_onboarding").length;
  const sinPhone = assets.filter(
    (a) => !a.meta_phone_id && tenants.find((t) => t.id === a.tenant_id)?.status === "active",
  ).length;

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center font-bold text-black">A</div>
              <span className="font-bold tracking-tight">ActivosYA</span>
            </Link>
            <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400">
              Admin · Operadores
            </span>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-sm text-zinc-400 hover:text-white transition">
              Salir
            </button>
          </form>
        </div>
      </header>

      <section className="px-6 py-8">
        <div className="mx-auto max-w-7xl">
          {/* Banners de resultado */}
          {params.ok === "vinculado" && (
            <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm">
              ✅ Phone vinculado correctamente
              {params.display ? ` a ${decodeURIComponent(params.display)}` : ""}. Operador notificado por WhatsApp.
            </div>
          )}
          {params.error === "invalid_phone_id" && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
              ❌ El phone_id <code className="font-mono">{params.phone_id}</code> no existe en Meta. Verifica que lo
              copiaste bien desde Meta Business Suite.
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-surface rounded-2xl p-5">
              <div className="text-3xl font-bold">{total}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Total operadores</div>
            </div>
            <div className="card-surface rounded-2xl p-5">
              <div className="text-3xl font-bold text-emerald-400">{activos}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Activos</div>
            </div>
            <div className="card-surface rounded-2xl p-5">
              <div className="text-3xl font-bold text-amber-400">{pendientesPago}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Esperando pago</div>
            </div>
            <div className="card-surface rounded-2xl p-5">
              <div className="text-3xl font-bold text-orange-400">{sinPhone}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Sin phone vinculado</div>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-6">Operadores</h1>

          {tenants.length === 0 ? (
            <div className="card-surface rounded-2xl p-10 text-center text-zinc-500">
              No hay operadores registrados aún.
            </div>
          ) : (
            <div className="space-y-4">
              {tenants.map((t) => {
                const tenantAssets = assets.filter((a) => a.tenant_id === t.id);
                const planInfo = t.plan ? PLANES[t.plan] : null;
                return (
                  <div key={t.id} className="card-surface rounded-2xl p-6">
                    {/* Header del operador */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="text-xl font-bold">{t.name}</h2>
                          <StatusPill status={t.status} />
                        </div>
                        <div className="text-sm text-zinc-400 flex flex-wrap items-center gap-3">
                          <span>{t.city ?? "—"}</span>
                          <span>·</span>
                          <span className="font-mono text-amber-400">{t.referral_code ?? "—"}</span>
                          <span>·</span>
                          <span>WA: <a href={`https://wa.me/${t.whatsapp_personal}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{t.whatsapp_personal}</a></span>
                          <span>·</span>
                          <span>Yape: <span className="font-mono">{t.yape_numero}</span></span>
                        </div>
                        {t.suspended_reason && (
                          <div className="text-xs text-orange-400 mt-1">Razón pausa: {t.suspended_reason}</div>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        {planInfo && (
                          <>
                            <div className="font-bold">{planInfo.label} · S/ {t.monthly_fee_pen}</div>
                            <div className="text-zinc-500 text-xs">
                              Próx. renta: {fmtDate(t.fecha_proxima_renta)} · Última: {fmtDate(t.ultima_renta_pagada_at)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Assets del operador */}
                    {tenantAssets.length === 0 ? (
                      <div className="text-sm text-zinc-500 italic">Sin activos asignados</div>
                    ) : (
                      <div className="space-y-3">
                        {tenantAssets.map((a) => {
                          const info = ACTIVOS_FRANQUICIABLES[a.asset_slug];
                          return (
                            <div key={a.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{info?.icon}</span>
                                  <span className="font-semibold">{info?.name ?? a.asset_slug}</span>
                                  <StatusPill status={a.status} />
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {a.meta_phone_id ? `✓ ${a.meta_phone_display}` : "⏳ sin chip vinculado"}
                                </div>
                              </div>

                              {!a.meta_phone_id && t.status === "active" && (
                                <form action={vincularPhoneAction} className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                                  <input type="hidden" name="asset_id" value={a.id} />
                                  <input type="hidden" name="tenant_id" value={t.id} />
                                  <input
                                    type="text"
                                    name="meta_phone_id"
                                    placeholder="meta_phone_id (ej: 1080734831795014)"
                                    required
                                    pattern="\d{10,20}"
                                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono outline-none focus:border-amber-500/50"
                                  />
                                  <input
                                    type="text"
                                    name="meta_waba_id"
                                    placeholder="meta_waba_id (opcional)"
                                    pattern="\d{10,20}"
                                    className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm font-mono outline-none focus:border-amber-500/50"
                                  />
                                  <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition"
                                  >
                                    Vincular y notificar →
                                  </button>
                                </form>
                              )}

                              {a.meta_phone_id && (
                                <div className="text-xs text-zinc-500 font-mono mt-1">
                                  phone_id: {a.meta_phone_id}
                                  {a.setup_completed_at ? ` · vinculado ${fmtDate(a.setup_completed_at)}` : ""}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Acciones tenant */}
                    <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center gap-2 text-sm">
                      <Link
                        href={`/operador/setup?token=${encodeURIComponent(
                          // Necesitamos el macrodroid_token del operador. Lo cargamos en server side abajo
                          ""
                        )}`}
                        className="hidden"
                      />
                      {t.status === "active" && (
                        <form action={suspenderAction}>
                          <input type="hidden" name="tenant_id" value={t.id} />
                          <input type="hidden" name="reason" value="suspendido_admin_manual" />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-semibold transition"
                          >
                            Suspender
                          </button>
                        </form>
                      )}
                      {(t.status === "paused" || t.status === "cancelled") && (
                        <form action={reactivarAction}>
                          <input type="hidden" name="tenant_id" value={t.id} />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition"
                          >
                            Reactivar
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-10 text-xs text-zinc-600 text-center">
            <p>Helper: para encontrar el phone_id del chip que acabas de agregar:</p>
            <p className="mt-1 font-mono">
              GET https://graph.facebook.com/v22.0/{`{WABA_ID}`}/phone_numbers?fields=id,display_phone_number&access_token=...
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
