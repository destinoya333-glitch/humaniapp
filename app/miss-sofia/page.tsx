"use client";

import { useState } from "react";

const WA_LINK = "https://wa.me/51979385499?text=Hola%20Miss%20Sofia%2C%20quiero%20empezar%20mi%20Fase%200";

/* ── Data ──────────────────────────────────────────────────── */

const phases = [
  {
    n: 0,
    icon: "🌙",
    name: "Cuna",
    subtitle: "Despertar Silencioso",
    days: "Días 1–30",
    brain: "Tu cerebro calibra los sonidos del inglés",
    you_do: "Escuchas 5 min al día. Marcas 👍 / 👎.",
    you_dont: "No hablas. No traduces. No memorizas.",
    exit: "Día 30: entiendes un audio que el día 1 no entendías.",
    color: "text-indigo-400",
    border: "border-indigo-400/20",
    bg: "bg-indigo-400/5",
  },
  {
    n: 1,
    icon: "💧",
    name: "Primera Palabra",
    subtitle: "One Word Magic",
    days: "Días 31–60",
    brain: "Una palabra = una intención completa",
    you_do: "Respondes con UNA palabra real. 'Hungry'. 'Tired'. 'Happy'.",
    you_dont: "No frases. No conjugaciones. No 'I am'.",
    exit: "30 palabras inglesas que USAS en tu vida real.",
    color: "text-sky-400",
    border: "border-sky-400/20",
    bg: "bg-sky-400/5",
  },
  {
    n: 2,
    icon: "⚡",
    name: "Telegráfico",
    subtitle: "Two-Word Magic",
    days: "Días 61–90",
    brain: "Combinas 2-3 palabras. La gramática emerge sola.",
    you_do: "'Want water.' 'Tired today.' 'Where bathroom.'",
    you_dont: "No estrés por gramática. Sofia jamás te corrige el orden.",
    exit: "Audio de 60 segundos sin tirar al español ni una vez.",
    color: "text-emerald-400",
    border: "border-emerald-400/20",
    bg: "bg-emerald-400/5",
  },
  {
    n: 3,
    icon: "🌱",
    name: "Tu Voz",
    subtitle: "Sentence Builder",
    days: "Días 91–150",
    brain: "Frases completas con errores OK. La gramática se acomoda implícita.",
    you_do: "Conversaciones de 3-5 min con Sofia. Empieza tu novela personal.",
    you_dont: "Estudiar tablas de verbos. Sofia los contrabandea en historias.",
    exit: "Cuentas un recuerdo de tu infancia en inglés en 2 min.",
    color: "text-amber-400",
    border: "border-amber-400/20",
    bg: "bg-amber-400/5",
  },
  {
    n: 4,
    icon: "🌊",
    name: "Tu Mundo",
    subtitle: "Storyteller",
    days: "Días 151–240",
    brain: "Vives EN inglés. Pasado, futuro, hipotético. Humor.",
    you_do: "Series con subs en inglés. Misión mensual: hacer reír a alguien en inglés.",
    you_dont: "Caer en respuestas de una palabra. 'Mi amor, full sentence. You've earned it.'",
    exit: "Cuentas la trama de tu serie favorita en 5 min sin prepararlo.",
    color: "text-orange-400",
    border: "border-orange-400/20",
    bg: "bg-orange-400/5",
  },
  {
    n: 5,
    icon: "🔥",
    name: "Tu Yo en Inglés",
    subtitle: "Native Self",
    days: "Días 241–365",
    brain: "Piensas sin filtro. Lees ironía. Dominas registros.",
    you_do: "Debates con Sofia. Inglés industria-específico. Misión final: el Sello Cuna.",
    you_dont: "Baby-talk. Sofia te trata como par.",
    exit: "Un nativo en USA, en 5 min, no sabe que eres hispanohablante.",
    color: "text-rose-400",
    border: "border-rose-400/20",
    bg: "bg-rose-400/5",
  },
];

