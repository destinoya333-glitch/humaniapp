"use client";

import { useEffect, useState } from "react";

type Difficulty = "easy" | "medium" | "hard";

export default function TopicPicker({
  userId,
  onStart,
}: {
  userId: string;
  onStart: (opts: { topic: string; difficulty: Difficulty }) => void;
}) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allowedDifficulties, setAllowedDifficulties] = useState<Difficulty[]>(["easy", "medium"]);
  const [phase, setPhase] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/sofia-passage/suggestions?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        setSuggestions(data.suggestions ?? []);
        setAllowedDifficulties((data.allowed_difficulties ?? ["easy", "medium"]) as Difficulty[]);
        setPhase(data.phase ?? 0);
        const def: Difficulty = data.phase <= 1 ? "easy" : data.phase <= 3 ? "medium" : "hard";
        setDifficulty(def);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  function start() {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    onStart({ topic: t, difficulty });
  }

  return (
    <div className="rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] p-5">
      <div className="text-center mb-4">
        <div className="text-3xl mb-2">🧠</div>
        <h2 className="text-lg font-bold text-zinc-100">¿Sobre qué tema te gustaría estudiar?</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Escribe cualquier tema en español. Sofia genera el pasaje para tu Fase {phase}.
        </p>
      </div>

      <input
        type="text"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Escribe aquí…"
        className="w-full rounded-xl bg-[#15151A] border border-[#2A2A2A] px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
        disabled={loading}
      />

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Sugerencias</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setTopic(s)}
                className="text-xs rounded-full bg-[#15151A] border border-[#2A2A2A] hover:border-amber-500/50 px-3 py-1 text-zinc-300"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Dificultad</p>
        <div className="flex gap-2">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => {
            const enabled = allowedDifficulties.includes(d);
            const active = difficulty === d && enabled;
            const labels: Record<Difficulty, string> = { easy: "Fácil", medium: "Medio", hard: "Difícil" };
            return (
              <button
                key={d}
                type="button"
                disabled={!enabled}
                onClick={() => enabled && setDifficulty(d)}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-colors ${
                  active
                    ? "bg-amber-500 text-black border-amber-500"
                    : enabled
                    ? "bg-[#15151A] text-zinc-300 border-[#2A2A2A] hover:border-amber-500/40"
                    : "bg-[#15151A] text-zinc-600 border-[#2A2A2A] opacity-50 cursor-not-allowed"
                }`}
              >
                {labels[d]}
              </button>
            );
          })}
        </div>
        {phase <= 1 && (
          <p className="text-[10px] text-zinc-600 mt-2">
            Dificultad &quot;difícil&quot; se desbloquea en Fase 2.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={start}
        disabled={!topic.trim() || loading}
        className="mt-5 w-full bg-amber-500 text-black rounded-full py-3 font-bold hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
      >
        {loading ? "Preparando tu cápsula…" : "Comenzar →"}
      </button>
    </div>
  );
}
