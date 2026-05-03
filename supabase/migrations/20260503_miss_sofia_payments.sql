-- =====================================================================
-- Miss Sofia — payments table (Yape MacroDroid validation pattern)
-- Fecha: 2026-05-03 (tercera migración del día)
--
-- Mismo patrón que TuDestinoYa: lead/usuario hace Yape, registramos pago
-- como pending_validation. MacroDroid Android del operador detecta la
-- notificación Yape y dispara webhook que valida el pago por monto +
-- código de operación.
-- =====================================================================

CREATE TABLE IF NOT EXISTS mse_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES mse_users(id) ON DELETE SET NULL,
  phone text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('cuna', 'cuna_vip')),
  billing text NOT NULL CHECK (billing IN ('monthly', 'yearly')),
  amount_pen numeric(10, 2) NOT NULL CHECK (amount_pen > 0),
  yape_operation_code text,
  status text NOT NULL DEFAULT 'pending_validation'
    CHECK (status IN ('pending_validation', 'validated', 'refunded', 'failed')),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS mse_payments_phone_idx
  ON mse_payments (phone, created_at DESC);

CREATE INDEX IF NOT EXISTS mse_payments_user_idx
  ON mse_payments (user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS mse_payments_status_idx
  ON mse_payments (status, created_at DESC) WHERE status = 'pending_validation';

COMMENT ON TABLE mse_payments IS
  'Registros de pago Yape para Sofia Cuna / Sofia Cuna VIP. Validación via MacroDroid (igual patrón que destinoya).';
