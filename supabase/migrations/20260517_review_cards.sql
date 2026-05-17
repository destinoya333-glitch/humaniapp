-- =====================================================================
-- Miss Sofia — Review Cards (Método APA dentro de Cuna)
-- Fecha: 2026-05-17
-- Tabla para guardar las correcciones tipo Teacher Poli (Article Use,
-- Word Choice, Verb Tense, Pronunciation, Word Order) extraídas tras
-- cada sesión de conversación.
-- =====================================================================

CREATE TABLE IF NOT EXISTS mse_review_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES mse_sessions(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN (
    'article_use',
    'word_choice',
    'verb_tense',
    'pronunciation',
    'word_order',
    'preposition',
    'subject_verb_agreement'
  )),
  user_phrase text NOT NULL,
  correction text NOT NULL,
  explanation_es text NOT NULL,
  severity smallint NOT NULL DEFAULT 2 CHECK (severity BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz
);

CREATE INDEX IF NOT EXISTS mse_review_cards_user_open_idx
  ON mse_review_cards (user_id, created_at DESC)
  WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS mse_review_cards_session_idx
  ON mse_review_cards (session_id);

COMMENT ON TABLE mse_review_cards IS
  'Correcciones APA (estilo Teacher Poli) extraídas tras cada sesión Cuna. Severity 1=baja 2=media 3=alta';
COMMENT ON COLUMN mse_review_cards.user_phrase IS
  'Frase exacta que dijo el estudiante (transcrita)';
COMMENT ON COLUMN mse_review_cards.correction IS
  'Versión nativa de la frase';
COMMENT ON COLUMN mse_review_cards.explanation_es IS
  'Explicación corta en español de por qué es mejor la versión nativa';
