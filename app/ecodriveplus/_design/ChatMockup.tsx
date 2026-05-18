"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Msg = { side: "in" | "out"; body: React.ReactNode; meta?: string };

const SCRIPT: Msg[] = [
  { side: "out", body: "Hola Eco", meta: "9:42" },
  { side: "in", body: "¡Hola! Soy Eco 🌱 ¿A dónde vas, jefe?", meta: "9:42" },
  { side: "out", body: "Mall Aventura", meta: "9:43" },
  { side: "in", body: "Listo. Comparte tu ubicación con el clip 📎 y te mando 3 ofertas en 12 segundos.", meta: "9:43" },
  { side: "out", body: "📍 Ubicación enviada", meta: "9:43" },
  { side: "in", body: "🚗 Carlos · Toyota Yaris · S/.7.50 · 4 min\n🚗 Luis · Hyundai · S/.8.00 · 6 min\n🚗 Ana · Nissan · S/.7.00 · 5 min", meta: "9:44" },
];

export default function ChatMockup() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-msg]"),
        { y: 24, opacity: 0, scale: 0.96 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.65,
          ease: "power3.out",
          stagger: 0.22,
          scrollTrigger: { trigger: el, start: "top 78%", once: true },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      className="relative rounded-[28px] bg-[#0E0D0C] border border-[var(--eco-line-strong)] overflow-hidden shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)]"
      style={{ transform: "rotate(1.6deg) translateZ(0)" }}
    >
      {/* Header chat */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--eco-line)] bg-[#0A0908]/80 backdrop-blur">
        <div className="h-10 w-10 rounded-full bg-[url('/ecodriveplus/icon.png')] bg-contain bg-no-repeat bg-center" />
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--eco-ink)]">Eco · EcoDrive+</div>
          <div className="text-[10px] eco-mono text-[var(--eco-flame)]">EN LINEA</div>
        </div>
        <div className="text-[var(--eco-ink-mute)] text-xs eco-mono">9:42</div>
      </div>

      {/* Messages */}
      <div
        className="px-5 py-6 space-y-2.5 text-sm bg-[radial-gradient(ellipse_at_top,rgba(224,136,33,0.06),transparent_70%)]"
        style={{ minHeight: "420px" }}
      >
        {SCRIPT.map((m, i) => (
          <div
            key={i}
            data-msg
            className={`flex ${m.side === "out" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 whitespace-pre-line leading-snug ${
                m.side === "out"
                  ? "bg-[#1F3D2F] text-[#E7F4EB] rounded-tr-sm"
                  : "bg-[#1A1816] text-[var(--eco-ink-soft)] rounded-tl-sm border border-[var(--eco-line)]"
              }`}
            >
              {m.body}
              {m.meta && (
                <div className="text-[10px] eco-mono opacity-50 mt-1 text-right">
                  {m.meta}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input mock */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--eco-line)] bg-[#0A0908]">
        <div className="flex-1 px-3 py-2 rounded-full bg-[#1A1816] text-[var(--eco-ink-mute)] text-xs">
          Escribe a Eco
        </div>
        <div className="h-9 w-9 rounded-full bg-[#25D366] flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="currentColor">
            <path d="M3 11l18-8-8 18-2-7-8-3z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
