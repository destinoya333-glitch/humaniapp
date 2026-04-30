import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  getStats,
  listRecentTrips,
  listRecentConversations,
  listWaitlist,
} from "@/lib/ecodrive/db";

const COOKIE = "ecodrive_admin";

async function isAuthorized(): Promise<boolean> {
  const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
  if (!expected) return false;
  const c = await cookies();
  return c.get(COOKIE)?.value === expected;
}

export default async function EcodriveAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const sp = await searchParams;

  // Login flow: ?p=passcode setea cookie y redirige sin query.
  if (sp.p) {
    const expected = process.env.ECODRIVE_ADMIN_PASSCODE;
    if (expected && sp.p === expected) {
      const c = await cookies();
      c.set(COOKIE, sp.p, { httpOnly: true, sameSite: "lax", path: "/admin/ecodrive" });
      redirect("/admin/ecodrive");
    }
  }

  if (!(await isAuthorized())) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center p-6">
        <form className="max-w-sm w-full space-y-4">
          <h1 className="text-2xl font-bold">EcoDrive+ Admin</h1>
          <p className="text-sm text-zinc-400">Ingresa el passcode.</p>
          <input
            name="p"
            type="password"
            className="w-full rounded-md bg-zinc-900 border border-zinc-800 px-4 py-3 outline-none focus:border-amber-500"
            placeholder="passcode"
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

  const [stats, trips, convos, waitlist] = await Promise.all([
    getStats(),
    listRecentTrips(30),
    listRecentConversations(15),
    listWaitlist(50),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">🚗 EcoDrive+ Admin</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Datos en vivo · {new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })}
        </p>

        <h2 className="text-lg font-semibold mb-3 text-zinc-300">Hoy</h2>
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Stat label="Viajes hoy" value={stats.trips_today} highlight />
          <Stat label="Completados" value={stats.trips_completed_today} highlight />
          <Stat label="Ingreso S/." value={stats.revenue_today.toFixed(2)} highlight />
          <Stat label="Choferes en turno" value={stats.drivers_on_shift} />
          <Stat label="Convos hoy" value={stats.conversations_today} />
        </section>

        <h2 className="text-lg font-semibold mb-3 text-zinc-300">Base de usuarios</h2>
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          <Stat label="Total" value={stats.users_total} />
          <Stat label="Choferes" value={stats.drivers_total} />
          <Stat label="Pasajeros" value={stats.passengers_total} />
          <Stat label="Activos" value={stats.active_total} />
          <Stat label="Pre-registro" value={stats.preregistered_total} subtle />
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Últimos viajes</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Cuándo</th>
                  <th className="text-left px-4 py-2">Pasajero</th>
                  <th className="text-left px-4 py-2">Origen → Destino</th>
                  <th className="text-left px-4 py-2">Modo</th>
                  <th className="text-right px-4 py-2">S/.</th>
                  <th className="text-left px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-zinc-500">
                      Sin viajes todavía.
                    </td>
                  </tr>
                ) : (
                  trips.map((t) => (
                    <tr key={t.id} className="border-t border-zinc-800">
                      <td className="px-4 py-2 text-zinc-400">
                        {new Date(t.created_at).toLocaleString("es-PE", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Lima",
                        })}
                      </td>
                      <td className="px-4 py-2 font-mono">{t.pasajero_telefono || "—"}</td>
                      <td className="px-4 py-2 text-zinc-300">
                        {(t.origen_texto || "?").split(",")[0]} → {(t.destino_texto || "?").split(",")[0]}
                      </td>
                      <td className="px-4 py-2">
                        <Badge value={t.modo || "regular"} />
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {t.precio_estimado ? Number(t.precio_estimado).toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <EstadoTag value={t.estado || "?"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Pre-registro / waitlist (últimos 50)</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Cuándo</th>
                  <th className="text-left px-4 py-2">Celular</th>
                  <th className="text-left px-4 py-2">Nombre</th>
                  <th className="text-left px-4 py-2">Rol</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-zinc-500">
                      Sin pre-registros.
                    </td>
                  </tr>
                ) : (
                  waitlist.map((w) => (
                    <tr key={w.id} className="border-t border-zinc-800">
                      <td className="px-4 py-2 text-zinc-400">
                        {new Date(w.created_at).toLocaleString("es-PE", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Lima",
                        })}
                      </td>
                      <td className="px-4 py-2 font-mono">{w.telefono}</td>
                      <td className="px-4 py-2">{w.nombre || "—"}</td>
                      <td className="px-4 py-2">
                        <Badge value={w.rol || "?"} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Conversaciones recientes</h2>
          <div className="space-y-2">
            {convos.length === 0 ? (
              <p className="text-zinc-500">Sin conversaciones todavía.</p>
            ) : (
              convos.map((c) => (
                <div
                  key={c.user_phone}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 flex justify-between text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono">{c.user_phone}</div>
                    <div className="text-zinc-400 truncate">{c.preview}</div>
                  </div>
                  <span className="text-zinc-500 text-xs ml-4 whitespace-nowrap">
                    {new Date(c.last_at).toLocaleString("es-PE", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Lima",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
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
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 uppercase mt-1 tracking-wider">{label}</div>
    </div>
  );
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
    <span className={`px-2 py-1 rounded text-xs ${colors[value] || "bg-zinc-700/50 text-zinc-300"}`}>
      {value}
    </span>
  );
}

function EstadoTag({ value }: { value: string }) {
  const colors: Record<string, string> = {
    completado: "bg-emerald-500/20 text-emerald-300",
    buscando: "bg-amber-500/20 text-amber-300",
    aceptado: "bg-blue-500/20 text-blue-300",
    cancelado: "bg-red-500/20 text-red-300",
    en_curso: "bg-blue-500/20 text-blue-300",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[value] || "bg-zinc-700/50 text-zinc-300"}`}>
      {value}
    </span>
  );
}
