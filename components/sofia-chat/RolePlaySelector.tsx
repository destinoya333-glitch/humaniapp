"use client";

import { useEffect, useState } from "react";

type Scenario = {
  id: string;
  emoji: string;
  title_es: string;
  blurb_es: string;
  difficulty: "easy" | "medium" | "hard";
  min_phase: number;
};

const DIFFICULTY_COLORS: Record<Scenario["difficulty"], string> = {
  easy: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  hard: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

export default function RolePlaySelector({
  userId,
  expanded,
  onToggle,
  onPick,
}: {
  userId: string;
  expanded: boolean;
  onToggle: () => void;
  onPick: (scenarioId: string) => void;
}) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!expanded || scenarios.length > 0) return;
    setLoading(true);
    fetch(`/api/sofia-roleplay/list?user_id=${userId}`)
      .then((r) => r.json())
      .then((data) => setScenarios(data.scenarios ?? []))
      .finally(() => setLoading(false));
  }, [expanded, userId, scenarios.length]);

  return (
    <section className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#0F0F12] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#15151A] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400">🎭</span>
          <span className="font-semibold text-zinc-100">Role Play</span>
          <span className="text-zinc-500 text-xs">— Sofia entra en personaje</span>
        </div>
        <span className="text-zinc-500 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {loading && <p className="text-xs text-zinc-500">Cargando escenarios…</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onPick(s.id)}
                className="text-left rounded-xl bg-[#15151A] border border-[#2A2A2A] hover:border-amber-500/40 p-3 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{s.emoji}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 border ${DIFFICULTY_COLORS[s.difficulty]}`}
                  >
                    {s.difficulty}
                  </span>
                </div>
                <p className="text-sm font-semibold text-zinc-100">{s.title_es}</p>
                <p className="text-[11px] text-zinc-500 mt-1">{s.blurb_es}</p>
              </button>
            ))}
          </div>
          {!loading && scenarios.length === 0 && (
            <p className="text-xs text-zinc-500 mt-2">
              Los escenarios se desbloquean a partir de Fase 1.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
