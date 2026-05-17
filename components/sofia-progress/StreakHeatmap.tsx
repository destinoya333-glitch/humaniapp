"use client";

import { useEffect, useState } from "react";

type DayCount = { date: string; count: number };

function intensityClass(count: number): string {
  if (count === 0) return "bg-[#15151A]";
  if (count === 1) return "bg-emerald-600/40";
  if (count === 2) return "bg-emerald-500/60";
  if (count === 3) return "bg-emerald-400/80";
  return "bg-emerald-300";
}

export default function StreakHeatmap({ userId }: { userId: string }) {
  const [days, setDays] = useState<DayCount[]>([]);
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sofia-progress/streak?user_id=${userId}&days=90`)
      .then((r) => r.json())
      .then((data) => {
        setDays(data.days ?? []);
        setStreak(data.current_streak ?? 0);
        setTotal(data.total_sessions ?? 0);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] p-4">
        <p className="text-xs text-zinc-500">Cargando racha…</p>
      </div>
    );
  }

  // Render: 13 columnas (semanas) x 7 filas (días)
  // Build rows: first day starts on its weekday position
  const weeks: DayCount[][] = [];
  let currentWeek: DayCount[] = [];
  for (const d of days) {
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(d);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <div className="rounded-2xl bg-[#0F0F12] border border-[#2A2A2A] p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Tu racha</p>
          <p className="text-2xl font-bold text-emerald-400">
            {streak} día{streak === 1 ? "" : "s"} 🔥
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Últimos 90 días</p>
          <p className="text-2xl font-bold text-zinc-100">{total}</p>
          <p className="text-[10px] text-zinc-500">sesiones</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} sesión${d.count === 1 ? "" : "es"}`}
                className={`w-3 h-3 rounded-sm ${intensityClass(d.count)}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-zinc-500">
        <span>Menos</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-[#15151A]" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-600/40" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400/80" />
        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-300" />
        <span>Más</span>
      </div>
    </div>
  );
}
