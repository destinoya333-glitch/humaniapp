-- EcoDrive+ Garaje — programa permanente de sorteos de vehiculos electricos
-- 2026-05-17 / RUC EcoDrive Plus SAC 20613413228

-- 1) Programa global (config singleton)
CREATE TABLE IF NOT EXISTS garaje_programa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_precio_publico NUMERIC(10,2) NOT NULL DEFAULT 99,
  pass_precio_interno NUMERIC(10,2) NOT NULL DEFAULT 69,
  pass_duracion_meses INT NOT NULL DEFAULT 12,
  pass_cap_por_dni INT NOT NULL DEFAULT 5,
  pass_bonus_lealtad_max INT NOT NULL DEFAULT 5,
  ticket_precio_publico NUMERIC(10,2) NOT NULL DEFAULT 40,
  ticket_precio_interno NUMERIC(10,2) NOT NULL DEFAULT 30,
  chofer_viajes_sin_comision INT NOT NULL DEFAULT 18,
  pasajero_cashback_pct INT NOT NULL DEFAULT 10,
  pasajero_cashback_meses INT NOT NULL DEFAULT 1,
  empresa_razon_social TEXT NOT NULL DEFAULT 'EcoDrive Plus SAC',
  empresa_ruc TEXT NOT NULL DEFAULT '20613413228',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO garaje_programa DEFAULT VALUES
  ON CONFLICT DO NOTHING;

-- 2) Ediciones (parent de tickets)
CREATE TABLE IF NOT EXISTS garaje_ediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_edicion INT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  premio_descripcion TEXT,
  premio_valor_referencial NUMERIC(10,2),
  premio_fotos_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  premio_video_url TEXT,
  meta_tickets INT NOT NULL DEFAULT 3000,
  ticket_precio_publico NUMERIC(10,2),
  ticket_precio_interno NUMERIC(10,2),
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','abierta','cerrada','sorteada','reembolsada')),
  abierta_at TIMESTAMPTZ,
  cerrada_at TIMESTAMPTZ,
  sorteo_at TIMESTAMPTZ,
  numero_ganador INT,
  miembro_ganador_id UUID,
  seed_random TEXT,
  bases_legales_pdf_url TEXT,
  acta_notarial_url TEXT,
  video_sorteo_youtube_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_garaje_ediciones_estado ON garaje_ediciones(estado);

-- 3) Miembros (compradores — vida util cross-ediciones)
CREATE TABLE IF NOT EXISTS garaje_miembros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  email TEXT,
  whatsapp TEXT NOT NULL,
  rider_id UUID REFERENCES v2_riders(id),
  driver_id UUID REFERENCES v2_drivers(id),
  tipo_perfil TEXT NOT NULL DEFAULT 'publico'
    CHECK (tipo_perfil IN ('publico','interno_pasajero','interno_conductor')),
  total_gastado NUMERIC(10,2) NOT NULL DEFAULT 0,
  ediciones_consumidas INT NOT NULL DEFAULT 0,
  primer_contacto TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_garaje_miembros_whatsapp ON garaje_miembros(whatsapp);
CREATE INDEX IF NOT EXISTS idx_garaje_miembros_dni ON garaje_miembros(dni);

-- 4) Pass anual (puede tener varios activos hasta el cap)
CREATE TABLE IF NOT EXISTS garaje_pass (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  miembro_id UUID NOT NULL REFERENCES garaje_miembros(id),
  numero_pass_en_dni INT NOT NULL,
  precio_pagado NUMERIC(10,2) NOT NULL,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo','vencido','cancelado','reembolsado')),
  ediciones_consumidas INT NOT NULL DEFAULT 0,
  beneficio_consumido_en_edicion UUID REFERENCES garaje_ediciones(id),
  beneficio_aplicado_at TIMESTAMPTZ,
  payment_method TEXT,
  payment_intent_id TEXT UNIQUE,
  yape_op_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (miembro_id, numero_pass_en_dni)
);
CREATE INDEX IF NOT EXISTS idx_pass_activo ON garaje_pass(miembro_id, estado) WHERE estado='activo';

