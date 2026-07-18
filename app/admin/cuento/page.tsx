/**
 * Panel admin /admin/cuento
 *
 * Dashboard de TuCuentoYa para Percy: métricas de pedidos, ingresos,
 * VIPs, costos reales, top clientes, promos otorgadas.
 *
 * Auth: passcode env var ACTIVOSYA_ADMIN_PASSCODE + cookie httpOnly
 * (mismo patrón que /admin/operadores y /admin/ecodrive).
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/activosya/db";

const COOKIE = "activosya_admin";
const PATH = "/admin/cuento";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════
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
    c.set(COOKIE, expected, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: true,
    });
  }
  redirect(PATH);
}

async function logoutAction(): Promise<void> {
  "use server";
  const c = await cookies();
  c.delete({ name: COOKIE, path: "/" });
  redirect(PATH);
}

// ═══════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════
type MetricasGenerales = {
  pedidos_hoy: number;
  pedidos_7d: number;
  pedidos_30d: number;
  ingresos_hoy_pen: number;
  ingresos_7d_pen: number;
  ingresos_30d_pen: number;
  entregados_30d: number;
  fallidos_30d: number;
  costo_real_promedio_pen: number;
  costo_total_30d_pen: number;
  utilidad_30d_pen: number;
  wallet_circulacion_pen: number;
  vip_estrella_activos: number;
  vip_magico_activos: number;
  promos_otorgadas: number;
  promos_convertidas: number;
};

type ClienteTop = {
  celular: string;
  nombre?: string | null;
  pedidos: number;
  monto_total: number;
};

async function cargarMetricas(): Promise<MetricasGenerales> {
  const ahora = new Date();
  const hoyISO = new Date(ahora.toISOString().slice(0, 10)).toISOString();
  const hace7d = new Date(ahora.getTime() - 7 * 86400_000).toISOString();
  const hace30d = new Date(ahora.getTime() - 30 * 86400_000).toISOString();

  const PEN_RATE = 3.75;

  // Pedidos
  const [hoyR, w7R, m30R] = await Promise.all([
    supabaseAdmin
      .from("tci_pedidos")
      .select("id, monto, status", { count: "exact" })
      .gte("created_at", hoyISO),
    supabaseAdmin
      .from("tci_pedidos")
      .select("id, monto, status", { count: "exact" })
      .gte("created_at", hace7d),
    supabaseAdmin
      .from("tci_pedidos")
      .select("id, monto, status", { count: "exact" })
      .gte("created_at", hace30d),
  ]);

  const sumMonto = (rows: Array<{ monto: number; status: string }> | null) =>
    (rows ?? [])
      .filter((r) => r.status === "entregado")
      .reduce((acc, r) => acc + Number(r.monto || 0), 0);

  const countStatus = (
    rows: Array<{ status: string }> | null,
    status: string,
  ): number => (rows ?? []).filter((r) => r.status === status).length;

  // Costos reales últimos 30d
  const { data: costos } = await supabaseAdmin
    .from("tci_cuentos_generados")
    .select("costo_real_usd")
    .gte("created_at", hace30d);

  const totalCostoUSD =
    (costos ?? []).reduce(
      (acc: number, c: { costo_real_usd?: number | null }) =>
        acc + Number(c.costo_real_usd ?? 0),
      0,
    );
  const promedioCostoUSD = costos?.length
    ? totalCostoUSD / costos.length
    : 0;

  // Wallet en circulación
  const { data: wallets } = await supabaseAdmin
    .from("tci_clientes")
    .select("wallet_balance");
  const walletTotal =
    (wallets ?? []).reduce(
      (acc: number, w: { wallet_balance?: number | null }) =>
        acc + Number(w.wallet_balance ?? 0),
      0,
    );

  // VIPs activos
  const { data: vipsActivos } = await supabaseAdmin
    .from("tci_vip")
    .select("plan, fecha_vencimiento, activo")
    .eq("activo", true)
    .gt("fecha_vencimiento", ahora.toISOString());

  const vipEstrella =
    (vipsActivos ?? []).filter(
      (v: { plan: string }) => v.plan.startsWith("estrella"),
    ).length;
  const vipMagico =
    (vipsActivos ?? []).filter(
      (v: { plan: string }) => v.plan.startsWith("magico"),
    ).length;

  // Promos
  const { data: promos } = await supabaseAdmin
    .from("tci_promos")
    .select("id, usado, celular")
    .eq("tipo", "primer_cuento_gratis");
  const promosOtorgadas = promos?.length ?? 0;
  const celularesPromo = new Set((promos ?? []).map((p: { celular: string }) => p.celular));

  // ¿Cuántos de los que recibieron promo después recargaron?
  let promosConvertidas = 0;
  if (celularesPromo.size > 0) {
    const { data: recargas } = await supabaseAdmin
      .from("tci_recargas")
      .select("celular");
    const celularesRecargaron = new Set(
      (recargas ?? []).map((r: { celular: string }) => r.celular),
    );
    promosConvertidas = [...celularesPromo].filter((c) =>
      celularesRecargaron.has(c),
    ).length;
  }

  const ingresos30d = sumMonto(
    m30R.data as Array<{ monto: number; status: string }> | null,
  );
  const costo30dPen = totalCostoUSD * PEN_RATE;
  const utilidad30d = ingresos30d - costo30dPen;

  return {
    pedidos_hoy: hoyR.count ?? 0,
    pedidos_7d: w7R.count ?? 0,
    pedidos_30d: m30R.count ?? 0,
    ingresos_hoy_pen: sumMonto(
      hoyR.data as Array<{ monto: number; status: string }> | null,
    ),
    ingresos_7d_pen: sumMonto(
      w7R.data as Array<{ monto: number; status: string }> | null,
    ),
    ingresos_30d_pen: ingresos30d,
    entregados_30d: countStatus(
      m30R.data as Array<{ status: string }> | null,
      "entregado",
    ),
    fallidos_30d: countStatus(
      m30R.data as Array<{ status: string }> | null,
      "fallido",
    ),
    costo_real_promedio_pen: promedioCostoUSD * PEN_RATE,
    costo_total_30d_pen: costo30dPen,
    utilidad_30d_pen: utilidad30d,
    wallet_circulacion_pen: walletTotal,
    vip_estrella_activos: vipEstrella,
    vip_magico_activos: vipMagico,
    promos_otorgadas: promosOtorgadas,
    promos_convertidas: promosConvertidas,
  };
}

async function cargarTopClientes(): Promise<ClienteTop[]> {
  const { data } = await supabaseAdmin
    .from("tci_pedidos")
    .select("celular, monto, cliente_id")
    .eq("status", "entregado");

  const agrupado = new Map<string, { pedidos: number; monto: number }>();
  for (const p of (data ?? []) as Array<{
    celular: string;
    monto: number;
  }>) {
    const ex = agrupado.get(p.celular) ?? { pedidos: 0, monto: 0 };
    agrupado.set(p.celular, {
      pedidos: ex.pedidos + 1,
      monto: ex.monto + Number(p.monto || 0),
    });
  }

  // Top 10 por pedidos
  const top = [...agrupado.entries()]
    .map(([celular, v]) => ({ celular, ...v }))
    .sort((a, b) => b.pedidos - a.pedidos)
    .slice(0, 10);

  // Anotar con nombres
  const cels = top.map((t) => t.celular);
  const { data: clientes } = await supabaseAdmin
    .from("tci_clientes")
    .select("celular, nombre, nombre_papa")
    .in("celular", cels);

  const nombres = new Map<string, string | null>();
  for (const c of (clientes ?? []) as Array<{
    celular: string;
    nombre?: string | null;
    nombre_papa?: string | null;
  }>) {
    nombres.set(c.celular, c.nombre ?? c.nombre_papa ?? null);
  }

  return top.map((t) => ({
    celular: t.celular,
    nombre: nombres.get(t.celular) ?? null,
    pedidos: t.pedidos,
    monto_total: t.monto,
  }));
}

async function cargarUltimosPedidos(): Promise<
  Array<{
    id: string;
    celular: string;
    duracion_min: number;
    escenario: string;
    monto: number;
    status: string;
    fuente_pago: string;
    created_at: string;
  }>
> {
  const { data } = await supabaseAdmin
    .from("tci_pedidos")
    .select(
      "id, celular, duracion_min, escenario, monto, status, fuente_pago, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as Array<{
    id: string;
    celular: string;
    duracion_min: number;
    escenario: string;
    monto: number;
    status: string;
    fuente_pago: string;
    created_at: string;
  }>;
}

// ═══════════════════════════════════════════════════════════
// VIEW
// ═══════════════════════════════════════════════════════════
function fmtPEN(n: number): string {
  return `S/ ${n.toFixed(2)}`;
}

function fmtPct(num: number, denom: number): string {
  if (denom === 0) return "—";
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function StatusBadge({ s }: { s: string }) {
  const cls =
    s === "entregado"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : s === "fallido"
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : s === "generando"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : s === "esperando_pago"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}
    >
      {s}
    </span>
  );
}

export default async function AdminCuentoPage() {
  if (!(await isAuthorized())) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
        <form
          action={loginAction}
          className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-[#0F0F0F] p-8 shadow-2xl"
        >
          <div className="text-3xl mb-3 text-center">🐕</div>
          <h1 className="text-xl font-bold mb-2 text-center">
            Admin TuCuentoYa
          </h1>
          <p className="text-zinc-400 text-sm text-center mb-6">
            Acceso restringido — passcode requerido.
          </p>
          <input
            type="password"
            name="p"
            placeholder="Passcode"
            className="w-full px-4 py-3 rounded-xl bg-[#181818] border border-zinc-800 text-white focus:border-amber-500 focus:outline-none"
            autoFocus
            required
          />
          <button
            type="submit"
            className="mt-4 w-full px-6 py-3 bg-amber-500 text-black rounded-xl font-semibold hover:bg-amber-400 transition-all"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const [met, top, ultimos] = await Promise.all([
    cargarMetricas(),
    cargarTopClientes(),
    cargarUltimosPedidos(),
  ]);

  const tasaEntrega = met.entregados_30d / (met.pedidos_30d || 1);
  const tasaConversionPromo = met.promos_convertidas / (met.promos_otorgadas || 1);
  const margenBruto =
    met.ingresos_30d_pen > 0
      ? (met.utilidad_30d_pen / met.ingresos_30d_pen) * 100
      : 0;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="border-b border-zinc-800 px-6 py-4 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur z-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐕</span>
            <div>
              <h1 className="text-lg font-bold">TuCuentoYa · Admin</h1>
              <p className="text-xs text-zinc-500">
                Dashboard métricas en tiempo real
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/cuento"
              className="text-zinc-400 hover:text-amber-400"
            >
              Ver landing
            </Link>
            <form action={logoutAction}>
              <button className="text-zinc-400 hover:text-red-400 text-sm">
                Salir
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* KPIs principales */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="Pedidos hoy"
            value={String(met.pedidos_hoy)}
            sub={`${met.pedidos_7d} últimos 7 días`}
          />
          <KpiCard
            label="Ingresos 30d"
            value={fmtPEN(met.ingresos_30d_pen)}
            sub={`Hoy: ${fmtPEN(met.ingresos_hoy_pen)}`}
            highlight
          />
          <KpiCard
            label="Utilidad 30d"
            value={fmtPEN(met.utilidad_30d_pen)}
            sub={`Margen ${margenBruto.toFixed(1)}%`}
            highlight
          />
          <KpiCard
            label="Costo real prom."
            value={fmtPEN(met.costo_real_promedio_pen)}
            sub="Por cuento generado"
          />
        </section>

        {/* VIPs + Promos */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            label="VIPs Estrella"
            value={String(met.vip_estrella_activos)}
            sub={`S/${met.vip_estrella_activos * 18} MRR`}
          />
          <KpiCard
            label="VIPs Mágico"
            value={String(met.vip_magico_activos)}
            sub={`S/${met.vip_magico_activos * 30} MRR`}
          />
          <KpiCard
            label="Wallet en circulación"
            value={fmtPEN(met.wallet_circulacion_pen)}
            sub="Saldo prepago activo"
          />
          <KpiCard
            label="Conv. promo gratis"
            value={`${met.promos_convertidas} / ${met.promos_otorgadas}`}
            sub={`Tasa ${(tasaConversionPromo * 100).toFixed(1)}%`}
          />
        </section>

        {/* Quality */}
        <section className="grid sm:grid-cols-3 gap-4 mb-8">
          <KpiCard
            label="Entregados 30d"
            value={String(met.entregados_30d)}
            sub={`Tasa entrega ${(tasaEntrega * 100).toFixed(1)}%`}
          />
          <KpiCard
            label="Fallidos 30d"
            value={String(met.fallidos_30d)}
            sub={fmtPct(met.fallidos_30d, met.pedidos_30d) + " del total"}
          />
          <KpiCard
            label="MRR proyectado"
            value={fmtPEN(
              met.vip_estrella_activos * 18 + met.vip_magico_activos * 30,
            )}
            sub="Solo VIPs · sin sueltos"
            highlight
          />
        </section>

        {/* Top clientes */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4">Top 10 clientes</h2>
          <div className="rounded-2xl border border-zinc-800 bg-[#0F0F0F] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#181818] text-xs uppercase text-zinc-500">
                <tr>
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-5 py-3">Cliente</th>
                  <th className="text-left px-5 py-3">Celular</th>
                  <th className="text-right px-5 py-3">Pedidos</th>
                  <th className="text-right px-5 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {top.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-zinc-500"
                    >
                      Sin clientes aún. Lanza la promo para arrancar.
                    </td>
                  </tr>
                ) : (
                  top.map((c, i) => (
                    <tr
                      key={c.celular}
                      className="border-t border-zinc-800 hover:bg-[#141414]"
                    >
                      <td className="px-5 py-3 text-zinc-500">{i + 1}</td>
                      <td className="px-5 py-3 font-medium">
                        {c.nombre ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-zinc-400 font-mono text-xs">
                        {c.celular}
                      </td>
                      <td className="px-5 py-3 text-right">{c.pedidos}</td>
                      <td className="px-5 py-3 text-right text-amber-400 font-semibold">
                        {fmtPEN(c.monto_total)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Últimos pedidos */}
        <section>
          <h2 className="text-lg font-bold mb-4">Últimos 20 pedidos</h2>
          <div className="rounded-2xl border border-zinc-800 bg-[#0F0F0F] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#181818] text-xs uppercase text-zinc-500">
                <tr>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Celular</th>
                  <th className="text-center px-4 py-3">Dur</th>
                  <th className="text-left px-4 py-3">Escenario</th>
                  <th className="text-left px-4 py-3">Fuente pago</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-center px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-8 text-center text-zinc-500"
                    >
                      Sin pedidos aún.
                    </td>
                  </tr>
                ) : (
                  ultimos.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-zinc-800 hover:bg-[#141414]"
                    >
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {new Date(p.created_at).toLocaleString("es-PE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {p.celular}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.duracion_min}m
                      </td>
                      <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">
                        {p.escenario}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {p.fuente_pago}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {fmtPEN(p.monto)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge s={p.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-xs text-zinc-600 mt-12">
          Datos en tiempo real desde Supabase · Actualiza la página para refrescar.
        </p>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════
function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-5 border ${
        highlight
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-zinc-800 bg-[#0F0F0F]"
      }`}
    >
      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-bold ${
          highlight ? "text-amber-400" : "text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
