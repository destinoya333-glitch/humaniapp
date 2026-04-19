export default function Logo({ size = 96 }: { size?: number }) {
  const cx = 50;
  const cy = 50;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="HumaniApp logo"
      style={{ overflow: "visible" }}
    >
      <defs>
        <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FDE68A" stopOpacity="0.3" />
          <stop offset="60%"  stopColor="#F59E0B" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hLeft"  x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="hRight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#F59E0B" stopOpacity="0.9" />
          <stop offset="40%"  stopColor="#FBBF24" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D97706" stopOpacity="0.15" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Soft core glow */}
      <circle cx={cx} cy={cy} r="42" fill="url(#coreGlow)" />

      {/* Outer ring — slow spin */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "spin-slow 14s linear infinite" }}>
        <circle cx={cx} cy={cy} r="46" stroke="url(#ringGrad)" strokeWidth="0.7" strokeDasharray="6 3" fill="none" />
        {[0, 60, 120, 180, 240, 300].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x = cx + 46 * Math.cos(rad);
          const y = cy + 46 * Math.sin(rad);
          return (
            <circle
              key={deg}
              cx={x} cy={y} r={i % 2 === 0 ? 1.8 : 1.1}
              fill="#F59E0B"
              opacity={i % 2 === 0 ? 1 : 0.5}
              style={{ animation: `pulse-dot ${1.8 + i * 0.3}s ease-in-out infinite` }}
            />
          );
        })}
      </g>

      {/* Mid ring — reverse spin */}
      <g style={{ transformOrigin: `${cx}px ${cy}px`, animation: "spin-reverse 9s linear infinite" }}>
        <circle cx={cx} cy={cy} r="36" stroke="#F59E0B" strokeWidth="0.5" strokeDasharray="2 5" fill="none" opacity="0.35" />
        {[30, 150, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x = cx + 36 * Math.cos(rad);
          const y = cy + 36 * Math.sin(rad);
          return <circle key={deg} cx={x} cy={y} r="1.2" fill="#FBBF24" opacity="0.6" />;
        })}
      </g>

      {/* Inner solid ring */}
      <circle cx={cx} cy={cy} r="27" stroke="#F59E0B" strokeWidth="0.8" fill="rgba(245,158,11,0.04)" opacity="0.6" />

      {/* H — left pillar */}
      <rect x="32" y="30" width="8" height="40" rx="3.5" fill="url(#hLeft)" filter="url(#glow)" />

      {/* H — right pillar */}
      <rect x="60" y="30" width="8" height="40" rx="3.5" fill="url(#hRight)" filter="url(#glow)" />

      {/* H — crossbar */}
      <rect x="32" y="44" width="36" height="8" rx="3.5" fill="#FBBF24" filter="url(#glow)" />

      {/* Center diamond accent */}
      <rect
        x="47" y="47" width="6" height="6" rx="1"
        fill="#FDE68A"
        style={{ transformOrigin: "50px 50px", transform: "rotate(45deg)", animation: "spin-slow 6s linear infinite" }}
      />

      {/* Corner tick marks */}
      {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx, sy], i) => (
        <line
          key={i}
          x1={cx + sx * 22} y1={cy + sy * 22}
          x2={cx + sx * 26} y2={cy + sy * 22}
          stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"
        />
      ))}
    </svg>
  );
}
