"use client";

import { useRef } from "react";

/** Reproductor vertical 9:16 con tracking de play/complete (métricas de retención). */
export default function Player({
  src,
  episodioId,
  userId,
}: {
  src: string | null;
  episodioId: string;
  userId: string | null;
}) {
  const done = useRef(false);

  async function ev(tipo: string) {
    try {
      await fetch("/api/tudramaya/evento", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, episodio_id: episodioId, tipo }),
      });
    } catch {
      /* métrica best-effort */
    }
  }

  if (!src) {
    return (
      <div className="aspect-[9/16] w-full max-w-md mx-auto bg-neutral-900 rounded-2xl flex items-center justify-center text-neutral-500 text-sm">
        Video aún no disponible
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      playsInline
      className="w-full max-w-md mx-auto rounded-2xl bg-black aspect-[9/16] object-cover"
      onPlay={() => ev("play")}
      onEnded={() => {
        if (!done.current) {
          done.current = true;
          ev("complete");
        }
      }}
    />
  );
}
