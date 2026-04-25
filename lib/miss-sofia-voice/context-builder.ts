/**
 * Context builder — injects student profile + curriculum context as the
 * first user message to Claude. The system prompt stays SACRED (master-prompt.ts).
 */
import { CurriculumWeek, DailySession, StudentProfile, User } from "./db";

export type SessionContext = {
  student_profile: {
    name: string;
    age: number | null;
    city: string | null;
    profession: string | null;
    motivation: string | null;
    recurring_errors: unknown[];
    vocabulary_mastered: string[];
    vocabulary_struggling: string[];
    personal_facts: Record<string, unknown>;
    last_session_summary: string | null;
  };
  student_level: string;
  current_week: number;
  current_day: string;
  weekly_topic: string;
  weekly_grammar: string;
  weekly_vocabulary: string[];
  weekly_situation: string;
  todays_session_type: string;
  todays_opening_prompt: string;
  todays_roleplay_scenario: string | null;
};

export function buildSessionContext(
  user: User,
  profile: StudentProfile,
  week: CurriculumWeek,
  daily: DailySession
): SessionContext {
  return {
    student_profile: {
      name: user.name,
      age: user.age,
      city: user.city,
      profession: user.profession,
      motivation: user.motivation,
      recurring_errors: profile.recurring_errors ?? [],
      vocabulary_mastered: profile.vocabulary_mastered ?? [],
      vocabulary_struggling: profile.vocabulary_struggling ?? [],
      personal_facts: profile.personal_facts ?? {},
      last_session_summary: profile.last_session_summary,
    },
    student_level: profile.current_level,
    current_week: profile.current_week,
    current_day: profile.current_day,
    weekly_topic: week.topic,
    weekly_grammar: week.grammar_focus,
    weekly_vocabulary: week.vocabulary,
    weekly_situation: week.situational_context,
    todays_session_type: daily.session_type,
    todays_opening_prompt: daily.opening_prompt,
    todays_roleplay_scenario: daily.roleplay_scenario,
  };
}

export function contextAsFirstUserMessage(ctx: SessionContext): string {
  return `[CONTEXT]
${JSON.stringify(ctx, null, 2)}

Start the session naturally. Use the opening_prompt as your guide but make
it feel spontaneous, not scripted. Greet the student by name. Reference
something from last_session_summary or personal_facts if available.`;
}

export function getCurrentDayName(): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[new Date().getDay()];
}