-- 5) Tickets (compra suelta + auto-asignados de Pass)
CREATE TABLE IF NOT EXISTS garaje_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edicion_id UUID NOT NULL REFERENCES garaje_ediciones(id),
  numero_correlativo INT NOT NULL,
  miembro_id UUID NOT NULL REFERENCES garaje_miembros(id),
  origen TEXT NOT NULL DEFAULT 'ticket_suelto'
    CHECK (origen IN ('ticket_suelto','pass_auto','pass_bonus')),
  pass_id UUID REFERENCES garaje_pass(id),
  precio_pagado NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_intent_id TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente_pago'
    CHECK (estado IN ('pendiente_pago','confirmado','ganador','no_ganador','reembolsado')),
  fuente_canal TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  UNIQUE (edicion_id, numero_correlativo)
);
CREATE INDEX IF NOT EXISTS idx_tickets_edicion_estado ON garaje_tickets(edicion_id, estado);
CREATE INDEX IF NOT EXISTS idx_tickets_miembro ON garaje_tickets(miembro_id);

-- 6) Reservas temporales (lock 15 min mientras paga)
CREATE TABLE IF NOT EXISTS garaje_reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edicion_id UUID NOT NULL REFERENCES garaje_ediciones(id),
  numero_correlativo INT NOT NULL,
  modalidad TEXT NOT NULL CHECK (modalidad IN ('ticket','pass')),
  whatsapp TEXT NOT NULL,
  dni TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo_perfil TEXT NOT NULL,
  precio_esperado NUMERIC(10,2) NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  metodo_pago_preferido TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (edicion_id, numero_correlativo)
);
CREATE INDEX IF NOT EXISTS idx_reservas_expira ON garaje_reservas(expira_en);

-- 7) Pagos auditables
CREATE TABLE IF NOT EXISTS garaje_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('ticket','pass')),
  ticket_id UUID REFERENCES garaje_tickets(id),
  pass_id UUID REFERENCES garaje_pass(id),
  miembro_id UUID REFERENCES garaje_miembros(id),
  metodo TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'iniciado'
    CHECK (estado IN ('iniciado','confirmado','fallido','reembolsado')),
  raw_payload JSONB,
  factura_serie TEXT,
  factura_numero TEXT,
  factura_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) Beneficios consumidos (auditoria: viajes sin comision chofer, cashback boost pasajero)
CREATE TABLE IF NOT EXISTS garaje_beneficios_consumo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id UUID NOT NULL REFERENCES garaje_pass(id),
  miembro_id UUID NOT NULL REFERENCES garaje_miembros(id),
  tipo_beneficio TEXT NOT NULL
    CHECK (tipo_beneficio IN ('viaje_sin_comision','cashback_boost')),
  viaje_id UUID,
  monto_descontado NUMERIC(10,2),
  fecha_consumo TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_beneficios_pass ON garaje_beneficios_consumo(pass_id);

-- 9) Difusion tracking (atribucion conversiones)
CREATE TABLE IF NOT EXISTS garaje_difusion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal TEXT,
  ad_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ip TEXT,
  user_agent TEXT,
  referer TEXT,
  miembro_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10) Trigger: cuando se ABRE una edicion, auto-asigna tickets a TODOS los Pass activos
CREATE OR REPLACE FUNCTION garaje_auto_assign_pass_tickets()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pass_row RECORD;
  next_num INT;
  bonus_count INT;
  i INT;
  cap_bonus INT;
