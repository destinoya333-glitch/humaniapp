import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agenda 1-on-1 con asesor ActivosYA",
  description:
    "Reserva una llamada de 30 minutos con nuestro equipo. Te asesoramos sobre el activo digital ideal según tu mercado, presupuesto y experiencia técnica.",
  alternates: { canonical: "https://activosya.com/agendar" },
};

const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/activosya/30min";

export default function AgendarPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-xs text-zinc-500 hover:text-amber-400">
          ← Volver al marketplace
        </Link>

        <h1 className="mt-6 text-4xl font-bold">
          Agenda <span className="text-amber-400">30 minutos</span> con un asesor
        </h1>
        <p className="mt-3 text-zinc-400">
          Te asesoramos sobre cuál activo digital encaja con tu mercado, presupuesto y nivel
          técnico. Sin compromiso, 100% gratis.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-2">
          <iframe
            src={`${CALENDLY_URL}?hide_gdpr_banner=1&background_color=0a0a0a&text_color=ffffff&primary_color=f59e0b`}
            className="w-full rounded-lg"
            style={{ minHeight: 700, border: 0 }}
            title="Agenda con ActivosYA"
            loading="lazy"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Bullet title="Análisis de tu mercado" desc="Te decimos qué activo se vende mejor en tu zona y vertical." />
          <Bullet title="Comparativa P&L" desc="Estimamos juntos ingresos, costos y breakeven." />
          <Bullet title="Demo en vivo" desc="Te mostramos el activo funcionando en tu pantalla." />
        </div>

        <div className="mt-10 text-center">
          <p className="text-zinc-500 text-sm">¿Prefieres WhatsApp?</p>
          <a
            href="https://wa.me/51998102258?text=Hola,%20quiero%20info%20sobre%20activos%20de%20ActivosYA"
            className="inline-flex items-center gap-2 mt-3 px-5 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 transition"
          >
            💬 Chatear por WhatsApp con Percy
          </a>
        </div>
      </div>
    </main>
  );
}

function Bullet(props: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
      <div className="text-amber-400 font-semibold">{props.title}</div>
      <div className="mt-2 text-sm text-zinc-400 leading-relaxed">{props.desc}</div>
    </div>
  );
}
