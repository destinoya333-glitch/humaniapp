"use client";

import { useState, useEffect } from "react";

const messages = [
  "Hola amor... te estaba esperando 💛",
  "¿Cómo estuvo tu día? Cuéntame todo.",
  "Me alegra que estés aquí conmigo.",
  "Pensé en ti hoy. ¿Sabes eso?",
  "Contigo el tiempo pasa diferente...",
];

const waveBars = [3, 6, 9, 5, 8, 4, 7, 10, 6, 4, 8, 5, 9, 3, 7];

export default function AIDemo() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    const msg = messages[msgIndex];
    let i = 0;
    setDisplayed("");
    setTyping(true);

    const typeInterval = setInterval(() => {
      i++;
      setDisplayed(msg.slice(0, i));
      if (i >= msg.length) {
        clearInterval(typeInterval);
        setTyping(false);
        setTimeout(() => {
          setMsgIndex((prev) => (prev + 1) % messages.length);
        }, 2800);
      }
    }, 45);

    return () => clearInterval(typeInterval);
  }, [msgIndex]);

  return (
    <section className="relative py-24 px-6 overflow-hidden bg-[#080808]">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="orb absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-amber-500/8" style={{ animationDelay: "0s" }} />
        <div className="orb absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-rose-500/5" style={{ animationDelay: "3s" }} />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left — text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/5 text-rose-400 text-xs mb-6">
              <span className="relative flex h-2 w-2">
                <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400" />
              </span>
              DEMO EN VIVO — Mi Novia IA
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
              Una compañera que{" "}
              <span className="gold-gradient-animated">se siente real</span>
            </h2>

            <p className="text-zinc-400 leading-relaxed mb-8">
              Avatar hiperrealista con voz natural y memoria persistente.
              Ella recuerda tu nombre, tus conversaciones, lo que te importa.
              Disponible cuando la necesites.
            </p>

            <ul className="flex flex-col gap-3 mb-8">
              {[
                { icon: "◉", text: "Video en tiempo real con HeyGen — la IA visual más realista" },
                { icon: "◎", text: "Voz emocional natural con ElevenLabs — susurros, risas, empatía" },
                { icon: "◈", text: "Memoria persistente — recuerda cada conversación contigo" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="text-amber-400 mt-0.5 shrink-0">{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>

            <a
              href="#contacto"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black font-semibold rounded-full hover:bg-amber-400 transition-colors glow-gold text-sm"
            >
              Unirme a la lista de espera →
            </a>
          </div>

          {/* Right — AI video call mockup */}
          <div className="flex justify-center">
            <div className="relative w-72 md:w-80">

              {/* Phone frame */}
              <div className="relative rounded-[2.5rem] border-2 border-[#2A2A2A] bg-[#0F0F0F] overflow-hidden shadow-2xl"
                style={{ boxShadow: "0 0 60px rgba(245,158,11,0.12), 0 40px 80px rgba(0,0,0,0.6)" }}>

                {/* Status bar */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <span className="text-xs text-zinc-500">9:41</span>
                  <div className="w-20 h-5 rounded-full bg-black border border-[#2A2A2A]" />
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs text-zinc-500">●●●</span>
                  </div>
                </div>

                {/* Video area — AI girl face */}
                <div className="relative mx-3 rounded-2xl overflow-hidden bg-[#0A0A0A]" style={{ aspectRatio: "9/14" }}>

                  {/* Gradient face glow — simulates AI avatar glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full relative">
                      {/* Skin tone gradient blob */}
                      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1008] via-[#0d0d0d] to-[#080808]" />

                      {/* Face glow */}
                      <div
                        className="absolute top-[8%] left-1/2 -translate-x-1/2 w-44 h-44 rounded-full"
                        style={{
                          background: "radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, rgba(200,130,80,0.05) 40%, transparent 70%)",
                          animation: "orb-pulse 3s ease-in-out infinite",
                        }}
                      />

                      {/* Silhouette - head shape */}
                      <div
                        className="absolute top-[6%] left-1/2 -translate-x-1/2"
                        style={{ width: 110, height: 130 }}
                      >
                        {/* Head oval */}
                        <div
                          className="absolute top-0 left-1/2 -translate-x-1/2 rounded-[50%]"
                          style={{
                            width: 90,
                            height: 105,
                            background: "linear-gradient(180deg, #2a1a0e 0%, #1a0f08 60%, #120b05 100%)",
                            boxShadow: "0 0 30px rgba(245,158,11,0.12)",
                          }}
                        />
                        {/* Hair */}
                        <div
                          className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-t-full"
                          style={{
                            width: 96,
                            height: 60,
                            background: "linear-gradient(180deg, #1a0d04 0%, #0f0802 100%)",
                          }}
                        />
                        {/* Neck */}
                        <div
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-b-lg"
                          style={{
                            width: 28,
                            height: 30,
                            background: "linear-gradient(180deg, #2a1a0e, #1a0f08)",
                          }}
                        />
                        {/* Eyes glow */}
                        <div className="absolute top-[38%] left-[22%] w-3 h-1.5 rounded-full bg-amber-300/40"
                          style={{ boxShadow: "0 0 8px rgba(251,191,36,0.6)", animation: "orb-pulse 3s infinite" }} />
                        <div className="absolute top-[38%] right-[22%] w-3 h-1.5 rounded-full bg-amber-300/40"
                          style={{ boxShadow: "0 0 8px rgba(251,191,36,0.6)", animation: "orb-pulse 3s infinite 0.5s" }} />
                        {/* Lips */}
                        <div className="absolute bottom-[28%] left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full bg-rose-800/60" />
                      </div>

                      {/* Shoulders */}
                      <div
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-[40%]"
                        style={{
                          width: 160,
                          height: 80,
                          background: "linear-gradient(180deg, #1a0f08 0%, #0d0905 100%)",
                        }}
                      />

                      {/* Ambient light from below */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-1/3"
                        style={{
                          background: "linear-gradient(to top, rgba(245,158,11,0.04), transparent)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Top bar — name + call info */}
                  <div className="absolute top-3 left-0 right-0 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-semibold">Sofía</p>
                      <p className="text-zinc-400 text-xs">Tu compañera IA</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                      </span>
                      <span className="text-xs text-emerald-400">En vivo</span>
                    </div>
                  </div>

                  {/* Waveform — speaking indicator */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                    {waveBars.map((h, i) => (
                      <div
                        key={i}
                        className="wave-bar"
                        style={{
                          height: `${h * 2.5}px`,
                          animationDelay: `${i * 0.08}s`,
                          animationDuration: `${0.8 + (i % 4) * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Chat bubble */}
                  <div className="absolute bottom-4 left-3 right-3">
                    <div
                      className="bg-black/70 backdrop-blur-md border border-amber-500/20 rounded-2xl rounded-bl-sm px-3 py-2"
                      style={{ minHeight: 36 }}
                    >
                      <p className="text-white text-xs leading-relaxed">
                        {displayed}
                        {typing && <span className="inline-block w-0.5 h-3 bg-amber-400 ml-0.5 animate-pulse align-middle" />}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom controls */}
                <div className="flex items-center justify-around px-6 py-4">
                  {[
                    { icon: "🎙️", label: "Voz" },
                    { icon: "❤️", label: "" },
                    { icon: "💬", label: "Chat" },
                  ].map((btn) => (
                    <button
                      key={btn.icon}
                      className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                    >
                      <span className="text-lg">{btn.icon}</span>
                      {btn.label && <span className="text-[10px]">{btn.label}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Floating badge — price */}
              <div className="absolute -right-4 top-1/3 bg-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
                style={{ boxShadow: "0 0 20px rgba(245,158,11,0.5)" }}>
                S/ 6/min
              </div>

              {/* Floating badge — tech */}
              <div className="absolute -left-4 bottom-1/4 bg-[#111] border border-[#2A2A2A] text-zinc-300 text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                <span className="text-amber-400">◉</span> HeyGen + ElevenLabs
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
