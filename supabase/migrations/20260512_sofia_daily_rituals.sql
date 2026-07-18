-- Sofia daily rituals — track which audio rituals were sent per user per day.
-- Avoids duplicate sends if the cron retries within the same slot/day.

CREATE TABLE IF NOT EXISTS public.mse_daily_rituals_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.mse_users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  ritual_slot text NOT NULL CHECK (ritual_slot IN ('morning','lunch','night','bedtime','weekend')),
  phase_day integer NOT NULL,
  current_phase integer NOT NULL DEFAULT 0,
  sent_date date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Lima')::date,
  sent_at timestamptz DEFAULT now(),
  audio_url text,
  audio_duration_sec integer,
  script_text text,
  wamid text,
  delivery_status text DEFAULT 'sent' CHECK (delivery_status IN ('sent','delivered','read','failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mse_daily_rituals_unique
  ON public.mse_daily_rituals_sent (user_id, ritual_slot, sent_date);

CREATE INDEX IF NOT EXISTS idx_mse_daily_rituals_phone
  ON public.mse_daily_rituals_sent (phone, sent_date DESC);

CREATE INDEX IF NOT EXISTS idx_mse_daily_rituals_recent
  ON public.mse_daily_rituals_sent (sent_at DESC);

COMMENT ON TABLE public.mse_daily_rituals_sent IS
  'Tracking de audios diarios Sofia (morning/lunch/night/bedtime) por estudiante para evitar duplicados';

-- Vista util: ¿quién recibió qué hoy?
CREATE OR REPLACE VIEW public.mse_rituals_today AS
SELECT
  u.id AS user_id,
  u.name,
  u.phone,
  sp.current_phase,
  sp.phase_day,
  array_agg(r.ritual_slot ORDER BY r.sent_at) AS rituals_sent_today,
  count(r.id) AS rituals_count_today
FROM public.mse_users u
LEFT JOIN public.mse_student_profiles sp ON sp.user_id = u.id
LEFT JOIN public.mse_daily_rituals_sent r
  ON r.user_id = u.id AND r.sent_date = (now() AT TIME ZONE 'America/Lima')::date
GROUP BY u.id, u.name, u.phone, sp.current_phase, sp.phase_day;
