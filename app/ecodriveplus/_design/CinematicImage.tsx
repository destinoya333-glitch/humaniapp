"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Props = {
  src: string;
  /** "ken-burns" = slow infinite zoom 1.0 → 1.08; "parallax" = yPercent scroll-bound; "both" = both. */
  motion?: "ken-burns" | "parallax" | "both";
  /** Parallax intensity (px range). Default 80. */
  parallaxRange?: number;
  /** Ken Burns origin: "center", "left top", etc. */
  origin?: string;
  className?: string;
  /** Optional overlay JSX rendered on top of the image. */
  children?: React.ReactNode;
  /** Override the position-bg class (e.g. bg-left, bg-right). */
  bgPosition?: string;
};

export default function CinematicImage({
  src,
  motion = "both",
  parallaxRange = 80,
  origin = "center",
  className = "",
  children,
  bgPosition = "bg-center",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    const ctx = gsap.context(() => {
      // Ken Burns slow zoom (independent of scroll)
      if (motion === "ken-burns" || motion === "both") {
        gsap.fromTo(
          img,
          { scale: 1.0, transformOrigin: origin },
          {
            scale: 1.12,
            duration: 18,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
          }
        );
      }
      // Parallax bound to scroll position
      if (motion === "parallax" || motion === "both") {
        gsap.fromTo(
          img,
          { yPercent: -parallaxRange / 6 },
          {
            yPercent: parallaxRange / 6,
            ease: "none",
            scrollTrigger: {
              trigger: wrap,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      }
    }, wrapRef);
    return () => ctx.revert();
  }, [motion, parallaxRange, origin]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <div
        ref={imgRef}
        aria-hidden
        className={`absolute bg-cover bg-no-repeat ${bgPosition} eco-cinematic will-change-transform`}
        style={{
          backgroundImage: `url('${src}')`,
          top: "-8%",
          right: "-8%",
          bottom: "-8%",
          left: "-8%",
        }}
      />
      {children}
    </div>
  );
}
