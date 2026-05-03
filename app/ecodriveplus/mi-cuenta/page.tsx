import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import MiCuentaClient from "./MiCuentaClient";

export const metadata: Metadata = {
  title: "Mi cuenta — EcoDrive+",
  description: "Tu historial, tickets de sorteo, BilleteraEco y constancia de servicios.",
};

export const dynamic = "force-dynamic";

async function getSession() {
  const ck = await cookies();
  const token = ck.get("eco_session")?.value;
  if (!token) return null;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await sb.from("eco_sessions").select("phone, expires_at").eq("token", token).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return { phone: data.phone };
}

async function getDashboardData(phone: string) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: ticketsHoy }, { data: ticketsHistorico }, { data: ganados }] = await Promise.all([
    sb.from("sorteos_tickets").select("id", { count: "exact", head: true }).eq("user_phone", phone).eq("fecha", today),
    sb.from("sorteos_tickets").select("id, fecha", { count: "exact" }).eq("user_phone", phone).order("fecha", { ascending: false }).limit(30),
    sb.from("sorteos_diarios").select("fecha, premio_soles, premio_descripcion").eq("ganador_phone", phone).order("fecha", { ascending: false }).limit(10),
  ]);

  return {
    tickets_hoy: ticketsHoy ?? 0,
    tickets_historico: ticketsHistorico?.length ?? 0,
    sorteos_ganados: ganados || [],
  };
}

export default async function MiCuentaPage() {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <Link href="/ecodriveplus" className="flex items-center gap-3 group">
            <Image src="/ecodrive-logo.png" alt="EcoDrive+" width={420} height={148} priority className="h-12 w-auto md:h-14 object-contain" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/ecodriveplus" className="text-zinc-400 hover:text-white transition">Inicio</Link>
            <Link href="/ecodriveplus/sorteos" className="text-zinc-400 hover:text-white transition">Sorteos</Link>
          </nav>
        </div>
      </header>

      {!session ? <MiCuentaClient /> : <MiCuentaDashboard phone={session.phone} />}
    </main>
  );
}

async function MiCuentaDashboard({ phone }: { phone: string }) {
  const data = await getDashboardData(phone);
  const phoneShown = `+51 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;

  return (
    <section className="relative px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-orange-400 uppercase tracking-widest font-semibold">Mi cuenta</div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Hola 👋</h1>
            <div className="mt-1 text-zinc-400 font-mono text-sm">{phoneShown}</div>
          </div>
          <form action="/api/ecodrive/auth/session" method="POST">
            <button className="text-sm text-zinc-500 hover:text-orange-400 transition">Cerrar sesión</button>
          </form>
        </div>

        {/* Stats */}
        <div className="mt-10 grid md:grid-cols-3 gap-5">
          <DashCard
            label="Tickets hoy"
            value={String(data.tickets_hoy)}
            sub="Para el sorteo S/.20 de las 10 PM"
            icon="🎟️"
          />
          <DashCard
            label="Tickets últimos 30 días"
            value={String(data.tickets_historico)}
            sub="Cada viaje suma uno"
            icon="📅"
          />
          <DashCard
            label="Sorteos ganados"
            value={String(data.sorteos_ganados.length)}
            sub={data.sorteos_ganados.length > 0 ? "¡Premio en BilleteraEco!" : "Aún ninguno"}
            icon="🏆"
          />
        </div>

        {/* Sección sorteos ganados */}
        {data.sorteos_ganados.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold">Tus sorteos ganados</h2>
            <div className="mt-4 space-y-3">
              {data.sorteos_ganados.map((s) => (
                <div key={s.fecha} className="flex items-center justify-between rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5">
                  <div>
                    <div className="text-xs text-zinc-500">{new Date(s.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })}</div>
                    <div className="mt-1 font-bold">{s.premio_descripcion}</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">S/. {s.premio_soles}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximamente */}
        <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-orange-400 text-xs uppercase tracking-widest font-semibold">Próximamente</div>
          <div className="mt-3 grid md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <div className="text-2xl">📊</div>
              <div className="mt-2 font-bold">Historial completo de viajes</div>
              <div className="text-xs text-zinc-500 mt-1">Filtros por fecha, ruta y monto</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <div className="text-2xl">📄</div>
              <div className="mt-2 font-bold">Constancia financiera PDF</div>
              <div className="text-xs text-zinc-500 mt-1">Descarga oficial para caja financiera</div>
            </div>
            <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4">
              <div className="text-2xl">💰</div>
              <div className="mt-2 font-bold">BilleteraEco</div>
              <div className="text-xs text-zinc-500 mt-1">Saldo, recargas y movimientos</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur p-6 hover:border-orange-500/40 transition">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500 uppercase tracking-widest">{label}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="mt-3 text-4xl font-bold bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="mt-2 text-xs text-zinc-500">{sub}</div>
    </div>
  );
}