const ritualSlots = [
  { time: "🌅 Mañana", duration: "3-5 min", what: "Audio-novela mientras te bañas o desayunas", from: "Día 1" },
  { time: "🌞 Almuerzo", duration: "2 min", what: "Misión real-life del día", from: "Fase 1 · Día 31" },
  { time: "🌙 Noche", duration: "10-15 min", what: "Conversación íntima con Sofia", from: "Fase 3 · Día 91" },
  { time: "🌌 Antes de dormir", duration: "90 seg", what: "Audio-cuento relajante. Subliminal.", from: "Día 1" },
];

const visceralMetrics = [
  { icon: "🎙️", label: "Tiempo de boca", desc: "Minutos reales hablando inglés. No tiempo de estudio." },
  { icon: "📚", label: "Palabras tuyas", desc: "Palabras que USAS en tu vida real, no que memorizaste." },
  { icon: "💭", label: "Pensaste en inglés", desc: "Días que te sorprendiste pensando en inglés sin querer." },
  { icon: "🌙", label: "Soñaste en inglés", desc: "El primer día que sueñas en inglés es mítico. Lo registramos." },
  { icon: "😄", label: "Hiciste reír", desc: "Veces que tu chiste en inglés funcionó." },
  { icon: "🇺🇸", label: "Te entendieron", desc: "Veces que un nativo te entendió a la primera." },
];

const cunaVsDuolingo = [
  ["Métrica de éxito", "Racha de días + gemas", "Días que soñaste en inglés"],
  ["Cómo aprendes vocabulario", "Listas y flashcards", "Palabras atadas a momentos de tu vida"],
  ["Cuándo empiezas a hablar", "Desde el día 1 (frustración)", "Tras 30 días de escucha (sin presión)"],
  ["Qué dice el contenido", "'The boy eats an apple'", "Tu novela personal donde TÚ eres protagonista"],
  ["Quién corrige tus errores", "Pop-up rojo inmediato", "Sofia los modela sin interrumpir"],
  ["Resultado a 1 año", "Sabes traducir frases sueltas", "Conversas con un nativo sin que note acento"],
  ["Certificado", "PDF que nadie ve", "Video real de un nativo USA"],
];

const plans = [
  {
    name: "Sofia Cuna",
    subtitle: "El método completo",
    monthly: "S/39",
    yearly: "S/349",
    yearly_save: "Ahorras S/119",
    color: "border-amber-400/40",
    tag: "Recomendado",
    features: [
      "Las 6 fases · 12 meses",
      "Sofia 24/7 por WhatsApp (audio + texto)",
      "Tu novela personal generada cada semana",
      "Tu diccionario personal (palabras atadas a tu vida)",
      "Misiones diarias real-life",
      "Métricas viscerales (no rachas vacías)",
      "Garantía 6 meses o devolvemos todo",
    ],
  },
  {
    name: "Sofia Cuna VIP",
    subtitle: "+ Sello humano",
    monthly: "S/89",
    yearly: "S/799",
    yearly_save: "Ahorras S/269",
    color: "border-purple-400/40",
    tag: null,
    features: [
      "Todo lo del plan Cuna",
      "2 sesiones video al mes con Sofia humana real",
      "Llamada Sello Cuna con nativo USA al graduarte",
      "Video testimonial del nativo (tu certificado)",
      "Acceso prioritario a nuevas funciones",
      "Comunidad VIP de graduados",
    ],
  },
];

