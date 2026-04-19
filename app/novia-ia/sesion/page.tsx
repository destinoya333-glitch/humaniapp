"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
} from "livekit-client";

const waveBars = [3, 6, 9, 5, 8, 4, 7, 10, 6, 4, 8, 5, 9, 3, 7];
const CHUNK_MS = 900; // ~1 second PCM chunks @ 24kHz 16-bit = 43200 bytes
const PCM_BYTES_PER_MS = 48; // 24000 Hz * 2 bytes / 1000ms

interface Message { role: "user" | "assistant"; content: string; }

interface LASession {
  ws_url: string;
  livekit_url: string;
  livekit_token: string;
}

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
  const [laReady, setLaReady] = useState(false);
  const [laError, setLaError] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  const bottomRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  // Connect to LiveAvatar LITE session
  const connectLiveAvatar = useCallback(async () => {
    try {
      const res = await fetch("/api/novia/liveavatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_duration: 1800 }),
      });
      if (!res.ok) { setLaError(true); return; }
      const la: LASession = await res.json();

      // Connect LiveKit room for video
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track, _pub, _participant) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        }
      });

      await room.connect(la.livekit_url, la.livekit_token, { autoSubscribe: true });

      // Open WebSocket for audio commands
      const ws = new WebSocket(la.ws_url);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.type === "session.state_updated" && msg.state === "connected") {
            setLaReady(true);
          }
          if (msg.type === "agent.speak_started") setSpeaking(true);
          if (msg.type === "agent.speak_ended") setSpeaking(false);
        } catch { /* ignore */ }
      };

      ws.onerror = () => setLaError(true);

    } catch {
      setLaError(true);
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

      setMessages([{
        role: "assistant",
        content: `Hola ${userData.name ?? "amor"}... te estaba esperando 💛`,
      }]);

      connectLiveAvatar();
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

  // Send PCM audio to LiveAvatar in chunks
  async function speakText(text: string) {
    setSpeaking(true);
    try {
      // Get PCM 24kHz audio from ElevenLabs
      const res = await fetch("/api/novia/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, format: "pcm" }),
      });
      if (!res.ok) { setSpeaking(false); return; }

      const pcmBuffer = await res.arrayBuffer();
      const ws = wsRef.current;

      if (!ws || ws.readyState !== WebSocket.OPEN || !laReady) {
        // Fallback: play MP3 in browser if LiveAvatar not ready
        await speakMp3Fallback(text);
        return;
      }

      // Send PCM in ~1-second chunks
      const bytes = new Uint8Array(pcmBuffer);
      const chunkSize = PCM_BYTES_PER_MS * CHUNK_MS;
      const eventId = crypto.randomUUID();

      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        const b64 = btoa(String.fromCharCode(...chunk));
        ws.send(JSON.stringify({ type: "agent.speak", audio: b64 }));
        // Small delay between chunks to avoid overwhelming the buffer
        if (i + chunkSize < bytes.length) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      // Signal end of speech
      ws.send(JSON.stringify({ type: "agent.speak_end", event_id: eventId }));

    } catch {
      setSpeaking(false);
    }
  }

  async function speakMp3Fallback(text: string) {
    try {
      const res = await fetch("/api/novia/voz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setSpeaking(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => setSpeaking(false);
      audio.play().catch(() => setSpeaking(false));
    } catch { setSpeaking(false); }
  }

  function toggleMic() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta voz. Usa Chrome."); return; }

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
    <div className="min-h-screen flex flex-col md:flex-row font-sans">

      {/* Left — Avatar video panel */}
      <div className="md:w-72 lg:w-80 bg-[#0A0A0A] border-b md:border-b-0 md:border-r border-[#1A1A1A] flex flex-col items-center justify-between p-4 gap-3">

        {/* Video container */}
        <div
          className="relative w-full rounded-3xl overflow-hidden border border-[#2A2A2A] flex-1"
          style={{
            minHeight: "300px",
            maxHeight: "calc(100vh - 160px)",
            boxShadow: speaking
              ? "0 0 60px rgba(245,158,11,0.3)"
              : "0 0 30px rgba(245,158,11,0.08)",
            transition: "box-shadow 0.3s ease",
          }}
        >
          {/* LiveKit video — always rendered, hidden until connected */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className="w-full h-full object-cover"
            style={{ display: laReady ? "block" : "none" }}
          />

          {/* Loading / fallback state */}
          {!laReady && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1008] via-[#0f0d0a] to-[#080808] flex flex-col items-center justify-center gap-3">
              {laError ? (
                <>
                  {/* CSS avatar fallback */}
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {/* face */}
                      <div style={{ position:"relative", width:90, height:110 }}>
                        <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:80, height:50, background:"linear-gradient(180deg,#0f0702,#1a0d04)", borderRadius:"50% 50% 20% 20%" }} />
                        <div style={{ position:"absolute", top:"8%", left:"50%", transform:"translateX(-50%)", width:72, height:86, background:"linear-gradient(180deg,#c8845a,#b87048 50%,#a05c38)", borderRadius:"42% 42% 38% 38%", boxShadow: speaking ? "0 0 20px rgba(245,158,11,0.2)" : "none" }} />
                        <div style={{ position:"absolute", top:"33%", left:"28%", width:11, height:7, background:"#1a0a04", borderRadius:"50%" }} />
                        <div style={{ position:"absolute", top:"33%", right:"28%", width:11, height:7, background:"#1a0a04", borderRadius:"50%" }} />
                        <div style={{ position:"absolute", top:"53%", left:"50%", transform:"translateX(-50%)", width: speaking?20:16, height: speaking?9:5, background: speaking?"rgba(180,60,60,0.9)":"rgba(160,60,60,0.7)", borderRadius: speaking?"50%":"0 0 50% 50%", transition:"all 0.15s ease" }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs absolute bottom-8">avatar animado</p>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  <p className="text-amber-400/60 text-xs">conectando video...</p>
                </>
              )}
            </div>
          )}

          {/* Speaking waveform overlay */}
          {speaking && laReady && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 pointer-events-none">
              {waveBars.map((h, i) => (
                <div key={i} className="wave-bar" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.08}s`, animationDuration: `${0.6 + (i % 4) * 0.1}s` }} />
              ))}
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full z-10">
            <span className="relative flex h-1.5 w-1.5">
              <span className={`live-ping absolute inline-flex h-full w-full rounded-full ${laReady ? "bg-emerald-400" : "bg-amber-400"} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${laReady ? "bg-emerald-400" : "bg-amber-400"}`} />
            </span>
            <span className={`text-[10px] ${laReady ? "text-emerald-400" : "text-amber-400"}`}>
              {speaking ? "hablando" : laReady ? "en vivo" : "conectando"}
            </span>
          </div>
        </div>

        {/* Name + stats bar */}
        <div className="w-full flex items-center justify-between px-1">
          <div>
            <p className="font-semibold text-sm">{noviaName}</p>
            <p className="text-zinc-500 text-xs">{laReady ? "Video real" : "Cargando..."}</p>
          </div>
          <div className="text-right">
            <p className="text-amber-400 font-bold text-base">{minutesLeft} min</p>
            <a href="https://wa.me/51979385499" target="_blank" rel="noopener noreferrer" className="text-zinc-600 text-[10px] hover:text-amber-400 transition-colors">+ recargar</a>
          </div>
        </div>
      </div>

      {/* Right — Chat */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-[#1A1A1A] px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">♡</div>
            <div>
              <p className="font-medium text-sm">{noviaName}</p>
              <p className="text-zinc-500 text-xs">{speaking ? "hablando..." : "activa ahora"}</p>
            </div>
          </div>
          {laReady && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
              📹 Video en vivo
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
            <button key={q} onClick={() => sendMessage(q)} className="shrink-0 px-3 py-1.5 text-xs border border-[#2A2A2A] rounded-full text-zinc-400 hover:border-amber-500/30 hover:text-amber-400 transition-colors">
              {q}
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 pt-2 shrink-0">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <button type="button" onClick={toggleMic}
              className={`px-4 py-3 rounded-2xl text-lg transition-all ${listening ? "bg-red-500 text-white animate-pulse" : "bg-[#111] border border-[#2A2A2A] text-zinc-400 hover:border-amber-500/40 hover:text-amber-400"}`}
              title={listening ? "Detener micrófono" : "Hablar"}>
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
          <p className="text-center text-zinc-600 text-[11px] mt-2">🎙️ Micrófono · {laReady ? "Avatar habla con la voz de Sofía" : "Cargando video..."}</p>
        </div>
      </div>
    </div>
  );
}

export default function SesionPage() {
  return <Suspense><SessionApp /></Suspense>;
}