BEGIN
  IF NEW.estado = 'abierta' AND (OLD.estado IS NULL OR OLD.estado <> 'abierta') THEN
    SELECT pass_bonus_lealtad_max INTO cap_bonus FROM garaje_programa LIMIT 1;
    SELECT COALESCE(MAX(numero_correlativo), 0) + 1 INTO next_num
      FROM garaje_tickets WHERE edicion_id = NEW.id;

    FOR pass_row IN
      SELECT p.id AS pass_id, p.miembro_id, p.ediciones_consumidas
      FROM garaje_pass p
      WHERE p.estado = 'activo' AND p.fecha_fin >= CURRENT_DATE
      ORDER BY p.created_at
    LOOP
      -- ticket base (1 por pass por edicion)
      INSERT INTO garaje_tickets
        (edicion_id, numero_correlativo, miembro_id, origen, pass_id, estado, paid_at)
      VALUES
        (NEW.id, next_num, pass_row.miembro_id, 'pass_auto', pass_row.pass_id, 'confirmado', now());
      next_num := next_num + 1;

      -- bonus lealtad: +1 ticket por edicion consumida, cap pass_bonus_lealtad_max - 1
      bonus_count := LEAST(pass_row.ediciones_consumidas, cap_bonus - 1);
      FOR i IN 1..bonus_count LOOP
        INSERT INTO garaje_tickets
          (edicion_id, numero_correlativo, miembro_id, origen, pass_id, estado, paid_at)
        VALUES
          (NEW.id, next_num, pass_row.miembro_id, 'pass_bonus', pass_row.pass_id, 'confirmado', now());
        next_num := next_num + 1;
      END LOOP;
    END LOOP;
    NEW.abierta_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_garaje_open_edition ON garaje_ediciones;
CREATE TRIGGER trg_garaje_open_edition
  BEFORE UPDATE OF estado ON garaje_ediciones
  FOR EACH ROW EXECUTE FUNCTION garaje_auto_assign_pass_tickets();

-- 11) Trigger: cuando se SORTEA una edicion, incrementa ediciones_consumidas de Pass holders
CREATE OR REPLACE FUNCTION garaje_increment_pass_consumed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'sorteada' AND OLD.estado <> 'sorteada' THEN
    UPDATE garaje_pass
       SET ediciones_consumidas = ediciones_consumidas + 1
     WHERE id IN (
       SELECT DISTINCT pass_id FROM garaje_tickets
       WHERE edicion_id = NEW.id AND pass_id IS NOT NULL
     );
    UPDATE garaje_miembros m
       SET ediciones_consumidas = ediciones_consumidas + 1
     WHERE m.id IN (
       SELECT DISTINCT miembro_id FROM garaje_tickets WHERE edicion_id = NEW.id
     );
    NEW.sorteo_at := COALESCE(NEW.sorteo_at, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_garaje_sorteo_edition ON garaje_ediciones;
CREATE TRIGGER trg_garaje_sorteo_edition
  BEFORE UPDATE OF estado ON garaje_ediciones
  FOR EACH ROW EXECUTE FUNCTION garaje_increment_pass_consumed();

-- 12) Funcion publica: stats de edicion actual (para contador en pagina)
CREATE OR REPLACE FUNCTION garaje_edicion_actual()
RETURNS TABLE(
  edicion_id UUID,
  numero_edicion INT,
  nombre TEXT,
  premio_descripcion TEXT,
  premio_valor NUMERIC,
  premio_fotos TEXT[],
  premio_video TEXT,
  vendidos INT,
  meta INT,
  porcentaje NUMERIC,
  precio_publico NUMERIC,
  precio_interno NUMERIC,
  bases_pdf TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    e.id, e.numero_edicion, e.nombre, e.premio_descripcion,
    e.premio_valor_referencial, e.premio_fotos_urls, e.premio_video_url,
    (SELECT COUNT(*)::INT FROM garaje_tickets t
       WHERE t.edicion_id = e.id AND t.estado = 'confirmado'),
    e.meta_tickets,
    ROUND(
      (SELECT COUNT(*) FROM garaje_tickets t
         WHERE t.edicion_id = e.id AND t.estado = 'confirmado')::NUMERIC
      / NULLIF(e.meta_tickets, 0) * 100, 2),
    COALESCE(e.ticket_precio_publico, p.ticket_precio_publico),
    COALESCE(e.ticket_precio_interno, p.ticket_precio_interno),
    e.bases_legales_pdf_url
  FROM garaje_ediciones e
  CROSS JOIN garaje_programa p
  WHERE e.estado = 'abierta'
  ORDER BY e.numero_edicion DESC
  LIMIT 1;
$$;

-- 13) Funcion publica: historial ediciones cerradas
CREATE OR REPLACE FUNCTION garaje_historial_ediciones()
RETURNS TABLE(
  numero_edicion INT,
  nombre TEXT,
  sorteo_at TIMESTAMPTZ,
  ganador_nombre_parcial TEXT,
  ganador_numero INT,
  video_youtube TEXT
) LANGUAGE SQL STABLE AS $$
  SELECT
    e.numero_edicion,
    e.nombre,
    e.sorteo_at,
    CASE WHEN m.nombre IS NOT NULL
      THEN regexp_replace(m.nombre, '^(\S+)\s+(\S+).*$', '\1 \2.') ELSE NULL END,
    e.numero_ganador,
    e.video_sorteo_youtube_url
  FROM garaje_ediciones e
  LEFT JOIN garaje_miembros m ON m.id = e.miembro_ganador_id
  WHERE e.estado = 'sorteada'
  ORDER BY e.numero_edicion DESC;
