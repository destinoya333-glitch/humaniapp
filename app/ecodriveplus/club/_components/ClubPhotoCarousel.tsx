"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Props = {
  photos: string[];
  alt: string;
};

/**
 * Galeria de fotos del premio Club.
 * Foto grande arriba (aspect 4/3) con Ken Burns + crossfade al cambiar.
 * Barra de thumbnails abajo con prev/next + scroll horizontal.
 */
export default function ClubPhotoCarousel({ photos, alt }: Props) {
  const [index, setIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const safePhotos = photos.filter(Boolean);
  const total = safePhotos.length;

  const go = useCallback(
    (next: number) => {
      if (total === 0) return;
      const i = ((next % total) + total) % total;
      setIndex(i);
    },
    [total],
  );

  // Crossfade + ken burns reset al cambiar de foto
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { opacity: 0, scale: 1.04 },
      {
        opacity: 1,
        scale: 1.0,
        duration: 0.9,
        ease: "power3.out",
      },
    );
    // Ken Burns continuo
    gsap.to(el, {
      scale: 1.1,
      duration: 14,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      delay: 0.6,
    });
  }, [index]);

  // Auto-scroll del strip para mantener el activo visible
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>(`[data-thumb-idx="${index}"]`);
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [index]);

  // Touch swipe
  const touchStart = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    const end = e.changedTouches[0]?.clientX ?? null;
    if (start == null || end == null) return;
    const diff = start - end;
    if (Math.abs(diff) > 50) go(index + (diff > 0 ? 1 : -1));
    touchStart.current = null;
  }

  // Keyboard
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") go(index - 1);
    if (e.key === "ArrowRight") go(index + 1);
  }

  if (total === 0) return null;

  const currentUrl = safePhotos[index]!;

  return (
    <div tabIndex={0} onKeyDown={onKey} className="outline-none">
      {/* Foto grande */}
      <div
        className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-[var(--eco-bg-soft)]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imgRef}
          key={currentUrl}
          src={currentUrl}
          alt={`${alt} — foto ${index + 1} de ${total}`}
          className="absolute inset-0 w-full h-full object-cover eco-cinematic will-change-transform"
          loading="eager"
        />
        <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(10,9,8,0.45) 100%)" }} />

        {/* Contador foto N de T */}
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-[var(--eco-bg)]/70 backdrop-blur eco-mono text-[var(--eco-flame)]">
          {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </div>

        {/* Botones prev/next sobre la foto */}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-[var(--eco-bg)]/80 hover:bg-[var(--eco-flame)] backdrop-blur text-[var(--eco-ink)] hover:text-[var(--eco-bg-deep)] transition-colors flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-[var(--eco-bg)]/80 hover:bg-[var(--eco-flame)] backdrop-blur text-[var(--eco-ink)] hover:text-[var(--eco-bg-deep)] transition-colors flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Strip thumbnails con prev/next afuera */}
      {total > 1 && (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => go(index - 1)}
            className="h-10 w-10 shrink-0 rounded-full border border-[var(--eco-line-strong)] text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] hover:border-[var(--eco-flame)] transition-colors flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div
            ref={stripRef}
            className="flex-1 flex gap-2 overflow-x-auto eco-no-scrollbar scroll-smooth pb-1"
          >
            {safePhotos.map((url, i) => (
              <button
                key={url}
                type="button"
                data-thumb-idx={i}
                onClick={() => go(i)}
                aria-label={`Foto ${i + 1}`}
                className={`shrink-0 relative h-16 w-24 md:h-20 md:w-28 rounded-xl overflow-hidden border-2 transition-all ${
                  i === index
                    ? "border-[var(--eco-flame)] opacity-100"
                    : "border-transparent opacity-55 hover:opacity-100"
                }`}
              >
                <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                {i === index && (
                  <span aria-hidden className="absolute inset-0 ring-2 ring-[var(--eco-flame)] rounded-xl pointer-events-none" />
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => go(index + 1)}
            className="h-10 w-10 shrink-0 rounded-full border border-[var(--eco-line-strong)] text-[var(--eco-ink-soft)] hover:text-[var(--eco-flame)] hover:border-[var(--eco-flame)] transition-colors flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
