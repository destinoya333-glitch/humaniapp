"use client";

import { useEffect, useRef, useState } from "react";
import VoiceRecorder from "@/components/sofia-chat/VoiceRecorder";
import ConversationView, {
  ChatMessage,
} from "@/components/sofia-chat/ConversationView";
import TimerWarning from "@/components/sofia-chat/TimerWarning";
import UpgradeModal from "@/components/sofia-chat/UpgradeModal";

type SessionInfo = {
  sessionId: string;
  level: string;
  week: number;
  day: string;
  topic: string;
  sessionType: string;
};

export default function SofiaChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        throw new Error(data.message || data.error || "Error starting session");
      }
      setSession({
        sessionId: data.sessionId,
        level: data.context.level,
        week: data.context.week,
        day: data.context.day,
        topic: data.context.topic,
        sessionType: data.context.sessionType,
      });
      setSecondsRemaining(data.secondsRemaining);
      setMessages([
        {
          role: "assistant",
          content: data.text,
          timestamp: Date.now(),
        },
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

      const res = await fetch("/api/conversation/turn", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "daily_limit_reached") {
          setUpgradeOpen(true);
          return;
        }
        throw new Error(data.message || data.error || "Error in turn");
      }

      const userMsg: ChatMessage = {
        role: "user",
        content: data.userText,
        timestamp: Date.now(),
      };
      const sofiaMsg: ChatMessage = {
        role: "assistant",
        content: data.text,
        timestamp: Date.now() + 1,
      };
      setMessages((prev) => [...prev, userMsg, sofiaMsg]);
      setSecondsRemaining(data.secondsRemaining);
      playAudio(data.audioBase64, data.audioContentType);

      if (data.warningCue === "freemium_30s_warning") {
        // Visual warning is handled by TimerWarning color
        // Could add a toast here later
      }
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
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.src = url;
    audioRef.current.play().catch(() => {
      // Some browsers block autoplay until user gesture; ignore
    });
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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      // Auto-close on unmount
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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <header className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Miss Sofia <span className="text-blue-600">English</span>
          </h1>
          {session && (
            <p className="text-sm text-gray-600">
              {session.level} · Week {session.week} · {session.day} ·{" "}
              <span className="text-blue-600 font-medium">{session.topic}</span>
            </p>
          )}
        </header>

        <TimerWarning secondsRemaining={secondsRemaining} />

        {!session ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-3xl">
              👩‍🏫
            </div>
            <h2 className="text-xl font-semibold mb-1">Ready to talk?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Free plan: 3 minutes per day. No commitment.
            </p>
            <button
              type="button"
              onClick={startSession}
              disabled={loading}
              className="bg-blue-600 text-white rounded-full px-8 py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Starting..." : "Start session"}
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-md mb-4">
              <ConversationView messages={messages} isLoading={loading} />
            </div>

            <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col items-center">
              <VoiceRecorder onAudioReady={sendTurn} disabled={loading} />
              <button
                type="button"
                onClick={endSession}
                className="mt-3 text-xs text-gray-500 hover:text-red-600"
              >
                End session
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </main>
  );
}

function b64ToBlob(b64: string, contentType: string): Blob {
  const byteChars = atob(b64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
}
