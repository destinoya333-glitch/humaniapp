const services = [
  {
    tag: "Activo",
    tagColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    icon: "✦",
    name: "DestinoYA",
    description:
      "Astrología, orientación profesional y consultas express por WhatsApp. Respuestas reales de IA especializada en minutos.",
    features: ["Astrología personal", "Consulta profesional", "Servicio exprés"],
    pricing: [
      { plan: "Básico",        price: "S/ 3",   note: "1 consulta" },
      { plan: "Estándar",      price: "S/ 6",   note: "1 consulta" },
      { plan: "Plus",          price: "S/ 9",   note: "1 consulta" },
      { plan: "Premium",       price: "S/ 9.90",note: "1 consulta" },
      { plan: "VIP Mensual",   price: "S/ 18",  note: "Ilimitado · todos los servicios" },
      { plan: "VIP Anual",     price: "S/ 63",  note: "Ilimitado · todos los servicios" },
    ],
    cta: "Probar ahora",
    href: "https://wa.me/",
    highlight: null,
  },
  {
    tag: "Próximamente",
    tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    icon: "♡",
    name: "Mi Novia IA",
    description:
      "Compañía IA femenina hiperrealista. Video en tiempo real, voz natural y personalidad única adaptada a cada usuario.",
    features: ["Avatar hiperrealista", "Voz emocional natural", "Memoria persistente"],
    pricing: [
      { plan: "1 minuto",         price: "S/ 3.90", note: "Sesión puntual" },
      { plan: "2 minutos",        price: "S/ 6.90", note: "Sesión corta" },
      { plan: "3 minutos",        price: "S/ 9.00", note: "Sesión estándar" },
      { plan: "Pack Semanal",     price: "S/ 120",  note: "6 min/día · 7 días = 42 min" },
      { plan: "Plan Mensual",     price: "S/ 480",  note: "9 min/día · 30 días = 270 min" },
    ],
    cta: "Lista de espera",
    href: "#contacto",
    highlight: null,
  },
  {
    tag: "En desarrollo",
    tagColor: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
    icon: "◈",
    name: "Más servicios",
    description:
      "Nuevos servicios IA en camino. Cada uno diseñado para una experiencia profunda y personalizada.",
    features: ["Coaching IA", "Tutores personales", "Asistentes de negocio"],
    pricing: [],
    cta: "Notificarme",
    href: "#contacto",
    highlight: null,
  },
];

export default function Services() {
  return (
    <section id="servicios" className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Para usuarios finales
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Nuestros servicios IA
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Experiencias de inteligencia artificial diseñadas para sentirse reales,
            accesibles por WhatsApp o web.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s) => (
            <div
              key={s.name}
              className="card-surface card-hover rounded-2xl p-6 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs px-3 py-1 rounded-full border font-medium ${s.tagColor}`}>
                  {s.tag}
                </span>
                <span className="text-2xl text-amber-400/60">{s.icon}</span>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-2">{s.name}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.description}</p>
              </div>

              <ul className="flex flex-col gap-2">
                {s.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {s.pricing.length > 0 && (
                <div className="border-t border-[#2A2A2A] pt-4 flex flex-col gap-2.5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Planes y precios</p>
                  {s.pricing.map((p) => (
                    <div key={p.plan} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <span className="text-zinc-300 font-medium">{p.plan}</span>
                        {p.note && <span className="block text-zinc-500 text-xs">{p.note}</span>}
                      </div>
                      <span className="font-bold text-amber-400 shrink-0">{p.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {s.pricing.length === 0 && (
                <div className="border-t border-[#2A2A2A] pt-4">
                  <p className="text-xs text-zinc-600 text-center">Precios por anunciar</p>
                </div>
              )}

              <a
                href={s.href}
                className="mt-auto text-center py-2.5 px-4 rounded-xl border border-[#2A2A2A] text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
              >
                {s.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
