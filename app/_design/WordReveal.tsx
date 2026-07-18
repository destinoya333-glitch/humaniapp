"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Split children (string) into words that rise into view, line by line,
 * with a staggered editorial cadence. Non-string children render as-is.
 */
export default function WordReveal({
  text,
  className = "",
  stagger = 55,
  start = 0,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  stagger?: number;
  start?: number;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll<HTMLElement>(".au-word");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            words.forEach((w, i) => {
              w.style.transitionDelay = `${start + i * stagger}ms`;
              w.classList.add("is-in");
            });
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stagger, start]);

  const words = text.split(" ");

  return (
    <Tag ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} className="au-word-line">
          <span className="au-word">
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </Tag>
  ) as ReactNode;
}
