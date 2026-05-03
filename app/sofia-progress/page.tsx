"use client";

import { useEffect, useState } from "react";

/* ─── Types matching /api/sofia-progress/dashboard ────────────── */

type Dashboard = {
  phase: {
    number: number;
    name: string;
    subtitle: string;
    day: number;
    total_days: number;
    completion_pct: number;
    exit_signal: string;
  };
  metrics: {
    days_in_cuna: number;
    tiempo_de_boca_minutes: number;
    palabras_tuyas_count: number;
    milestones_unlocked_count: number;
    chapters_completed_count: number;
    chapters_total_count: number;
  };
  dictionary: Array<{
    word: string;
    learned_on: string;
    context: string;
    phase_when_learned: number;
    uses_count: number;
    last_used_at: string;
  }>;
  milestones: Array<{ key: string; achieved_at: string; context: string | null }>;
  chapters: Array<{
    id: string;
    chapter_number: number;
    title: string;
    audio_url: string | null;
    student_part_audio_url: string | null;
    cliffhanger: string | null;
    generated_at: string;
    completed_at: string | null;
    phase_when_generated: number;
  }>;
  sessions: Array<{
    id: string;
    session_type: string | null;
    duration_seconds: number | null;
    started_at: string;
    ended_at: string | null;
  }>;
  cuna_started_at: string | null;
  profile_summary: {
    last_session_summary: string | null;
    recurring_errors_count: number;
  };
};

