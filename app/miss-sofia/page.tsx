"use client";

import { useState } from "react";

const WA_LINK = "https://wa.me/51979385499?text=Hola%20Miss%20Sofia%2C%20quiero%20mi%20prueba%20gratis%20de%207%20d%C3%ADas";

/* ── Data ──────────────────────────────────────────────────── */

const levels = [
  {
    code: "A1 → A2",
    name: "Básico",
    subtitle: "Finding My Voice",
    duration: "4 meses",
    weeks: "16 semanas",
    words: "600+ palabras",
    situations: "48 escenarios",
    icon: "◎",
    color: "text-emerald-400",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/5",
    outcome: "Puedes presentarte, describir tu rutina y mantener conversación básica de 15 min.",
    topics: ["Yo y mi mundo", "Rutinas diarias", "Casa y lugares", "Comida y salud", "Trabajo básico", "Conversación real"],
  },
  {
    code: "B1 → B2",
    name: "Intermedio",
    subtitle: "Living in English",
    duration: "5 meses",
    weeks: "20 semanas",
    words: "900+ palabras",
    situations: "72 escenarios",
    icon: "◈",
    color: "text-amber-400",
    border: "border-amber-400/20",
    bg: "bg-amber-400/5",
    outcome: "Trabajas, negocias y te expresas en inglés con confianza. Piensas sin traducir.",
    topics: ["Inglés profesional", "Reuniones y datos", "Series sin subtítulos", "Storytelling", "Debates y opiniones", "Slang e idioms"],
  },
  {
    code: "C1 → C2",
    name: "Avanzado",
    subtitle: "Mastering the Language",
    duration: "6 meses",
    weeks: "24 semanas",
    words: "1,000+ palabras",
    situations: "72 escenarios",
    icon: "✦",
    color: "text-purple-400",
    border: "border-purple-400/20",
    bg: "bg-purple-400/5",
    outcome: "Hablas, presentas y lideras en inglés como segunda lengua natural. Certificación IELTS/TOEFL.",
    topics: ["Fluencia cognitiva", "Retórica y persuasión", "Humor e ironía", "Escritura C1", "Preparación IELTS/TOEFL", "Inglés de tu industria"],
  },
];

const plans = [
  {
    name: "Básico",
    subtitle: "Finding My Voice",
    level: "A1 → A2",
    duration: "4 meses",
    monthly: "$15",
    total: "$60",
    once: "$45",
    save: "25%",
    color: "border-emerald-400/30",
    tag: null,
    features: [
      "16 semanas de lecciones diarias",
      "Lección por WhatsApp con Miss Sofia",
      "Audio de pronunciación incluido",
      "4 evaluaciones mensuales",
      "Certificado A2 digital",
      "Soporte lun–sáb",
    ],
  },
  {
    name: "Intermedio",
    subtitle: "Living in English",
    level: "B1 → B2",
    duration: "5 meses",
    monthly: "$20",
    total: "$100",
    once: "$75",
    save: "25%",
    color: "border-amber-400/40",
    tag: "Más popular",
    features: [
      "20 semanas de lecciones diarias",
      "Roleplay avanzado con voz IA",
      "Biblioteca de audios nativos",
      "Simulaciones laborales y viajes",
      "1 sesión mensual de feedback",
      "Certificado B2 digital",
    ],
  },
  {
    name: "Avanzado",
    subtitle: "Mastering the Language",
    level: "C1 → C2",
    duration: "6 meses",
    monthly: "$30",
    total: "$180",
    once: "$140",
    save: "22%",
    color: "border-purple-400/30",
    tag: null,
    features: [
      "24 semanas de lecciones diarias",
      "Inglés especializado en tu industria",
      "Preparación IELTS / TOEFL",
      "2 videosesiones/mes con avatar Sofia",
      "Acceso de por vida al material",
      "Certificado C1–C2 digital",
    ],
  },
  {
    name: "Completo",
    subtitle: "The Full Journey",
    level: "A1 → C2",
    duration: "15 meses",
    monthly: "$20 prom.",
    total: "$300",
    once: "$220",
    save: "27%",
    color: "border-amber-500/50",
    tag: "Mejor valor",
    features: [
      "Los 3 niveles completos",
      "Precio bloqueado desde el inicio",
      "Los 3 certificados incluidos",
      "Video avatar Miss Sofia incluido",
      "Preparación certificación internacional",
      "Acceso de por vida + comunidad VIP",
      "Garantía 30 días o te devolvemos",
    ],
  },
];

