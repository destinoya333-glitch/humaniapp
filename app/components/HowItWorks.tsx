const steps = [
  {
    num: "01",
    icon: "🔍",
    title: "Solicita acceso",
    desc: "Completa el formulario con tu perfil y el activo que te interesa. Te contactamos en menos de 24 horas para coordinar.",
  },
  {
    num: "02",
    icon: "📊",
    title: "Revisa el data room",
    desc: "Acceso de lectura a métricas reales: usuarios, MRR, retención, P&L. Reunión técnica con nuestro equipo para resolver dudas.",
  },
  {
    num: "03",
    icon: "✍️",
    title: "Firma y onboarding",
    desc: "Contrato de licencia o compra. Configuramos tu dominio, branding, procesadores de pago y números de WhatsApp.",
  },
  {
    num: "04",
    icon: "🚀",
    title: "Empieza a operar",
    desc: "Recibes acceso al panel de operador. Lanzas con tu marca y empiezas a cobrar suscripciones desde el día uno.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-6 bg-[#0D0D0D] scroll-mt-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Cómo funciona
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            De la solicitud al lanzamiento{" "}
            <span className="gold-gradient">en 7 a 14 días</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Un proceso institucional pero rápido. Sin tecnicismos innecesarios,
            sin meses de espera. Diseñado para emprendedores que quieren
            facturar pronto.
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center group">
                <div
                  className="w-20 h-20 rounded-full border border-[#2A2A2A] bg-[#111] flex items-center justify-center text-3xl mb-5 group-hover:border-amber-500/40 transition-colors z-10"
                  style={{ boxShadow: "0 0 30px rgba(245,158,11,0.06)" }}
                >
                  {step.icon}
                </div>

                <span className="absolute -top-2 -right-2 md:right-auto md:left-[calc(50%+24px)] w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center z-20">
                  {i + 1}
                </span>

                <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-14">
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors glow-gold"
          >
            Iniciar mi solicitud →
          </a>
          <p className="text-zinc-500 text-xs mt-4">
            Sin compromiso. Sin costo de evaluación. Respuesta garantizada en 24 h.
          </p>
        </div>
      </div>
    </section>
  );
}
