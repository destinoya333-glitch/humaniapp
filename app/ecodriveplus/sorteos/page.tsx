import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Sorteos diarios EcoDrive+ — Cada viaje es 1 ticket",
  description:
    "Sorteo diario S/.20 BilleteraEco para usuarios EcoDrive+. Cada viaje completado = 1 ticket automático. Ganador anunciado por WhatsApp 10 PM.",
};

export const revalidate = 60;

const PASAJERO_WA = "https://wa.me/51994810242?text=Hola,%20quiero%20pedir%20un%20taxi";

type Sorteo = {
  fecha: string;
  premio_soles: number;
  ganador_name: string | null;
  ganador_phone: string | null;
  ganador_role: string | null;
  total_tickets: number;
  total_participantes: number;
  estado: string;
};

async function getSorteos(): Promise<{ hoy: Sorteo | null; pasados: Sorteo[] }> {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const today = new Date().toISOString().slice(0, 10);
    const { data: hoy } = await sb.from("sorteos_diarios").select("*").eq("fecha", today).maybeSingle();
    const { data: pasados } = await sb
      .from("sorteos_diarios")
      .select("*")
      .neq("fecha", today)
      .order("fecha", { ascending: false })
      .limit(7);
    return { hoy, pasados: pasados || [] };
  } catch {
    return { hoy: null, pasados: [] };
  }
}

function maskPhone(p: string | null): string {
  if (!p) return "—";
  const last3 = p.slice(-3);
  return `+51 *** *** ${last3}`;
}

export default async function SorteosPage() {
  const { hoy, pasados } = await getSorteos();
  const fechaHoyLima = new Intl.DateTimeFormat("es-PE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Lima",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      {/* Background mesh */}
      <div aria-hidden className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-orange-500/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-orange-600/15 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0A0A0A]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-20 flex items-center justify-between">
          <Link href="/ecodriveplus" className="flex items-center gap-3 group">
            <Image src="/ecodrive-logo.png" alt="EcoDrive+" width={420} height={148} priority className="h-12 w-auto md:h-14 object-contain" />
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/ecodriveplus" className="text-zinc-400 hover:text-white transition">Inicio</Link>
            <Link href="/ecodriveplus/mi-cuenta" className="text-zinc-400 hover:text-white transition">Mi cuenta</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-12 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-widest uppercase">
            🎰 Sorteos diarios
          </div>
          <h1 className="mt-5 text-5xl md:text-6xl font-bold tracking-tight">
            Cada viaje es <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">un ticket</span>
          </h1>
          <p className="mt-5 text-lg text-zinc-300 max-w-2xl mx-auto">
            Cada vez que completas un viaje en EcoDrive+, ganas <strong>1 ticket automático</strong> para el
            sorteo del día. Más viajes = más chances. Ganador anunciado por WhatsApp a las <strong>10 PM</strong>.
          </p>
        </div>
      </section>

      {/* Sorteo HOY */}
      <section className="relative px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-orange-400/40 bg-gradient-to-br from-orange-500/15 via-orange-600/5 to-transparent p-8 md:p-12 shadow-2xl shadow-orange-500/20">
            <div className="text-orange-400 text-xs uppercase tracking-widest font-bold">Sorteo de hoy</div>
            <div className="mt-2 text-zinc-400 text-sm capitalize">{fechaHoyLima}</div>
            <div className="mt-6 flex items-baseline gap-3">
              <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-orange-300 to-amber-400 bg-clip-text text-transparent">
                S/. {hoy?.premio_soles ?? 20}
              </div>
              <div className="text-2xl text-zinc-400">en BilleteraEco</div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Stat label="Participantes hoy" value={String(hoy?.total_participantes ?? 0)} />
              <Stat label="Tickets totales" value={String(hoy?.total_tickets ?? 0)} />
            </div>

            {hoy?.estado === "sorteado" ? (
              <div className="mt-8 rounded-2xl bg-orange-500/15 border border-orange-400/40 p-5">
                <div className="text-xs text-orange-400 font-semibold tracking-widest uppercase">
                  🎉 GANADOR ANUNCIADO
                </div>
                <div className="mt-2 text-2xl font-bold">{hoy.ganador_name || "Anónimo"}</div>
                <div className="mt-1 text-zinc-400 font-mono">{maskPhone(hoy.ganador_phone)}</div>
                <div className="mt-1 text-xs text-zinc-500 capitalize">{hoy.ganador_role}</div>
              </div>
            ) : (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                <div className="text-sm text-zinc-300">⏳ Sorteo pendiente — se ejecuta a las <strong>10:00 PM</strong></div>
                <div className="mt-1 text-xs text-zinc-500">Notificamos al ganador y a todos los participantes por WhatsApp</div>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={PASAJERO_WA}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#25D366] hover:bg-[#22C35E] text-white font-bold transition shadow-xl shadow-[#25D366]/30"
              >
                🚗 Pedir un viaje y ganar tickets
              </a>
              <Link
                href="/ecodriveplus/mi-cuenta"
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border border-orange-500/30 hover:bg-orange-500/10 text-orange-400 font-bold transition"
              >
                Ver mis tickets
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="relative px-6 py-16 border-t border-white/5">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight text-center">¿Cómo funciona?</h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <Step n={1} title="Pides tu viaje" desc="Por WhatsApp, como siempre." />
            <Step n={2} title="Ganas 1 ticket" desc="Automático al completar el viaje. Más viajes = más tickets." />
            <Step n={3} title="10 PM sorteo" desc="Eco anuncia ganador por WhatsApp. Premio en BilleteraEco al toque." />
          </div>
        </div>
      </section>

      {/* Sorteos pasados */}
      {pasados.length > 0 && (
        <section className="relative px-6 py-16 border-t border-white/5">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold tracking-tight">Últimos ganadores</h2>
            <div className="mt-6 space-y-3">
              {pasados.map((s) => (
                <div key={s.fecha} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <div>
                    <div className="text-xs text-zinc-500">{new Date(s.fecha).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</div>
                    <div className="mt-1 font-bold">{s.ganador_name || "Sorteo desierto"}</div>
                    <div className="text-xs text-zinc-500 font-mono">{maskPhone(s.ganador_phone)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-400">S/. {s.premio_soles}</div>
                    <div className="text-xs text-zinc-500">{s.total_tickets} tickets</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="relative px-6 py-10 border-t border-white/5 text-center text-sm text-zinc-500">
        © 2026 EcoDrive+ · <Link href="/ecodriveplus" className="text-orange-400 hover:underline">Volver al inicio</Link>
      </footer>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-widest">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-black font-bold text-xl shadow-lg shadow-orange-500/30">
        {n}
      </div>
      <div className="mt-3 font-bold">{title}</div>
      <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{desc}</div>
    </div>
  );
}