const faqs = [
  {
    q: "¿Por qué no empiezo a hablar el día 1 como en otros cursos?",
    a: "Porque tu cerebro no está listo. Un bebé escucha 12 meses antes de decir 'mamá'. Saltarse esa fase es la razón #1 por la que la gente abandona. En Fase 0 (los primeros 30 días) tu cerebro CALIBRA los sonidos del inglés. Es invisible pero crítico. El día 31 vas a empezar a hablar y vas a sentir que el inglés ya estaba ahí dentro tuyo.",
  },
  {
    q: "¿En cuánto tiempo voy a hablar inglés de verdad?",
    a: "Día 90: ya combinas frases simples y mantienes 30 segundos sin tirar al español. Día 150: cuentas recuerdos en inglés. Día 240: hablas tu serie favorita en 5 min sin prepararlo. Día 365: un nativo USA no sabe que eres hispanohablante. Todo esto medible y visible en tu app.",
  },
  {
    q: "¿Qué pasa con mis 'palabras nuevas'? ¿Tengo que memorizarlas?",
    a: "No. Sofia te las contrabandea en TU novela personal y en TUS misiones reales. Cada palabra queda anclada a un momento emocional ('overwhelmed la aprendiste el día que contaste el caos del tráfico'). Eso se queda pegado al cerebro 10× más que una flashcard.",
  },
  {
    q: "¿Tienes garantía de verdad?",
    a: "Sí, garantía Klaric: si en 6 meses (180 días) no puedes mantener una conversación de 5 minutos con un nativo, te devolvemos cada centavo. Sin trámites, sin preguntas. Tenemos métricas viscerales objetivas para verificarlo.",
  },
  {
    q: "¿Qué es el Sello Cuna y cómo es mi 'certificado'?",
    a: "Cuando completas las 6 fases, te conectamos a una llamada de 30 minutos con un nativo USA real. Si la conversación fluye, el nativo te graba un video testimonial: 'this person speaks English'. ESE video es tu certificado. Lo subes a LinkedIn y te genera trabajos. Mucho más útil que un PDF A2.",
  },
  {
    q: "¿Necesito horario fijo?",
    a: "No. Vives con Sofia en tu WhatsApp como vivirías con un compañero de cuarto bilingüe. Audio en la mañana mientras te bañas, misión rapidita al almuerzo, conversación nocturna cuando puedas. 15-20 min al día total.",
  },
  {
    q: "¿Qué pasa si no puedo hacer la misión de un día?",
    a: "Nada. No hay racha que perder. No hay búho que regañe. Sofia te extraña y te recibe de vuelta. La adicción real viene de ver tu novela avanzar y tus métricas viscerales subir, no de mantener un contador artificial.",
  },
  {
    q: "¿Por qué no usan niveles A1, A2, B1, B2 como todos?",
    a: "Porque CEFR es un sistema de EXAMEN, no de aprendizaje. Nadie aprende su lengua materna por niveles. Los reemplazamos por las 6 fases reales del cerebro adquiriendo lengua. Si necesitas certificado A2/B2 para algo formal, en Fase 4-5 te preparamos para IELTS/TOEFL.",
  },
];

const competitors = [
  { name: "Duolingo Max", price: "$30/mes", method: "Gamificación vacía", real_speaker: false, personal: false, guarantee: false },
  { name: "Open English", price: "$39–49/mes", method: "Clases grupales", real_speaker: true, personal: false, guarantee: false },
  { name: "Academia local", price: "$80–150/mes", method: "Pizarrón presencial", real_speaker: true, personal: true, guarantee: false },
  { name: "Sofia Cuna", price: "S/39/mes", method: "Método Cuna 6 fases", real_speaker: true, personal: true, guarantee: true },
];

