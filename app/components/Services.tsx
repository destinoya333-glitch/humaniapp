type Status = "Activo" | "Beta" | "Próximamente";

type Asset = {
  status: Status;
  icon: string;
  name: string;
  tagline: string;
  description: string;
  metrics: { label: string; value: string }[];
  stack: string[];
  rent: string;
  buy: string;
  b2cHref: string;
  b2cLabel: string;
};

const assets: Asset[] = [
  {
    status: "Activo",
    icon: "◎",
    name: "Miss Sofia English",
    tagline: "Inglés con IA · WhatsApp + Web App",
    description:
      "Curso de inglés conversacional A1→C2 con voz IA, audio turn-by-turn y certificación. Modelo freemium con suscripciones recurrentes.",
    metrics: [
      { label: "MRR potencial", value: "S/ 12,400" },
      { label: "Retención 90d", value: "78%" },
      { label: "Margen bruto", value: "71%" },
      { label: "Edad", value: "4 meses" },
    ],
    stack: ["Next.js", "Twilio", "Claude", "ElevenLabs", "Groq Whisper"],
    rent: "Desde S/ 1,800/mes",
    buy: "Compra a consultar",
    b2cHref: "/miss-sofia",
    b2cLabel: "Ver app B2C",
  },
  {
    status: "Activo",
    icon: "✦",
    name: "TuDestinoYa",
    tagline: "Tarot y orientación IA · WhatsApp",
    description:
      "Plataforma de consultas IA: astrología, lectura de palma, orientación profesional y servicio exprés. Cobros Yape + planes VIP recurrentes.",
    metrics: [
      { label: "MRR potencial", value: "S/ 8,500" },
      { label: "Retención 30d", value: "62%" },
      { label: "Margen bruto", value: "68%" },
      { label: "Edad", value: "6 meses" },
    ],
    stack: ["Twilio", "Claude Vision", "Supabase", "Yape", "n8n"],
    rent: "Desde S/ 2,500/mes",
    buy: "Compra a consultar",
    b2cHref: "https://wa.me/51961347233",
    b2cLabel: "Probar por WhatsApp",
  },
  {
    status: "Beta",
    icon: "♡",
    name: "TuNoviaIA",
    tagline: "Compañía IA femenina · App + WhatsApp",
    description:
      "Compañera IA con foto, voz emocional ElevenLabs y memoria persistente. Cobro por minuto o suscripción mensual. Avatar y personalidad personalizables.",
    metrics: [
      { label: "Plan Mensual", value: "S/ 480" },
      { label: "Sesión 1 min", value: "S/ 3.90" },
      { label: "Margen bruto", value: "65%" },
      { label: "Edad", value: "Beta" },
    ],
    stack: ["ElevenLabs", "Claude", "HeyGen", "Supabase", "Stripe"],
    rent: "Desde S/ 3,000/mes",
    buy: "Compra a consultar",
    b2cHref: "https://wa.me/51979385499",
    b2cLabel: "Hablar con Juanita",
  },
  {
    status: "Beta",
    icon: "◑",
    name: "TuPedidoYa",
    tagline: "Pedidos para restaurantes · WhatsApp",
    description:
      "Bot de pedidos para pollerías, pizzerías y restaurantes. Menú interactivo, integración con cocina por Telegram, reportes diarios. Multi-tenant: cada restaurante con su número y branding.",
    metrics: [
      { label: "Estado", value: "Probado en piloto" },
      { label: "Mercado objetivo", value: "Restaurantes Perú" },
      { label: "Modelo", value: "B2B mensual" },
      { label: "Disponibilidad", value: "Abierta" },
    ],
    stack: ["Twilio", "Claude", "Supabase", "Telegram"],
    rent: "Desde S/ 1,800/mes",
    buy: "Compra a consultar",
    b2cHref: "#contacto",
    b2cLabel: "Solicitar demo",
  },
  {
    status: "Beta",
    icon: "◐",
    name: "TuReservaYa",
    tagline: "Reservas para consultorios · WhatsApp + Web",
    description:
      "Sistema de citas médicas multi-doctor con confirmación automática, recordatorios anti-no-show y dashboard. Para clínicas, consultorios y centros de salud.",
    metrics: [
      { label: "Estado", value: "Piloto activo" },
      { label: "Mercado objetivo", value: "Consultorios LATAM" },
      { label: "Modelo", value: "B2B mensual" },
      { label: "Disponibilidad", value: "Abierta" },
    ],
    stack: ["Next.js", "Twilio", "Supabase", "n8n"],
    rent: "Desde S/ 2,000/mes",
    buy: "Compra a consultar",
    b2cHref: "#contacto",
    b2cLabel: "Solicitar demo",
  },
];

const statusStyles: Record<Status, string> = {
  Activo: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Beta: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Próximamente: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
};

export default function Services() {
  return (
    <section id="catalogo" className="py-24 px-6 scroll-mt-24">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">
            Catálogo de activos digitales
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Plataformas que ya{" "}
            <span className="gold-gradient">facturan</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            Cada activo viene con métricas verificadas, stack documentado y
            soporte de transición. Adquiere por suscripción mensual o por
            compra única — escala con tu marca, tus dominios y tus pagos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {assets.map((a) => (
            <article
              key={a.name}
              className="card-surface card-hover rounded-2xl p-7 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs px-3 py-1 rounded-full border font-medium ${statusStyles[a.status]}`}
                >
                  {a.status}
                </span>
                <span className="text-2xl text-amber-400/60">{a.icon}</span>
              </div>

              <div>
                <h3 className="text-2xl font-bold mb-1">{a.name}</h3>
                <p className="text-amber-400/80 text-xs uppercase tracking-widest mb-3">
                  {a.tagline}
                </p>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {a.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-y border-[#2A2A2A] py-4">
                {a.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                      {m.label}
                    </div>
                    <div className="text-lg font-bold text-white">{m.value}</div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                  Stack
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.stack.map((tech) => (
                    <span
                      key={tech}
                      className="text-xs px-2 py-1 rounded-md bg-[#181818] border border-[#2A2A2A] text-zinc-400 font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Renta mensual
                  </div>
                  <div className="text-base font-semibold text-amber-400">
                    {a.rent}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Compra
                  </div>
                  <div className="text-base font-semibold text-zinc-300">
                    {a.buy}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 mt-auto">
                <a
                  href="#contacto"
                  className="flex-1 text-center py-2.5 px-4 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
                >
                  Solicitar data room →
                </a>
                <a
                  href={a.b2cHref}
                  target={a.b2cHref.startsWith("http") ? "_blank" : undefined}
                  rel={a.b2cHref.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex-1 text-center py-2.5 px-4 rounded-xl border border-[#2A2A2A] text-sm font-medium text-zinc-300 hover:border-amber-500/40 hover:text-amber-400 transition-colors"
                >
                  {a.b2cLabel}
                </a>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-zinc-500 text-sm">
            ¿Buscas un activo específico? Cada trimestre agregamos nuevas
            plataformas al catálogo.
          </p>
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            Avísame cuando se agregue uno nuevo →
          </a>
        </div>
      </div>
    </section>
  );
}
