"use client";

/**
 * ReviewTab — Método APA "Ajustar" dentro de Sofia.
 *
 * Cards estilo Teacher Poli con categoría + frase del estudiante + corrección
 * + explicación en español. Dismiss explícito ("Ya lo entendí").
 *
 * Polling cada 8s mientras está expandido — porque /extract corre async tras
 * conversation/end, las cards pueden tardar 5-15s en aparecer.
 */

import { useCallback, useEffect, useState } from "react";

type ReviewCard = {
  id: string;
  session_id: string | null;
  category:
    | "article_use"
    | "word_choice"
    | "verb_tense"
    | "pronunciation"
    | "word_order"
    | "preposition"
    | "subject_verb_agreement";
  user_phrase: string;
  correction: string;
  explanation_es: string;
  severity: 1 | 2 | 3;
  created_at: string;
  dismissed_at: string | null;
};

const CATEGORY_LABELS: Record<ReviewCard["category"], string> = {
  article_use: "ARTICLE USE",
  word_choice: "WORD CHOICE",
  verb_tense: "VERB TENSE",
  pronunciation: "PRONUNCIATION",
  word_order: "WORD ORDER",
  preposition: "PREPOSITION",
  subject_verb_agreement: "SUBJECT-VERB AGREEMENT",
};

const SEVERITY_DOT: Record<1 | 2 | 3, string> = {
  1: "bg-zinc-500",
  2: "bg-amber-400",
  3: "bg-rose-400",
};

export default function ReviewTab({
  userId,
  expanded,
  onToggle,
  pollWhileExpanded = true,
}: {
  userId: string;
  expanded: boolean;
  onToggle: () => void;
  pollWhileExpanded?: boolean;
}) {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sofia-review/list?user_id=${userId}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "no pude cargar la revisión");
      setCards(data.cards ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (expanded) refresh();
  }, [expanded, refresh]);

  useEffect(() => {
    if (!expanded || !pollWhileExpanded) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [expanded, pollWhileExpanded, refresh]);

  async function dismiss(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    try {
      await fetch("/api/sofia-review/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId, user_id: userId }),
      });
    } catch {
      refresh();
    }
  }

  const openCount = cards.length;

  return (
    <section className="mt-4 rounded-2xl border border-[#2A2A2A] bg-[#0F0F12] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#15151A] transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">📝</span>
          <span className="font-semibold text-zinc-100">Revisión APA</span>
          {openCount > 0 && (
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full px-2 py-0.5">
              {openCount} pendiente{openCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <span className="text-zinc-500 text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {loading && cards.length === 0 && (
            <p className="text-xs text-zinc-500">Analizando tu conversación…</p>
          )}
          {!loading && cards.length === 0 && !error && (
            <p className="text-xs text-zinc-500">
              Sin correcciones pendientes. Cuando termines una sesión, aquí aparecerán los ajustes para refinar tu inglés.
            </p>
          )}
          {error && (
            <p className="text-xs text-rose-300">{error}</p>
          )}
          {cards.map((c) => (
            <article
              key={c.id}
              className="rounded-xl bg-[#15151A] border border-[#2A2A2A] p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${SEVERITY_DOT[c.severity]}`} />
                <span className="text-[10px] font-bold tracking-wider text-zinc-400">
                  {CATEGORY_LABELS[c.category]}
                </span>
              </div>
              <p className="text-sm text-zinc-200 mb-1">
                <span className="text-zinc-500">Dijiste:</span>{" "}
                <span className="italic">&ldquo;{c.user_phrase}&rdquo;</span>
              </p>
              <p className="text-sm text-emerald-300 mb-2">
                <span className="text-zinc-500">Más natural:</span>{" "}
                <span className="font-semibold">&ldquo;{c.correction}&rdquo;</span>
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {c.explanation_es}
              </p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => dismiss(c.id)}
                  className="text-[11px] text-zinc-500 hover:text-emerald-400 transition-colors"
                >
                  Ya lo entendí ✓
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
