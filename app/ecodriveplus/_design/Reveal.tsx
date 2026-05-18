"use client";

import { createElement, useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Tag = "div" | "section" | "header" | "article" | "p" | "h1" | "h2" | "h3";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
  stagger?: number;
  as?: Tag;
  start?: string;
};

export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = 60,
  duration = 1.1,
  stagger = 0,
  as = "div",
  start = "top 85%",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const targets = stagger > 0 ? el.children : el;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          ease: "power3.out",
          delay,
          stagger: stagger > 0 ? stagger : 0,
          scrollTrigger: { trigger: el, start, once: true },
        }
      );
    }, ref);
    return () => ctx.revert();
  }, [delay, y, duration, stagger, start]);

  return createElement(as, { ref, className }, children);
}
