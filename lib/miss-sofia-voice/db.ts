/**
 * Miss Sofia Voice — Supabase queries
 *
 * v2.0 incluye soporte completo para el Método Cuna:
 *   - StudentProfile extendido con current_phase, phase_day, ritual data
 *   - mse_phase_progress       — log de transiciones entre fases
 *   - mse_personal_dictionary  — palabras atadas a momentos
 *   - mse_novel_chapters       — capítulos novela personal
 *   - mse_real_life_missions   — misiones diarias
 *   - mse_visceral_milestones  — hitos viscerales
 *
 * Las funciones legacy (curriculum CEFR) se mantienen por compatibilidad
 * con el endpoint POST /api/conversation/start hasta que migre completo.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { CunaPhase, VisceralMilestoneKey } from "./phase-engine";

let _supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_supabase) return _supabase;
  _supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _supabase;
}

// =====================================================================
// Tipos
// =====================================================================

export type StudentProfile = {
  user_id: string;
  // Cuna fields (v2)
  current_phase: CunaPhase;
  phase_day: number;
  phase_started_at: string;
  cuna_started_at: string | null;
  tiempo_de_boca_seconds: number;
  // Legacy CEFR fields (kept for compatibility)
  current_level: string;
  current_week: number;
  current_day: string;
  // Shared
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
  plan: "free" | "regular" | "premium";
  whatsapp_phone: string | null;
};

export type PersonalDictionaryEntry = {
  id: string;
  user_id: string;
  word: string;
  learned_on: string;
  context: string;
  phase_when_learned: CunaPhase;
  uses_count: number;
  last_used_at: string;
};

export type NovelChapter = {
  id: string;
  user_id: string;
  chapter_number: number;
  title: string;
  script_full: string;
  audio_url: string | null;
  student_part_required: string | null;
  student_part_audio_url: string | null;
  phase_when_generated: CunaPhase;
  generated_at: string;
  listened_at: string | null;
  completed_at: string | null;
  cliffhanger: string | null;
  vocabulary_introduced: string[];
};

export type RealLifeMission = {
  id: string;
  user_id: string;
  assigned_date: string;
  phase: CunaPhase;
  title: string;
  description: string;
  evidence_type: "audio" | "photo" | "text" | "none";
  evidence_url: string | null;
  evidence_text: string | null;
  completed_at: string | null;
  skipped: boolean;
};

export type VisceralMilestone = {
  id: string;
  user_id: string;
  milestone_key: VisceralMilestoneKey;
  achieved_at: string;
  context: string | null;
  evidence_url: string | null;
};

// =====================================================================
// Users
// =====================================================================

export async function getUser(userId: string): Promise<User | null> {
  const { data } = await getClient().from("mse_users").select("*").eq("id", userId).single();
  return data;
}

// =====================================================================
// Student Profile (Cuna-aware)
// =====================================================================

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
    .insert({ user_id: userId, cuna_started_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
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

/**
 * Add seconds to the student's "tiempo de boca" counter.
 * Atomic via RPC-style increment (read-then-write — acceptable for single-user
 * sessions; switch to PostgreSQL function if concurrency becomes an issue).
 */
export async function addTiempoDeBoca(userId: string, seconds: number): Promise<void> {
  const profile = await getStudentProfile(userId);
  if (!profile) return;
  await updateStudentProfile(userId, {
    tiempo_de_boca_seconds: profile.tiempo_de_boca_seconds + Math.max(0, Math.round(seconds)),
  });
}

// =====================================================================
// Phase Progress
// =====================================================================

export async function recordPhaseTransition(opts: {
  userId: string;
  fromPhase: CunaPhase | null;
  toPhase: CunaPhase;
  exitSignalEvidence?: string;
  completionPct?: number;
}): Promise<void> {
  const supabase = getClient();
  const nowIso = new Date().toISOString();

  // Close out the previous phase log if exists.
  if (opts.fromPhase !== null) {
    await supabase
      .from("mse_phase_progress")
      .update({
        exited_at: nowIso,
        exit_signal_evidence: opts.exitSignalEvidence ?? null,
        completion_pct: opts.completionPct ?? null,
      })
      .eq("user_id", opts.userId)
      .eq("phase", opts.fromPhase)
      .is("exited_at", null);
  }

  // Open the new phase log.
  await supabase.from("mse_phase_progress").insert({
    user_id: opts.userId,
    phase: opts.toPhase,
    entered_at: nowIso,
  });

  // Update profile state.
  await updateStudentProfile(opts.userId, {
    current_phase: opts.toPhase,
    phase_day: 1,
    phase_started_at: nowIso,
  });
}

// =====================================================================
// Personal Dictionary
// =====================================================================

