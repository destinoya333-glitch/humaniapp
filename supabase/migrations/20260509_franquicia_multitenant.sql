-- ════════════════════════════════════════════════════════════════════════════
-- ActivosYA Franquicia Digital — Multi-tenant para TuDestinoYa + Miss Sofia
-- ════════════════════════════════════════════════════════════════════════════
-- Sprint 2026-05-09 (Percy + Claude). Plan híbrido:
--   - Auto-onboarding hasta el pago (MacroDroid de Percy detecta renta)
--   - Vinculación phone_id manual de Percy (5-10 min × operador) hasta tener
--     Embedded Signup aprobado por Meta (~2-4 sem)
--   - Cada operador con SU número WhatsApp + SU Yape personal + SU MacroDroid
--   - Solo Perú en V1
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. operadores_leads (formaliza la tabla creada manualmente) ───────────
CREATE TABLE IF NOT EXISTS operadores_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,                  -- 51XXXXXXXXX normalizado
  email TEXT,
  ciudad TEXT,
  activo_interes TEXT DEFAULT 'miss-sofia' CHECK (activo_interes IN ('miss-sofia','tudestinoya','ambos')),
  plan_interes TEXT DEFAULT 'no-decidido' CHECK (plan_interes IN ('no-decidido','local','comunidad','lider')),
  comentario TEXT,
  fuente TEXT DEFAULT 'web',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  whatsapp_msg_id TEXT,                    -- wamid del mensaje de bienvenida
  status TEXT DEFAULT 'new' CHECK (status IN ('new','contacted','paid','converted','rejected','lost')),
  converted_at TIMESTAMPTZ,
  converted_tenant_id UUID,                -- FK a ay_tenants (operador)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_operadores_leads_status ON operadores_leads(status);
CREATE INDEX IF NOT EXISTS idx_operadores_leads_telefono ON operadores_leads(telefono);
CREATE INDEX IF NOT EXISTS idx_operadores_leads_created ON operadores_leads(created_at DESC);

-- ─── 2. Extender ay_tenants con datos del operador ─────────────────────────
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS dni TEXT;
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS whatsapp_personal TEXT;     -- celular personal del operador (notif renta)
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS yape_numero TEXT;           -- celular Yape donde COBRA a sus alumnos
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS macrodroid_token TEXT UNIQUE; -- token único en URL webhook MacroDroid
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;    -- ej: JUAN-CAJ-2026
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS plan TEXT CHECK (plan IN ('local','comunidad','lider'));
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS monthly_fee_pen NUMERIC(10,2);
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS max_alumnos INT;             -- 30 / 100 / 300
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS fecha_proxima_renta DATE;
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS ultima_renta_pagada_at TIMESTAMPTZ;
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE ay_tenants ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_ay_tenants_referral_code ON ay_tenants(referral_code);
CREATE INDEX IF NOT EXISTS idx_ay_tenants_macrodroid_token ON ay_tenants(macrodroid_token);
CREATE INDEX IF NOT EXISTS idx_ay_tenants_proxima_renta ON ay_tenants(fecha_proxima_renta) WHERE status='active';

-- ─── 3. Extender ay_tenant_assets con datos Meta Cloud ─────────────────────
ALTER TABLE ay_tenant_assets ADD COLUMN IF NOT EXISTS meta_phone_id TEXT;
ALTER TABLE ay_tenant_assets ADD COLUMN IF NOT EXISTS meta_waba_id TEXT;
ALTER TABLE ay_tenant_assets ADD COLUMN IF NOT EXISTS meta_phone_display TEXT;  -- ej: +51 9XX XXX XXX
ALTER TABLE ay_tenant_assets ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;
ALTER TABLE ay_tenant_assets ADD COLUMN IF NOT EXISTS macrodroid_setup_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ay_tenant_assets_meta_phone_id ON ay_tenant_assets(meta_phone_id) WHERE meta_phone_id IS NOT NULL;

-- ─── 4. Alumnos del operador (clientes finales atribuidos) ─────────────────
CREATE TABLE IF NOT EXISTS ay_operador_alumnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ay_tenants(id) ON DELETE CASCADE,
  asset_slug TEXT NOT NULL,                -- 'tudestinoya' o 'miss-sofia'
  alumno_phone TEXT NOT NULL,              -- 51XXXXXXXXX
  alumno_name TEXT,
  fecha_primer_contacto TIMESTAMPTZ DEFAULT NOW(),
  source TEXT,                             -- 'referral', 'direct', 'ads', etc
  referral_code_used TEXT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo','pausado','cancelado')),
  total_pagado_pen NUMERIC(10,2) DEFAULT 0,
  ultimo_pago_at TIMESTAMPTZ,
  proximo_pago DATE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, asset_slug, alumno_phone)
);
CREATE INDEX IF NOT EXISTS idx_ay_operador_alumnos_tenant ON ay_operador_alumnos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ay_operador_alumnos_phone ON ay_operador_alumnos(alumno_phone);
CREATE INDEX IF NOT EXISTS idx_ay_operador_alumnos_referral ON ay_operador_alumnos(referral_code_used);

