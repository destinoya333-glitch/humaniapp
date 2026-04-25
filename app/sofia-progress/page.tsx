"use client";

import { useEffect, useState } from "react";

type Profile = {
  current_level: string;
  current_week: number;
  current_day: string;
  streak_days: number;
  total_minutes_practiced: number;
  fluency_score: number;
  cefr_estimate: string;
  vocabulary_mastered: string[];
  recurring_errors: unknown[];
  personal_facts: Record<string, unknown>;
  last_session_summary: string | null;
};

type Session = {
  id: string;
  level: string;
  week_number: number;
  day_name: string;
  session_type: string;
  duration_seconds: number;
  started_at: string;
};

type Exam = {
  id: string;
  level: string;
  week_number: number;
  fluency_score: number;
  cefr_estimate: string;
  recommendation: string;
  taken_at: string;
};

type UsageDay = { usage_date: string; seconds_used: number };

export default function SofiaProgressPage() {
  const [data, setData] = useState<{
    profile: Profile | null;
    sessions: Session[];
    exams: Exam[];
    weeklyUsage: UsageDay[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/sofia-auth/me");
      const me = await meRes.json();
      if (!me.authenticated) {
        window.location.href = "/sofia-auth/login";
        return;
      }
      const r = await fetch(`/api/sofia-progress?user_id=${me.user_id}`);
      setData(await r.json());
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;
  if (!data?.profile) return <div className="p-6 text-gray-500">No profile yet. Start a session first.</div>;

  const p = data.profile;
  const totalSessions = data.sessions.length;
  const minutesThisWeek = data.weeklyUsage.reduce((s, d) => s + d.seconds_used, 0) / 60;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Your Progress</h1>
          <p className="text-sm text-gray-500">Miss Sofia English</p>
        </header>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Current level" value={p.current_level} highlight />
          <Stat label="Week" value={`${p.current_week} / 12`} />
          <Stat label="Streak" value={`${p.streak_days} days`} />
          <Stat label="Fluency" value={`${p.fluency_score}/100`} />
        </div>

        {/* This week */}
        <section className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-2">This week</h2>
          <p className="text-sm text-gray-600">
            You&apos;re on {p.current_level} Week {p.current_week}, {p.current_day}.
            <br />
            Practice this week: <strong>{minutesThisWeek.toFixed(1)} minutes</strong> across{" "}
            {data.weeklyUsage.length} days.
          </p>
          {p.last_session_summary && (
            <p className="mt-3 text-sm italic text-gray-500">
              “{p.last_session_summary}”
            </p>
          )}
        </section>

        {/* Recent exams */}
        {data.exams.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-3">Weekly exams</h2>
            <div className="space-y-2">
              {data.exams.map((e) => (
                <div
                  key={e.id}
                  className="flex justify-between items-center text-sm py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-mono text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mr-2">
                      {e.level} W{e.week_number}
                    </span>
                    <span className="text-gray-600">
                      Fluency {e.fluency_score} · CEFR {e.cefr_estimate}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      e.recommendation === "advance"
                        ? "text-green-600"
                        : e.recommendation === "review"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {e.recommendation}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent sessions */}
        <section className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">Recent sessions ({totalSessions})</h2>
          {data.sessions.length === 0 ? (
            <p className="text-sm text-gray-500">No sessions yet.</p>
          ) : (
            <div className="space-y-1">
              {data.sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex justify-between items-center text-sm py-1.5 border-b last:border-0"
                >
                  <span className="text-gray-700">
                    {s.level} W{s.week_number} · {s.day_name} · {s.session_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(s.duration_seconds)}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Vocabulary mastered */}
        {p.vocabulary_mastered?.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">
              Vocabulary mastered ({p.vocabulary_mastered.length})
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {p.vocabulary_mastered.slice(0, 50).map((w, i) => (
                <span
                  key={i}
                  className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded"
                >
                  {w}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        highlight
          ? "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
          : "bg-white shadow-sm"
      }`}
    >
      <div
        className={`text-xs font-medium ${
          highlight ? "text-white/80" : "text-gray-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`text-2xl font-bold mt-1 ${
          highlight ? "text-white" : "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
