import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getStats,
  listRecentTrips,
  listActiveTrips,
  listRecentConversations,
  listWaitlist,
  listDriversOnShift,
  listTopWallets,
  listPendingCommissions,
  listRecentTransactions,
  listTopDrivers,
  listTopPassengers,
  cancelTripById,
} from "@/lib/ecodrive/db";

const COOKIE = "ecodrive_admin";
const PATH = "/admin/ecodrive";

async function loginAction(formData: FormData): Promise<void> {
  "use server";
  const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
  const submitted = String(formData.get("p") || "");
  if (expected && submitted === expected) {
    const c = await cookies();
    c.set(COOKIE, expected, { httpOnly: true, sameSite: "lax", path: PATH, secure: true });
  }
  redirect(PATH);
}

async function logoutAction(): Promise<void> {
  "use server";
  const c = await cookies();
  c.delete(COOKIE);
  redirect(PATH);
}

async function cancelTripAction(formData: FormData): Promise<void> {
  "use server";
  const id = Number(formData.get("id"));
  if (id) {
    await cancelTripById(id);
    revalidatePath(PATH);
  }
}

async function isAuthorized(): Promise<boolean> {
  const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === expected;
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Lima",
  });
const fmtHour = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { timeStyle: "short", timeZone: "America/Lima" });
const last4 = (s: string | null) => (s ? s.slice(-4) : "—");
const trunc = (s: string | null, n = 22) => (s ? s.slice(0, n) : "—");

