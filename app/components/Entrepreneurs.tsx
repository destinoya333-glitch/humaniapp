const benefits = [
  {
    icon: "🛡️",
    title: "Soporte 24/7 por 90 días",
    desc: "Onboarding completo, configuración técnica y respuesta a incidencias. Slack privado con nuestro equipo durante el período de transición.",
  },
  {
    icon: "📊",
    title: "Métricas verificadas",
    desc: "Acceso de lectura a Supabase y Stripe del activo durante el due diligence. Sin sorpresas: ves los números reales antes de firmar.",
  },
  {
    icon: "🔄",
    title: "Garantía 30 días",
    desc: "Si el activo no rinde como las métricas declaradas en el primer mes operativo, devolvemos el 100% del setup y los días no consumidos.",
  },
  {
    icon: "🚀",
    title: "Roadmap compartido",
    desc: "Cada 6 meses agregamos nuevas features al stack base sin costo adicional. Tu activo evoluciona con la categoría.",
  },
  {
    icon: "🎨",
    title: "White-label completo",
    desc: "Tu marca, tu dominio, tu paleta de colores, tu tono de voz. Tus clientes finales nunca saben que el motor es de ActivosYA.",
  },
  {
    icon: "🇵🇪",
    title: "Hecho en Perú · escala LATAM",
    desc: "Pagos Yape, Culqi, Stripe. Soporte en español. Twilio multi-subaccount para que cada operador tenga su número y factura propia.",
  },
];

export default function Entrepreneurs() {
  return (
    <section id="por-que" className="py-24 px-6 bg-[#0D0D0D] scroll-mt-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Por qué ActivosYA
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Compra con{" "}
            <span className="gold-gradient">confianza institucional</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            No vendemos código sueltos. Vendemos negocios operativos con
            métricas verificadas, stack documentado y un equipo detrás que
            cuida tu inversión.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="card-surface rounded-2xl p-6 flex flex-col gap-3 hover:border-amber-500/20 transition-colors"
            >
              <span className="text-3xl">{b.icon}</span>
              <h3 className="font-semibold text-base">{b.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/8 to-transparent p-8">
            <div className="text-amber-400 text-xs uppercase tracking-widest mb-3">
              Modelo de renta
            </div>
            <h3 className="text-2xl font-bold mb-3">
              Empieza desde S/ 1,800/mes
            </h3>
            <p className="text-zinc-400 leading-relaxed mb-5">
              Acceso completo al activo: código, dominio personalizado, integración
              de pagos, soporte. Puedes cancelar cuando quieras. Ideal para validar
              tu mercado sin compromiso de capital alto.
            </p>
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 text-amber-400 font-medium hover:text-amber-300 transition-colors"
            >
              Solicitar acceso al modelo de renta →
            </a>
          </div>
          <div className="card-surface rounded-2xl p-8">
            <div className="text-zinc-400 text-xs uppercase tracking-widest mb-3">
              Modelo de compra
            </div>
            <h3 className="text-2xl font-bold mb-3">
              Adquisición total del activo
            </h3>
            <p className="text-zinc-400 leading-relaxed mb-5">
              Compras el código, base de usuarios, dominio, contratos. Pasa a ser
              100% tuyo. Soporte de transición 90 días. Para emprendedores
              consolidados que quieren un activo permanente en su portafolio.
            </p>
            <a
              href="#contacto"
              className="inline-flex items-center gap-2 text-zinc-300 font-medium hover:text-amber-400 transition-colors"
            >
              Solicitar valoración de compra →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