const faqs = [
  {
    q: "¿Necesito saber inglés para empezar?",
    a: "No. El nivel Básico empieza desde cero absoluto. Miss Sofia hace un test de 5 preguntas para ubicarte en el nivel correcto.",
  },
  {
    q: "¿Cómo funciona la lección diaria por WhatsApp?",
    a: "Cada día Miss Sofia te envía la historia del día, el audio de pronunciación y tu ejercicio. Tú respondes desde tu celular. Son 45 minutos divididos en bloques que puedes hacer en cualquier momento.",
  },
  {
    q: "¿Qué método usa Miss Sofia?",
    a: "El Método NAS (Natural Acquisition System): basado en Comprehensible Input de Krashen, TPRS (aprendizaje por historias), Repetición Espaciada y Shadowing. El mismo método que usan los países con mayor éxito en enseñanza de idiomas.",
  },
  {
    q: "¿Los certificados tienen validez internacional?",
    a: "Los certificados de Miss Sofia acreditan los niveles del Marco Europeo (A2, B2, C1–C2). Para el nivel Avanzado incluimos preparación para IELTS y TOEFL, que sí tienen validez internacional.",
  },
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. Puedes hacer upgrade al siguiente nivel en cualquier momento. Si pagaste mensual, el pago único del nivel siguiente se descuenta proporcionalmente.",
  },
  {
    q: "¿Qué pasa si un día no puedo estudiar?",
    a: "Miss Sofia guarda tu progreso. Puedes retomar en cualquier momento. Las lecciones no se pierden y el material queda disponible siempre.",
  },
  {
    q: "¿Tienen garantía?",
    a: "Sí. Si en los primeros 30 días no notas diferencia en tu inglés, te devolvemos el pago sin preguntas.",
  },
];

const methodology = [
  {
    icon: "◎",
    title: "Comprehensible Input",
    desc: "El 95–98% del contenido es comprensible. El cerebro adquiere el idioma igual que un niño — naturalmente, sin esfuerzo consciente.",
  },
  {
    icon: "◈",
    title: "TPRS — Historias",
    desc: "Vocabulario en contexto narrativo. El cerebro retiene 7× más palabras en historias que en listas.",
  },
  {
    icon: "✦",
    title: "Repetición Espaciada",
    desc: "Revisión inteligente en intervalos crecientes. +25% de retención demostrado científicamente.",
  },
  {
    icon: "◇",
    title: "Shadowing",
    desc: "Imitas la pronunciación de Miss Sofia en tiempo real. Activa la memoria muscular del idioma.",
  },
];

const stats = [
  { value: "630", label: "Horas totales de contenido" },
  { value: "2,500+", label: "Palabras y expresiones" },
  { value: "192", label: "Escenarios reales" },
  { value: "3", label: "Certificados internacionales" },
];

const competitors = [
  { name: "Duolingo Max", price: "$30/mes", personal: false, whatsapp: false, cert: false, method: "Gamificado" },
  { name: "Open English", price: "$39–49/mes", personal: false, whatsapp: false, cert: true, method: "Clases grupales" },
  { name: "Academia local", price: "$80–150/mes", personal: true, whatsapp: false, cert: true, method: "Presencial" },
  { name: "Miss Sofia", price: "Desde $15/mes", personal: true, whatsapp: true, cert: true, method: "NAS + IA" },
];

/* ── Components ─────────────────────────────────────────────── */

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-emerald-400 font-bold">✓</span>
    : <span className="text-zinc-600">✗</span>;
}

