"use client";

/**
 * TappableText — Tap-to-define para textos en inglés.
 *
 * Tokeniza el texto manteniendo puntuación y espacios. Cada palabra
 * inglesa (>=3 chars) es clickable → popover con significado contextual
 * y dos ejemplos generados por Claude. Persiste en mse_personal_dictionary.
 *
 * Diseñado para reusarse en ConversationView, NovelCard y ReadAlongPlayer.
 */

import { useEffect, useRef, useState } from "react";

type Definition = {
  word: string;
  meaning_es: string;
  example_1: string;
  example_2: string;
};

export default function TappableText({
  text,
  userId,
  context,
  className = "",
}: {
  text: string;
  userId?: string | null;
  context?: string;
  className?: string;
}) {
  const [openWord, setOpenWord] = useState<string | null>(null);
  const [def, setDef] = useState<Definition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Cerrar popover al click fuera
  useEffect(() => {
    if (!openWord) return;
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenWord(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openWord]);

  async function handleTap(word: string) {
    const clean = word.toLowerCase().replace(/[^a-z'\-]/g, "");
    if (clean.length < 3) return;

    setOpenWord(clean);
    setDef(null);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/sofia-define", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: clean,
          context: context ?? text.slice(0, 400),
          user_id: userId ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "no pude definir");
      setDef(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // Tokenize manteniendo puntuación y espacios como tokens separados
  const tokens = text.split(/(\s+|[.,;:!?'"\(\)\[\]])/).filter((t) => t.length > 0);

  return (
    <span className={className}>
      {tokens.map((tok, i) => {
        const isWord = /^[a-zA-Z][a-zA-Z'\-]*$/.test(tok);
        const tappable = isWord && tok.length >= 3;

        if (!tappable) return <span key={i}>{tok}</span>;
        const isOpen = openWord === tok.toLowerCase().replace(/[^a-z'\-]/g, "");
        return (
          <span key={i} className="relative inline-block">
            <button
              type="button"
              onClick={() => handleTap(tok)}
              className={`underline decoration-dotted decoration-zinc-600 underline-offset-2 hover:text-amber-400 hover:decoration-amber-400 transition-colors ${
                isOpen ? "text-amber-400" : ""
              }`}
            >
              {tok}
            </button>
            {isOpen && (
              <div
                ref={popoverRef}
                className="absolute z-50 left-0 top-full mt-1 w-72 max-w-[85vw] rounded-xl bg-[#0F0F12] border border-[#2A2A2A] shadow-xl p-3 text-left"
              >
                {loading && (
                  <p className="text-xs text-zinc-500">Buscando…</p>
                )}
                {error && (
                  <p className="text-xs text-rose-300">{error}</p>
                )}
                {def && (
                  <>
                    <p className="text-sm font-bold text-amber-400 mb-1">{def.word}</p>
                    <p className="text-xs text-zinc-300 mb-2">
                      <span className="text-zinc-500">Significado: </span>
                      {def.meaning_es}
                    </p>
                    <p className="text-[11px] text-zinc-400 italic mb-1">
                      &ldquo;{def.example_1}&rdquo;
                    </p>
                    <p className="text-[11px] text-zinc-400 italic">
                      &ldquo;{def.example_2}&rdquo;
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpenWord(null)}
                  className="absolute top-1 right-2 text-zinc-600 hover:text-zinc-300 text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </span>
        );
      })}
    </span>
  );
}
