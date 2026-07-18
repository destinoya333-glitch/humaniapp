-- ════════════════════════════════════════════════════════════════════════════
-- TuChoferYa — 7mo activo ActivosYA (SaaS choferes Uber/InDrive Perú)
-- ════════════════════════════════════════════════════════════════════════════
-- Sprint TC-1 (Percy + Claude, 2026-05-11).
--   - Modelo: chofer paga renta mensual fija (S/.39/79/149) y opera reservas
--     directas con pasajeros. Yape va directo del pasajero al chofer; Percy
--     SOLO cobra la mensualidad SaaS. NO se intermedia el viaje (legal SUTRAN).
--   - Decisión arquitectónica: extender eco_choferes con columnas choferya_*
--     en lugar de crear tabla paralela. Un mismo chofer puede operar
--     EcoDrive+ (random pasajero, comisión 6.3%) y TuChoferYa (clientes
--     recurrentes, suscripción) sin duplicar validación IA/DNI/SOAT.
--   - Reuso: ay_tenants (type='chofer_independiente'), ay_operador_pagos,
--     crons renta T-3/T0/T+30 ya deployados.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0. Columnas legacy del Sprint 19 EcoDrive (yape_celular) que quedaron pendientes ──
-- Esto debió haberse aplicado en Sprint 19 cierre ciclo viaje. Garantiza idempotencia.
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS yape_celular TEXT;

