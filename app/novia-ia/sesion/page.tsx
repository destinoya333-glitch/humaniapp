"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Room, RoomEvent, Track } from "livekit-client";

// Map avatar_id → preview photo shown while LiveAvatar loads
const AVATAR_PHOTOS: Record<string, string> = {
  "37c384cc-e572-4bf1-bc2a-02907ffc6521": "/juanita-avatar.jpg",  // Rika (Juanita)
  "65ee9a5b-00ae-4c96-acf2-3326d9566467": "/juanita-avatar.jpg",
  "9a4f4b1f-86f9-4acf-9a37-b81c21ae95e4": "/sofia-avatar.jpg",
  "7299c55d-1f45-482d-915c-e5efdc9dd266": "/elenora-avatar.jpg",
};

interface Message { role: "user" | "assistant"; content: string; }

interface LASession {
  session_id: string;
  livekit_url: string;
  livekit_token: string;
  ws_url: string;
}

const CHUNK_SIZE = 43200; // ~1s of PCM 24kHz 16-bit

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
  const [laStatus, setLaStatus] = useState<"loading" | "ready" | "error">("loading");
  const [avatarId, setAvatarId] = useState<string>("");
  const [avatarPhoto, setAvatarPhoto] = useState<string>("/juanita-avatar.jpg");
  const [sessionId] = useState(() => crypto.randomUUID());

  const bottomRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const connectLiveAvatar = useCallback(async (selectedAvatarId?: string) => {
    try {
      const res = await fetch("/api/novia/liveavatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_duration: 300, avatar_id: selectedAvatarId || undefined }),
      });
      if (!res.ok) { setLaStatus("error"); return; }

      const la: LASession = await res.json();
      if (!la.livekit_url) { setLaStatus("error"); return; }

      // Connect LiveKit room for video stream
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        }
        // LITE mode: no audio track from LiveKit — audio comes from ElevenLabs MP3
      });

      await room.connect(la.livekit_url, la.livekit_token, { autoSubscribe: true });

      // Open WebSocket for audio commands
      const ws = new WebSocket(la.ws_url);
      wsRef.current = ws;

      ws.onopen = () => { /* wait for session.state_updated */ };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.type === "session.state_updated" && msg.state === "connected") {
            wsReadyRef.current = true;
            setLaStatus("ready");
          }
          if (msg.type === "agent.speak_started") setSpeaking(true);
          if (msg.type === "agent.speak_ended") setSpeaking(false);
        } catch { /* ignore */ }
      };
      ws.onerror = () => setLaStatus("error");
      ws.onclose = () => { wsReadyRef.current = false; };

    } catch {
      setLaStatus("error");
    }
  }, []);

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

      // avatar_id: prefer DB, fallback to localStorage
      const savedAvatarId = userData.avatar_id
        || (typeof window !== "undefined" ? localStorage.getItem(`avatar_id_${token}`) : null)
        || "";
      if (savedAvatarId) {
        setAvatarId(savedAvatarId);
        setAvatarPhoto(AVATAR_PHOTOS[savedAvatarId] ?? "/juanita.jpg");
      }

      setMessages([{ role: "assistant", content: `Hola ${userData.name ?? "amor"}... te estaba esperando 💛` }]);

      connectLiveAvatar(savedAvatarId);
    }
    if (token) init();
    return () => {
      roomRef.current?.disconnect();
      wsRef.current?.close();
    };
  }, [token, connectLiveAvatar]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function speakText(text: string) {
    setSpeaking(true);
    try {
      // Always fetch MP3 for browser audio — LITE mode doesn't stream audio back
      const [mp3Res, pcmRes] = await Promise.all([
        fetch("/api/novia/voz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, format: "mp3" }),
        }),
        wsReadyRef.current && wsRef.current?.readyState === WebSocket.OPEN
          ? fetch("/api/novia/voz", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, format: "pcm" }),
            })
          : Promise.resolve(null),
      ]);

      // Play MP3 in browser
      if (mp3Res.ok) {
        const blob = await mp3Res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          // Stop avatar lip-sync immediately when voice ends
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "agent.interrupt" }));
          }
        };
        audio.onerror = () => setSpeaking(false);
        audio.play().catch(() => setSpeaking(false));
      } else {
        setSpeaking(false);
      }

      // Send PCM to LiveAvatar for lip-sync video (fire and forget)
      if (pcmRes && pcmRes.ok && wsRef.current?.readyState === WebSocket.OPEN) {
        const buffer = await pcmRes.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const eventId = crypto.randomUUID();
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = bytes.slice(i, i + CHUNK_SIZE);
          let binary = "";
          chunk.forEach((b) => { binary += String.fromCharCode(b); });
          wsRef.current.send(JSON.stringify({ type: "agent.speak", audio: btoa(binary) }));
          if (i + CHUNK_SIZE < bytes.length) await new Promise((r) => setTimeout(r, 40));
        }
        wsRef.current.send(JSON.stringify({ type: "agent.speak_end", event_id: eventId }));
      }
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

  const statusColor = laStatus === "ready" ? "bg-emerald-400" : laStatus === "error" ? "bg-red-400" : "bg-amber-400";
  const statusText = speaking ? "hablando" : laStatus === "ready" ? "en vivo" : laStatus === "error" ? "sin video" : "conectando";

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans bg-[#080808]">

      {/* LEFT — Avatar video */}
      <div className="md:w-[420px] lg:w-[480px] bg-[#0A0A0A] flex flex-col border-b md:border-b-0 md:border-r border-[#1A1A1A]">

        <div className="relative flex-1 overflow-hidden" style={{ minHeight: "72vh" }}>

          {/* Avatar photo — always visible, subtle breathing animation */}
          <Image
            src={avatarPhoto}
            alt={noviaName}
            fill
            className="object-cover object-top"
            style={{
              animation: speaking
                ? "avatar-speak 0.6s ease-in-out infinite alternate"
                : "avatar-breathe 4s ease-in-out infinite",
              transformOrigin: "center top",
            }}
            unoptimized
            priority
          />

          {/* LiveKit video + audio — hidden, background only for lip-sync signal */}
          <video ref={videoRef} autoPlay playsInline style={{ display: "none" }} />
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audioRef} autoPlay style={{ display: "none" }} />

          {/* Gradient overlay bottom */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent pointer-events-none z-10" />

          {/* Speaking: golden glow + waveform */}
          {speaking && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 100px rgba(245,158,11,0.18)" }} />
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-[3px] items-end z-20">
                {[4,7,12,9,14,11,8,13,6,10,5].map((h, i) => (
                  <div key={i}
                    className="w-[3px] bg-amber-400 rounded-full"
                    style={{
                      height: `${h * 2}px`,
                      animation: `waveform 0.${4 + (i % 4)}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.06}s`,
                      opacity: 0.85,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Idle: subtle glow around face */}
          {!speaking && laStatus === "ready" && (
            <div className="absolute inset-0 pointer-events-none z-10"
              style={{ boxShadow: "inset 0 0 60px rgba(245,158,11,0.06)" }} />
          )}

          <style>{`
            @keyframes avatar-breathe {
              0%   { transform: scale(1.00) translateY(0px); }
              50%  { transform: scale(1.015) translateY(-3px); }
              100% { transform: scale(1.00) translateY(0px); }
            }
            @keyframes avatar-speak {
              0%   { transform: scale(1.01) translateY(-1px); }
              100% { transform: scale(1.025) translateY(-4px); }
            }
            @keyframes waveform {
              0%   { transform: scaleY(0.4); }
              100% { transform: scaleY(1.0); }
            }
          `}</style>

          {/* Status badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full z-20">
            <span className="relative flex h-1.5 w-1.5">
              <span className={`live-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor}`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${statusColor}`} />
            </span>
            <span className="text-[10px] text-white/70">{statusText}</span>
          </div>
        </div>

        {/* Info bar */}
        <div className="px-4 py-3 border-t border-[#1A1A1A] flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{noviaName}</p>
            <p className="text-zinc-500 text-[11px]">Tu compañera IA</p>
          </div>
          <div className="text-right">
            <p className="text-amber-400 font-bold">{minutesLeft} min</p>
            <a href="https://wa.me/51979385499" target="_blank" rel="noopener noreferrer"
              className="text-zinc-600 text-[11px] hover:text-amber-400 transition-colors">+ recargar</a>
          </div>
        </div>
      </div>

      {/* RIGHT — Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-[#1A1A1A] px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">♡</div>
            <div>
              <p className="font-medium text-sm">{noviaName}</p>
              <p className="text-zinc-500 text-xs">{speaking ? "hablando..." : "escuchándote"}</p>
            </div>
          </div>
          {!speaking && (
            <span className="text-[11px] text-emerald-400/70">🎙️ voz activa</span>
          )}
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
          <p className="text-center text-zinc-600 text-[11px] mt-2">🎙️ Micrófono · {noviaName} te escucha en español</p>
        </div>
      </div>
    </div>
  );
}

export default function SesionPage() {
  return <Suspense><SessionApp /></Suspense>;
}
