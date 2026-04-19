"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
  const [listening, setListening] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [embedLoading, setEmbedLoading] = useState(true);
  const [sessionId] = useState(() => crypto.randomUUID());

  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

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

      // Get LiveAvatar embed URL
      const laRes = await fetch("/api/novia/liveavatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (laRes.ok) {
        const laData = await laRes.json();
        if (laData.url) setEmbedUrl(laData.url);
      }
      setEmbedLoading(false);
    }
    if (token) init();
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => setSpeaking(false);
      audio.play().catch(() => setSpeaking(false));
    } catch { setSpeaking(false); }
  }

  function toggleMic() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { alert("Usa Chrome para el micrófono."); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.lang = "es-PE";
    rec.continuous = false;
    rec.interimResults = false;
    recognitionRef.current = rec;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const t: string = e.results[0][0].transcript;
      if (t.trim()) sendMessage(t.trim());
    };
    rec.start();
  }

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);

    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    const res = await fetch("/api/novia/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message: msg, session_id: sessionId }),
    });
    const data = await res.json();
    const reply: string = data.reply;
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
    speakText(reply);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-[#080808]">

      {/* LEFT — Avatar video (takes most space) */}
      <div className="md:w-[420px] lg:w-[480px] bg-[#0A0A0A] flex flex-col border-b md:border-b-0 md:border-r border-[#1A1A1A]">

        {/* Embed frame — fills available height */}
        <div className="relative flex-1" style={{ minHeight: "70vh" }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              allow="microphone; camera; autoplay; display-capture"
              className="absolute inset-0 w-full h-full border-0"
              style={{ borderRadius: 0 }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0A0A0A]">
              {embedLoading ? (
                <>
                  <div className="w-10 h-10 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
                  <p className="text-amber-400/50 text-sm">Conectando con {noviaName}...</p>
                </>
              ) : (
                <p className="text-zinc-600 text-sm">No se pudo conectar el video</p>
              )}
            </div>
          )}

          {/* Speaking glow overlay on frame */}
          {speaking && (
            <div className="absolute inset-0 pointer-events-none rounded-none" style={{ boxShadow: "inset 0 0 40px rgba(245,158,11,0.15)" }} />
          )}
        </div>

        {/* Bottom info bar */}
        <div className="px-4 py-3 border-t border-[#1A1A1A] flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{noviaName}</p>
            <p className="text-zinc-500 text-xs flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`live-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${speaking ? "bg-amber-400" : "bg-emerald-400"}`} />
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${speaking ? "bg-amber-400" : "bg-emerald-400"}`} />
              </span>
              {speaking ? "hablando..." : "en vivo"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-amber-400 font-bold">{minutesLeft} min</p>
            <a href="https://wa.me/51979385499" target="_blank" rel="noopener noreferrer"
              className="text-zinc-600 text-[11px] hover:text-amber-400 transition-colors">+ recargar</a>
          </div>
        </div>
      </div>

      {/* RIGHT — Chat with Sofía (Claude + ElevenLabs) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-[#1A1A1A] px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">♡</div>
            <div>
              <p className="font-medium text-sm">{noviaName}</p>
              <p className="text-zinc-500 text-xs">{speaking ? "respondiendo..." : "escuchándote"}</p>
            </div>
          </div>
          {speaking && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full animate-pulse">
              🔊 hablando
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs md:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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
                  {[0,1,2].map((i) => <div key={i} className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-5 pb-2 flex gap-2 overflow-x-auto shrink-0">
          {["Hola 😊", "¿Cómo estás?", "Cuéntame algo", "Te extrañaba"].map((q) => (
            <button key={q} onClick={() => sendMessage(q)}
              className="shrink-0 px-3 py-1.5 text-xs border border-[#2A2A2A] rounded-full text-zinc-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
              {q}
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 pt-2 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <button type="button" onClick={toggleMic}
              className={`px-4 py-3 rounded-2xl text-lg transition-all ${listening ? "bg-red-500 text-white animate-pulse" : "bg-[#111] border border-[#2A2A2A] text-zinc-400 hover:border-amber-500/40 hover:text-amber-400"}`}>
              {listening ? "⏹" : "🎙️"}
            </button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? "Escuchando..." : `Escríbele a ${noviaName}...`}
              className="flex-1 bg-[#111] border border-[#2A2A2A] rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50" />
            <button type="submit" disabled={!input.trim() || loading}
              className="px-5 py-3 bg-amber-500 text-black font-semibold rounded-2xl hover:bg-amber-400 transition-colors disabled:opacity-40">
              →
            </button>
          </form>
          <p className="text-center text-zinc-600 text-[11px] mt-2">🎙️ Habla o escribe · Voz de Sofía activada</p>
        </div>
      </div>
    </div>
  );
}

export default function SesionPage() {
  return <Suspense><SessionApp /></Suspense>;
}