export default async function EcodriveAdminPage() {
  if (!(await isAuthorized())) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center p-6">
        <form action={loginAction} className="max-w-sm w-full space-y-4">
          <h1 className="text-2xl font-bold">🚗 EcoDrive+ Admin</h1>
          <p className="text-sm text-zinc-400">Ingresa el passcode.</p>
          <input
            name="p"
            type="password"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-4 py-3 outline-none focus:border-amber-500"
            placeholder="passcode"
            autoComplete="current-password"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-amber-500 text-black font-semibold py-3 hover:bg-amber-400"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  let stats: Awaited<ReturnType<typeof getStats>> | null = null;
  let activeTrips: Awaited<ReturnType<typeof listActiveTrips>> = [];
  let recentTrips: Awaited<ReturnType<typeof listRecentTrips>> = [];
  let onShift: Awaited<ReturnType<typeof listDriversOnShift>> = [];
  let topWallets: Awaited<ReturnType<typeof listTopWallets>> = [];
  let pendingComm: Awaited<ReturnType<typeof listPendingCommissions>> = [];
  let txs: Awaited<ReturnType<typeof listRecentTransactions>> = [];
  let topDrivers: Awaited<ReturnType<typeof listTopDrivers>> = [];
  let topPassengers: Awaited<ReturnType<typeof listTopPassengers>> = [];
  let convos: Awaited<ReturnType<typeof listRecentConversations>> = [];
  let waitlist: Awaited<ReturnType<typeof listWaitlist>> = [];
  const errors: string[] = [];

  await Promise.all([
    getStats().then((r) => (stats = r)).catch((e: Error) => errors.push(`getStats: ${e?.message || e}`)),
    listActiveTrips().then((r) => (activeTrips = r)).catch((e: Error) => errors.push(`listActiveTrips: ${e?.message || e}`)),
    listRecentTrips(30).then((r) => (recentTrips = r)).catch((e: Error) => errors.push(`listRecentTrips: ${e?.message || e}`)),
    listDriversOnShift().then((r) => (onShift = r)).catch((e: Error) => errors.push(`listDriversOnShift: ${e?.message || e}`)),
    listTopWallets(10).then((r) => (topWallets = r)).catch((e: Error) => errors.push(`listTopWallets: ${e?.message || e}`)),
    listPendingCommissions(15).then((r) => (pendingComm = r)).catch((e: Error) => errors.push(`listPendingCommissions: ${e?.message || e}`)),
    listRecentTransactions(20).then((r) => (txs = r)).catch((e: Error) => errors.push(`listRecentTransactions: ${e?.message || e}`)),
    listTopDrivers(10).then((r) => (topDrivers = r)).catch((e: Error) => errors.push(`listTopDrivers: ${e?.message || e}`)),
    listTopPassengers(10).then((r) => (topPassengers = r)).catch((e: Error) => errors.push(`listTopPassengers: ${e?.message || e}`)),
    listRecentConversations(15).then((r) => (convos = r)).catch((e: Error) => errors.push(`listRecentConversations: ${e?.message || e}`)),
    listWaitlist(50).then((r) => (waitlist = r)).catch((e: Error) => errors.push(`listWaitlist: ${e?.message || e}`)),
  ]);

  if (!stats) {
    stats = {
      users_total: 0, drivers_total: 0, passengers_total: 0, active_total: 0,
      preregistered_total: 0, preregistered_today: 0, conversations_today: 0,
      trips_today: 0, trips_completed_today: 0, trips_active: 0, revenue_today: 0,
      drivers_on_shift: 0, total_wallet_balance: 0, pending_commissions_amount: 0,
      waitlist_total: 0, waitlist_today: 0,
    };
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">🚗 EcoDrive+ Admin</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Datos en vivo · {new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-amber-400 border border-zinc-800 rounded px-3 py-1"
            >
              Cerrar sesión
            </button>
          </form>
        </header>

        {errors.length > 0 && (
          <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            <div className="font-semibold mb-2">⚠️ Errores cargando datos:</div>
            <ul className="list-disc list-inside space-y-1 text-xs font-mono">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {/* HOY */}
        <h2 className="text-lg font-semibold mb-3 text-zinc-300">🔥 Hoy (Lima)</h2>
        <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          <Stat label="Viajes hoy" value={stats.trips_today} highlight />
          <Stat label="Completados" value={stats.trips_completed_today} highlight />
          <Stat label="Activos" value={stats.trips_active} highlight />
          <Stat label="Ingreso S/." value={stats.revenue_today.toFixed(2)} highlight />
          <Stat label="Choferes turno" value={stats.drivers_on_shift} />
          <Stat label="Convos hoy" value={stats.conversations_today} />
        </section>

        {/* GLOBAL */}
        <h2 className="text-lg font-semibold mb-3 text-zinc-300">📊 Globales</h2>
        <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-10">
          <Stat label="Total users" value={stats.users_total} />
          <Stat label="Choferes" value={stats.drivers_total} />
          <Stat label="Pasajeros" value={stats.passengers_total} />
          <Stat label="Activos" value={stats.active_total} />
          <Stat label="Saldo wallets" value={`S/.${stats.total_wallet_balance.toFixed(2)}`} subtle />
          <Stat label="Comisiones x cobrar" value={`S/.${stats.pending_commissions_amount.toFixed(2)}`} subtle />
        </section>

        {/* CHOFERES EN TURNO + VIAJES ACTIVOS */}
        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <Panel title={`🟢 Choferes en turno (${onShift.length})`}>
            {onShift.length === 0 ? (
              <Empty>Ningún chofer en turno.</Empty>
            ) : (
              <Table headers={["Nombre", "Teléfono", "⭐", "Vehículo", "Zona"]}>
                {onShift.map((d) => (
                  <tr key={d.chofer_id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">{d.nombre || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{d.telefono}</td>
                    <td className="px-3 py-2">{d.calificacion?.toFixed(1) || "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {d.vehiculo?.modelo || "—"} {d.vehiculo?.placas || ""}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-400">{d.zona || "—"}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          <Panel title={`🚦 Viajes activos (${activeTrips.length})`}>
            {activeTrips.length === 0 ? (
              <Empty>Sin viajes activos.</Empty>
            ) : (
              <Table headers={["#", "Pasajero", "Estado", "S/.", ""]}>
                {activeTrips.map((t) => (
                  <tr key={t.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2">#{t.id}</td>
                    <td className="px-3 py-2 font-mono text-xs">{last4(t.pasajero_telefono)}</td>
                    <td className="px-3 py-2"><EstadoTag value={t.estado || "?"} /></td>
                    <td className="px-3 py-2 font-semibold">{t.precio_estimado?.toFixed(2) || "—"}</td>
                    <td className="px-3 py-2">
                      <form action={cancelTripAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/30 rounded px-2 py-1"
                        >
                          Cancelar
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </section>

        {/* VIAJES RECIENTES */}
        <Panel title={`📋 Últimos 30 viajes`} className="mb-8">
          {recentTrips.length === 0 ? (
            <Empty>Sin viajes todavía.</Empty>
          ) : (
            <Table headers={["#", "Hora", "Pasajero", "Origen → Destino", "Modo", "S/.", "Estado"]}>
              {recentTrips.map((t) => (
                <tr key={t.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-xs">#{t.id}</td>
                  <td className="px-3 py-2 text-xs text-zinc-400">{fmtTime(t.created_at)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{last4(t.pasajero_telefono)}</td>
                  <td className="px-3 py-2 text-xs text-zinc-300">
                    {trunc(t.origen_texto?.split(",")[0] || "?", 18)} → {trunc(t.destino_texto?.split(",")[0] || "?", 18)}
                  </td>
                  <td className="px-3 py-2"><Badge value={t.modo || "regular"} /></td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {t.precio_estimado ? Number(t.precio_estimado).toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2"><EstadoTag value={t.estado || "?"} /></td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>

        {/* TOP WALLETS + COMISIONES */}
        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <Panel title="💰 Top wallets (saldo)">
            {topWallets.length === 0 ? (
              <Empty>—</Empty>
            ) : (
              <Table headers={["Teléfono", "Saldo S/.", "Lifetime"]}>
                {topWallets.map((w) => (
                  <tr key={w.telefono} className="border-t border-zinc-800">
                    <td className="px-3 py-2 font-mono text-xs">{w.telefono}</td>
                    <td className="px-3 py-2 font-semibold">{Number(w.saldo_disponible).toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {Number(w.total_ganado_lifetime).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          <Panel title="🧾 Comisiones pendientes">
            {pendingComm.length === 0 ? (
              <Empty>Sin comisiones pendientes.</Empty>
            ) : (
              <Table headers={["Viaje", "Chofer", "Monto S/."]}>
                {pendingComm.map((c) => (
                  <tr key={c.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-xs">#{c.viaje_id}</td>
                    <td className="px-3 py-2 font-mono text-xs">{last4(c.chofer_telefono)}</td>
                    <td className="px-3 py-2 font-semibold">
                      {((Number(c.monto_comision) || 0) + (Number(c.service_fee) || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </section>

        {/* TRANSACCIONES */}
        <Panel title="💸 Transacciones recientes" className="mb-8">
          {txs.length === 0 ? (
            <Empty>—</Empty>
          ) : (
            <Table headers={["Hora", "Teléfono", "Tipo", "Monto", "Saldo después", "Descripción"]}>
              {txs.map((t) => {
                const m = Number(t.monto) || 0;
                return (
                  <tr key={t.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-xs text-zinc-400">{fmtHour(t.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{last4(t.telefono)}</td>
                    <td className="px-3 py-2 text-xs">{t.tipo || "—"}</td>
                    <td className={`px-3 py-2 font-semibold ${m >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {m.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {Number(t.saldo_despues || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">{trunc(t.descripcion, 36)}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Panel>

        {/* TOP CHOFERES + PASAJEROS */}
        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <Panel title="🏆 Top 10 choferes (lifetime)">
            {topDrivers.length === 0 ? (
              <Empty>—</Empty>
            ) : (
              <Table headers={["#", "Chofer", "Teléfono", "Ganado S/.", "Viajes"]}>
                {topDrivers.map((u, i) => (
                  <tr key={u.telefono} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2 text-xs">{u.nombre || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{last4(u.telefono)}</td>
                    <td className="px-3 py-2 font-semibold">{u.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs">{u.trips}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          <Panel title="⭐ Top 10 pasajeros (lifetime)">
            {topPassengers.length === 0 ? (
              <Empty>—</Empty>
            ) : (
              <Table headers={["#", "Pasajero", "Teléfono", "Gastado S/.", "Viajes"]}>
                {topPassengers.map((u, i) => (
                  <tr key={u.telefono} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                    <td className="px-3 py-2 text-xs">{u.nombre || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{last4(u.telefono)}</td>
                    <td className="px-3 py-2 font-semibold">{u.amount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-xs">{u.trips}</td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>
        </section>

        {/* WAITLIST + CONVOS */}
        <section className="grid md:grid-cols-2 gap-4 mb-8">
          <Panel title={`📝 Pre-registro (${waitlist.length})`}>
            {waitlist.length === 0 ? (
              <Empty>Sin pre-registros.</Empty>
            ) : (
              <Table headers={["Cuándo", "Teléfono", "Nombre", "Rol"]}>
                {waitlist.slice(0, 20).map((w) => (
                  <tr key={w.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-xs text-zinc-400">{fmtTime(w.created_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{w.telefono}</td>
                    <td className="px-3 py-2 text-xs">{w.nombre || "—"}</td>
                    <td className="px-3 py-2"><Badge value={w.rol || "?"} /></td>
                  </tr>
                ))}
              </Table>
            )}
          </Panel>

          <Panel title="💬 Conversaciones recientes">
            {convos.length === 0 ? (
              <Empty>Sin conversaciones todavía.</Empty>
            ) : (
              <div className="space-y-2 p-2">
                {convos.map((c) => (
                  <div
                    key={c.user_phone}
                    className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs"
                  >
                    <div className="flex justify-between mb-1">
                      <span className="font-mono">{c.user_phone}</span>
                      <span className="text-zinc-500">{fmtHour(c.last_at)}</span>
                    </div>
                    <div className="text-zinc-400 truncate">{c.preview}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>

        <p className="text-xs text-zinc-600 text-center mt-12">
          Refresca la página para datos nuevos · Ningún dato se modifica salvo cancelar viaje.
        </p>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  subtle = false,
  highlight = false,
}: {
  label: string;
  value: number | string;
  subtle?: boolean;
  highlight?: boolean;
}) {
  let cls = "border-zinc-800 bg-zinc-900/30";
  if (highlight) cls = "border-amber-500/30 bg-amber-500/10";
  else if (subtle) cls = "border-zinc-800 bg-zinc-900/30";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-2xl md:text-3xl font-bold">{value}</div>
      <div className="text-[10px] text-zinc-500 uppercase mt-1 tracking-wider">{label}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/30 ${className}`}>
      <div className="px-4 py-2 border-b border-zinc-800 text-sm font-semibold">{title}</div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-zinc-900/60 text-zinc-500 uppercase text-[10px]">
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="text-left px-3 py-2 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-center text-zinc-500 py-6 text-sm">{children}</div>;
}

function Badge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    pasajero: "bg-blue-500/20 text-blue-300",
    chofer: "bg-emerald-500/20 text-emerald-300",
    regular: "bg-zinc-700/50 text-zinc-300",
    eco: "bg-emerald-500/20 text-emerald-300",
    express: "bg-amber-500/20 text-amber-300",
    mujer: "bg-pink-500/20 text-pink-300",
    familia: "bg-blue-500/20 text-blue-300",
    mascotas: "bg-orange-500/20 text-orange-300",
    abuelo: "bg-purple-500/20 text-purple-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] ${colors[value] || "bg-zinc-700/50 text-zinc-300"}`}>
      {value}
    </span>
  );
}

function EstadoTag({ value }: { value: string }) {
  const colors: Record<string, string> = {
    completado: "bg-emerald-500/20 text-emerald-300",
    buscando: "bg-amber-500/20 text-amber-300",
    con_ofertas: "bg-amber-500/20 text-amber-300",
    asignado: "bg-blue-500/20 text-blue-300",
    en_curso: "bg-blue-500/20 text-blue-300",
    cancelado: "bg-red-500/20 text-red-300",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] ${colors[value] || "bg-zinc-700/50 text-zinc-300"}`}>
      {value}
    </span>
  );
}
