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
  const [userName, setUserName] = useState("");
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      setUserName(userData.name ?? "");

      // Welcome message
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

  async function speakText(text: string) {
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      setSpeaking(true);
      const res = await fetch("/api/novia/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch { setSpeaking(false); }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* Left — Avatar panel */}
      <div className="md:w-80 bg-[#0A0A0A] border-b md:border-b-0 md:border-r border-[#1A1A1A] flex flex-col items-center justify-center p-6 gap-4 py-8">

        {/* Avatar frame */}
        <div className="relative w-48 h-60 md:w-56 md:h-72 rounded-3xl overflow-hidden border border-[#2A2A2A]"
          style={{ boxShadow: "0 0 60px rgba(245,158,11,0.1)" }}>
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1008] via-[#100d08] to-[#080808]" />

          {/* Face glow */}
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-36 h-36 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.1) 0%, transparent 70%)" }} />

          {/* Head */}
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2" style={{ width: 100, height: 120 }}>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-t-full"
              style={{ width: 88, height: 55, background: "linear-gradient(180deg,#1a0d04,#0f0802)" }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 rounded-[50%]"
              style={{ width: 80, height: 96, background: "linear-gradient(180deg,#2a1a0e,#1a0f08)" }} />
            <div className="absolute top-[38%] left-[20%] w-3 h-1.5 rounded-full bg-amber-300/50"
              style={{ boxShadow: "0 0 8px rgba(251,191,36,0.7)", animation: speaking ? "orb-pulse 0.5s infinite" : "orb-pulse 3s infinite" }} />
            <div className="absolute top-[38%] right-[20%] w-3 h-1.5 rounded-full bg-amber-300/50"
              style={{ boxShadow: "0 0 8px rgba(251,191,36,0.7)", animation: speaking ? "orb-pulse 0.5s infinite 0.1s" : "orb-pulse 3s infinite 0.5s" }} />
            <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 w-7 h-1.5 rounded-full"
              style={{ background: speaking ? "rgba(239,68,68,0.7)" : "rgba(127,29,29,0.6)" }} />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-b-lg"
              style={{ width: 24, height: 28, background: "linear-gradient(180deg,#2a1a0e,#1a0f08)" }} />
          </div>

          {/* Shoulders */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[40%]"
            style={{ width: 150, height: 70, background: "linear-gradient(180deg,#1a0f08,#0d0905)" }} />

          {/* Speaking waveform */}
          {speaking && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
              {waveBars.map((h, i) => (
                <div key={i} className="wave-bar"
                  style={{ height: `${h * 2}px`, animationDelay: `${i * 0.08}s`, animationDuration: `${0.6 + (i % 4) * 0.1}s` }} />
              ))}
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] text-emerald-400">En vivo</span>
          </div>
        </div>

        <div className="text-center">
          <p className="font-semibold text-lg">{noviaName}</p>
          <p className="text-zinc-500 text-xs">Tu compañera IA</p>
        </div>

        {/* Minutes */}
        <div className="w-full bg-[#111] border border-[#2A2A2A] rounded-2xl px-4 py-3 text-center">
          <p className="text-amber-400 font-bold text-xl">{minutesLeft} min</p>
          <p className="text-zinc-500 text-xs">disponibles</p>
        </div>

        <a href="https://wa.me/51979385499" target="_blank" rel="noopener noreferrer"
          className="w-full text-center py-2.5 border border-amber-500/30 text-amber-400 text-sm rounded-xl hover:bg-amber-500/10 transition-colors">
          + Recargar minutos
        </a>
      </div>

      {/* Right — Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-[#1A1A1A] px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            ♡
          </div>
          <div>
            <p className="font-medium text-sm">{noviaName}</p>
            <p className="text-zinc-500 text-xs">{speaking ? "hablando..." : "activa ahora"}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4" style={{ maxHeight: "calc(100vh - 180px)" }}>
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
                    <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div className="px-6 pb-2 flex gap-2 overflow-x-auto">
          {["Hola 😊", "¿Cómo estás?", "Cuéntame algo", "Te extrañaba"].map((q) => (
            <button key={q} onClick={() => sendMessage(q)}
              className="shrink-0 px-3 py-1.5 text-xs border border-[#2A2A2A] rounded-full text-zinc-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-6 pb-6 pt-2">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Escríbele a ${noviaName}...`}
              className="flex-1 bg-[#111] border border-[#2A2A2A] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
            <button type="submit" disabled={!input.trim() || loading}
              className="px-5 py-3 bg-amber-500 text-black font-semibold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40">
              →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SesionPage() {
  return <Suspense><SessionApp /></Suspense>;
}