-- ─── 1. Extender eco_choferes con capa TuChoferYa ──────────────────────────
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS choferya_active BOOLEAN DEFAULT FALSE;
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS choferya_plan TEXT
  CHECK (choferya_plan IN ('basico','pro','elite'));
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS choferya_slug TEXT;
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS choferya_subscription_until DATE;
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS choferya_bio TEXT;
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS choferya_zonas TEXT[];
ALTER TABLE eco_choferes ADD COLUMN IF NOT EXISTS choferya_tenant_id UUID
  REFERENCES ay_tenants(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eco_choferes_choferya_slug
  ON eco_choferes(choferya_slug)
  WHERE choferya_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eco_choferes_choferya_active
  ON eco_choferes(choferya_active, status)
  WHERE choferya_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_eco_choferes_choferya_tenant
  ON eco_choferes(choferya_tenant_id)
  WHERE choferya_tenant_id IS NOT NULL;

COMMENT ON COLUMN eco_choferes.choferya_plan IS
  'basico=S/.39/mes (pagina+QR+sello), pro=S/.79/mes (+bot IA+tarifa dinamica), elite=S/.149/mes (+multi-chofer+ads)';

-- ─── 2. Extender CHECKs de ay_tenants (planes + type) ─────────────────────
-- ay_tenants.plan ya existe con CHECK (plan IN ('local','comunidad','lider')).
-- ay_tenants.type ya existe con CHECK (type IN ('master','operador')).
-- Hay que extender AMBOS para incluir TuChoferYa sin crear columnas paralelas.
ALTER TABLE ay_tenants DROP CONSTRAINT IF EXISTS ay_tenants_plan_check;
ALTER TABLE ay_tenants ADD CONSTRAINT ay_tenants_plan_check
  CHECK (plan IS NULL OR plan IN ('local','comunidad','lider','basico','pro','elite'));

ALTER TABLE ay_tenants DROP CONSTRAINT IF EXISTS ay_tenants_type_check;
ALTER TABLE ay_tenants ADD CONSTRAINT ay_tenants_type_check
  CHECK (type IN ('master','operador','chofer_independiente'));

-- Índice complementario (ya existe idx_ay_tenants_type del schema original)
CREATE INDEX IF NOT EXISTS idx_ay_tenants_type_status
  ON ay_tenants(type, status);

-- ─── 3. Tarifas planas por ruta (diferenciador vs Uber dinámico) ───────────
CREATE TABLE IF NOT EXISTS choferya_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chofer_id UUID NOT NULL REFERENCES eco_choferes(id) ON DELETE CASCADE,
  etiqueta TEXT NOT NULL,                    -- ej: "Centro → Aeropuerto"
  origen TEXT,                               -- texto libre del lugar A
  destino TEXT,                              -- texto libre del lugar B
  precio_pen NUMERIC(6,2) NOT NULL CHECK (precio_pen > 0),
  duracion_estimada_min INT,
  activo BOOLEAN DEFAULT TRUE,
  orden SMALLINT DEFAULT 0,                  -- orden de display en perfil público
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_choferya_precios_chofer
  ON choferya_precios(chofer_id, activo, orden);

-- ─── 4. Horarios disponibles del chofer ────────────────────────────────────
CREATE TABLE IF NOT EXISTS choferya_horarios (
  chofer_id UUID NOT NULL REFERENCES eco_choferes(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),  -- 0=domingo
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  PRIMARY KEY (chofer_id, dia_semana, hora_inicio),
  CHECK (hora_fin > hora_inicio)
);
CREATE INDEX IF NOT EXISTS idx_choferya_horarios_chofer
  ON choferya_horarios(chofer_id);

-- ─── 5. Reservas directas (pasajero ya eligió chofer, no hay matching) ─────
CREATE TABLE IF NOT EXISTS choferya_reservas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chofer_id UUID NOT NULL REFERENCES eco_choferes(id),
  pasajero_wa_id TEXT NOT NULL,              -- 51XXXXXXXXX normalizado
  pasajero_nombre TEXT,
  pasajero_eco_id UUID REFERENCES eco_pasajeros(id),  -- si ya esta en la BD
  fecha_viaje DATE NOT NULL,
  hora_viaje TIME NOT NULL,
  origen_direccion TEXT,
  origen_lat DOUBLE PRECISION,
  origen_lng DOUBLE PRECISION,
  destino_direccion TEXT,
  destino_lat DOUBLE PRECISION,
  destino_lng DOUBLE PRECISION,
  precio_pen NUMERIC(6,2) NOT NULL,
  precio_id UUID REFERENCES choferya_precios(id),    -- si vino de tarifa plana pre-armada
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','confirmada','en_curso','completada','cancelada','no_show','rechazada')),
  yape_confirmado BOOLEAN DEFAULT FALSE,             -- chofer confirma pago recibido (manual o evidencia)
  yape_evidencia_url TEXT,                           -- screenshot Yape opcional subido por chofer
  notas TEXT,
  source TEXT DEFAULT 'web',                         -- 'web', 'whatsapp', 'qr', 'directorio'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT CHECK (cancelled_by IS NULL OR cancelled_by IN ('pasajero','chofer','sistema')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_choferya_reservas_chofer_fecha
  ON choferya_reservas(chofer_id, fecha_viaje, hora_viaje);
CREATE INDEX IF NOT EXISTS idx_choferya_reservas_pasajero
  ON choferya_reservas(pasajero_wa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_choferya_reservas_estado
  ON choferya_reservas(estado, fecha_viaje)
  WHERE estado IN ('pendiente','confirmada','en_curso');

-- ─── 6. Calificaciones públicas (engine de confianza) ──────────────────────
CREATE TABLE IF NOT EXISTS choferya_calificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chofer_id UUID NOT NULL REFERENCES eco_choferes(id),
  reserva_id UUID UNIQUE REFERENCES choferya_reservas(id),
  pasajero_wa_id TEXT NOT NULL,
  estrellas SMALLINT NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario TEXT,
  oculto BOOLEAN DEFAULT FALSE,              -- moderación: ocultar abusivos sin borrar
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_choferya_calificaciones_chofer
  ON choferya_calificaciones(chofer_id, created_at DESC)
  WHERE oculto = FALSE;

-- ─── 7. Vista materializada — directorio público ───────────────────────────
-- Refresh cada 10 min vía cron n8n (CONCURRENTLY para no bloquear lecturas)
DROP MATERIALIZED VIEW IF EXISTS choferya_directorio;
CREATE MATERIALIZED VIEW choferya_directorio AS
SELECT
  ec.id,
  ec.choferya_slug,
  ec.nombre,
  ec.choferya_bio,
  ec.choferya_zonas,
  ec.choferya_plan,
  ec.selfie_foto_url,
  ec.carro_foto_url,
  ec.vehiculo_marca,
  ec.vehiculo_modelo,
  ec.vehiculo_anio,
  ec.vehiculo_color,
  ec.yape_celular,
  COALESCE(ROUND(AVG(cc.estrellas)::NUMERIC, 2), 0)::NUMERIC(3,2) AS rating_promedio,
  COUNT(DISTINCT cc.id) AS total_calificaciones,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.estado = 'completada') AS viajes_completados,
  ec.created_at AS antiguedad_desde
FROM eco_choferes ec
LEFT JOIN choferya_calificaciones cc
  ON cc.chofer_id = ec.id AND cc.oculto = FALSE
LEFT JOIN choferya_reservas cr
  ON cr.chofer_id = ec.id
WHERE ec.choferya_active = TRUE
  AND ec.status = 'approved'
  AND ec.choferya_subscription_until >= CURRENT_DATE
GROUP BY ec.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_choferya_directorio_slug
  ON choferya_directorio(choferya_slug);
CREATE INDEX IF NOT EXISTS idx_choferya_directorio_zonas
  ON choferya_directorio USING GIN(choferya_zonas);

-- ─── 8. Helpers SQL ─────────────────────────────────────────────────────────

-- 8.a Lookup operador (tenant) por slug del chofer
CREATE OR REPLACE FUNCTION choferya_get_tenant_by_slug(p_slug TEXT)
RETURNS UUID AS $$
  SELECT choferya_tenant_id FROM eco_choferes
  WHERE choferya_slug = p_slug AND choferya_active = TRUE
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 8.b Generar slug único legible a partir del nombre + sufijo opcional
CREATE OR REPLACE FUNCTION choferya_generate_slug(p_nombre TEXT, p_ciudad TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  attempt INT := 0;
BEGIN
  base := lower(regexp_replace(p_nombre, '[^A-Za-zÁÉÍÓÚáéíóúÑñ ]', '', 'g'));
  base := translate(base, 'áéíóúñ', 'aeioun');
  base := regexp_replace(trim(base), '\s+', '-', 'g');
  base := substr(base, 1, 30);
  IF p_ciudad IS NOT NULL AND p_ciudad <> '' THEN
    base := base || '-' || lower(regexp_replace(p_ciudad, '[^A-Za-z]', '', 'g'));
    base := substr(base, 1, 40);
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM eco_choferes WHERE choferya_slug = candidate) LOOP
    attempt := attempt + 1;
    candidate := base || '-' || attempt::TEXT;
    IF attempt > 99 THEN
      candidate := base || '-' || substr(md5(random()::TEXT), 1, 5);
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 8.c Disponibilidad: slots libres para un chofer en una fecha
CREATE OR REPLACE FUNCTION choferya_slots_disponibles(
  p_chofer_id UUID,
  p_fecha DATE,
  p_step_min INT DEFAULT 30
)
RETURNS TABLE(slot_inicio TIME, slot_fin TIME) AS $$
DECLARE
  v_dow SMALLINT := EXTRACT(DOW FROM p_fecha);
BEGIN
  RETURN QUERY
  WITH ventanas AS (
    SELECT hora_inicio, hora_fin
    FROM choferya_horarios
    WHERE chofer_id = p_chofer_id AND dia_semana = v_dow
  ),
  ocupados AS (
    SELECT hora_viaje AS ini,
           (hora_viaje + (COALESCE(p.duracion_estimada_min, 60) || ' minutes')::INTERVAL)::TIME AS fin
    FROM choferya_reservas cr
    LEFT JOIN choferya_precios p ON p.id = cr.precio_id
    WHERE cr.chofer_id = p_chofer_id
      AND cr.fecha_viaje = p_fecha
      AND cr.estado IN ('pendiente','confirmada','en_curso')
  ),
  candidatos AS (
    SELECT generate_series(
      v.hora_inicio,
      v.hora_fin - (p_step_min || ' minutes')::INTERVAL,
      (p_step_min || ' minutes')::INTERVAL
    )::TIME AS s_ini,
    (v.hora_fin)::TIME AS v_fin
    FROM ventanas v
  )
  SELECT c.s_ini,
         LEAST(c.s_ini + (p_step_min || ' minutes')::INTERVAL, c.v_fin)::TIME
  FROM candidatos c
  WHERE NOT EXISTS (
    SELECT 1 FROM ocupados o
    WHERE c.s_ini < o.fin
      AND (c.s_ini + (p_step_min || ' minutes')::INTERVAL)::TIME > o.ini
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── 9. RLS para nuevas tablas ──────────────────────────────────────────────
ALTER TABLE choferya_precios ENABLE ROW LEVEL SECURITY;
ALTER TABLE choferya_horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE choferya_reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE choferya_calificaciones ENABLE ROW LEVEL SECURITY;

-- Precios: lectura pública (perfil chofer), escritura solo master/service_role
DROP POLICY IF EXISTS choferya_precios_select_public ON choferya_precios;
CREATE POLICY choferya_precios_select_public ON choferya_precios FOR SELECT
  USING (activo = TRUE);

-- Horarios: lectura pública, escritura solo master/service_role
DROP POLICY IF EXISTS choferya_horarios_select_public ON choferya_horarios;
CREATE POLICY choferya_horarios_select_public ON choferya_horarios FOR SELECT
  USING (TRUE);

-- Reservas: master ve todo (las APIs usan service_role; el chofer ve via tracker-token)
DROP POLICY IF EXISTS choferya_reservas_select_master ON choferya_reservas;
CREATE POLICY choferya_reservas_select_master ON choferya_reservas FOR SELECT
  USING (ay_is_master());

-- Calificaciones: lectura pública si no están ocultas
DROP POLICY IF EXISTS choferya_calificaciones_select_public ON choferya_calificaciones;
CREATE POLICY choferya_calificaciones_select_public ON choferya_calificaciones FOR SELECT
  USING (oculto = FALSE);

-- ─── 10. Triggers updated_at ────────────────────────────────────────────────
-- ay_set_updated_at() ya existe (declarada en 20260509_franquicia_multitenant.sql)
DROP TRIGGER IF EXISTS trg_choferya_precios_updated_at ON choferya_precios;
CREATE TRIGGER trg_choferya_precios_updated_at
  BEFORE UPDATE ON choferya_precios
  FOR EACH ROW EXECUTE FUNCTION ay_set_updated_at();

DROP TRIGGER IF EXISTS trg_choferya_reservas_updated_at ON choferya_reservas;
CREATE TRIGGER trg_choferya_reservas_updated_at
  BEFORE UPDATE ON choferya_reservas
  FOR EACH ROW EXECUTE FUNCTION ay_set_updated_at();
