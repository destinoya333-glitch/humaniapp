-- =====================================================================
-- Miss Sofia — Log idempotencia cápsula diaria por WhatsApp
-- Fecha: 2026-05-17
-- =====================================================================

CREATE TABLE IF NOT EXISTS mse_capsula_diaria_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES mse_users(id) ON DELETE CASCADE,
  sent_on date NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sent_on)
);

CREATE INDEX IF NOT EXISTS mse_capsula_diaria_log_user_idx
  ON mse_capsula_diaria_log (user_id, sent_on DESC);

COMMENT ON TABLE mse_capsula_diaria_log IS
  'Log idempotencia para el cron /api/cron/sofia-capsula-diaria (1 push x usuario x día)';
