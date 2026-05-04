-- =====================================================================
-- Miss Sofia — planes v2 (Regular + Premium)
-- Fecha: 2026-05-03
--
-- Renombra planes a esquema simple: free | regular | premium
-- - free:    OpenAI Nova voz, tier free Cuna (3d ilimitado + 6 min/día x 30d)
-- - regular: OpenAI Nova voz, ilimitado, S/39/mes o S/349/año
-- - premium: ElevenLabs Sofia voz + sesión humana, ilimitado, S/89/mes o S/799/año
--
-- Migra registros existentes:
--   'cuna' / 'pro' → 'regular'
--   'cuna_vip' / 'elite' → 'premium'
-- =====================================================================

-- 1. Drop CHECK constraints viejos para permitir migración
ALTER TABLE mse_users DROP CONSTRAINT IF EXISTS mse_users_plan_check;
ALTER TABLE mse_payments DROP CONSTRAINT IF EXISTS mse_payments_plan_check;

-- 2. Migrar valores legacy de mse_users.plan
UPDATE mse_users SET plan = 'regular' WHERE plan IN ('cuna', 'pro');
UPDATE mse_users SET plan = 'premium' WHERE plan IN ('cuna_vip', 'elite');

-- 3. Migrar valores legacy de mse_payments.plan
UPDATE mse_payments SET plan = 'regular' WHERE plan = 'cuna';
UPDATE mse_payments SET plan = 'premium' WHERE plan = 'cuna_vip';

-- 4. Aplicar nuevos CHECK constraints (después del backfill)
ALTER TABLE mse_users
  ADD CONSTRAINT mse_users_plan_check
  CHECK (plan IN ('free', 'regular', 'premium'));

ALTER TABLE mse_payments
  ADD CONSTRAINT mse_payments_plan_check
  CHECK (plan IN ('regular', 'premium'));

-- 5. Promover Percy (rojas_percy@hotmail.com) a Premium para testing inmediato
UPDATE mse_users
   SET plan = 'premium'
 WHERE email = 'rojas_percy@hotmail.com';

COMMENT ON COLUMN mse_users.plan IS
  'Plan: free | regular (Nova voice) | premium (ElevenLabs Sofia + human session)';
