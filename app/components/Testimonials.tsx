const testimonials = [
  {
    name: "Carlos M.",
    location: "Lima",
    service: "DestinoYA — Astrología",
    stars: 5,
    text: "Increíble la precisión. Me habló de cosas que nadie sabía y me dio claridad sobre decisiones que tenía pendientes. Vale cada sol.",
    avatar: "C",
    color: "bg-amber-500",
  },
  {
    name: "Valeria R.",
    location: "Arequipa",
    service: "DestinoYA — Consulta Profesional",
    stars: 5,
    text: "Estaba dudando entre dos trabajos y la consulta me ayudó a ver lo que yo misma no veía. La respuesta fue directa y muy útil.",
    avatar: "V",
    color: "bg-rose-500",
  },
  {
    name: "Diego T.",
    location: "Trujillo",
    service: "DestinoYA — Servicio Exprés",
    stars: 5,
    text: "Rápido, concreto y sorprendentemente preciso. En 3 soles obtuve más claridad que en conversaciones largas. Lo recomiendo.",
    avatar: "D",
    color: "bg-emerald-500",
  },
  {
    name: "Sofía P.",
    location: "Lima",
    service: "DestinoYA — VIP Mensual",
    stars: 5,
    text: "El plan VIP mensual es una ganga. Lo uso casi todos los días para tomar decisiones y orientarme. La IA es muy humana, nada robótica.",
    avatar: "S",
    color: "bg-violet-500",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Lo que dicen nuestros usuarios
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Experiencias reales
          </h2>
          <p className="text-zinc-400 max-w-xl mx-auto">
            Miles de personas en Perú ya usan DestinoYA para tomar mejores decisiones.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {testimonials.map((t) => (
            <div key={t.name} className="card-surface card-hover rounded-2xl p-5 flex flex-col gap-4">
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <span key={i} className="text-amber-400 text-sm">★</span>
                ))}
              </div>

              <p className="text-zinc-300 text-sm leading-relaxed flex-1">"{t.text}"</p>

              <div>
                <span className="text-xs text-amber-400/70 font-medium block mb-2">{t.service}</span>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.location}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-center">
          {[
            { value: "500+", label: "Consultas realizadas" },
            { value: "4.9★", label: "Calificación promedio" },
            { value: "98%", label: "Clientes satisfechos" },
            { value: "24/7", label: "Disponibilidad" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold gold-gradient">{s.value}</div>
              <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
