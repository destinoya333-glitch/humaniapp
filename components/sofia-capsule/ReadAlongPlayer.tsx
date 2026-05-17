"use client";

import { useRef, useState } from "react";
import TappableText from "@/components/sofia-chat/TappableText";

type PassageData = {
  id: string;
  title: string;
  body_en: string;
  body_es: string;
  audio_url: string | null;
  word_count: number;
};

export default function ReadAlongPlayer({
  passage,
  userId,
  onDone,
}: {
  passage: PassageData;
  userId: string;
  onDone: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lang, setLang] = useState<"EN" | "ES">("EN");
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  function changeRate(next: number) {
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  return (
    <div className="rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center gap-2">
        <span className="text-emerald-400">📥</span>
        <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
          A — Adquirir
        </span>
        <span className="text-zinc-600 text-xs ml-auto">{passage.word_count} palabras</span>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-zinc-100 mb-1">{passage.title}</h3>
        <p className="text-[11px] text-zinc-500 mb-4">
          Lee y escucha. Toca cualquier palabra para ver su significado.
        </p>

        <div className="rounded-xl bg-[#15151A] border border-[#2A2A2A] p-4 mb-4 text-zinc-200 leading-relaxed text-sm">
          {lang === "EN" ? (
            <TappableText text={passage.body_en} userId={userId} context={passage.body_en} />
          ) : (
            <span className="text-zinc-300">{passage.body_es}</span>
          )}
        </div>

        {passage.audio_url && (
          <div className="rounded-xl bg-[#15151A] border border-[#2A2A2A] p-3 flex items-center gap-3">
            <div className="flex gap-1 text-[10px]">
              {(["EN", "ES"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-md px-2 py-1 font-bold ${
                    lang === l ? "bg-amber-500 text-black" : "bg-[#2A2A2A] text-zinc-400"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-amber-500 text-black font-bold hover:bg-amber-400"
            >
              {playing ? "❚❚" : "▶"}
            </button>
            <div className="flex gap-1 text-[10px] ml-auto">
              {[0.75, 1, 1.25].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => changeRate(r)}
                  className={`rounded-md px-2 py-1 font-mono ${
                    rate === r ? "bg-amber-500 text-black" : "bg-[#2A2A2A] text-zinc-400"
                  }`}
                >
                  {r}x
                </button>
              ))}
            </div>
            <audio
              ref={audioRef}
              src={passage.audio_url}
              onEnded={() => setPlaying(false)}
              preload="metadata"
            />
          </div>
        )}

        <button
          type="button"
          onClick={onDone}
          className="mt-4 w-full bg-amber-500 text-black rounded-full py-3 font-bold hover:bg-amber-400"
        >
          Listo → Hablar con Sofia (P — Practicar)
        </button>
      </div>
    </div>
  );
}
