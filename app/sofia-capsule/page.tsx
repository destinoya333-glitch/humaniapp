"use client";

/**
 * Cápsula APA — flujo Adquirir → Practicar → Ajustar dentro de Sofia.
 *
 * Pantallas (state machine):
 *   1. picker   → TopicPicker
 *   2. reading  → ReadAlongPlayer
 *   3. practice → invita al usuario a abrir sofia-chat para hablar con Sofia (P)
 *   4. quiz     → QuizCard
 *   5. done     → score final + CTA volver a /sofia-chat
 */

import { useEffect, useState } from "react";
import TopicPicker from "@/components/sofia-capsule/TopicPicker";
import ReadAlongPlayer from "@/components/sofia-capsule/ReadAlongPlayer";
import QuizCard, { type QuizQuestion } from "@/components/sofia-capsule/QuizCard";

type Passage = {
  id: string;
  title: string;
  body_en: string;
  body_es: string;
  audio_url: string | null;
  word_count: number;
};

type Step = "picker" | "loading" | "reading" | "practice_prompt" | "loading_quiz" | "quiz" | "done";

export default function SofiaCapsulePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [step, setStep] = useState<Step>("picker");
  const [passage, setPassage] = useState<Passage | null>(null);
  const [capsuleSessionId, setCapsuleSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sofia-auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          window.location.href = "/sofia-auth/login";
          return;
        }
        if (data.needsOnboarding) {
          window.location.href = "/sofia-onboarding";
          return;
        }
        setUserId(data.user_id);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // Auto-start desde deep-link WhatsApp si vienen los params firmados.
  useEffect(() => {
    if (!userId || step !== "picker") return;
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic");
    const difficulty = params.get("difficulty") as "easy" | "medium" | "hard" | null;
    const sig = params.get("sig");
    const exp = params.get("exp");
    const u = params.get("u");
    if (!topic || !difficulty || !sig || !exp || !u) return;
    if (u !== userId) return; // el link es para otro user; ignorar

    fetch(
      `/api/sofia-capsule/verify-link?${new URLSearchParams({ topic, difficulty, u, exp, sig }).toString()}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          startCapsule({ topic, difficulty });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, step]);

  async function startCapsule(opts: { topic: string; difficulty: "easy" | "medium" | "hard" }) {
    if (!userId) return;
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/sofia-passage/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, topic: opts.topic, difficulty: opts.difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "no pude generar la cápsula");
      setPassage(data.passage);

      // Crear capsule session
      const sres = await fetch("/api/sofia-capsule/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, passage_id: data.passage.id }),
      });
      const sdata = await sres.json();
      if (sres.ok) setCapsuleSessionId(sdata.capsule_session_id);

      setStep("reading");
    } catch (e) {
      setError((e as Error).message);
      setStep("picker");
    }
  }

  async function goToQuiz() {
    if (!passage) return;
    setStep("loading_quiz");
    try {
      const res = await fetch("/api/sofia-quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passage_id: passage.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "no pude generar el quiz");
      setQuestions(data.questions);
      setStep("quiz");
    } catch (e) {
      setError((e as Error).message);
      setStep("reading");
    }
  }

  if (authLoading || !userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-zinc-400">
        Cargando…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <header className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="text-amber-400">Cápsula APA</span>{" "}
            <span className="text-zinc-500 font-normal">· Método Teacher Poli × Cuna</span>
          </h1>
          <a href="/sofia-chat" className="text-xs text-zinc-500 hover:text-amber-400">
            ← Chat
          </a>
        </header>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-3">
            {error}
          </div>
        )}

        {step === "picker" && <TopicPicker userId={userId} onStart={startCapsule} />}

        {(step === "loading" || step === "loading_quiz") && (
          <div className="rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] p-10 text-center">
            <div className="text-3xl mb-3 animate-pulse">🧠</div>
            <p className="text-zinc-400 text-sm">
              {step === "loading"
                ? "Generando tu cápsula APA…"
                : "Preparando tu quiz…"}
            </p>
          </div>
        )}

        {step === "reading" && passage && (
          <ReadAlongPlayer
            passage={passage}
            userId={userId}
            onDone={() => setStep("practice_prompt")}
          />
        )}

        {step === "practice_prompt" && passage && (
          <div className="rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] p-6 text-center">
            <div className="text-emerald-400 mb-2">
              <span className="text-[10px] uppercase tracking-wider font-bold">
                P — Practicar
              </span>
            </div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">
              Habla con Sofia sobre &ldquo;{passage.title}&rdquo;
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Abre tu chat con Sofia. Cuéntale lo que aprendiste del pasaje o hazle preguntas. Cuando termines, vuelve aquí para el quiz.
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={`/sofia-chat?topic=${encodeURIComponent(passage.title)}`}
                className="bg-amber-500 text-black rounded-full px-6 py-3 font-bold hover:bg-amber-400"
              >
                Abrir chat con Sofia →
              </a>
              <button
                type="button"
                onClick={goToQuiz}
                className="text-xs text-zinc-500 hover:text-amber-400 mt-2"
              >
                Saltar a quiz (A — Ajustar) →
              </button>
            </div>
          </div>
        )}

        {step === "quiz" && passage && (
          <QuizCard
            questions={questions}
            userId={userId}
            passageId={passage.id}
            capsuleSessionId={capsuleSessionId}
            onScored={(s) => {
              setFinalScore(s);
              setStep("done");
            }}
          />
        )}

        {step === "done" && finalScore !== null && (
          <div className="mt-4 rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] p-6 text-center">
            <p className="text-zinc-400 text-sm mb-3">Ciclo APA cerrado</p>
            <p className="text-5xl font-bold text-amber-400 mb-3">{finalScore}/100</p>
            <p className="text-xs text-zinc-500 mb-5">
              Tu pasaje, tu conversación con Sofia y tu quiz quedan guardados en tu progreso.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  setStep("picker");
                  setPassage(null);
                  setQuestions([]);
                  setFinalScore(null);
                  setCapsuleSessionId(null);
                }}
                className="bg-amber-500 text-black rounded-full px-6 py-2 font-bold hover:bg-amber-400 text-sm"
              >
                Otra cápsula
              </button>
              <a
                href="/sofia-chat"
                className="bg-[#15151A] border border-[#2A2A2A] rounded-full px-6 py-2 font-bold text-zinc-300 hover:border-amber-500/40 text-sm"
              >
                Volver al chat
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
