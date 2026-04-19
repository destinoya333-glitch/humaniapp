INSERT INTO novia_users (token, phone, name, novia_name, personality)
VALUES ('PRUEBA-PERCY-001', '51979385499', 'Percy', 'Sofía', 'dulce')
ON CONFLICT (token) DO NOTHING;

INSERT INTO novia_sessions (user_id, plan, minutes_total, minutes_used, expires_at, active)
VALUES (
  (SELECT id FROM novia_users WHERE token = 'PRUEBA-PERCY-001'),
  'mensual',
  270,
  0,
  NOW() + INTERVAL '30 days',
  true
);
