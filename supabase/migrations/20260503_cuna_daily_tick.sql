-- =====================================================================
-- Miss Sofia Cuna — daily tick function + evidence bucket
-- Fecha: 2026-05-03 (segunda migración del día)
--
-- 1) cuna_daily_tick() — recalcula phase_day desde phase_started_at.
--    Self-healing: si el cron falla un día, al día siguiente recupera el valor
--    correcto. NO usa increment ciego.
--
-- 2) Bucket sofia-evidence (privado) — para uploads de evidencia de misiones
--    (audio/foto/texto). Distinto del bucket público sofia-tts.
-- =====================================================================

CREATE OR REPLACE FUNCTION cuna_daily_tick()
RETURNS TABLE(updated_users integer, max_phase_day integer)
LANGUAGE plpgsql
AS $$
DECLARE
  rows_updated integer;
  max_day integer;
BEGIN
  WITH updated AS (
    UPDATE mse_student_profiles
       SET phase_day = LEAST(
             GREATEST(EXTRACT(DAY FROM (now() - phase_started_at))::int + 1, 1),
             CASE current_phase
               WHEN 0 THEN 30
               WHEN 1 THEN 30
               WHEN 2 THEN 30
               WHEN 3 THEN 60
               WHEN 4 THEN 90
               WHEN 5 THEN 125
               ELSE 30
             END
           ),
           updated_at = now()
     WHERE current_phase BETWEEN 0 AND 5
     RETURNING phase_day
  )
  SELECT count(*)::int, COALESCE(max(phase_day), 0)::int
    INTO rows_updated, max_day
    FROM updated;

  RETURN QUERY SELECT rows_updated, max_day;
END;
$$;

COMMENT ON FUNCTION cuna_daily_tick IS
  'Recalcula phase_day para todos los estudiantes Cuna desde phase_started_at. Self-healing. Llamar diariamente desde Vercel Cron.';

-- ---------------------------------------------------------------------
-- Bucket sofia-evidence (privado) para uploads de evidencia de misiones
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('sofia-evidence', 'sofia-evidence', false)
ON CONFLICT (id) DO NOTHING;
