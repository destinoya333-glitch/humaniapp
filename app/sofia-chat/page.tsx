"use client";

import { useEffect, useRef, useState } from "react";
import VoiceRecorder from "@/components/sofia-chat/VoiceRecorder";
import ConversationView, {
  ChatMessage,
} from "@/components/sofia-chat/ConversationView";
import TimerWarning from "@/components/sofia-chat/TimerWarning";
import UpgradeModal from "@/components/sofia-chat/UpgradeModal";

/* ─── Types matching the Cuna endpoints ──────────────────────── */

type SessionInfo = {
  sessionId: string;
  phase: number;
  phaseDay: number;
  ritualSlot: string;
  missionTitle: string | null;
  novelChapter: number | null;
};

type ProgressData = {
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
    tiempo_de_boca_minutes: number;
    palabras_tuyas_count: number;
    milestones_unlocked_count: number;
  };
  milestones: Array<{ key: string; achieved_at: string; context: string | null }>;
  novel: {
    current_chapter_number: number;
    title: string;
    audio_url: string | null;
    completed: boolean;
  } | null;
  mission_today: { title: string; completed: boolean } | null;
  cuna_started_at: string | null;
};

type LatestChapter = {
  id: string;
  chapter_number: number;
  title: string;
  audio_url: string | null;
  student_part_required: string | null;
  completed_at: string | null;
} | null;