-- ─── 5. Pagos: renta del operador a Percy + pagos de alumnos al operador ──
CREATE TABLE IF NOT EXISTS ay_operador_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES ay_tenants(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('renta_a_percy','pago_alumno','setup_fee','adjustment','refund')),
  monto_pen NUMERIC(10,2) NOT NULL,
  yape_operacion TEXT,                     -- número de operación Yape
  yape_numero_origen TEXT,                 -- celular que pagó
  yape_nombre_origen TEXT,                 -- nombre que aparece en Yape
  alumno_phone TEXT,                       -- solo para tipo='pago_alumno'
  asset_slug TEXT,                         -- para qué activo
  servicio_id UUID,                        -- FK opcional a destinoya_pagos / sofia_payments
  detectado_via TEXT DEFAULT 'macrodroid' CHECK (detectado_via IN ('macrodroid','manual','yape_comercio','mercado_pago')),
  fecha_pago TIMESTAMPTZ DEFAULT NOW(),
  validado BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ay_operador_pagos_tenant ON ay_operador_pagos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ay_operador_pagos_tipo ON ay_operador_pagos(tipo, fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_ay_operador_pagos_yape_op ON ay_operador_pagos(yape_operacion);

-- ─── 6. Lookup helper: phone_id Meta → operador ────────────────────────────
-- (ya tenemos índice unique en ay_tenant_assets.meta_phone_id, esta es la query)
CREATE OR REPLACE FUNCTION ay_get_operador_by_meta_phone(p_phone_id TEXT)
RETURNS UUID AS $$
  SELECT tenant_id FROM ay_tenant_assets
  WHERE meta_phone_id = p_phone_id AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ─── 7. Lookup helper: macrodroid_token → operador ─────────────────────────
CREATE OR REPLACE FUNCTION ay_get_operador_by_macrodroid_token(p_token TEXT)
RETURNS UUID AS $$
  SELECT id FROM ay_tenants
  WHERE macrodroid_token = p_token AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ─── 8. Helper: generar referral_code único legible ─────────────────────────
CREATE OR REPLACE FUNCTION ay_generate_referral_code(p_nombre TEXT, p_ciudad TEXT)
RETURNS TEXT AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  attempt INT := 0;
BEGIN
  base := upper(regexp_replace(split_part(p_nombre, ' ', 1), '[^A-Za-z]', '', 'g'));
  base := substr(base, 1, 6);
  IF p_ciudad IS NOT NULL AND p_ciudad <> '' THEN
    base := base || '-' || upper(substr(regexp_replace(p_ciudad, '[^A-Za-z]', '', 'g'), 1, 3));
  END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM ay_tenants WHERE referral_code = candidate) LOOP
    attempt := attempt + 1;
    candidate := base || '-' || lpad(attempt::text, 2, '0');
    IF attempt > 99 THEN
      candidate := base || '-' || substr(md5(random()::text), 1, 4);
      EXIT;
    END IF;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ─── 9. RLS para nuevas tablas ──────────────────────────────────────────────
ALTER TABLE ay_operador_alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ay_operador_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores_leads ENABLE ROW LEVEL SECURITY;

-- Alumnos: master ve todo, operador ve los suyos
DROP POLICY IF EXISTS ay_operador_alumnos_select ON ay_operador_alumnos;
CREATE POLICY ay_operador_alumnos_select ON ay_operador_alumnos FOR SELECT
  USING (ay_is_master() OR ay_is_tenant_member(tenant_id));

-- Pagos: master ve todo, operador ve los suyos
DROP POLICY IF EXISTS ay_operador_pagos_select ON ay_operador_pagos;
CREATE POLICY ay_operador_pagos_select ON ay_operador_pagos FOR SELECT
  USING (ay_is_master() OR ay_is_tenant_member(tenant_id));

-- Leads: solo master
DROP POLICY IF EXISTS operadores_leads_select ON operadores_leads;
CREATE POLICY operadores_leads_select ON operadores_leads FOR SELECT
  USING (ay_is_master());

-- Leads: cualquiera puede insertar (form público) — el endpoint usa service_role así que esto no aplica realmente
DROP POLICY IF EXISTS operadores_leads_insert_anon ON operadores_leads;
CREATE POLICY operadores_leads_insert_anon ON operadores_leads FOR INSERT
  WITH CHECK (true);

-- ─── 10. FK de operadores_leads.converted_tenant_id (después de declararla) ─
ALTER TABLE operadores_leads
  ADD CONSTRAINT IF NOT EXISTS operadores_leads_converted_tenant_fk
  FOREIGN KEY (converted_tenant_id) REFERENCES ay_tenants(id) ON DELETE SET NULL;

-- ─── 11. Pricing seed (los 3 planes oficiales) ──────────────────────────────
-- (Solo referencia — no es tabla, pero documenta los precios)
COMMENT ON COLUMN ay_tenants.plan IS 'local=S/.500/30 alumnos, comunidad=S/.1200/100 alumnos, lider=S/.2500/300 alumnos';

-- ─── 12. Trigger updated_at automático ──────────────────────────────────────
CREATE OR REPLACE FUNCTION ay_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ay_operador_alumnos_updated_at ON ay_operador_alumnos;
CREATE TRIGGER trg_ay_operador_alumnos_updated_at
  BEFORE UPDATE ON ay_operador_alumnos
  FOR EACH ROW EXECUTE FUNCTION ay_set_updated_at();

DROP TRIGGER IF EXISTS trg_operadores_leads_updated_at ON operadores_leads;
CREATE TRIGGER trg_operadores_leads_updated_at
  BEFORE UPDATE ON operadores_leads
  FOR EACH ROW EXECUTE FUNCTION ay_set_updated_at();
