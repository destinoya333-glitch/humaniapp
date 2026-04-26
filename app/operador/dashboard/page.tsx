import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActivo } from "@/lib/activos";

type TenantRow = {
  id: string;
  type: string;
  name: string;
  slug: string;
  status: string;
  city: string | null;
  custom_domain: string | null;
};

type AssetRow = {
  id: string;
  tenant_id: string;
  asset_slug: string;
  mode: string;
  monthly_fee_pen: number | null;
  status: string;
  started_at: string;
  twilio_phone_number: string | null;
};

export default async function OperadorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/operador/login");
  }

  // Tenants where this user is a member (RLS handles filtering)
  const { data: memberships } = await supabase
    .from("ay_tenant_members")
    .select("tenant_id, role, ay_tenants(id, type, name, slug, status, city, custom_domain)")
    .eq("user_id", user.id);

  const tenants =
    (memberships
      ?.map((m: { ay_tenants: TenantRow | TenantRow[] | null }) =>
        Array.isArray(m.ay_tenants) ? m.ay_tenants[0] : m.ay_tenants,
      )
      .filter(Boolean) as TenantRow[]) ?? [];

  let assets: AssetRow[] = [];
  if (tenants.length > 0) {
    const tenantIds = tenants.map((t) => t.id);
    const { data: assetData } = await supabase
      .from("ay_tenant_assets")
      .select("id, asset_slug, mode, monthly_fee_pen, status, started_at, twilio_phone_number, tenant_id")
      .in("tenant_id", tenantIds);
    assets = (assetData ?? []) as AssetRow[];
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-[#2A2A2A] px-6 py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">
              <span className="gold-gradient">Activos</span>
              <span className="text-white">YA</span>
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400">
              Panel del operador
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400 hidden sm:inline">{user.email}</span>
            <form action="/operador/logout" method="POST">
              <button
                type="submit"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Tu dashboard</h1>
          <p className="text-zinc-400 mb-10">
            Resumen de los activos digitales que operas.
          </p>

          {tenants.length === 0 ? (
            <div className="card-surface rounded-2xl p-10 text-center">
              <p className="text-amber-400 text-xs font-medium mb-3 tracking-widest uppercase">
                Sin tenants activos
              </p>
              <h2 className="text-2xl font-bold mb-3">Tu cuenta aún no tiene activos asignados</h2>
              <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
                Si ya conversaste con nosotros y firmaste el contrato, te
                asignaremos los activos en las próximas 24 horas. Si todavía
                no, agenda una reunión para evaluar el catálogo.
              </p>
              <Link
                href="/#contacto"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors"
              >
                Solicitar acceso a un activo →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {tenants.map((tenant) => {
                const tenantAssets = assets.filter((a) => a.tenant_id === tenant.id);
                return (
                  <div key={tenant.id} className="card-surface rounded-2xl p-7">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
                      <div>
                        <p className="text-amber-400 text-xs font-medium mb-1 tracking-widest uppercase">
                          {tenant.type === "master" ? "Master tenant" : "Operador"}
                        </p>
                        <h2 className="text-2xl font-bold">{tenant.name}</h2>
                        <p className="text-zinc-500 text-sm mt-1">
                          {tenant.city ?? "—"} ·{" "}
                          {tenant.custom_domain ?? "sin dominio custom"} ·{" "}
                          <span
                            className={
                              tenant.status === "active"
                                ? "text-emerald-400"
                                : "text-zinc-500"
                            }
                          >
                            {tenant.status}
                          </span>
                        </p>
                      </div>
                    </div>

                    {tenantAssets.length === 0 ? (
                      <p className="text-zinc-500 text-sm">
                        Sin activos asignados a este tenant todavía.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#2A2A2A]">
                              <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Activo</th>
                              <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Modelo</th>
                              <th className="text-right py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Mensualidad</th>
                              <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">WhatsApp</th>
                              <th className="text-left py-3 px-4 text-zinc-500 font-medium uppercase tracking-widest text-xs">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenantAssets.map((asset) => {
                              const def = getActivo(asset.asset_slug);
                              return (
                                <tr key={asset.id} className="border-b border-[#2A2A2A]/50">
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-zinc-200">
                                      {def?.name ?? asset.asset_slug}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                      desde {new Date(asset.started_at).toLocaleDateString("es-PE")}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-zinc-400 capitalize">
                                    {asset.mode === "rent" ? "Renta" : "Compra"}
                                  </td>
                                  <td className="py-3 px-4 text-right text-amber-400 font-mono">
                                    {asset.monthly_fee_pen
                                      ? `S/ ${asset.monthly_fee_pen.toLocaleString("es-PE")}`
                                      : "—"}
                                  </td>
                                  <td className="py-3 px-4 text-zinc-400 font-mono text-xs">
                                    {asset.twilio_phone_number ?? "—"}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full border ${
                                        asset.status === "active"
                                          ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                                          : "text-zinc-400 bg-zinc-400/10 border-zinc-400/20"
                                      }`}
                                    >
                                      {asset.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="https://wa.me/51961347233"
              target="_blank"
              rel="noopener noreferrer"
              className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition-colors"
            >
              <div className="text-2xl mb-3">💬</div>
              <h3 className="font-semibold mb-1">Soporte por WhatsApp</h3>
              <p className="text-zinc-400 text-sm">Resolvemos en menos de 24h hábiles</p>
            </a>
            <Link href="/#catalogo" className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition-colors">
              <div className="text-2xl mb-3">📦</div>
              <h3 className="font-semibold mb-1">Agregar otro activo</h3>
              <p className="text-zinc-400 text-sm">Explora el catálogo y solicita acceso</p>
            </Link>
            <Link href="/#contacto" className="card-surface rounded-2xl p-6 hover:border-amber-500/30 transition-colors">
              <div className="text-2xl mb-3">📊</div>
              <h3 className="font-semibold mb-1">Reportar incidencia</h3>
              <p className="text-zinc-400 text-sm">Bugs, consultas, mejoras</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