const PHASE_VISUALS: Record<number, { icon: string; color: string; bg: string }> = {
  0: { icon: "🌙", color: "text-indigo-400", bg: "bg-indigo-400/10" },
  1: { icon: "💧", color: "text-sky-400", bg: "bg-sky-400/10" },
  2: { icon: "⚡", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  3: { icon: "🌱", color: "text-amber-400", bg: "bg-amber-400/10" },
  4: { icon: "🌊", color: "text-orange-400", bg: "bg-orange-400/10" },
  5: { icon: "🔥", color: "text-rose-400", bg: "bg-rose-400/10" },
};

const RITUAL_LABELS: Record<string, string> = {
  morning: "🌅 Mañana",
  lunch: "🌞 Almuerzo",
  night: "🌙 Noche",
  bedtime: "🌌 Antes de dormir",
  weekend: "🍖 Asado familiar",
};

/* ─── Page ───────────────────────────────────────────────────── */

export default function SofiaChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [chapter, setChapter] = useState<LatestChapter>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auth check
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

  // Load progress + latest chapter when userId is known
  useEffect(() => {
    if (!userId) return;
    refreshProgress(userId);
    refreshChapter(userId);
  }, [userId]);

  async function refreshProgress(uid: string) {
    try {
      const res = await fetch(`/api/sofia-flows/progress?user_id=${uid}`);
      if (res.ok) setProgress(await res.json());
    } catch {
      /* silent */
    }
  }

  async function refreshChapter(uid: string) {
    try {
      const res = await fetch(`/api/novel/latest?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setChapter(data.chapter);
      }
    } catch {
      /* silent */
    }
  }

  async function generateNextChapter() {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/novel/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!res.ok) throw new Error("No pude generar el capítulo");
      const data = await res.json();
      setChapter(data.chapter);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function startSession() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/conversation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "daily_limit_reached") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.message || data.error || "Error iniciando sesión");
      }
      setSession({
        sessionId: data.sessionId,
        phase: data.context.phase,
        phaseDay: data.context.phase_day,
        ritualSlot: data.context.ritual_slot,
        missionTitle: data.context.mission_title,
        novelChapter: data.context.novel_chapter,
      });
      setSecondsRemaining(data.secondsRemaining);
      setMessages([
        { role: "assistant", content: data.text, timestamp: Date.now() },
      ]);
      playAudio(data.audioBase64, data.audioContentType);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function sendTurn(audio: Blob, durationSeconds: number) {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("session_id", session.sessionId);
      fd.append("audio", audio, "audio.webm");
      fd.append("duration_seconds", String(durationSeconds));
      const res = await fetch("/api/conversation/turn", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "daily_limit_reached") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.message || data.error || "Error en el turno");
      }
      setMessages((prev) => [
        ...prev,
        { role: "user", content: data.userText, timestamp: Date.now() },
        { role: "assistant", content: data.text, timestamp: Date.now() + 1 },
      ]);
      setSecondsRemaining(data.secondsRemaining);
      playAudio(data.audioBase64, data.audioContentType);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function playAudio(base64: string | null, contentType: string | null) {
    if (!base64 || !contentType) return;
    const blob = b64ToBlob(base64, contentType);
    const url = URL.createObjectURL(blob);
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {});
  }

  async function endSession() {
    if (!session) return;
    setLoading(true);
    try {
      await fetch("/api/conversation/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.sessionId }),
      });
      setSession(null);
      setMessages([]);
      // Refresh progress + chapter after the session closed (Shadow Coach may have updated state)
      if (userId) {
        refreshProgress(userId);
        refreshChapter(userId);
      }
    } finally {
      setLoading(false);
    }
  }

  // Auto-close on unmount
  useEffect(() => {
    return () => {
      if (session) {
        fetch("/api/conversation/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: session.sessionId }),
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading || !userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-zinc-400">
        Cargando...
      </main>
    );
  }

  const phaseVis = progress ? PHASE_VISUALS[progress.phase.number] ?? PHASE_VISUALS[0] : PHASE_VISUALS[0];

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-zinc-100">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">

        {/* ── Header con fase + ritual ─────────────────── */}
        <header className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">
              Miss Sofia <span className="text-amber-400">·</span>{" "}
              <span className="text-zinc-400 font-normal">Método Cuna</span>
            </h1>
            <a
              href="/sofia-progress"
              className="text-xs text-zinc-500 hover:text-amber-400 transition-colors"
            >
              Ver progreso completo →
            </a>
          </div>

          {progress && (
            <div className={`rounded-2xl p-4 ${phaseVis.bg} border border-[#2A2A2A]`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{phaseVis.icon}</span>
                  <div>
                    <p className={`font-semibold ${phaseVis.color}`}>
                      Fase {progress.phase.number} · {progress.phase.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Día {progress.phase.day} de {progress.phase.total_days}
                      {" · "}
                      {RITUAL_LABELS[progress.phase.subtitle] ? "" : null}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <Metric label="🎙️ Boca" value={`${progress.metrics.tiempo_de_boca_minutes}m`} />
                  <Metric label="📚 Palabras" value={String(progress.metrics.palabras_tuyas_count)} />
                  <Metric label="🌟 Hitos" value={String(progress.metrics.milestones_unlocked_count)} />
                </div>
              </div>
              <div className="mt-3 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className={`h-full ${phaseVis.color.replace("text-", "bg-")} opacity-70 transition-all`}
                  style={{ width: `${progress.phase.completion_pct}%` }}
                />
              </div>
            </div>
          )}
        </header>

        <TimerWarning secondsRemaining={secondsRemaining} />

        {/* ── Misión del día ─────────────────────────────── */}
        {progress?.mission_today && (
          <div className="mb-4 card-surface rounded-2xl p-4 border border-[#2A2A2A]">
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-xs text-amber-400 uppercase tracking-widest">🎯 Misión de hoy</p>
              {progress.mission_today.completed && (
                <span className="text-xs text-emerald-400">✓ Completada</span>
              )}
            </div>
            <p className="text-zinc-200 text-sm">{progress.mission_today.title}</p>
          </div>
        )}

        {/* ── Capítulo de novela ─────────────────────────── */}
        <NovelCard
          chapter={chapter}
          userId={userId}
          loading={loading}
          onGenerate={generateNextChapter}
          onCompleted={() => userId && refreshChapter(userId)}
        />

        {/* ── Sesión de conversación ─────────────────────── */}
        {!session ? (
          <div className="card-surface rounded-2xl p-6 text-center border border-[#2A2A2A]">
            <p className="text-zinc-300 mb-4">
              {progress?.phase.number === 0
                ? "En Fase Cuna no necesitas hablar. Solo escucha el audio matutino y marca cómo te fue."
                : "Habla con Sofia. Ajustada a tu fase y ritmo."}
            </p>
            <button
              type="button"
              onClick={startSession}
              disabled={loading}
              className="bg-amber-500 text-black rounded-full px-8 py-3 font-bold hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
            >
              {loading ? "Iniciando..." : "Iniciar sesión"}
            </button>
          </div>
        ) : (
          <>
            <div className="card-surface rounded-2xl border border-[#2A2A2A] mb-4">
              <ConversationView messages={messages} isLoading={loading} />
            </div>
            <div className="card-surface rounded-2xl p-4 border border-[#2A2A2A] flex flex-col items-center">
              <VoiceRecorder onAudioReady={sendTurn} disabled={loading} />
              <button
                type="button"
                onClick={endSession}
                className="mt-3 text-xs text-zinc-500 hover:text-rose-400 transition-colors"
              >
                Terminar sesión
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="mt-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </main>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-zinc-200 font-bold">{value}</p>
      <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</p>
    </div>
  );
}

function NovelCard({
  chapter,
  userId,
  loading,
  onGenerate,
  onCompleted,
}: {
  chapter: LatestChapter;
  userId: string;
  loading: boolean;
  onGenerate: () => void;
  onCompleted: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    if (!chapter || !chapter.student_part_required) return;
    setRecordError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        uploadStudentPart(blob);
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      setRecordError("No pude acceder al micrófono. Revisa permisos.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function uploadStudentPart(blob: Blob) {
    if (!chapter || !userId) return;
    setUploading(true);
    setRecordError(null);
    try {
      const base64 = await blobToBase64(blob);
      const res = await fetch("/api/novel/student-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          audio_base64: base64,
          audio_mime: "audio/webm",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Error subiendo audio");
      }
      onCompleted();
    } catch (e) {
      setRecordError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (!chapter) {
    return (
      <div className="mb-4 card-surface rounded-2xl p-4 border border-[#2A2A2A]">
        <p className="text-xs text-amber-400 uppercase tracking-widest mb-2">📖 Tu novela personal</p>
        <p className="text-zinc-400 text-sm mb-3">
          Aún no tienes capítulos generados. Tu novela arranca cuando avances a Fase 3.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="text-xs text-amber-400 hover:text-amber-300 disabled:text-zinc-600"
        >
          {loading ? "Generando..." : "Generar capítulo 1 →"}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 card-surface rounded-2xl p-4 border border-[#2A2A2A]">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs text-amber-400 uppercase tracking-widest">
            📖 Capítulo {chapter.chapter_number}
          </p>
          <p className="text-zinc-200 font-medium mt-1">{chapter.title}</p>
        </div>
        {chapter.completed_at && (
          <span className="text-xs text-emerald-400 shrink-0">✓ Completado</span>
        )}
      </div>

      {chapter.audio_url && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio controls className="w-full mt-3" src={chapter.audio_url} />
      )}

      {chapter.student_part_required && !chapter.completed_at && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Tu línea</p>
          <p className="text-zinc-300 italic mb-3">"{chapter.student_part_required}"</p>
          {recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="bg-rose-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-rose-400"
            >
              ⏹ Detener
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={uploading}
              className="bg-amber-500 text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-amber-400 disabled:bg-zinc-700"
            >
              {uploading ? "Subiendo..." : "🎙 Grabar mi línea"}
            </button>
          )}
          {recordError && (
            <p className="text-rose-400 text-xs mt-2">{recordError}</p>
          )}
        </div>
      )}

      {chapter.completed_at && (
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="mt-4 text-xs text-amber-400 hover:text-amber-300 disabled:text-zinc-600"
        >
          {loading ? "Generando..." : "Generar capítulo siguiente →"}
        </button>
      )}
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function b64ToBlob(b64: string, contentType: string): Blob {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

