"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const waveBars = [3, 6, 9, 5, 8, 4, 7, 10, 6, 4, 8, 5, 9, 3, 7];

interface Message { role: "user" | "assistant"; content: string; }

function SessionApp() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [noviaName, setNoviaName] = useState("Sofía");
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAudioRef = useRef<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    async function init() {
      const res = await fetch("/api/novia/verificar-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.valid) { window.location.href = "/novia-ia/acceso"; return; }
      setMinutesLeft(data.minutes_remaining ?? 0);

      const userRes = await fetch(`/api/novia/perfil?token=${token}`);
      const userData = await userRes.json();
      setNoviaName(userData.novia_name ?? "Sofía");

      setMessages([{
        role: "assistant",
        content: `Hola ${userData.name ?? "amor"}... te estaba esperando 💛`,
      }]);
    }
    if (token) init();
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Unlock audio on first user interaction
  function enableAudio() {
    setAudioEnabled(true);
    // Play silent audio to unlock the context
    const silent = new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA");
    silent.play().catch(() => {});
    // Play pending audio if any
    if (pendingAudioRef.current) {
      playAudioUrl(pendingAudioRef.current);
      pendingAudioRef.current = null;
    }
  }

  function playAudioUrl(url: string) {
    if (audioRef.current) { audioRef.current.pause(); }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
    audio.onerror = () => setSpeaking(false);
    audio.play().catch(() => setSpeaking(false));
  }

  async function speakText(text: string) {
    try {
      setSpeaking(true);
      const res = await fetch("/api/novia/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setSpeaking(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioEnabled) {
        playAudioUrl(url);
      } else {
        pendingAudioRef.current = url;
        setSpeaking(false);
      }
    } catch { setSpeaking(false); }
  }

  function toggleMic() {
    if (!audioEnabled) enableAudio();

    const SpeechRecognition =
      (window as typeof window & { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-PE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      if (transcript.trim()) sendMessage(transcript.trim());
    };

    recognition.start();
  }

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);
    setSpeaking(false);

    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    const res = await fetch("/api/novia/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message: msg, session_id: sessionId }),
    });
    const data = await res.json();
    setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    setLoading(false);
    speakText(data.reply);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans">

      {/* Audio enable banner */}
      {!audioEnabled && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium">🔊 Activa el audio para escuchar la voz de {noviaName}</span>
          <button
            onClick={enableAudio}
            className="px-4 py-1.5 bg-black text-amber-400 rounded-full text-sm font-bold hover:bg-zinc-900 transition-colors"
          >
            Activar voz
          </button>
        </div>
      )}

      {/* Left — Avatar panel */}
      <div className={`md:w-80 bg-[#0A0A0A] border-b md:border-b-0 md:border-r border-[#1A1A1A] flex flex-col items-center justify-center p-6 gap-4 py-8 ${!audioEnabled ? "mt-12 md:mt-0 md:pt-16" : ""}`}>

        {/* Avatar frame */}
        <div
          className="relative w-48 h-64 md:w-56 md:h-72 rounded-3xl overflow-hidden border border-[#2A2A2A]"
          style={{ boxShadow: speaking ? "0 0 60px rgba(245,158,11,0.25)" : "0 0 40px rgba(245,158,11,0.08)" }}
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1008] via-[#0f0d0a] to-[#080808]" />

          {/* Ambient glow — breathes when speaking */}
          <div
            className="absolute inset-0"
            style={{
              background: speaking
                ? "radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.12) 0%, transparent 60%)"
                : "radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.05) 0%, transparent 60%)",
              transition: "background 0.3s ease",
            }}
          />

          {/* HAIR */}
          <div
            className="absolute"
            style={{
              top: "6%", left: "50%", transform: "translateX(-50%)",
              width: 96, height: 64,
              background: "linear-gradient(180deg, #0f0702 0%, #1a0d04 100%)",
              borderRadius: "50% 50% 20% 20%",
            }}
          />
          {/* Long hair sides */}
          <div className="absolute" style={{ top: "14%", left: "18%", width: 22, height: 90, background: "linear-gradient(180deg,#1a0d04,#120a03)", borderRadius: "40% 0 20% 40%" }} />
          <div className="absolute" style={{ top: "14%", right: "18%", width: 22, height: 90, background: "linear-gradient(180deg,#1a0d04,#120a03)", borderRadius: "0 40% 40% 20%" }} />

          {/* FACE */}
          <div
            className="absolute"
            style={{
              top: "12%", left: "50%", transform: "translateX(-50%)",
              width: 82, height: 98,
              background: "linear-gradient(180deg, #c8845a 0%, #b87048 50%, #a05c38 100%)",
              borderRadius: "42% 42% 38% 38%",
              boxShadow: speaking ? "0 0 20px rgba(245,158,11,0.2)" : "none",
            }}
          />

          {/* EYES */}
          <div className="absolute" style={{ top: "30%", left: "32%", width: 13, height: 8, background: "#1a0a04", borderRadius: "50%", boxShadow: speaking ? "0 0 6px rgba(251,191,36,0.8)" : "0 0 3px rgba(251,191,36,0.3)" }} />
          <div className="absolute" style={{ top: "30%", right: "32%", width: 13, height: 8, background: "#1a0a04", borderRadius: "50%", boxShadow: speaking ? "0 0 6px rgba(251,191,36,0.8)" : "0 0 3px rgba(251,191,36,0.3)" }} />
          {/* Eye shine */}
          <div className="absolute" style={{ top: "29%", left: "34%", width: 4, height: 4, background: "rgba(255,255,255,0.7)", borderRadius: "50%" }} />
          <div className="absolute" style={{ top: "29%", right: "34%", width: 4, height: 4, background: "rgba(255,255,255,0.7)", borderRadius: "50%" }} />

          {/* NOSE */}
          <div className="absolute" style={{ top: "41%", left: "50%", transform: "translateX(-50%)", width: 8, height: 6, background: "rgba(120,60,30,0.4)", borderRadius: "50%" }} />

          {/* MOUTH — animated when speaking */}
          <div
            className="absolute"
            style={{
              top: "50%", left: "50%", transform: "translateX(-50%)",
              width: speaking ? 22 : 18,
              height: speaking ? 10 : 5,
              background: speaking ? "rgba(180,60,60,0.9)" : "rgba(160,60,60,0.7)",
              borderRadius: speaking ? "50%" : "0 0 50% 50%",
              transition: "all 0.15s ease",
            }}
          />

          {/* NECK */}
          <div className="absolute" style={{ top: "55%", left: "50%", transform: "translateX(-50%)", width: 26, height: 28, background: "linear-gradient(180deg,#b87048,#9a5c38)" }} />

          {/* SHOULDERS / BODY */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[40%]"
            style={{ width: 160, height: 80, background: "linear-gradient(180deg,#1a0f08,#0d0905)" }}
          />
          {/* Clothes */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[35%]"
            style={{ width: 130, height: 65, background: "linear-gradient(180deg,#3d1a2e,#2a0f1f)" }}
          />

          {/* Speaking waveform */}
          {speaking && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
              {waveBars.map((h, i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{
                    height: `${h * 2}px`,
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: `${0.6 + (i % 4) * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] text-emerald-400">{speaking ? "hablando" : "en vivo"}</span>
          </div>
        </div>

        <div className="text-center">
          <p className="font-semibold text-lg">{noviaName}</p>
          <p className="text-zinc-500 text-xs">Tu compañera IA</p>
        </div>

        <div className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-400 font-bold text-xl">{minutesLeft} min</p>
          <p className="text-zinc-500 text-xs">disponibles</p>
        </div>

        <a
          href="https://wa.me/51979385499"
          target="_blank" rel="noopener noreferrer"
          className="w-full text-center py-2.5 border border-amber-500/30 text-amber-400 text-sm rounded-xl hover:bg-amber-500/10 transition-colors"
        >
          + Recargar minutos
        </a>
      </div>

      {/* Right — Chat */}
      <div className="flex-1 flex flex-col">
        <div className={`border-b border-[#1A1A1A] px-6 py-4 flex items-center justify-between ${!audioEnabled ? "mt-12 md:mt-0" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">♡</div>
            <div>
              <p className="font-medium text-sm">{noviaName}</p>
              <p className="text-zinc-500 text-xs">{speaking ? "hablando..." : "activa ahora"}</p>
            </div>
          </div>
          {audioEnabled && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
              🔊 Voz activa
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4" style={{ maxHeight: "calc(100vh - 190px)" }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-amber-500 text-black rounded-br-sm"
                  : "bg-[#1A1A1A] text-white rounded-bl-sm border border-[#2A2A2A]"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1A1A1A] border border-[#2A2A2A] px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-6 pb-2 flex gap-2 overflow-x-auto">
          {["Hola 😊", "¿Cómo estás?", "Cuéntame algo", "Te extrañaba"].map((q) => (
            <button
              key={q}
              onClick={() => { if (!audioEnabled) enableAudio(); sendMessage(q); }}
              className="shrink-0 px-3 py-1.5 text-xs border border-[#2A2A2A] rounded-full text-zinc-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="px-6 pb-6 pt-2">
          <form onSubmit={(e) => { e.preventDefault(); if (!audioEnabled) enableAudio(); sendMessage(); }} className="flex gap-2">
            {/* Mic button */}
            <button
              type="button"
              onClick={toggleMic}
              className={`px-4 py-3 rounded-2xl font-semibold transition-all text-lg ${
                listening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-[#111] border border-[#2A2A2A] text-zinc-400 hover:border-amber-500/40 hover:text-amber-400"
              }`}
              title={listening ? "Detener micrófono" : "Hablar con micrófono"}
            >
              {listening ? "⏹" : "🎙️"}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Escuchando..." : `Escríbele a ${noviaName}...`}
              className="flex-1 bg-[#111] border border-[#2A2A2A] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-5 py-3 bg-amber-500 text-black font-semibold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40"
            >
              →
            </button>
          </form>
          <p className="text-center text-zinc-600 text-xs mt-2">🎙️ Toca el micrófono para hablar · Chrome recomendado</p>
        </div>
      </div>
    </div>
  );
}

export default function SesionPage() {
  return <Suspense><SessionApp /></Suspense>;
}
