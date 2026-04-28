import type { Metadata } from "next";
import Link from "next/link";
import { ACTIVOS } from "@/lib/activos";

export const metadata: Metadata = {
  title: "Precios — Renta o compra de activos digitales",
  description:
    "Tarifas claras y públicas para rentar o comprar activos digitales SaaS de ActivosYA. Desde S/.1,800/mes en renta o cotización individual para compra única.",
  alternates: { canonical: "https://activosya.com/precios" },
};

export default function PreciosPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400">
          ← Volver al marketplace
        </Link>

        <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
          Precios <span className="text-amber-400">claros</span>, sin sorpresas
        </h1>
        <p className="mt-3 text-zinc-400 max-w-3xl">
          Cada activo tiene 2 modelos de adquisición. La renta es ideal si quieres bajo riesgo
          inicial. La compra única transfiere todo (código, BD, dominio) bajo tu propiedad.
        </p>

        <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs px-4 py-2">
          <span>🎁</span>
          <span>Bonus: 30 días gratis de soporte 24/7 + roadmap compartido 6 meses</span>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ACTIVOS.map((a) => (
            <div
              key={a.slug}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-amber-500/50 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl mb-2">{a.icon}</div>
                  <h3 className="text-xl font-bold">{a.name}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{a.tagline}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                  {a.status}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-400">Renta</div>
                  <div className="mt-1 text-xl font-bold">{a.rent}</div>
                  <div className="text-xs text-zinc-500 mt-1">Cancela cuando quieras</div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-amber-400">Compra</div>
                  <div className="mt-1 text-xl font-bold">{a.buy}</div>
                  <div className="text-xs text-zinc-500 mt-1">100% de tu propiedad</div>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Link
                  href={`/activos/${a.slug}`}
                  className="flex-1 text-center px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-amber-500 text-sm font-medium transition"
                >
                  Ver ficha
                </Link>
                <Link
                  href="/agendar"
                  className="flex-1 text-center px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold transition"
                >
                  Agendar
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 p-8">
          <h2 className="text-2xl font-bold">¿Qué incluye en ambos modelos?</h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
            <Block icon="🛠️" title="Setup llave-en-mano" desc="Configuramos dominio, BD, integraciones y dejamos todo corriendo en 24-48h." />
            <Block icon="🔐" title="White-label total" desc="Tu marca, tu logo, tu URL. El cliente final no ve ActivosYA." />
            <Block icon="📞" title="Soporte 90 días" desc="Slack/WhatsApp directo con el equipo creador para dudas o urgencias." />
            <Block icon="🚀" title="Roadmap incluido" desc="Mejoras y features nuevas se sincronizan automáticamente cada 2 meses." />
            <Block icon="💸" title="Garantía 30 días" desc="Si no llegas a métricas declaradas, devolvemos 100% sin preguntas." />
            <Block icon="🎓" title="Capacitación" desc="2 sesiones de onboarding 1-on-1 para que operes desde el día 1." />
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-zinc-400">¿Aún tienes dudas?</p>
          <div className="mt-4 flex flex-wrap gap-3 justify-center">
            <Link
              href="/calculadora-roi"
              className="px-6 py-3 rounded-lg border border-zinc-700 hover:border-amber-500 text-sm font-medium transition"
            >
              📊 Calcular tu ROI
            </Link>
            <Link
              href="/agendar"
              className="px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold transition"
            >
              🗓️ Agendar 30 min con asesor
            </Link>
            <Link
              href="/comparativa"
              className="px-6 py-3 rounded-lg border border-zinc-700 hover:border-amber-500 text-sm font-medium transition"
            >
              ⚖️ Comparar vs competencia
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function Block(props: { icon: string; title: string; desc: string }) {
  return (
    <div>
      <div className="text-2xl">{props.icon}</div>
      <div className="mt-2 font-semibold">{props.title}</div>
      <div className="mt-1 text-zinc-400 leading-relaxed">{props.desc}</div>
    </div>
  );
}
