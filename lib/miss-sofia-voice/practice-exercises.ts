/**
 * Practice exercises served after the level test.
 * Each exercise has:
 *   - prompt: what Sofia says/asks (in English) — also the audio narration
 *   - es: Spanish translation for "traducir" command
 *   - level: minimum CEFR level
 *   - expected_skills: hints used by Claude to give targeted feedback
 *
 * Audio files are pre-generated at /storage/sofia-tts/practice/ex-N.mp3.
 */
export type PracticeExercise = {
  id: number;
  level: "A1" | "A2" | "B1" | "B2";
  prompt: string;
  es: string;
  expected_skills: string;
  audio_url?: string; // pre-generated, optional
};

export const PRACTICE_EXERCISES: PracticeExercise[] = [
  // A1 / A2 introductions
  {
    id: 1,
    level: "A1",
    prompt: "Tell me about yourself in 2 or 3 sentences. Your name, where you're from, and what you do.",
    es: "Cuéntame sobre ti en 2 o 3 oraciones. Tu nombre, de dónde eres y a qué te dedicas.",
    expected_skills: "verb to be, basic present simple, personal info vocabulary",
  },
  {
    id: 2,
    level: "A1",
    prompt: "Describe your typical day. What time do you wake up? What do you do in the morning, afternoon, and evening?",
    es: "Describe tu día típico. ¿A qué hora te despiertas? ¿Qué haces en la mañana, tarde y noche?",
    expected_skills: "present simple with -s for he/she/it, time expressions, daily routines",
  },
  {
    id: 3,
    level: "A2",
    prompt: "Tell me about something fun you did last weekend. Where did you go and who did you go with?",
    es: "Cuéntame sobre algo divertido que hiciste el fin de semana pasado. ¿A dónde fuiste y con quién?",
    expected_skills: "past simple regular and irregular verbs, time markers (last, ago)",
  },
  {
    id: 4,
    level: "A2",
    prompt: "Imagine you're at a restaurant. Order a main dish, a drink, and ask for the bill politely.",
    es: "Imagina que estás en un restaurante. Pide un plato principal, una bebida y la cuenta con cortesía.",
    expected_skills: "would like, polite forms, restaurant vocabulary",
  },
  // B1
  {
    id: 5,
    level: "B1",
    prompt: "Tell me about a place you have always wanted to visit. Why does it interest you?",
    es: "Cuéntame de un lugar que siempre has querido visitar. ¿Por qué te interesa?",
    expected_skills: "present perfect (have always wanted), reasons with because, descriptive language",
  },
  {
    id: 6,
    level: "B1",
    prompt: "If you won 10,000 dollars tomorrow, what would you do with it? Give me 3 specific things.",
    es: "Si ganaras 10,000 dólares mañana, ¿qué harías con el dinero? Dame 3 cosas específicas.",
    expected_skills: "second conditional (would + verb), hypothetical reasoning",
  },
  // B2
  {
    id: 7,
    level: "B2",
    prompt: "What's a problem in your country or city that you would like to solve? Why is it important to you?",
    es: "¿Cuál es un problema de tu país o ciudad que te gustaría resolver? ¿Por qué te importa?",
    expected_skills: "complex sentences, opinion phrases, linking words (because, however, although)",
  },
  {
    id: 8,
    level: "B2",
    prompt: "Tell me about a time you had to make a difficult decision. What were your options, and what did you choose?",
    es: "Cuéntame de una vez que tuviste que tomar una decisión difícil. ¿Cuáles eran tus opciones y qué elegiste?",
    expected_skills: "narrative past tenses, conditionals, decision-making vocabulary",
  },
];

export function pickFirstExerciseForLevel(level: string): PracticeExercise {
  // Pick first exercise at or below user's level so they ramp up
  const ordering = { A1: 1, A2: 2, B1: 3, B2: 4 };
  const userLevel = ordering[level as keyof typeof ordering] ?? 1;
  // Start at the easiest of their level
  const candidates = PRACTICE_EXERCISES.filter(
    (e) => (ordering[e.level] ?? 1) <= userLevel
  );
  // For first exercise, pick the highest-of-allowed minus 1 (so it's a bit easier than their cap)
  const target = Math.max(1, userLevel - 1);
  const found = candidates.find((e) => (ordering[e.level] ?? 1) === target);
  return found ?? candidates[0] ?? PRACTICE_EXERCISES[0];
}

export function nextExerciseAfter(currentId: number): PracticeExercise | null {
  const idx = PRACTICE_EXERCISES.findIndex((e) => e.id === currentId);
  if (idx < 0 || idx >= PRACTICE_EXERCISES.length - 1) return null;
  return PRACTICE_EXERCISES[idx + 1];
}

export function getExerciseById(id: number): PracticeExercise | undefined {
  return PRACTICE_EXERCISES.find((e) => e.id === id);
}
