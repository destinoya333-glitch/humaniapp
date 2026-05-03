-- =====================================================================
-- Miss Sofia — Migración Método Cuna
-- Fecha: 2026-05-03
-- Reemplaza el modelo CEFR (A1-C1, weeks, days) por las 6 fases neurolingüísticas
-- del Método Cuna. Conserva las columnas viejas para compatibilidad durante el cutover.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extender mse_student_profiles con campos Cuna
-- ---------------------------------------------------------------------
ALTER TABLE mse_student_profiles
  ADD COLUMN IF NOT EXISTS current_phase smallint NOT NULL DEFAULT 0
    CHECK (current_phase BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS phase_day integer NOT NULL DEFAULT 1
    CHECK (phase_day >= 1),
  ADD COLUMN IF NOT EXISTS phase_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS cuna_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS tiempo_de_boca_seconds integer NOT NULL DEFAULT 0
    CHECK (tiempo_de_boca_seconds >= 0);

COMMENT ON COLUMN mse_student_profiles.current_phase IS
  'Cuna phase 0-5: 0=Cuna, 1=Primera Palabra, 2=Telegráfico, 3=Tu Voz, 4=Tu Mundo, 5=Tu Yo en Inglés';
COMMENT ON COLUMN mse_student_profiles.phase_day IS
  'Día dentro de la fase actual (1..N según la fase)';
COMMENT ON COLUMN mse_student_profiles.tiempo_de_boca_seconds IS
  'Acumulado total de segundos hablando inglés en sesiones de voz';

-- ---------------------------------------------------------------------
-- 2. mse_phase_progress — log de transiciones entre fases
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_phase_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  phase smallint NOT NULL CHECK (phase BETWEEN 0 AND 5),
  entered_at timestamptz NOT NULL DEFAULT now(),
  exited_at timestamptz,
  exit_signal_evidence text,
  completion_pct smallint CHECK (completion_pct BETWEEN 0 AND 100),
  notes text
);

CREATE INDEX IF NOT EXISTS mse_phase_progress_user_idx
  ON mse_phase_progress (user_id, entered_at DESC);

COMMENT ON TABLE mse_phase_progress IS
  'Log inmutable de cuándo el estudiante entró/salió de cada fase del Método Cuna';

-- ---------------------------------------------------------------------
-- 3. mse_personal_dictionary — palabras atadas a momentos emocionales
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_personal_dictionary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  word text NOT NULL,
  learned_on date NOT NULL DEFAULT current_date,
  context text NOT NULL,
  phase_when_learned smallint NOT NULL CHECK (phase_when_learned BETWEEN 0 AND 5),
  uses_count integer NOT NULL DEFAULT 1 CHECK (uses_count >= 0),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, word)
);

CREATE INDEX IF NOT EXISTS mse_personal_dictionary_user_idx
  ON mse_personal_dictionary (user_id, last_used_at DESC);

COMMENT ON TABLE mse_personal_dictionary IS
  'Diccionario personal del estudiante: cada palabra anclada al momento real en que la aprendió';
COMMENT ON COLUMN mse_personal_dictionary.context IS
  'Descripción del momento emocional: "describiendo el caos del tráfico de Lima"';

-- ---------------------------------------------------------------------
-- 4. mse_novel_chapters — capítulos de la novela personal del estudiante
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_novel_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL CHECK (chapter_number >= 1),
  title text NOT NULL,
  script_full text NOT NULL,
  audio_url text,
  student_part_required text,
  student_part_audio_url text,
  phase_when_generated smallint NOT NULL CHECK (phase_when_generated BETWEEN 0 AND 5),
  generated_at timestamptz NOT NULL DEFAULT now(),
  listened_at timestamptz,
  completed_at timestamptz,
  cliffhanger text,
  vocabulary_introduced text[] NOT NULL DEFAULT '{}',
  UNIQUE (user_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS mse_novel_chapters_user_idx
  ON mse_novel_chapters (user_id, chapter_number DESC);

COMMENT ON TABLE mse_novel_chapters IS
  'Novela personal del estudiante: capítulos generados donde el alumno es protagonista';
COMMENT ON COLUMN mse_novel_chapters.student_part_required IS
  'Línea/diálogo que el estudiante debe grabar para desbloquear el siguiente capítulo';

-- ---------------------------------------------------------------------
-- 5. mse_real_life_missions — misiones diarias real-life
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_real_life_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  assigned_date date NOT NULL DEFAULT current_date,
  phase smallint NOT NULL CHECK (phase BETWEEN 0 AND 5),
  title text NOT NULL,
  description text NOT NULL,
  evidence_type text NOT NULL DEFAULT 'none'
    CHECK (evidence_type IN ('audio', 'photo', 'text', 'none')),
  evidence_url text,
  evidence_text text,
  completed_at timestamptz,
  skipped boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS mse_real_life_missions_user_idx
  ON mse_real_life_missions (user_id, assigned_date DESC);

COMMENT ON TABLE mse_real_life_missions IS
  'Misiones diarias real-life del Método Cuna (1 por día, ajustada por fase)';

-- ---------------------------------------------------------------------
-- 6. mse_visceral_milestones — hitos viscerales únicos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_visceral_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  milestone_key text NOT NULL CHECK (milestone_key IN (
    'first_dream_in_english',
    'first_thought_without_translation',
    'first_joke_landed',
    'first_native_understood_first_try',
    'first_word_in_real_life',
    'first_30sec_no_spanish',
    'first_60sec_no_spanish',
    'first_full_conversation_5min',
    'first_podcast_understood',
    'first_series_no_subs',
    'sello_cuna_completed'
  )),
  achieved_at timestamptz NOT NULL DEFAULT now(),
  context text,
  evidence_url text,
  UNIQUE (user_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS mse_visceral_milestones_user_idx
  ON mse_visceral_milestones (user_id, achieved_at DESC);

COMMENT ON TABLE mse_visceral_milestones IS
  'Hitos viscerales del Método Cuna: eventos únicos de transformación que celebramos en lugar de rachas';

-- ---------------------------------------------------------------------
-- 7. Backfill: estudiantes existentes arrancan en Fase 0
--    (current_phase ya tiene DEFAULT 0, pero seteamos cuna_started_at)
-- ---------------------------------------------------------------------
UPDATE mse_student_profiles
   SET cuna_started_at = COALESCE(cuna_started_at, now())
 WHERE cuna_started_at IS NULL;
