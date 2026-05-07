-- =====================================================================
-- Miss Sofia — fechas de plan + tabla debug log MacroDroid
-- Fecha: 2026-05-06
--
-- Agrega plan_started_at y plan_expires_at a mse_users para que el
-- validador Yape (MacroDroid webhook) pueda activar planes con vigencia
-- 30 días (monthly) o 365 días (yearly).
-- =====================================================================

ALTER TABLE mse_users
  ADD COLUMN IF NOT EXISTS plan_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS mse_users_plan_expires_idx
  ON mse_users (plan_expires_at) WHERE plan_expires_at IS NOT NULL;

COMMENT ON COLUMN mse_users.plan_started_at IS
  'Cuando arrancó el plan actual (set por validador Yape). NULL para free.';
COMMENT ON COLUMN mse_users.plan_expires_at IS
  'Cuando expira el plan actual. Cron diario degrada a free cuando vence.';

CREATE TABLE IF NOT EXISTS mse_macrodroid_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  raw_body text,
  parsed jsonb,
  result text,
  payment_id uuid REFERENCES mse_payments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS mse_macrodroid_log_received_idx
  ON mse_macrodroid_log (received_at DESC);

COMMENT ON TABLE mse_macrodroid_log IS
  'Log de notificaciones Yape recibidas desde MacroDroid Android. Debug y reconciliación.';
