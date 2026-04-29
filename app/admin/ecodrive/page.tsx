import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { listWaitlist, getStats, supabase } from "@/lib/ecodrive/db";

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

  const [stats, waitlist, recentConvos] = await Promise.all([
    getStats(),
    listWaitlist(50),
    supabase
      .from("ecodrive_conversations")
      .select("celular, updated_at, messages")
      .order("updated_at", { ascending: false })
      .limit(15)
      .then((r: { data: Array<{ celular: string; updated_at: string; messages: Array<{ role: string; content: string }> }> | null }) => r.data || []),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">EcoDrive+ Admin</h1>
        <p className="text-sm text-zinc-500 mb-8">Última actualización: {new Date().toLocaleString("es-PE")}</p>

        <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-10">
          <Stat label="Users" value={stats.users_total} />
          <Stat label="Drivers" value={stats.drivers_total} />
          <Stat label="Passengers" value={stats.passengers_total} />
          <Stat label="Waitlist" value={stats.waitlist_total} />
          <Stat label="Hoy" value={stats.waitlist_today} subtle />
          <Stat label="Convos hoy" value={stats.conversations_today} subtle />
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Waitlist (últimos 50)</h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Cuándo</th>
                  <th className="text-left px-4 py-2">Celular</th>
                  <th className="text-left px-4 py-2">Nombre</th>
                  <th className="text-left px-4 py-2">Interés</th>
                  <th className="text-left px-4 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-zinc-500">Sin entradas todavía.</td></tr>
                ) : waitlist.map((w: { id: string; celular: string; nombre: string | null; interes: string; notas: string | null; created_at: string }) => (
                  <tr key={w.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2 text-zinc-400">{new Date(w.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-4 py-2 font-mono">{w.celular}</td>
                    <td className="px-4 py-2">{w.nombre || "—"}</td>
                    <td className="px-4 py-2"><Badge value={w.interes} /></td>
                    <td className="px-4 py-2 text-zinc-400">{w.notas || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Conversaciones recientes</h2>
          <div className="space-y-3">
            {recentConvos.length === 0 ? (
              <p className="text-zinc-500">Sin conversaciones todavía.</p>
            ) : recentConvos.map((c: { celular: string; updated_at: string; messages: Array<{ role: string; content: string }> }) => (
              <details key={c.celular} className="rounded-lg border border-zinc-800 bg-zinc-900/40">
                <summary className="cursor-pointer px-4 py-3 flex justify-between text-sm">
                  <span className="font-mono">{c.celular}</span>
                  <span className="text-zinc-500">{new Date(c.updated_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</span>
                </summary>
                <div className="border-t border-zinc-800 p-4 space-y-2 text-sm">
                  {(c.messages || []).slice(-6).map((m: { role: string; content: string }, i: number) => (
                    <div key={i} className={m.role === "user" ? "text-zinc-300" : "text-amber-400"}>
                      <span className="opacity-50 mr-2">{m.role === "user" ? "→" : "←"}</span>
                      {m.content}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, subtle = false }: { label: string; value: number; subtle?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${subtle ? "border-zinc-800 bg-zinc-900/30" : "border-amber-500/20 bg-amber-500/5"}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 uppercase mt-1 tracking-wider">{label}</div>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  const colors: Record<string, string> = {
    passenger: "bg-blue-500/20 text-blue-300",
    driver: "bg-emerald-500/20 text-emerald-300",
    both: "bg-amber-500/20 text-amber-300",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[value] || "bg-zinc-700 text-zinc-300"}`}>
      {value}
    </span>
  );
}
