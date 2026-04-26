-- ════════════════════════════════════════════════════════════════════════════
-- ActivosYA — Multi-tenant schema
-- ════════════════════════════════════════════════════════════════════════════
-- Tablas:
--   ay_tenants         · master + operadores que rentan/compran activos
--   ay_tenant_assets   · qué activo opera cada tenant (1 tenant → N activos)
--   ay_tenant_members  · qué usuarios pertenecen a qué tenant (con roles)
--   ay_b2b_leads       · solicitudes del form de calificación
--   ay_audit_log       · trazabilidad de acciones críticas
-- ════════════════════════════════════════════════════════════════════════════

-- ─── TENANTS (la entidad de negocio que opera activos) ─────────────────────
CREATE TABLE IF NOT EXISTS ay_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('master', 'operador')),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  legal_name TEXT,
  ruc TEXT,
  country TEXT DEFAULT 'PE',
  city TEXT,
  billing_email TEXT,
  whatsapp_phone TEXT,
  custom_domain TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'pending_onboarding')),
  stripe_customer_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ay_tenants_status ON ay_tenants(status);
CREATE INDEX IF NOT EXISTS idx_ay_tenants_type ON ay_tenants(type);

-- ─── TENANT ASSETS (qué activos digitales opera el tenant) ─────────────────
CREATE TABLE IF NOT EXISTS ay_tenant_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ay_tenants(id) ON DELETE CASCADE,
  asset_slug TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('rent', 'buy')),
  monthly_fee_pen NUMERIC(10, 2),
  buy_price_pen NUMERIC(12, 2),
  setup_fee_pen NUMERIC(10, 2),
  started_at DATE NOT NULL,
  ends_at DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  twilio_subaccount_sid TEXT,
  twilio_phone_number TEXT,
  custom_branding JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, asset_slug)
);
CREATE INDEX IF NOT EXISTS idx_ay_tenant_assets_tenant ON ay_tenant_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ay_tenant_assets_status ON ay_tenant_assets(status);

-- ─── TENANT MEMBERS (auth: quién accede a qué tenant y con qué rol) ────────
CREATE TABLE IF NOT EXISTS ay_tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES ay_tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ay_tenant_members_user ON ay_tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ay_tenant_members_tenant ON ay_tenant_members(tenant_id);

-- ─── B2B LEADS (form de calificación de activosya.com/#contacto) ───────────
CREATE TABLE IF NOT EXISTS ay_b2b_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  asset_interest TEXT,
  budget_range TEXT,
  timing TEXT,
  notes TEXT,
  source TEXT DEFAULT 'web_form',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'data_room_sent', 'meeting_booked', 'won', 'lost')),
  assigned_to UUID REFERENCES auth.users(id),
  converted_tenant_id UUID REFERENCES ay_tenants(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ay_b2b_leads_status ON ay_b2b_leads(status);
CREATE INDEX IF NOT EXISTS idx_ay_b2b_leads_email ON ay_b2b_leads(email);
CREATE INDEX IF NOT EXISTS idx_ay_b2b_leads_created ON ay_b2b_leads(created_at DESC);

-- ─── AUDIT LOG ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ay_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES ay_tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ay_audit_log_tenant ON ay_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ay_audit_log_user ON ay_audit_log(user_id, created_at DESC);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────────────────────
ALTER TABLE ay_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ay_tenant_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ay_tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ay_b2b_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ay_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: ¿es member del tenant?
CREATE OR REPLACE FUNCTION ay_is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM ay_tenant_members
    WHERE tenant_id = p_tenant_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: ¿es master? (acceso global)
CREATE OR REPLACE FUNCTION ay_is_master()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM ay_tenant_members tm
    JOIN ay_tenants t ON t.id = tm.tenant_id
    WHERE tm.user_id = auth.uid() AND t.type = 'master'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Tenants: master ve todo, operador ve solo su tenant
DROP POLICY IF EXISTS ay_tenants_select ON ay_tenants;
CREATE POLICY ay_tenants_select ON ay_tenants FOR SELECT
  USING (ay_is_master() OR ay_is_tenant_member(id));

-- Tenant assets: igual
DROP POLICY IF EXISTS ay_tenant_assets_select ON ay_tenant_assets;
CREATE POLICY ay_tenant_assets_select ON ay_tenant_assets FOR SELECT
  USING (ay_is_master() OR ay_is_tenant_member(tenant_id));

-- Tenant members: igual
DROP POLICY IF EXISTS ay_tenant_members_select ON ay_tenant_members;
CREATE POLICY ay_tenant_members_select ON ay_tenant_members FOR SELECT
  USING (ay_is_master() OR ay_is_tenant_member(tenant_id));

-- B2B leads: solo master
DROP POLICY IF EXISTS ay_b2b_leads_select ON ay_b2b_leads;
CREATE POLICY ay_b2b_leads_select ON ay_b2b_leads FOR SELECT
  USING (ay_is_master());

-- B2B leads: cualquiera puede insertar (formulario público)
DROP POLICY IF EXISTS ay_b2b_leads_insert_anon ON ay_b2b_leads;
CREATE POLICY ay_b2b_leads_insert_anon ON ay_b2b_leads FOR INSERT
  WITH CHECK (true);

-- Audit: master ve todo, tenant ve lo suyo
DROP POLICY IF EXISTS ay_audit_log_select ON ay_audit_log;
CREATE POLICY ay_audit_log_select ON ay_audit_log FOR SELECT
  USING (ay_is_master() OR (tenant_id IS NOT NULL AND ay_is_tenant_member(tenant_id)));

-- ─── SEED master tenant ─────────────────────────────────────────────────────
INSERT INTO ay_tenants (type, name, slug, legal_name, country, city, status, billing_email)
VALUES ('master', 'ActivosYA', 'activosya', 'ActivosYA', 'PE', 'Lima', 'active', 'destinoya333@gmail.com')
ON CONFLICT (slug) DO NOTHING;
