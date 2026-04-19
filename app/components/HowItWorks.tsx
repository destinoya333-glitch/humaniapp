const steps = [
  {
    num: "01",
    icon: "💬",
    title: "Escríbenos por WhatsApp",
    desc: "Contáctanos directamente. Nuestro chatbot IA te atiende al instante, 24 horas al día.",
  },
  {
    num: "02",
    icon: "🎯",
    title: "Elige tu servicio",
    desc: "Selecciona el tipo de consulta o experiencia que necesitas. Tenemos opciones para cada momento.",
  },
  {
    num: "03",
    icon: "💳",
    title: "Paga fácil con Yape",
    desc: "Pago instantáneo con Yape, tarjeta o Stripe. Sin cuentas ni registros complicados.",
  },
  {
    num: "04",
    icon: "✨",
    title: "Recibe tu experiencia IA",
    desc: "En segundos recibes tu respuesta personalizada o acceso a tu sesión. Simple y directo.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-[#0D0D0D]">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Así de simple
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            ¿Cómo funciona?
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            En menos de 2 minutos puedes tener tu primera experiencia IA.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center group">
                {/* Icon circle */}
                <div
                  className="w-20 h-20 rounded-full border border-[#2A2A2A] bg-[#111] flex items-center justify-center text-3xl mb-5 group-hover:border-amber-500/40 transition-colors z-10"
                  style={{ boxShadow: "0 0 30px rgba(245,158,11,0.06)" }}
                >
                  {step.icon}
                </div>

                {/* Step number */}
                <span className="absolute -top-2 -right-2 md:right-auto md:left-[calc(50%+24px)] w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center z-20">
                  {i + 1}
                </span>

                <h3 className="font-semibold text-base mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <a
            href="https://wa.me/51979385499"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors glow-gold"
          >
            Empezar ahora por WhatsApp →
          </a>
        </div>
      </div>
    </section>
  );
}