export async function getPersonalDictionary(
  userId: string,
  limit = 50
): Promise<PersonalDictionaryEntry[]> {
  const { data } = await getClient()
    .from("mse_personal_dictionary")
    .select("*")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function recordWordLearned(opts: {
  userId: string;
  word: string;
  context: string;
  phase: CunaPhase;
}): Promise<void> {
  const supabase = getClient();
  const word = opts.word.trim().toLowerCase();
  if (!word) return;

  // Upsert: if exists, increment uses_count + bump last_used_at; else insert.
  const { data: existing } = await supabase
    .from("mse_personal_dictionary")
    .select("id, uses_count")
    .eq("user_id", opts.userId)
    .eq("word", word)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("mse_personal_dictionary")
      .update({
        uses_count: (existing.uses_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("mse_personal_dictionary").insert({
      user_id: opts.userId,
      word,
      context: opts.context,
      phase_when_learned: opts.phase,
    });
  }
}

// =====================================================================
// Novel Chapters
// =====================================================================

export async function getLatestChapter(userId: string): Promise<NovelChapter | null> {
  const { data } = await getClient()
    .from("mse_novel_chapters")
    .select("*")
    .eq("user_id", userId)
    .order("chapter_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getNovelChapters(userId: string, limit = 10): Promise<NovelChapter[]> {
  const { data } = await getClient()
    .from("mse_novel_chapters")
    .select("*")
    .eq("user_id", userId)
    .order("chapter_number", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function createChapter(
  chapter: Omit<NovelChapter, "id" | "generated_at" | "listened_at" | "completed_at">
): Promise<NovelChapter> {
  const { data, error } = await getClient()
    .from("mse_novel_chapters")
    .insert(chapter)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markChapterListened(chapterId: string): Promise<void> {
  await getClient()
    .from("mse_novel_chapters")
    .update({ listened_at: new Date().toISOString() })
    .eq("id", chapterId)
    .is("listened_at", null);
}

export async function completeChapter(
  chapterId: string,
  studentPartAudioUrl: string
): Promise<void> {
  await getClient()
    .from("mse_novel_chapters")
    .update({
      student_part_audio_url: studentPartAudioUrl,
      completed_at: new Date().toISOString(),
    })
    .eq("id", chapterId);
}

// =====================================================================
// Real-life Missions
// =====================================================================

export async function getTodayMission(userId: string): Promise<RealLifeMission | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await getClient()
    .from("mse_real_life_missions")
    .select("*")
    .eq("user_id", userId)
    .eq("assigned_date", today)
    .maybeSingle();
  return data;
}

export async function upsertTodayMission(opts: {
  userId: string;
  phase: CunaPhase;
  title: string;
  description: string;
  evidence_type: "audio" | "photo" | "text" | "none";
}): Promise<RealLifeMission> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await getClient()
    .from("mse_real_life_missions")
    .upsert(
      {
        user_id: opts.userId,
        assigned_date: today,
        phase: opts.phase,
        title: opts.title,
        description: opts.description,
        evidence_type: opts.evidence_type,
      },
      { onConflict: "user_id,assigned_date" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeTodayMission(opts: {
  userId: string;
  evidenceUrl?: string;
  evidenceText?: string;
}): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await getClient()
    .from("mse_real_life_missions")
    .update({
      completed_at: new Date().toISOString(),
      evidence_url: opts.evidenceUrl ?? null,
      evidence_text: opts.evidenceText ?? null,
    })
    .eq("user_id", opts.userId)
    .eq("assigned_date", today);
}

// =====================================================================
// Visceral Milestones
// =====================================================================

export async function getVisceralMilestones(userId: string): Promise<VisceralMilestone[]> {
  const { data } = await getClient()
    .from("mse_visceral_milestones")
    .select("*")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false });
  return data ?? [];
}

/**
 * Record a visceral milestone if not already achieved.
 * Returns true if newly recorded, false if already existed.
 */
export async function recordVisceralMilestone(opts: {
  userId: string;
  milestoneKey: VisceralMilestoneKey;
  context?: string;
  evidenceUrl?: string;
}): Promise<boolean> {
  const { error } = await getClient().from("mse_visceral_milestones").insert({
    user_id: opts.userId,
    milestone_key: opts.milestoneKey,
    context: opts.context ?? null,
    evidence_url: opts.evidenceUrl ?? null,
  });
  if (error) {
    // 23505 = unique violation → already exists, that's fine.
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

// =====================================================================
// Sessions (legacy + new)
// =====================================================================

export async function createSession(opts: {
  user_id: string;
  level?: string;          // legacy CEFR
  week_number?: number;    // legacy CEFR
  day_name?: string;       // legacy weekly schedule
  session_type: string;    // 'morning' | 'lunch' | 'night' | 'bedtime' | 'weekend' | legacy types
}): Promise<{ id: string }> {
  const { data, error } = await getClient()
    .from("mse_sessions")
    .insert({
      user_id: opts.user_id,
      level: opts.level ?? null,
      week_number: opts.week_number ?? null,
      day_name: opts.day_name ?? null,
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

// =====================================================================
// Daily Usage (free tier limits)
// =====================================================================

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

/**
 * Suma todos los segundos usados por el user en el mes actual (UTC).
 * Usado para aplicar el soft cap de 45 min de voz Premium ElevenLabs.
 */
export async function getMonthUsageSeconds(userId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString().slice(0, 10);
  const { data } = await getClient()
    .from("mse_daily_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .gte("usage_date", monthStart);
  if (!data) return 0;
  return data.reduce((sum, row) => sum + (row.seconds_used ?? 0), 0);
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

// =====================================================================
// Legacy CEFR curriculum (kept for compatibility — deprecated)
// =====================================================================

/**
 * @deprecated Replaced by Método Cuna 6 fases. Mantener hasta retirar el funnel WhatsApp.
 */
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

/**
 * @deprecated CEFR-based weekly exam — superseded by Cuna phase_progress.
 */
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
