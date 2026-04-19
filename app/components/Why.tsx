const tech = [
  { name: "Claude AI", desc: "Conversación más natural del mercado", logo: "◈" },
  { name: "HeyGen", desc: "Avatares hiperrealistas en tiempo real", logo: "◉" },
  { name: "ElevenLabs", desc: "Voz IA más natural disponible", logo: "◎" },
  { name: "Supabase", desc: "Base de datos en tiempo real", logo: "▣" },
  { name: "Yape + Culqi", desc: "Pagos locales peruanos integrados", logo: "◆" },
  { name: "Stripe", desc: "Pagos internacionales seguros", logo: "◇" },
];

export default function Why() {
  return (
    <section id="por-que" className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Por qué HumaniApp
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tecnología real,{" "}
            <span className="gold-gradient">resultados reales</span>
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Usamos las mejores herramientas IA del mundo, integradas y probadas
            en el mercado peruano.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {tech.map((t) => (
            <div key={t.name} className="card-surface rounded-2xl p-5 flex items-start gap-4 hover:border-amber-500/20 transition-colors">
              <div className="text-2xl text-amber-400 shrink-0 mt-0.5">{t.logo}</div>
              <div>
                <h4 className="font-semibold mb-1">{t.name}</h4>
                <p className="text-zinc-400 text-sm">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Differentiators */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8">
            <h3 className="text-xl font-bold mb-3">Primeros en Perú</h3>
            <p className="text-zinc-400 leading-relaxed">
              Somos pioneros en servicios IA conversacionales y de compañía en el mercado
              latinoamericano. Modelo probado, tecnología operativa, clientes reales.
            </p>
          </div>
          <div className="card-surface rounded-2xl p-8">
            <h3 className="text-xl font-bold mb-3">Pagos que conoces</h3>
            <p className="text-zinc-400 leading-relaxed">
              Yape, Culqi y Stripe integrados. Tus clientes pagan como siempre lo hacen,
              sin fricciones. Tú cobras desde el primer día.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
