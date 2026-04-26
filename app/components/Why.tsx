const tech = [
  { name: "Claude Opus / Sonnet", desc: "Razonamiento más avanzado del mercado", logo: "◈" },
  { name: "ElevenLabs", desc: "Voz IA emocional natural", logo: "◎" },
  { name: "Twilio", desc: "WhatsApp Business multi-subaccount", logo: "◉" },
  { name: "Supabase", desc: "Postgres + Auth + Storage", logo: "▣" },
  { name: "Vercel Fluid", desc: "Compute serverless 0-cold-start", logo: "▲" },
  { name: "Stripe + Yape + Culqi", desc: "Pagos LATAM e internacionales", logo: "◆" },
];

export default function Why() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Stack tecnológico
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Construido sobre{" "}
            <span className="gold-gradient">infraestructura premium</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Cada activo en el catálogo corre sobre la misma columna vertebral:
            la mejor IA, la mejor infraestructura cloud, los mejores procesadores
            de pago. Lo que recibes es producción real, no prototipo.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {tech.map((t) => (
            <div
              key={t.name}
              className="card-surface rounded-2xl p-5 flex items-start gap-4 hover:border-amber-500/20 transition-colors"
            >
              <div className="text-2xl text-amber-400 shrink-0 mt-0.5">{t.logo}</div>
              <div>
                <h4 className="font-semibold mb-1">{t.name}</h4>
                <p className="text-zinc-400 text-sm">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-7">
            <div className="text-3xl mb-3">🏗️</div>
            <h3 className="text-lg font-bold mb-2">Multi-tenant nativo</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Cada operador opera en su propio espacio aislado: dominio, branding,
              base de datos lógica, números de WhatsApp y procesadores de pago
              propios.
            </p>
          </div>
          <div className="card-surface rounded-2xl p-7">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="text-lg font-bold mb-2">Seguridad de grado bancario</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Row Level Security en todas las tablas, encriptación en tránsito y
              en reposo, auditoría completa de cada acceso, backups diarios
              automatizados.
            </p>
          </div>
          <div className="card-surface rounded-2xl p-7">
            <div className="text-3xl mb-3">📈</div>
            <h3 className="text-lg font-bold mb-2">Observabilidad incluida</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Dashboard con MRR, churn, conversión y métricas operativas en tiempo
              real. Vercel Analytics + PostHog integrados desde el día uno.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