function Pill({ children, color = "amber" }: { children: React.ReactNode; color?: string }) {
  const styles: Record<string, string> = {
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  };
  return (
    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${styles[color] ?? styles.amber}`}>
      {children}
    </span>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#2A2A2A] rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[#111] transition-colors"
      >
        <span className="font-medium text-zinc-200 pr-4">{q}</span>
        <span className="text-amber-400 text-xl shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-zinc-400 text-sm leading-relaxed border-t border-[#2A2A2A]">
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */

export default function MissSofiaPage() {
  return (
    <main className="overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#2A2A2A] bg-[#0A0A0A]/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors">
            <span className="text-amber-400">✦</span> ActivosYA
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#metodo" className="hover:text-white transition-colors">Método</a>
            <a href="#niveles" className="hover:text-white transition-colors">Niveles</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-amber-500 text-black text-sm font-bold rounded-full hover:bg-amber-400 transition-colors"
          >
            Prueba gratis →
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: "linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            Disponible ahora · Prueba gratis 7 días
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Aprende inglés con{" "}
            <br />
            <span className="gold-gradient-animated">Miss Sofia</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Tu profesora IA personal por WhatsApp. Del nivel A1 al C2 en 15 meses
            con el método que usan los países más avanzados en enseñanza de idiomas.
          </p>
          <p className="text-sm text-zinc-500 mb-10">
            Sin horarios fijos · Sin clases grupales · Sin miedo a equivocarte
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 text-base font-bold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all glow-gold"
            >
              Empezar gratis 7 días →
            </a>
            <a
              href="#niveles"
              className="w-full sm:w-auto px-8 py-4 text-base font-medium border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-white transition-all"
            >
              Ver los niveles
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-[#2A2A2A] pt-10">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold gold-gradient">{s.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Simple y sin fricción</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">¿Cómo funciona?</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Todo desde tu WhatsApp. Sin apps que descargar, sin horarios que respetar.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", icon: "◎", title: "Test de nivel", desc: "5 preguntas rápidas. Miss Sofia te ubica en A1, A2, B1, B2 o C1 automáticamente." },
              { step: "02", icon: "◈", title: "Elige tu plan", desc: "Básico, Intermedio, Avanzado o Completo. Mensual o pago único. Tú decides." },
              { step: "03", icon: "✦", title: "Lección diaria", desc: "Miss Sofia te escribe cada día: historia, audio, ejercicio. 45 minutos que puedes hacer en bloques." },
              { step: "04", icon: "◇", title: "Certifícate", desc: "Evaluación mensual + certificado al terminar cada nivel. A2, B2 y C1–C2." },
            ].map((item) => (
              <div key={item.step} className="card-surface rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 font-mono">{item.step}</span>
                  <span className="text-2xl text-amber-400/60">{item.icon}</span>
                </div>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Daily routine */}
          <div className="mt-12 card-surface rounded-2xl p-8">
            <p className="text-amber-400 text-xs font-medium tracking-widest uppercase mb-6">Rutina diaria con Miss Sofia · 45 minutos</p>
            <div className="grid md:grid-cols-6 gap-3">
              {[
                { time: "0–5 min", label: "Wake up", desc: "Saludo + repaso del día anterior" },
                { time: "5–15 min", label: "Input", desc: "Historia, audio o video del día" },
                { time: "15–25 min", label: "Comprensión", desc: "Preguntas sobre lo que escuchaste" },
                { time: "25–35 min", label: "Producción", desc: "Tú hablas o escribes en inglés" },
                { time: "35–40 min", label: "Shadowing", desc: "Imitas la pronunciación de Sofia" },
                { time: "40–45 min", label: "Cierre", desc: "5 palabras nuevas · spaced repetition" },
              ].map((block) => (
                <div key={block.time} className="bg-[#1A1A1A] rounded-xl p-4 text-center">
                  <p className="text-amber-400 text-xs font-mono mb-2">{block.time}</p>
                  <p className="text-white text-sm font-semibold mb-1">{block.label}</p>
                  <p className="text-zinc-500 text-xs leading-tight">{block.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Método NAS ── */}
      <section id="metodo" className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Respaldo científico</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              El método{" "}
              <span className="gold-gradient">NAS</span>
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Natural Acquisition System — el mismo enfoque que usan Singapur, Finlandia y los Países Bajos.
              Aprende como un niño aprende su lengua materna, pero adaptado para adultos.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {methodology.map((m) => (
              <div key={m.title} className="card-surface rounded-2xl p-6 flex flex-col gap-3">
                <span className="text-2xl text-amber-400/60">{m.icon}</span>
                <h3 className="font-bold text-white">{m.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-[#2A2A2A]">
              <p className="text-amber-400 text-xs font-medium tracking-widest uppercase mb-1">Comparación</p>
              <h3 className="text-xl font-bold">Método tradicional vs. Método NAS</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left px-6 py-4 text-zinc-500 font-normal">Aspecto</th>
                    <th className="text-center px-6 py-4 text-zinc-500 font-normal">Método tradicional</th>
                    <th className="text-center px-6 py-4 text-amber-400 font-semibold">Método NAS · Miss Sofia</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Punto de partida", "Gramática y reglas", "Inmersión y contexto"],
                    ["Vocabulario", "Listas de memoria", "Historias y situaciones reales"],
                    ["Errores", "Corrección inmediata (bloquea)", "Ambiente seguro, luego modelas"],
                    ["Traducción", "Constante", "Se elimina progresivamente"],
                    ["Resultado en 4 meses", "Conjugar verbos", "Conversación real de 15 minutos"],
                    ["Retención a 1 año", "~20%", "~75% con spaced repetition"],
                  ].map(([aspect, trad, nas]) => (
                    <tr key={aspect} className="border-b border-[#1A1A1A]">
                      <td className="px-6 py-4 text-zinc-400">{aspect}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">{trad}</td>
                      <td className="px-6 py-4 text-center text-amber-400 font-medium">{nas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Niveles ── */}
      <section id="niveles" className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Programa completo</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">3 niveles · 15 meses · 1 certificado por nivel</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Puedes entrar en cualquier nivel según tu test de diagnóstico.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {levels.map((level) => (
              <div
                key={level.name}
                className={`card-surface rounded-2xl p-6 flex flex-col gap-5 border ${level.border}`}
              >
                <div className="flex items-center justify-between">
                  <Pill color={level.name === "Básico" ? "emerald" : level.name === "Intermedio" ? "amber" : "purple"}>
                    {level.code}
                  </Pill>
                  <span className={`text-2xl ${level.color} opacity-60`}>{level.icon}</span>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-1">{level.name}</h3>
                  <p className={`text-sm font-medium ${level.color} mb-3`}>"{level.subtitle}"</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{level.outcome}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Duración", val: level.duration },
                    { label: "Semanas", val: level.weeks },
                    { label: "Vocabulario", val: level.words },
                    { label: "Escenarios", val: level.situations },
                  ].map((d) => (
                    <div key={d.label} className={`${level.bg} rounded-xl p-3 text-center`}>
                      <p className="text-white text-sm font-semibold">{d.val}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{d.label}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#2A2A2A] pt-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Temas del nivel</p>
                  <ul className="flex flex-col gap-2">
                    {level.topics.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-sm text-zinc-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${level.color.replace("text-", "bg-")} opacity-60 shrink-0`} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Journey timeline */}
          <div className="card-surface rounded-2xl p-8">
            <p className="text-amber-400 text-xs font-medium tracking-widest uppercase mb-6">Tu transformación mes a mes</p>
            <div className="flex flex-col md:flex-row gap-4">
              {[
                { mes: "Mes 1", texto: "Dices tu nombre y rutina en inglés" },
                { mes: "Mes 4", texto: "Conversas 15 min con fluidez · Certificado A2" },
                { mes: "Mes 6", texto: "Trabajas y negocias en inglés" },
                { mes: "Mes 9", texto: "Piensas directamente en inglés · Certificado B2" },
                { mes: "Mes 12", texto: "Presentas, lideras y persuades" },
                { mes: "Mes 15", texto: "El inglés es parte de ti · Certificado C1–C2" },
              ].map((item, i) => (
                <div key={item.mes} className="flex-1 flex flex-col items-center text-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-amber-400 text-xs font-semibold">{item.mes}</p>
                  <p className="text-zinc-400 text-xs leading-tight">{item.texto}</p>
                  {i < 5 && (
                    <div className="hidden md:block w-full h-px bg-gradient-to-r from-amber-500/30 to-transparent absolute" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Precios ── */}
      <section id="precios" className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Sin sorpresas</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Planes y precios</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Paga mensual o ahorra con pago único. Empieza gratis 7 días sin tarjeta.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card-surface rounded-2xl p-6 flex flex-col gap-5 border ${plan.color} relative`}
              >
                {plan.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-500 text-black text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      {plan.tag}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">{plan.level}</p>
                  <h3 className="text-xl font-bold mb-0.5">{plan.name}</h3>
                  <p className="text-zinc-500 text-xs">"{plan.subtitle}"</p>
                </div>

                <div className="border-t border-[#2A2A2A] pt-4">
                  <div className="mb-3">
                    <p className="text-zinc-500 text-xs mb-1">Pago mensual</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">{plan.monthly}</span>
                      <span className="text-zinc-500 text-sm">/ mes · {plan.duration}</span>
                    </div>
                    <p className="text-zinc-600 text-xs mt-0.5">Total: {plan.total}</p>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-amber-400 text-xs mb-0.5">Pago único · ahorra {plan.save}</p>
                    <span className="text-2xl font-bold text-amber-400">{plan.once}</span>
                  </div>
                </div>

                <ul className="flex flex-col gap-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-center py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                    plan.tag
                      ? "bg-amber-500 text-black hover:bg-amber-400"
                      : "border border-[#2A2A2A] text-zinc-300 hover:border-amber-500/40 hover:text-amber-400"
                  }`}
                >
                  Empezar gratis →
                </a>
              </div>
            ))}
          </div>

          {/* Guarantee */}
          <div className="card-surface rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 border border-emerald-400/20">
            <div className="text-4xl">🛡</div>
            <div>
              <h4 className="font-bold text-white mb-1">Garantía 30 días</h4>
              <p className="text-zinc-400 text-sm">
                Si en los primeros 30 días no notas diferencia real en tu inglés, te devolvemos el pago completo. Sin preguntas, sin trámites.
              </p>
            </div>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-6 py-3 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 text-sm font-semibold rounded-full hover:bg-emerald-500/20 transition-colors"
            >
              Empezar sin riesgo →
            </a>
          </div>
        </div>
      </section>

      {/* ── Comparación ── */}
      <section className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">¿Por qué Miss Sofia?</p>
            <h2 className="text-4xl font-bold mb-4">Miss Sofia vs. la competencia</h2>
          </div>

          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left px-6 py-5 text-zinc-500 font-normal">Plataforma</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Precio</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Tutor personal</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Por WhatsApp</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Certificado</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c, i) => (
                    <tr
                      key={c.name}
                      className={`border-b border-[#1A1A1A] ${i === competitors.length - 1 ? "bg-amber-500/5" : ""}`}
                    >
                      <td className={`px-6 py-5 font-semibold ${i === competitors.length - 1 ? "text-amber-400" : "text-zinc-300"}`}>
                        {c.name}
                        {i === competitors.length - 1 && <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Tú</span>}
                      </td>
                      <td className={`px-4 py-5 text-center ${i === competitors.length - 1 ? "text-amber-400 font-bold" : "text-zinc-400"}`}>
                        {c.price}
                      </td>
                      <td className="px-4 py-5 text-center"><Check ok={c.personal} /></td>
                      <td className="px-4 py-5 text-center"><Check ok={c.whatsapp} /></td>
                      <td className="px-4 py-5 text-center"><Check ok={c.cert} /></td>
                      <td className={`px-4 py-5 text-center text-xs ${i === competitors.length - 1 ? "text-amber-400 font-semibold" : "text-zinc-500"}`}>
                        {c.method}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Preguntas frecuentes</p>
            <h2 className="text-4xl font-bold">¿Tienes dudas?</h2>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            7 días gratis · Sin tarjeta de crédito
          </div>

          <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Tu inglés empieza{" "}
            <span className="gold-gradient-animated">hoy</span>
          </h2>

          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Miss Sofia está lista para tu primera lección. Empieza gratis, sin compromisos.
            Si en 30 días no ves resultados, te devolvemos el dinero.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-10 py-5 text-lg font-bold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all glow-gold"
            >
              Hablar con Miss Sofia →
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 7 días gratis</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Sin tarjeta</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Garantía 30 días</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Por WhatsApp</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Cancela cuando quieras</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#2A2A2A] py-10 px-6">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="text-amber-400">✦</span>
            <span>Miss Sofia · ActivosYA · Hecho en Perú</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600">
            <a href="/" className="hover:text-zinc-400 transition-colors">Inicio</a>
            <a href="#precios" className="hover:text-zinc-400 transition-colors">Precios</a>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">WhatsApp</a>
          </div>
        </div>
      </footer>

    </main>
  );
}
