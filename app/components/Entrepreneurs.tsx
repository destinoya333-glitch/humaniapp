const steps = [
  { num: "01", title: "Contacta con nosotros", desc: "Cuéntanos tu idea de negocio IA y evaluamos el fit." },
  { num: "02", title: "Personalizamos tu plataforma", desc: "Tu marca, tus colores, tus servicios IA. Nosotros ponemos la tecnología." },
  { num: "03", title: "Lanzas en semanas", desc: "Chatbot, pagos y web listos. Tú te enfocas en crecer tu negocio." },
];

const benefits = [
  { icon: "⚡", title: "Sin desarrollar desde cero", desc: "Tecnología probada y operativa. Ahorra meses de desarrollo." },
  { icon: "🎨", title: "Tu marca, tu identidad", desc: "White-label completo. Tus clientes solo ven tu negocio." },
  { icon: "💳", title: "Pagos integrados", desc: "Yape, Culqi y Stripe listos. Cobra desde el día uno." },
  { icon: "🤖", title: "IA de última generación", desc: "Claude, HeyGen, ElevenLabs. La misma tecnología que grandes empresas." },
  { icon: "📊", title: "Panel de administración", desc: "Gestiona clientes, sesiones y métricas desde tu dashboard." },
  { icon: "🇵🇪", title: "Soporte en español", desc: "Equipo peruano que entiende tu mercado y te acompaña." },
];

const platforms = [
  {
    status: "Activo",
    statusColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    icon: "✦",
    name: "DestinoYA",
    desc: "Plataforma de consultas IA por WhatsApp. Astrología, orientación profesional y servicio exprés. Chatbot automatizado 24/7 con pagos integrados.",
    includes: ["Chatbot WATI personalizado", "3 servicios IA incluidos", "Pagos Yape + Culqi", "Panel de administración"],
    pricing: [
      { label: "Setup inicial", price: "S/ 500" },
      { label: "Licencia mensual", price: "S/ 299/mes" },
    ],
  },
  {
    status: "En desarrollo",
    statusColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: "♡",
    name: "Mi Novia IA",
    desc: "Plataforma de compañía IA con avatar hiperrealista, voz natural y memoria persistente. Experiencia tipo videollamada íntima, cobro por minuto.",
    includes: ["Avatar HeyGen hiperrealista", "Voz ElevenLabs personalizada", "Cobro por minuto/plan", "Panel de sesiones y usuarios"],
    pricing: [
      { label: "Setup inicial", price: "S/ 800" },
      { label: "Licencia mensual", price: "S/ 499/mes" },
    ],
  },
];

export default function Entrepreneurs() {
  return (
    <section id="emprendedores" className="py-24 px-6 bg-[#0D0D0D]">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Para emprendedores
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Lanza tu propio{" "}
            <span className="gold-gradient">negocio IA</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Licencia nuestra plataforma con tu marca. Tú traes la visión y los clientes,
            nosotros ponemos toda la tecnología IA lista para operar.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {steps.map((step) => (
            <div key={step.num} className="card-surface rounded-2xl p-6">
              <div className="text-4xl font-bold text-amber-500/20 mb-4">{step.num}</div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Platforms list */}
        <div id="plataformas" className="mb-16 scroll-mt-24">
          <h3 className="text-2xl font-bold mb-2 text-center">Plataformas disponibles</h3>
          <p className="text-zinc-400 text-center mb-8 text-sm">Elige la plataforma que mejor se adapta a tu negocio</p>

          <div className="grid md:grid-cols-2 gap-6">
            {platforms.map((p) => (
              <div key={p.name} className="card-surface rounded-2xl p-7 flex flex-col gap-5 hover:border-amber-500/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-3 py-1 rounded-full border font-medium ${p.statusColor}`}>
                    {p.status}
                  </span>
                  <span className="text-2xl text-amber-400/60">{p.icon}</span>
                </div>

                <div>
                  <h4 className="text-xl font-bold mb-2">{p.name}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">{p.desc}</p>
                </div>

                <ul className="flex flex-col gap-2">
                  {p.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-[#2A2A2A] pt-4 flex flex-col gap-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Inversión</p>
                  {p.pricing.map((pr) => (
                    <div key={pr.label} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">{pr.label}</span>
                      <span className="font-semibold text-amber-400">{pr.price}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="#contacto"
                  className="text-center py-2.5 px-4 rounded-xl border border-amber-500/30 text-sm font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  Me interesa esta plataforma →
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {benefits.map((b) => (
            <div key={b.title} className="flex gap-4 p-5 rounded-xl border border-[#2A2A2A] hover:border-amber-500/20 transition-colors">
              <span className="text-2xl shrink-0">{b.icon}</span>
              <div>
                <h4 className="font-medium mb-1">{b.title}</h4>
                <p className="text-zinc-400 text-sm">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors glow-gold"
          >
            Quiero saber más →
          </a>
          <p className="text-zinc-500 text-sm mt-4">Sin compromiso. Te respondemos en menos de 24 horas.</p>
        </div>
      </div>
    </section>
  );
}
