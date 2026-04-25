/**
 * Miss Sofia Voice — Supabase queries
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_supabase) return _supabase;
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _supabase;
}

export type StudentProfile = {
  user_id: string;
  current_level: string;
  current_week: number;
  current_day: string;
  recurring_errors: unknown[];
  vocabulary_mastered: string[];
  vocabulary_struggling: string[];
  personal_facts: Record<string, unknown>;
  last_session_summary: string | null;
  streak_days: number;
  total_minutes_practiced: number;
  fluency_score: number;
  cefr_estimate: string;
};

export type CurriculumWeek = {
  id: number;
  level: string;
  week_number: number;
  topic: string;
  grammar_focus: string;
  vocabulary: string[];
  situational_context: string;
  functional_goal: string;
  cultural_note: string;
};

export type DailySession = {
  id: number;
  week_id: number;
  day_name: string;
  session_type: string;
  opening_prompt: string;
  roleplay_scenario: string | null;
  target_outputs: Record<string, unknown>;
  duration_target_minutes: number;
};

export type User = {
  id: string;
  email: string;
  name: string;
  age: number | null;
  city: string | null;
  country: string | null;
  profession: string | null;
  motivation: string | null;
  plan: "free" | "pro" | "elite";
  whatsapp_phone: string | null;
};

export async function getUser(userId: string): Promise<User | null> {
  const { data } = await getClient().from("mse_users").select("*").eq("id", userId).single();
  return data;
}

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  const { data } = await getClient()
    .from("mse_student_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data;
}

export async function ensureStudentProfile(userId: string): Promise<StudentProfile> {
  const existing = await getStudentProfile(userId);
  if (existing) return existing;
  const { data, error } = await getClient()
    .from("mse_student_profiles")
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCurriculumSession(
  level: string,
  weekNumber: number,
  dayName: string
): Promise<{ week: CurriculumWeek; daily: DailySession } | null> {
  const supabase = getClient();
  const { data: week } = await supabase
    .from("mse_curriculum_weeks")
    .select("*")
    .eq("level", level)
    .eq("week_number", weekNumber)
    .single();
  if (!week) return null;

  const { data: daily } = await supabase
    .from("mse_curriculum_daily_sessions")
    .select("*")
    .eq("week_id", week.id)
    .eq("day_name", dayName)
    .single();
  if (!daily) return null;

  return { week, daily };
}

export async function getTodayUsage(userId: string): Promise<{ seconds_used: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await getClient()
    .from("mse_daily_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .maybeSingle();
  return { seconds_used: data?.seconds_used ?? 0 };
}

export async function incrementUsage(userId: string, seconds: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = getClient();
  const current = await getTodayUsage(userId);
  await supabase
    .from("mse_daily_usage")
    .upsert(
      {
        user_id: userId,
        usage_date: today,
        seconds_used: current.seconds_used + Math.round(seconds),
      },
      { onConflict: "user_id,usage_date" }
    );
}

export async function createSession(opts: {
  user_id: string;
  level: string;
  week_number: number;
  day_name: string;
  session_type: string;
}): Promise<{ id: string }> {
  const { data, error } = await getClient()
    .from("mse_sessions")
    .insert({
      user_id: opts.user_id,
      level: opts.level,
      week_number: opts.week_number,
      day_name: opts.day_name,
      session_type: opts.session_type,
      transcript: [],
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function appendToTranscript(
  sessionId: string,
  message: { role: "user" | "assistant"; content: string }
): Promise<void> {
  const supabase = getClient();
  const { data } = await supabase
    .from("mse_sessions")
    .select("transcript")
    .eq("id", sessionId)
    .single();
  const current = (data?.transcript as Array<{ role: string; content: string }>) ?? [];
  current.push(message);
  await supabase.from("mse_sessions").update({ transcript: current }).eq("id", sessionId);
}

export async function getTranscript(
  sessionId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data } = await getClient()
    .from("mse_sessions")
    .select("transcript")
    .eq("id", sessionId)
    .single();
  return (data?.transcript as Array<{ role: "user" | "assistant"; content: string }>) ?? [];
}

export async function closeSession(
  sessionId: string,
  shadowCoachReport: Record<string, unknown>,
  durationSeconds: number
): Promise<void> {
  await getClient()
    .from("mse_sessions")
    .update({
      shadow_coach_report: shadowCoachReport,
      duration_seconds: durationSeconds,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

export async function updateStudentProfile(
  userId: string,
  updates: Partial<StudentProfile>
): Promise<void> {
  await getClient()
    .from("mse_student_profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export async function saveWeeklyExam(opts: {
  user_id: string;
  level: string;
  week_number: number;
  exam: Record<string, unknown>;
}): Promise<void> {
  await getClient().from("mse_weekly_exams").insert({
    user_id: opts.user_id,
    level: opts.level,
    week_number: opts.week_number,
    fluency_score: opts.exam.fluency_score,
    grammar_accuracy: opts.exam.grammar_accuracy,
    vocabulary_usage: opts.exam.vocabulary_usage,
    pronunciation_estimate: opts.exam.pronunciation_estimate,
    weekly_topic_mastery: opts.exam.weekly_topic_mastery,
    cefr_estimate: opts.exam.cefr_estimate,
    recommendation: opts.exam.recommendation,
    highlights: opts.exam.highlights,
    areas_to_improve: opts.exam.areas_to_improve,
  });
}
