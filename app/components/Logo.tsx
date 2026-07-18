import Image from "next/image";

export default function Logo({ size = 96 }: { size?: number }) {
  return (
    <span
      className="relative inline-block rounded-2xl overflow-hidden ring-1 ring-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.25)]"
      style={{ width: size, height: size }}
      aria-label="ActivosYA logo"
    >
      <Image
        src="/activosya-logo.jpg"
        alt="ActivosYA"
        fill
        sizes={`${size}px`}
        priority
        className="object-cover"
      />
    </span>
  );
}
