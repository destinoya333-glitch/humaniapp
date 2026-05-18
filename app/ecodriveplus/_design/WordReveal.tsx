"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Props = {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  triggerStart?: string;
};

/**
 * Split text into words wrapped in <span>, then orchestrate a staggered reveal.
 * Each word is wrapped in an overflow-hidden span so the inner translates from 105%.
 */
export default function WordReveal({
  text,
  className = "",
  wordClassName = "",
  delay = 0,
  stagger = 0.08,
  triggerStart = "top 88%",
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el.querySelectorAll("[data-word-inner]"),
        { yPercent: 110, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          delay,
          stagger,
          scrollTrigger: { trigger: el, start: triggerStart, once: true },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, [delay, stagger, triggerStart]);

  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="inline-block overflow-hidden align-baseline pb-[0.18em]"
          style={{ marginRight: "0.28em" }}
        >
          <span data-word-inner className={`inline-block ${wordClassName}`}>
            {w}
          </span>
        </span>
      ))}
    </span>
  );
}
