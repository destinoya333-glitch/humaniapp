"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Props = {
  src: string;
  alt?: string;
  motion?: "ken-burns" | "parallax" | "both" | "none";
  parallaxRange?: number;
  origin?: string;
  className?: string;
  children?: React.ReactNode;
  objectPosition?: string;
};

export default function CinematicImage({
  src,
  alt = "",
  motion = "both",
  parallaxRange = 80,
  origin = "50% 50%",
  className = "",
  children,
  objectPosition = "center",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    gsap.set(img, { scale: 1.08, transformOrigin: origin });

    const ctx = gsap.context(() => {
      if (motion === "ken-burns" || motion === "both") {
        gsap.to(img, {
          scale: 1.18,
          duration: 18,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });
      }
      if (motion === "parallax" || motion === "both") {
        gsap.to(img, {
          yPercent: parallaxRange / 8,
          ease: "none",
          scrollTrigger: {
            trigger: wrap,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      }
    }, wrapRef);
    return () => ctx.revert();
  }, [motion, parallaxRange, origin]);

  return (
    <div ref={wrapRef} className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        aria-hidden={alt === ""}
        className="absolute inset-0 w-full h-full object-cover eco-cinematic will-change-transform"
        style={{ objectPosition }}
        loading="eager"
      />
      {children}
    </div>
  );
}