const stats = [
  { value: "12", label: "Meses al inglés real" },
  { value: "6", label: "Fases neurolingüísticas" },
  { value: "180d", label: "Garantía o devolvemos" },
  { value: "1", label: "Sello Cuna con nativo USA" },
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
    indigo: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
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
            <a href="#metodo" className="hover:text-white transition-colors">Método Cuna</a>
            <a href="#fases" className="hover:text-white transition-colors">Las 6 fases</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-amber-500 text-black text-sm font-bold rounded-full hover:bg-amber-400 transition-colors"
          >
            Empezar Fase 0 →
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20 overflow-hidden">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            Método Cuna · único en LATAM · garantía 6 meses
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
            Aprende inglés{" "}
            <br />
            <span className="gold-gradient-animated">como aprendiste español</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Si pudiste aprender español sin estudiar gramática, puedes aprender inglés igual.
            Sofia te enseña como tu mamá te enseñó español: <strong className="text-zinc-200">hablándote todos los días.</strong>
          </p>
          <p className="text-sm text-zinc-500 mb-10">
            6 fases neurolingüísticas · 12 meses · sin gramática · sin flashcards · sin rachas vacías
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 text-base font-bold bg-amber-500 text-black rounded-full hover:bg-amber-400 transition-all glow-gold"
            >
              Empezar mi Fase 0 →
            </a>
            <a
              href="#metodo"
              className="w-full sm:w-auto px-8 py-4 text-base font-medium border border-[#2A2A2A] text-zinc-300 rounded-full hover:border-amber-500/40 hover:text-white transition-all"
            >
              ¿Por qué Cuna funciona?
            </a>
          </div>

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

      {/* ── El problema con los demás ── */}
      <section className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-rose-400 text-sm font-medium mb-3 tracking-widest uppercase">El problema</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Llevas años con apps y aún no hablas inglés.
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              No es tu culpa. Es el método. Duolingo te hace sentir que avanzas mientras
              te llena de gemas, traducciones y rachas. Pasan 3 años y sigues sin poder
              pedir un café en inglés. <strong className="text-zinc-200">Es un casino disfrazado de escuela.</strong>
            </p>
          </div>

          <div className="card-surface rounded-2xl p-8 border border-rose-400/10">
            <p className="text-zinc-400 text-sm mb-4 italic">Lo que pasa con la mayoría de cursos online:</p>
            <ul className="grid md:grid-cols-2 gap-4 text-sm">
              {[
                "Te enseñan gramática antes de comunicar — bloqueas la voz.",
                "Memorizas listas de palabras que olvidas en 1 mes.",
                "Te corrigen mid-sentence — desarrollas miedo a equivocarte.",
                "Diálogos de libro: 'The cat is on the table' — nadie habla así.",
                "La racha te genera ansiedad, no fluidez.",
                "Pasas años sin un solo minuto de boca real.",
              ].map((p) => (
                <li key={p} className="flex items-start gap-3 text-zinc-400">
                  <span className="text-rose-400 mt-0.5 shrink-0">✗</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── El Método Cuna ── */}
      <section id="metodo" className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">La solución</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              El <span className="gold-gradient">Método Cuna</span>
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              El cerebro humano ya sabe cómo aprender un idioma — lo hizo con tu lengua materna.
              Cuna respeta esas 6 fases neurolingüísticas en lugar de pelearse con ellas.
            </p>
          </div>

          {/* Comparación Cuna vs Duolingo */}
          <div className="card-surface rounded-2xl overflow-hidden mb-12">
            <div className="p-6 border-b border-[#2A2A2A]">
              <p className="text-amber-400 text-xs font-medium tracking-widest uppercase mb-1">Comparación honesta</p>
              <h3 className="text-xl font-bold">Duolingo & cía vs. Método Cuna</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left px-6 py-4 text-zinc-500 font-normal">Aspecto</th>
                    <th className="text-center px-6 py-4 text-zinc-500 font-normal">Duolingo & cía</th>
                    <th className="text-center px-6 py-4 text-amber-400 font-semibold">Método Cuna</th>
                  </tr>
                </thead>
                <tbody>
                  {cunaVsDuolingo.map(([aspect, trad, cuna]) => (
                    <tr key={aspect} className="border-b border-[#1A1A1A]">
                      <td className="px-6 py-4 text-zinc-400">{aspect}</td>
                      <td className="px-6 py-4 text-center text-zinc-500">{trad}</td>
                      <td className="px-6 py-4 text-center text-amber-400 font-medium">{cuna}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Las 6 Fases ── */}
      <section id="fases" className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">El programa completo</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Las 6 fases del Método Cuna</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Cada fase respeta exactamente lo que tu cerebro está listo para hacer en ese momento.
              Saltarte una fase rompe el método.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phases.map((phase) => (
              <div
                key={phase.n}
                className={`card-surface rounded-2xl p-6 flex flex-col gap-4 border ${phase.border}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{phase.icon}</span>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase tracking-widest">Fase {phase.n}</p>
                      <h3 className="text-xl font-bold">{phase.name}</h3>
                    </div>
                  </div>
                </div>

                <p className={`text-sm font-medium ${phase.color}`}>"{phase.subtitle}"</p>

                <div className={`${phase.bg} rounded-xl p-3 text-center`}>
                  <p className="text-white text-sm font-semibold">{phase.days}</p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">🧠 Tu cerebro</p>
                  <p className="text-zinc-300 text-sm leading-relaxed">{phase.brain}</p>
                </div>

                <div>
                  <p className="text-xs text-emerald-500 uppercase tracking-widest mb-2">✅ Sí haces</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{phase.you_do}</p>
                </div>

                <div>
                  <p className="text-xs text-rose-500 uppercase tracking-widest mb-2">❌ No haces</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">{phase.you_dont}</p>
                </div>

                <div className="border-t border-[#2A2A2A] pt-4">
                  <p className="text-xs text-amber-400 uppercase tracking-widest mb-2">🎯 Hito de salida</p>
                  <p className="text-zinc-300 text-sm leading-relaxed italic">{phase.exit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ritual circadiano ── */}
      <section className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Cómo es un día contigo</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">El ritual circadiano</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Un papá no le agenda "martes es día de gramática" a su bebé. Vive con él.
              Lo mismo aquí: el mismo ritual todos los días, ajustado a tu fase.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {ritualSlots.map((slot) => (
              <div key={slot.time} className="card-surface rounded-2xl p-6">
                <p className="text-2xl mb-3">{slot.time}</p>
                <p className="text-amber-400 text-xs font-mono mb-3">{slot.duration}</p>
                <p className="text-zinc-300 text-sm leading-relaxed mb-4">{slot.what}</p>
                <p className="text-zinc-600 text-xs uppercase tracking-widest">Aparece desde {slot.from}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 card-surface rounded-2xl p-6 border border-amber-400/10 text-center">
            <p className="text-zinc-300 text-sm leading-relaxed">
              <strong className="text-amber-400">Domingo es día de asado familiar.</strong> Sin misión, sin presión.
              Sofia te manda un capítulo extra divertido de tu novela y te deja descansar de verdad.
            </p>
          </div>
        </div>
      </section>

      {/* ── Métricas viscerales ── */}
      <section className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Lo que medimos</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Métricas que <span className="gold-gradient">sí importan</span>
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Olvídate de "racha de 100 días" o "nivel B1 alcanzado". Son métricas vacías.
              Cuna mide lo que de verdad le pasa a tu cerebro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {visceralMetrics.map((m) => (
              <div key={m.label} className="card-surface rounded-2xl p-6">
                <p className="text-3xl mb-3">{m.icon}</p>
                <h3 className="text-lg font-bold text-white mb-2">{m.label}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diferenciadores únicos ── */}
      <section className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Lo que nadie más tiene</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">3 cosas únicas en el mundo</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="card-surface rounded-2xl p-8 border border-amber-400/20">
              <p className="text-3xl mb-4">📖</p>
              <h3 className="text-xl font-bold text-white mb-3">Tu novela personal</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Cada semana Sofia genera un capítulo donde TÚ eres el protagonista.
                Usa tu nombre, tu ciudad, tu trabajo, tu familia.
              </p>
              <p className="text-amber-400 text-xs italic">
                Imposible no querer saber qué pasa el siguiente capítulo.
              </p>
            </div>

            <div className="card-surface rounded-2xl p-8 border border-amber-400/20">
              <p className="text-3xl mb-4">📚</p>
              <h3 className="text-xl font-bold text-white mb-3">Tu diccionario personal</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Cada palabra atada a un momento real de tu vida.
                "Overwhelmed la aprendiste el lunes que contaste el caos del tráfico."
              </p>
              <p className="text-amber-400 text-xs italic">
                10× más memorable que cualquier flashcard.
              </p>
            </div>

            <div className="card-surface rounded-2xl p-8 border border-amber-400/20">
              <p className="text-3xl mb-4">🎬</p>
              <h3 className="text-xl font-bold text-white mb-3">El Sello Cuna</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                Tu graduación es una llamada de 30 min con un nativo USA real.
                Si fluye, te graba un video diciendo "this person speaks English".
              </p>
              <p className="text-amber-400 text-xs italic">
                Tu video va a LinkedIn. Te genera trabajos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Precios ── */}
      <section id="precios" className="py-24 px-6 border-t border-[#2A2A2A]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">Sin sorpresas</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Un viaje, dos formas</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              No vendemos niveles. Vendemos la transformación completa de 12 meses.
              Empieza con tu Fase 0 gratis.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card-surface rounded-2xl p-8 flex flex-col gap-5 border ${plan.color} relative`}
              >
                {plan.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-500 text-black text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                      {plan.tag}
                    </span>
                  </div>
                )}

                <div>
                  <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-zinc-500 text-sm">{plan.subtitle}</p>
                </div>

                <div className="border-t border-[#2A2A2A] pt-5">
                  <div className="mb-4">
                    <p className="text-zinc-500 text-xs mb-1">Pago mensual</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{plan.monthly}</span>
                      <span className="text-zinc-500 text-sm">/ mes</span>
                    </div>
                  </div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-amber-400 text-xs mb-1">Pago anual · {plan.yearly_save}</p>
                    <span className="text-2xl font-bold text-amber-400">{plan.yearly}</span>
                    <span className="text-zinc-500 text-sm"> / año</span>
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
                  Empezar Fase 0 →
                </a>
              </div>
            ))}
          </div>

          {/* Garantía 6 meses */}
          <div className="card-surface rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6 border border-emerald-400/30 bg-emerald-400/5">
            <div className="text-5xl shrink-0">🛡️</div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-bold text-white text-xl mb-2">Garantía Klaric · 6 meses</h4>
              <p className="text-zinc-300 text-sm leading-relaxed mb-2">
                Si en 180 días no puedes mantener una conversación de 5 minutos con un nativo,
                <strong className="text-emerald-400"> te devolvemos cada centavo.</strong> Sin trámites, sin preguntas.
              </p>
              <p className="text-zinc-500 text-xs">Garantía objetiva: validamos con la llamada del Sello Cuna.</p>
            </div>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-6 py-3 bg-emerald-500 text-black text-sm font-bold rounded-full hover:bg-emerald-400 transition-colors"
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
            <p className="text-amber-400 text-sm font-medium mb-3 tracking-widest uppercase">¿Por qué Sofia Cuna?</p>
            <h2 className="text-4xl font-bold mb-4">Sofia Cuna vs. la competencia</h2>
          </div>

          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="text-left px-6 py-5 text-zinc-500 font-normal">Plataforma</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Precio</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Te hace hablar</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Personalizado</th>
                    <th className="text-center px-4 py-5 text-zinc-500 font-normal">Garantía 6m</th>
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
                      <td className="px-4 py-5 text-center"><Check ok={c.real_speaker} /></td>
                      <td className="px-4 py-5 text-center"><Check ok={c.personal} /></td>
                      <td className="px-4 py-5 text-center"><Check ok={c.guarantee} /></td>
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
            Tu Fase 0 empieza hoy · sin tarjeta
          </div>

          <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            En 12 meses{" "}
            <span className="gold-gradient-animated">hablas inglés.</span>
          </h2>

          <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            O te devolvemos cada centavo. Sofia te espera en WhatsApp para empezar
            tu primera Fase 0 — los 30 días en los que tu cerebro empieza a calibrar el inglés.
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
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Fase 0 gratis</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Sin tarjeta</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Garantía 6 meses</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Por WhatsApp</span>
            <span className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Sello Cuna con nativo USA</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#2A2A2A] py-10 px-6">
        <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="text-amber-400">✦</span>
            <span>Miss Sofia · Método Cuna · ActivosYA · Hecho en Perú</span>
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
