/**
 * Dashboard del operador franquicia ActivosYA
 *
 * Auth dual:
 *  A) Token-based (franquicia V1): ?token={macrodroid_token}
 *     Usado por operadores que solo tienen el link único de su WhatsApp
 *     post-activación. No requiere cuenta Supabase.
 *  B) Auth Supabase (B2B legacy): operadores con cuenta auth + RLS
 *
 * Si hay token en URL → modo A (vista del operador franquicia con sus
 * alumnos, ingresos, pagos recibidos, próxima renta).
 * Si no hay token pero hay user auth → modo B (vista B2B legacy).
 * Si nada → redirect a login.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/activosya/db";
import { ACTIVOS_FRANQUICIABLES, PLANES, type Plan, type ActivoSlug } from "@/lib/activosya/operadores";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type TenantOp = {
  id: string;
  name: string;
  city: string | null;
  whatsapp_personal: string | null;
  yape_numero: string | null;
  referral_code: string | null;
  macrodroid_token: string | null;
  plan: Plan | null;
  monthly_fee_pen: number | null;
  max_alumnos: number | null;
  status: string;
  fecha_proxima_renta: string | null;
  ultima_renta_pagada_at: string | null;
};

type AssetOp = {
  id: string;
  asset_slug: ActivoSlug;
  status: string;
  meta_phone_id: string | null;
  meta_phone_display: string | null;
  setup_completed_at: string | null;
};

type AlumnoOp = {
  id: string;
  asset_slug: string;
  alumno_phone: string;
  alumno_name: string | null;
  fecha_primer_contacto: string;
  estado: string;
  total_pagado_pen: number;
  ultimo_pago_at: string | null;
};

type PagoOp = {
  id: string;
  tipo: string;
  monto_pen: number;
  yape_operacion: string | null;
  yape_nombre_origen: string | null;
  alumno_phone: string | null;
  asset_slug: string | null;
  fecha_pago: string;
  validado: boolean;
};

async function loadByToken(token: string): Promise<{ tenant: TenantOp; assets: AssetOp[]; alumnos: AlumnoOp[]; pagos: PagoOp[] } | null> {
  const { data: tenant } = await supabaseAdmin
    .from("ay_tenants")
    .select(
      "id, name, city, whatsapp_personal, yape_numero, referral_code, macrodroid_token, plan, monthly_fee_pen, max_alumnos, status, fecha_proxima_renta, ultima_renta_pagada_at",
    )
    .eq("macrodroid_token", token)
    .eq("type", "operador")
    .maybeSingle();
  if (!tenant) return null;

  const [{ data: assets }, { data: alumnos }, { data: pagos }] = await Promise.all([
    supabaseAdmin
      .from("ay_tenant_assets")
      .select("id, asset_slug, status, meta_phone_id, meta_phone_display, setup_completed_at")
      .eq("tenant_id", tenant.id),
    supabaseAdmin
      .from("ay_operador_alumnos")
      .select("id, asset_slug, alumno_phone, alumno_name, fecha_primer_contacto, estado, total_pagado_pen, ultimo_pago_at")
      .eq("tenant_id", tenant.id)
      .order("ultimo_pago_at", { ascending: false, nullsFirst: false })
      .limit(100),
    supabaseAdmin
      .from("ay_operador_pagos")
      .select("id, tipo, monto_pen, yape_operacion, yape_nombre_origen, alumno_phone, asset_slug, fecha_pago, validado")
      .eq("tenant_id", tenant.id)
      .order("fecha_pago", { ascending: false })
      .limit(50),
  ]);

  return {
    tenant: tenant as TenantOp,
    assets: (assets || []) as AssetOp[],
    alumnos: (alumnos || []) as AlumnoOp[],
    pagos: (pagos || []) as PagoOp[],
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "2-digit" });
  } catch {
    return "—";
  }
}

function fmtMoney(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function startOfMonth(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export default async function OperadorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // ─── MODO A: token-based (franquicia V1) ──────────────────────────────
  if (token) {
    const data = await loadByToken(token);
    if (!data) redirect("/operador/login");

    const { tenant: t, assets, alumnos, pagos } = data;
    const planInfo = t.plan ? PLANES[t.plan] : null;
    const principalAsset = assets[0];
    const activoInfo = principalAsset ? ACTIVOS_FRANQUICIABLES[principalAsset.asset_slug] : null;
    const referralPath = principalAsset?.asset_slug === "tudestinoya" ? "r" : "sofia/r";
    const referralUrl = `https://activosya.com/${referralPath}/${t.referral_code}`;

    // KPIs
    const inicioMes = startOfMonth().toISOString();
    const pagosAlumnoMes = pagos.filter(
      (p) => p.tipo === "pago_alumno" && p.validado && p.fecha_pago >= inicioMes,
    );
    const ingresosMes = pagosAlumnoMes.reduce((s, p) => s + Number(p.monto_pen), 0);
    const ingresosTotal = pagos
      .filter((p) => p.tipo === "pago_alumno" && p.validado)
      .reduce((s, p) => s + Number(p.monto_pen), 0);
    const alumnosActivos = alumnos.filter((a) => a.estado === "activo").length;
    const cupoRestante = (t.max_alumnos ?? 0) - alumnosActivos;

    return (
      <main className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center font-bold text-black">A</div>
              <span className="font-bold tracking-tight">ActivosYA</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-zinc-400 hidden sm:inline">{t.name}</span>
              <Link
                href={`/operador/setup?token=${token}`}
                className="text-zinc-400 hover:text-white transition"
              >
                Setup →
              </Link>
            </div>
          </div>
        </header>

        <section className="px-6 py-8">
          <div className="mx-auto max-w-7xl">
            {/* Status banner */}
            {t.status === "paused" && (
              <div className="mb-6 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300">
                ⚠️ Tu cuenta está pausada. Para reactivarla yapea S/. {t.monthly_fee_pen} a 998 102 258.
              </div>
            )}
            {t.status === "pending_onboarding" && (
              <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                ⏳ Esperando confirmación de tu primera renta. Si ya pagaste, en 1-2 minutos se activa.
              </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Dashboard {t.name.split(" ")[0]}</h1>
                <p className="text-zinc-400 text-sm mt-1">
                  {activoInfo?.name ?? "—"} · Plan {planInfo?.label} · {t.city ?? "—"}
                </p>
              </div>
              <a
                href={`/api/operadores/reporte-mensual?token=${token}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-sm transition"
              >
                ⬇ Descargar reporte CSV
              </a>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <div className="card-surface rounded-2xl p-5">
                <div className="text-3xl font-bold text-amber-400">{alumnosActivos}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Alumnos activos</div>
                <div className="text-xs text-zinc-600 mt-1">de {t.max_alumnos ?? "—"} cupo</div>
              </div>
              <div className="card-surface rounded-2xl p-5">
                <div className="text-3xl font-bold text-emerald-400">{fmtMoney(ingresosMes)}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Ingresos mes</div>
                <div className="text-xs text-zinc-600 mt-1">{pagosAlumnoMes.length} cobros</div>
              </div>
              <div className="card-surface rounded-2xl p-5">
                <div className="text-3xl font-bold text-blue-400">{fmtMoney(ingresosTotal)}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Total histórico</div>
                <div className="text-xs text-zinc-600 mt-1">desde inicio</div>
              </div>
              <div className="card-surface rounded-2xl p-5">
                <div className="text-3xl font-bold">{cupoRestante}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Cupos libres</div>
                <div className="text-xs text-zinc-600 mt-1">en tu plan</div>
              </div>
            </div>

            {/* Estado renta */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-10 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Plan actual</div>
                <div className="font-bold text-amber-400">{planInfo?.label}</div>
                <div className="text-zinc-500 text-xs">{fmtMoney(t.monthly_fee_pen)} / mes</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Última renta pagada</div>
                <div className="font-bold">{fmtDate(t.ultima_renta_pagada_at)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Próximo cobro</div>
                <div className="font-bold">{fmtDate(t.fecha_proxima_renta)}</div>
                <div className="text-zinc-500 text-xs">a Yape Percy 998 102 258</div>
              </div>
            </div>

            {/* Link de referido + WhatsApp del operador */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-10">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2 font-semibold">Tus canales</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-zinc-400 mb-1">Tu link de referido:</div>
                  <input
                    readOnly
                    defaultValue={referralUrl}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 font-mono text-xs text-amber-300 select-all"
                  />
                </div>
                <div>
                  <div className="text-zinc-400 mb-1">Tu WhatsApp Business vinculado:</div>
                  <div className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
                    {principalAsset?.meta_phone_display ?? (
                      <span className="text-orange-400">⏳ Pendiente — envía tu chip al soporte</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabla últimos pagos */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-4">💰 Últimos cobros recibidos</h2>
              {pagos.filter((p) => p.tipo === "pago_alumno").length === 0 ? (
                <div className="card-surface rounded-2xl p-8 text-center text-zinc-500 text-sm">
                  Aún no recibes pagos. Comparte tu link de referido para empezar.
                </div>
              ) : (
                <div className="card-surface rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left">
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Fecha</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Alumno</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Activo</th>
                          <th className="py-3 px-4 text-right text-zinc-500 font-medium uppercase tracking-widest text-xs">Monto</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Op Yape</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagos
                          .filter((p) => p.tipo === "pago_alumno")
                          .slice(0, 25)
                          .map((p) => (
                            <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="py-3 px-4 text-zinc-300 text-xs">{fmtDate(p.fecha_pago)}</td>
                              <td className="py-3 px-4 text-zinc-300 font-mono text-xs">
                                {p.alumno_phone ?? p.yape_nombre_origen ?? "—"}
                              </td>
                              <td className="py-3 px-4 text-zinc-400 text-xs capitalize">
                                {p.asset_slug ?? "—"}
                              </td>
                              <td className="py-3 px-4 text-right text-emerald-400 font-mono">
                                {fmtMoney(p.monto_pen)}
                              </td>
                              <td className="py-3 px-4 text-zinc-500 font-mono text-xs">{p.yape_operacion ?? "—"}</td>
                              <td className="py-3 px-4">
                                {p.validado ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                    ✓ Validado
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">
                                    Sin match
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Tabla alumnos */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold mb-4">👥 Tus alumnos</h2>
              {alumnos.length === 0 ? (
                <div className="card-surface rounded-2xl p-8 text-center text-zinc-500 text-sm">
                  Aún no captas alumnos. Empieza compartiendo tu link de referido en Facebook, WhatsApp o ads.
                </div>
              ) : (
                <div className="card-surface rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left">
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Alumno</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Activo</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Desde</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Último pago</th>
                          <th className="py-3 px-4 text-right text-zinc-500 font-medium uppercase tracking-widest text-xs">Total</th>
                          <th className="py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumnos.map((a) => (
                          <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 px-4">
                              <div className="text-zinc-300">{a.alumno_name ?? "—"}</div>
                              <div className="font-mono text-xs text-zinc-500">{a.alumno_phone}</div>
                            </td>
                            <td className="py-3 px-4 text-zinc-400 text-xs capitalize">{a.asset_slug}</td>
                            <td className="py-3 px-4 text-zinc-500 text-xs">{fmtDate(a.fecha_primer_contacto)}</td>
                            <td className="py-3 px-4 text-zinc-400 text-xs">{fmtDate(a.ultimo_pago_at)}</td>
                            <td className="py-3 px-4 text-right text-emerald-400 font-mono">
                              {fmtMoney(a.total_pagado_pen)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  a.estado === "activo"
                                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                                    : "bg-zinc-500/10 border border-zinc-500/30 text-zinc-400"
                                }`}
                              >
                                {a.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Soporte */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
              <a
                href={`https://wa.me/51998102258?text=${encodeURIComponent(`Hola, soy ${t.name} (operador ${t.referral_code}). Necesito soporte.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition"
              >
                <div className="text-2xl mb-3">💬</div>
                <h3 className="font-semibold mb-1">Soporte WhatsApp</h3>
                <p className="text-zinc-400 text-sm">Respuesta &lt; 24h</p>
              </a>
              <Link href={`/operador/setup?token=${token}`} className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition">
                <div className="text-2xl mb-3">🛠️</div>
                <h3 className="font-semibold mb-1">Volver al setup</h3>
                <p className="text-zinc-400 text-sm">Tutoriales y kit marketing</p>
              </Link>
              <a
                href={`/api/operadores/reporte-mensual?token=${token}`}
                className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition"
              >
                <div className="text-2xl mb-3">📊</div>
                <h3 className="font-semibold mb-1">Reporte mensual CSV</h3>
                <p className="text-zinc-400 text-sm">Para tu contador / SUNAT</p>
              </a>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ─── MODO B: Auth Supabase (B2B legacy) ──────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/operador/login");

  // Layout simple para legacy B2B (usuario auth Supabase con membership en ay_tenant_members)
  const { data: memberships } = await supabase
    .from("ay_tenant_members")
    .select("tenant_id, role, ay_tenants(id, name, status, city, plan, monthly_fee_pen, macrodroid_token)")
    .eq("user_id", user.id);

  type LegacyTenant = { id: string; name: string; status: string; city: string | null; plan: string | null; monthly_fee_pen: number | null; macrodroid_token: string | null };
  const tenants =
    (memberships
      ?.map((m: { ay_tenants: LegacyTenant | LegacyTenant[] | null }) =>
        Array.isArray(m.ay_tenants) ? m.ay_tenants[0] : m.ay_tenants,
      )
      .filter(Boolean) as LegacyTenant[]) ?? [];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-[#2A2A2A] px-6 py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="font-bold">ActivosYA · Operador</Link>
          <form action="/operador/logout" method="POST">
            <button type="submit" className="text-zinc-400 hover:text-white text-sm transition">
              Salir ({user.email})
            </button>
          </form>
        </div>
      </header>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold mb-2">Tu dashboard</h1>
          <p className="text-zinc-400 mb-8">Operador legacy con cuenta auth.</p>

          {tenants.length === 0 ? (
            <div className="card-surface rounded-2xl p-10 text-center">
              <h2 className="text-xl font-bold mb-3">No tienes activos asignados</h2>
              <p className="text-zinc-400 mb-6">Si eres operador franquicia, usa el link de tu WhatsApp con ?token=...</p>
              <Link href="/se-operador" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors">
                Registrar como operador →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {tenants.map((t) => (
                <div key={t.id} className="card-surface rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-bold">{t.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      {t.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500 mb-4">
                    {t.city ?? "—"} · Plan {t.plan ?? "—"} · {fmtMoney(t.monthly_fee_pen)}
                  </p>
                  {t.macrodroid_token && (
                    <Link
                      href={`/operador/dashboard?token=${t.macrodroid_token}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition"
                    >
                      Ver dashboard franquicia →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
