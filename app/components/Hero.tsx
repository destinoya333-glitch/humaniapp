import Particles from "./Particles";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px]"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)" }}
        />
        <div
          className="orb absolute top-1/4 left-1/4 w-[350px] h-[350px]"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)",
            animationDelay: "2s",
          }}
        />
        <div
          className="orb absolute bottom-1/4 right-1/4 w-[300px] h-[300px]"
          style={{
            background: "radial-gradient(circle, rgba(251,191,36,0.04) 0%, transparent 70%)",
            animationDelay: "4s",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <Particles />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm mb-8 fade-up">
          <span className="relative flex h-2 w-2">
            <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
          </span>
          Marketplace operativo · Hecho en Perú
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6 fade-up">
          Compra negocios digitales{" "}
          <br className="hidden md:block" />
          que <span className="gold-gradient-animated">YA facturan</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed fade-up">
          Plataformas SaaS llave-en-mano con flujo de caja verificado. Adquiere
          o renta — empieza a cobrar suscripciones desde el día uno.
          Soporte 24/7 por 90 días post-venta. Garantía de devolución 30 días.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 fade-up">
          <a
            href="#catalogo"
            className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all glow-gold"
          >
            Ver catálogo de activos →
          </a>
          <a
            href="#contacto"
            className="w-full sm:w-auto px-8 py-4 text-base font-medium border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-white transition-all"
          >
            Hablar con un asesor
          </a>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto border-t border-[#2A2A2A] pt-10 fade-up">
          {[
            { value: "5", label: "Activos disponibles" },
            { value: "S/ 247K", label: "Facturado YTD" },
            { value: "87%", label: "Retención promedio" },
            { value: "24h", label: "Onboarding" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold gold-gradient">{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-1.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
