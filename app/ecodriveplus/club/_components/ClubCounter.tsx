"use client";

import { useEffect, useState } from "react";

export function ClubCounter(props: {
  edicionId: string;
  initialVendidos: number;
  meta: number;
  initialPct: number;
}) {
  const [vendidos, setVendidos] = useState(props.initialVendidos);
  const pct = (vendidos / props.meta) * 100;

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/ecodrive/club?action=edicion-actual", { cache: "no-store" });
        const d = await r.json();
        if (d?.edicion?.vendidos != null) setVendidos(d.edicion.vendidos);
      } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, []);

  const faltan = Math.max(props.meta - vendidos, 0);

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="text-5xl md:text-6xl font-black text-white">{vendidos.toLocaleString("es-PE")}</span>
        <span className="text-xl text-gray-400">/ {props.meta.toLocaleString("es-PE")} tickets</span>
      </div>
      <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-gradient-to-r from-[#E1811B] to-[#FFA84A] transition-all duration-700"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-sm text-gray-400">
        Faltan <strong className="text-white">{faltan.toLocaleString("es-PE")}</strong> para el sorteo
        {pct >= 90 && <span className="text-[#FFA84A] ml-2">🔥 ¡Casi cerramos!</span>}
      </p>
    </div>
  );
}