const PHASE_VISUALS: Record<number, { icon: string; color: string; bg: string; border: string }> = {
  0: { icon: "🌙", color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  1: { icon: "💧", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/20" },
  2: { icon: "⚡", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  3: { icon: "🌱", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  4: { icon: "🌊", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  5: { icon: "🔥", color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
};

const MILESTONE_LABELS: Record<string, { label: string; emoji: string }> = {
  first_dream_in_english: { label: "Primer sueño en inglés", emoji: "🌙" },
  first_thought_without_translation: { label: "Pensaste en inglés sin traducir", emoji: "💭" },
  first_joke_landed: { label: "Hiciste reír en inglés", emoji: "😄" },
  first_native_understood_first_try: { label: "Un nativo te entendió a la primera", emoji: "🇺🇸" },
  first_word_in_real_life: { label: "Tu primera palabra en la vida real", emoji: "💧" },
  first_30sec_no_spanish: { label: "30 segundos sin español", emoji: "⚡" },
  first_60sec_no_spanish: { label: "60 segundos sin español", emoji: "⚡" },
  first_full_conversation_5min: { label: "Conversación completa de 5 min", emoji: "💬" },
  first_podcast_understood: { label: "Entendiste un podcast completo", emoji: "🎧" },
  first_series_no_subs: { label: "Viste una serie sin subtítulos", emoji: "📺" },
  sello_cuna_completed: { label: "Sello Cuna obtenido", emoji: "🏆" },
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function SofiaProgressPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/sofia-auth/me");
        const me = await meRes.json();
        if (!me.authenticated) {
          window.location.href = "/sofia-auth/login";
          return;
        }
        const r = await fetch(`/api/sofia-progress/dashboard?user_id=${me.user_id}`);
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.message || err.error || "No pude cargar tu progreso");
        }
        setData(await r.json());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] text-zinc-400 flex items-center justify-center">
        Cargando tu progreso...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="max-w-md mx-auto bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-4 rounded-xl">
          {error}
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] p-6 text-zinc-400">
        Aún no hay datos. Inicia tu primera sesión en{" "}
        <a href="/sofia-chat" className="text-amber-400 hover:underline">
          /sofia-chat
        </a>
        .
      </main>
    );
  }

  const phaseVis = PHASE_VISUALS[data.phase.number] ?? PHASE_VISUALS[0];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">

        {/* ── Header ─────────────────────────────────────── */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tu progreso</h1>
            <p className="text-sm text-zinc-500">Miss Sofia · Método Cuna</p>
          </div>
          <a href="/sofia-chat" className="text-xs text-amber-400 hover:text-amber-300">
            ← Volver al chat
          </a>
        </header>

        {/* ── Hero phase card ────────────────────────────── */}
        <section className={`rounded-2xl p-6 mb-6 ${phaseVis.bg} border ${phaseVis.border}`}>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{phaseVis.icon}</span>
            <div className="flex-1">
              <p className="text-sm text-zinc-400 uppercase tracking-widest">Fase {data.phase.number}</p>
              <h2 className={`text-2xl font-bold ${phaseVis.color}`}>{data.phase.name}</h2>
              <p className="text-sm text-zinc-400">"{data.phase.subtitle}"</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-zinc-100">{data.phase.completion_pct}%</p>
              <p className="text-xs text-zinc-500">Día {data.phase.day} de {data.phase.total_days}</p>
            </div>
          </div>

          <div className="h-2 bg-[#0A0A0A] rounded-full overflow-hidden mb-4">
            <div
              className={`h-full ${phaseVis.color.replace("text-", "bg-")} opacity-70 transition-all`}
              style={{ width: `${data.phase.completion_pct}%` }}
            />
          </div>

          <p className="text-xs text-zinc-400">
            🎯 <strong className="text-zinc-300">Hito de salida:</strong> {data.phase.exit_signal}
          </p>
        </section>

        {/* ── Stats grid ─────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat icon="📅" label="Días en Cuna" value={String(data.metrics.days_in_cuna)} />
          <Stat icon="🎙️" label="Tiempo de boca" value={`${data.metrics.tiempo_de_boca_minutes} min`} />
          <Stat icon="📚" label="Palabras tuyas" value={String(data.metrics.palabras_tuyas_count)} />
          <Stat icon="🌟" label="Hitos viscerales" value={String(data.metrics.milestones_unlocked_count)} />
        </section>

        {/* ── Visceral milestones ────────────────────────── */}
        <section className="card-surface rounded-2xl p-5 mb-6 border border-[#2A2A2A]">
          <h3 className="font-bold text-zinc-100 mb-3">🌟 Hitos viscerales</h3>
          {data.milestones.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aún no has desbloqueado ningún hito. El primero típicamente es{" "}
              <em className="text-zinc-400">"tu primera palabra en la vida real"</em> en Fase 1.
            </p>
          ) : (
            <div className="space-y-3">
              {data.milestones.map((m) => {
                const meta = MILESTONE_LABELS[m.key] ?? { label: m.key, emoji: "✨" };
                return (
                  <div key={m.key} className="flex items-start gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-200">{meta.label}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(m.achieved_at)}
                        {m.context && <> · <span className="italic">"{m.context}"</span></>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Personal dictionary ─────────────────────────── */}
        <section className="card-surface rounded-2xl p-5 mb-6 border border-[#2A2A2A]">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-bold text-zinc-100">📚 Tu diccionario personal</h3>
            <span className="text-xs text-zinc-500">{data.dictionary.length} palabras</span>
          </div>
          {data.dictionary.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aún no hay palabras. Cada palabra que uses queda atada al momento real en que la aprendiste.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {data.dictionary.slice(0, 50).map((d) => (
                <div key={d.word} className="border-b border-[#1A1A1A] last:border-0 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-amber-400">{d.word}</p>
                    <span className="text-xs text-zinc-500">
                      usada {d.uses_count}× · Fase {d.phase_when_learned}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 italic mt-0.5">"{d.context}"</p>
                </div>
              ))}
              {data.dictionary.length > 50 && (
                <p className="text-xs text-zinc-500 pt-2">
                  ...y {data.dictionary.length - 50} más
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Novel chapters ──────────────────────────────── */}
        <section className="card-surface rounded-2xl p-5 mb-6 border border-[#2A2A2A]">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-bold text-zinc-100">📖 Capítulos de tu novela</h3>
            <span className="text-xs text-zinc-500">
              {data.metrics.chapters_completed_count} de {data.metrics.chapters_total_count} completados
            </span>
          </div>
          {data.chapters.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Tu novela personal arranca cuando avances a Fase 3.
            </p>
          ) : (
            <div className="space-y-3">
              {data.chapters.map((c) => (
                <div key={c.id} className="border border-[#1A1A1A] rounded-xl p-3">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-zinc-200">
                      Capítulo {c.chapter_number} · {c.title}
                    </p>
                    {c.completed_at ? (
                      <span className="text-xs text-emerald-400">✓ Completado</span>
                    ) : (
                      <span className="text-xs text-amber-400">En curso</span>
                    )}
                  </div>
                  {c.audio_url && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <audio controls className="w-full mt-2 h-8" src={c.audio_url} />
                  )}
                  {c.cliffhanger && (
                    <p className="text-xs text-zinc-500 italic mt-2">→ {c.cliffhanger}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recent sessions ─────────────────────────────── */}
        <section className="card-surface rounded-2xl p-5 mb-6 border border-[#2A2A2A]">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-bold text-zinc-100">💬 Sesiones recientes</h3>
            <span className="text-xs text-zinc-500">{data.sessions.length}</span>
          </div>
          {data.sessions.length === 0 ? (
            <p className="text-sm text-zinc-500">Aún no tienes sesiones.</p>
          ) : (
            <div className="space-y-1.5">
              {data.sessions.slice(0, 10).map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center text-sm py-1.5 border-b border-[#1A1A1A] last:border-0"
                >
                  <span className="text-zinc-300">
                    {s.session_type ?? "—"}
                    <span className="text-zinc-500 text-xs ml-2">{formatDate(s.started_at)}</span>
                  </span>
                  <span className="text-xs text-zinc-500">
                    {s.duration_seconds ? `${Math.round(s.duration_seconds)}s` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Last session summary ─────────────────────────── */}
        {data.profile_summary.last_session_summary && (
          <section className="card-surface rounded-2xl p-5 mb-6 border border-[#2A2A2A]">
            <h3 className="font-bold text-zinc-100 mb-2">Última sesión</h3>
            <p className="text-sm text-zinc-400 italic">
              "{data.profile_summary.last_session_summary}"
            </p>
          </section>
        )}

      </div>
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card-surface rounded-2xl p-4 border border-[#2A2A2A]">
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
