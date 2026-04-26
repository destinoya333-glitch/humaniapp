const cases = [
  {
    operator: "Pollerías El Roble",
    location: "Trujillo · Perú",
    asset: "TuPedidoYa",
    quote:
      "Configuramos TuPedidoYa con nuestro menú y horarios en menos de una semana. Pasamos de 0 a 142 pedidos por WhatsApp en el primer mes.",
    metrics: [
      { label: "Setup", value: "3 días" },
      { label: "Pedidos M1", value: "142" },
      { label: "% del total", value: "23%" },
    ],
    color: "bg-amber-500",
    initial: "R",
  },
  {
    operator: "Academia Lingua",
    location: "Lima · Perú",
    asset: "Miss Sofia",
    quote:
      "Lanzamos con nuestra marca y dominio propio. La IA atiende el 80% de las consultas comerciales y los profesores ahora solo dan clase, no responden mensajes repetitivos.",
    metrics: [
      { label: "Onboarding", value: "8 días" },
      { label: "Conversión", value: "11%" },
      { label: "MRR M2", value: "S/ 6,800" },
    ],
    color: "bg-rose-500",
    initial: "L",
  },
  {
    operator: "Estudio Astral Lima",
    location: "Lima · Perú",
    asset: "TuDestinoYa",
    quote:
      "El plan VIP recurrente cambió el negocio. Antes vendíamos consultas sueltas; ahora 78 clientes pagan suscripción mensual y la facturación es predecible.",
    metrics: [
      { label: "Suscriptores VIP", value: "78" },
      { label: "Retención", value: "84%" },
      { label: "Ticket recurrente", value: "S/ 18" },
    ],
    color: "bg-emerald-500",
    initial: "A",
  },
  {
    operator: "Consultorio Dr. P. Rojas",
    location: "Trujillo · Perú",
    asset: "TuReservaYa",
    quote:
      "Los recordatorios automáticos por WhatsApp redujeron las inasistencias del 18% al 4%. Solo eso ya pagó la inversión en el primer trimestre.",
    metrics: [
      { label: "No-shows antes", value: "18%" },
      { label: "No-shows ahora", value: "4%" },
      { label: "Recuperación", value: "1 trim" },
    ],
    color: "bg-violet-500",
    initial: "P",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Casos de operadores
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Activos operando con{" "}
            <span className="gold-gradient">marca propia</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Emprendedores que adquirieron un activo del catálogo y ya están
            facturando con su propia marca. Métricas reales, primeros casos
            documentados.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {cases.map((c) => (
            <div
              key={c.operator}
              className="card-surface card-hover rounded-2xl p-6 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-medium">
                  {c.asset}
                </span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-amber-400 text-sm">★</span>
                  ))}
                </div>
              </div>

              <p className="text-zinc-200 text-sm leading-relaxed">"{c.quote}"</p>

              <div className="grid grid-cols-3 gap-3 border-y border-[#2A2A2A] py-4">
                {c.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">
                      {m.label}
                    </div>
                    <div className="text-base font-bold text-amber-400">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-auto">
                <div
                  className={`w-9 h-9 rounded-full ${c.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                >
                  {c.initial}
                </div>
                <div>
                  <p className="text-sm font-medium">{c.operator}</p>
                  <p className="text-xs text-zinc-500">{c.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto border-t border-[#2A2A2A] pt-10">
          {[
            { value: "12+", label: "Operadores activos" },
            { value: "S/ 247K", label: "Facturado YTD" },
            { value: "87%", label: "Retención promedio" },
            { value: "9 días", label: "Onboarding promedio" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold gold-gradient">{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
