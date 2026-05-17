"use client";

import { useState } from "react";

type QuizMC = {
  type: "mc";
  question: string;
  options: string[];
  correct_index: number;
  explanation_es?: string;
};
type QuizOpen = {
  type: "open";
  question: string;
  expected_keywords: string[];
  model_answer: string;
};
export type QuizQuestion = QuizMC | QuizOpen;

type Answer = { type: "mc" | "open"; value: number | string };

export default function QuizCard({
  questions,
  userId,
  passageId,
  capsuleSessionId,
  onScored,
}: {
  questions: QuizQuestion[];
  userId: string;
  passageId: string;
  capsuleSessionId: string | null;
  onScored: (totalScore: number) => void;
}) {
  const [answers, setAnswers] = useState<Answer[]>(
    questions.map((q) => ({ type: q.type, value: q.type === "mc" ? -1 : "" }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    total_score: number;
    scores: Array<{ type: "mc" | "open"; correct?: boolean; score: number; feedback_es?: string }>;
  } | null>(null);

  function updateAnswer(i: number, value: number | string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = { type: questions[i].type, value };
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sofia-quiz/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          passage_id: passageId,
          capsule_session_id: capsuleSessionId,
          questions,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "score failed");
      setResult(data);
      onScored(data.total_score);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const allAnswered = answers.every(
    (a, i) =>
      (questions[i].type === "mc" && a.value !== -1) ||
      (questions[i].type === "open" && String(a.value).trim().length > 0)
  );

  return (
    <div className="rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center gap-2">
        <span className="text-rose-400">🎯</span>
        <span className="text-[10px] uppercase tracking-wider text-rose-400 font-bold">
          A — Ajustar
        </span>
        <span className="text-zinc-600 text-xs ml-auto">Pregunta {result ? "✓" : `1-${questions.length}`}</span>
      </div>

      <div className="p-5 space-y-5">
        {questions.map((q, i) => {
          const a = answers[i];
          const r = result?.scores[i];
          return (
            <div key={i} className="rounded-xl bg-[#15151A] border border-[#2A2A2A] p-4">
              <p className="text-sm text-zinc-200 font-semibold mb-3">
                {i + 1}. {q.question}
              </p>

              {q.type === "mc" && (
                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = a.value === oi;
                    const isCorrect = result && oi === q.correct_index;
                    const isWrongPick = result && isSelected && !isCorrect;
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={!!result}
                        onClick={() => updateAnswer(i, oi)}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                          isCorrect
                            ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-200"
                            : isWrongPick
                            ? "bg-rose-500/10 border-rose-500/50 text-rose-200"
                            : isSelected
                            ? "bg-amber-500/10 border-amber-500/50 text-amber-200"
                            : "bg-[#0F0F12] border-[#2A2A2A] text-zinc-300 hover:border-amber-500/30"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  {result && q.explanation_es && (
                    <p className="text-[11px] text-zinc-500 mt-2 italic">{q.explanation_es}</p>
                  )}
                </div>
              )}

              {q.type === "open" && (
                <>
                  <textarea
                    value={String(a.value)}
                    onChange={(e) => updateAnswer(i, e.target.value)}
                    disabled={!!result}
                    placeholder="Escribe tu respuesta en inglés…"
                    className="w-full rounded-lg bg-[#0F0F12] border border-[#2A2A2A] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
                    rows={3}
                  />
                  {result && r && (
                    <div className="mt-2 text-[11px]">
                      <p
                        className={`font-bold ${
                          r.score >= 80
                            ? "text-emerald-400"
                            : r.score >= 50
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {r.score}/100
                      </p>
                      <p className="text-zinc-500 mt-1">{r.feedback_es}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {!result ? (
          <button
            type="button"
            disabled={!allAnswered || submitting}
            onClick={submit}
            className="w-full bg-amber-500 text-black rounded-full py-3 font-bold hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            {submitting ? "Calificando…" : "Enviar respuestas"}
          </button>
        ) : (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
            <p className="text-emerald-300 font-bold text-2xl">{result.total_score}/100</p>
            <p className="text-zinc-400 text-xs mt-1">
              Cápsula APA completada. El ciclo se cierra: estos puntos también ajustan tu Fase Cuna.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
