"use client";

type Props = {
  secondsRemaining: number | null;
};

/**
 * Shows the free-tier countdown.
 * - Hidden if `secondsRemaining` is null (paid user).
 * - Yellow warning at <=30s remaining.
 * - Red urgent at <=10s.
 */
export default function TimerWarning({ secondsRemaining }: Props) {
  if (secondsRemaining === null) return null;

  const totalLimit = parseInt(
    process.env.NEXT_PUBLIC_FREE_TIER_DAILY_SECONDS ?? "180",
    10
  );
  const used = Math.max(0, totalLimit - secondsRemaining);
  const pct = Math.min(100, (used / totalLimit) * 100);

  let color = "bg-green-500";
  let textColor = "text-green-700";
  if (secondsRemaining <= 10) {
    color = "bg-red-500";
    textColor = "text-red-700";
  } else if (secondsRemaining <= 30) {
    color = "bg-yellow-500";
    textColor = "text-yellow-700";
  }

  const mins = Math.floor(secondsRemaining / 60);
  const secs = Math.floor(secondsRemaining % 60);

  return (
    <div className="w-full mb-3">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-gray-500">Free tier today</span>
        <span className={`font-mono font-semibold ${textColor}`}>
          {mins}:{secs.toString().padStart(2, "0")} left
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
