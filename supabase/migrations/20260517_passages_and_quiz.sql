-- =====================================================================
-- Miss Sofia — Cápsulas APA: Passages + Quiz
-- Fecha: 2026-05-17
-- Soporta el flujo Adquirir → Practicar → Ajustar de Teacher Poli
-- integrado al Método Cuna.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. mse_passages — pasajes generados por tema/fase/dificultad
--    Cache compartido entre usuarios para ahorrar tokens/TTS.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_passages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  topic text NOT NULL,
  phase smallint NOT NULL CHECK (phase BETWEEN 0 AND 5),
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  title text NOT NULL,
  body_en text NOT NULL,
  body_es text NOT NULL,
  audio_url text,
  word_timings jsonb,
  word_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  use_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS mse_passages_lookup_idx
  ON mse_passages (phase, difficulty, created_at DESC);

COMMENT ON TABLE mse_passages IS
  'Pasajes APA generados por tema. cache_key = sha1(topic+phase+difficulty)';
COMMENT ON COLUMN mse_passages.word_timings IS
  'Array [{word, start_ms, end_ms}] para karaoke shadowing';

-- ---------------------------------------------------------------------
-- 2. mse_capsule_sessions — sesión de cápsula APA por usuario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_capsule_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  passage_id uuid NOT NULL REFERENCES mse_passages(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  passage_listened_at timestamptz,
  conversation_session_id uuid REFERENCES mse_sessions(id) ON DELETE SET NULL,
  quiz_completed_at timestamptz,
  quiz_score smallint CHECK (quiz_score BETWEEN 0 AND 100),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS mse_capsule_sessions_user_idx
  ON mse_capsule_sessions (user_id, started_at DESC);

COMMENT ON TABLE mse_capsule_sessions IS
  'Una corrida del ciclo APA: pasaje → conversación → quiz';

-- ---------------------------------------------------------------------
-- 3. mse_quiz_results — resultados de mini-quiz post-pasaje
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mse_quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  capsule_session_id uuid REFERENCES mse_capsule_sessions(id) ON DELETE CASCADE,
  passage_id uuid REFERENCES mse_passages(id) ON DELETE SET NULL,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL,
  scores jsonb NOT NULL,
  total_score smallint NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mse_quiz_results_user_idx
  ON mse_quiz_results (user_id, created_at DESC);

COMMENT ON TABLE mse_quiz_results IS
  'Mini-quiz de 5 preguntas (3 multiple-choice + 2 open) sobre el pasaje. Scoring Claude para open-ended.';