$$;

-- 14) Funcion publica: ultimos 10 numeros vendidos (prueba social)
CREATE OR REPLACE FUNCTION garaje_ultimos_vendidos()
RETURNS TABLE(numero_correlativo INT, nombre_parcial TEXT, paid_at TIMESTAMPTZ)
LANGUAGE SQL STABLE AS $$
  SELECT
    t.numero_correlativo,
    regexp_replace(m.nombre, '^(\S+).*$', '\1') || ' #' || t.numero_correlativo::TEXT,
    t.paid_at
  FROM garaje_tickets t
  JOIN garaje_miembros m ON m.id = t.miembro_id
  JOIN garaje_ediciones e ON e.id = t.edicion_id
  WHERE e.estado = 'abierta' AND t.estado = 'confirmado'
  ORDER BY t.paid_at DESC NULLS LAST
  LIMIT 10;
$$;

-- 15) Cleanup automatico de reservas vencidas (llamar via cron)
CREATE OR REPLACE FUNCTION garaje_cleanup_reservas_vencidas()
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
  borradas INT;
BEGIN
  DELETE FROM garaje_reservas WHERE expira_en < now() RETURNING 1 INTO borradas;
  GET DIAGNOSTICS borradas = ROW_COUNT;
  RETURN borradas;
END $$;

-- 16) RLS — el publico solo puede leer las funciones (stats, historial, ultimos)
ALTER TABLE garaje_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE garaje_pass ENABLE ROW LEVEL SECURITY;
ALTER TABLE garaje_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE garaje_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE garaje_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE garaje_beneficios_consumo ENABLE ROW LEVEL SECURITY;

-- Service role bypassa todo RLS (usado por endpoints del bot y de admin)
-- Authenticated users solo ven SUS propios datos
CREATE POLICY "miembros_self_read" ON garaje_miembros
  FOR SELECT TO authenticated
  USING (rider_id IN (SELECT id FROM v2_riders WHERE user_id = auth.uid())
      OR driver_id IN (SELECT id FROM v2_drivers WHERE user_id = auth.uid()));

CREATE POLICY "pass_self_read" ON garaje_pass
  FOR SELECT TO authenticated
  USING (miembro_id IN (
    SELECT id FROM garaje_miembros
    WHERE rider_id IN (SELECT id FROM v2_riders WHERE user_id = auth.uid())
       OR driver_id IN (SELECT id FROM v2_drivers WHERE user_id = auth.uid())));

CREATE POLICY "tickets_self_read" ON garaje_tickets
  FOR SELECT TO authenticated
  USING (miembro_id IN (
    SELECT id FROM garaje_miembros
    WHERE rider_id IN (SELECT id FROM v2_riders WHERE user_id = auth.uid())
       OR driver_id IN (SELECT id FROM v2_drivers WHERE user_id = auth.uid())));

GRANT EXECUTE ON FUNCTION garaje_edicion_actual() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION garaje_historial_ediciones() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION garaje_ultimos_vendidos() TO anon, authenticated;
