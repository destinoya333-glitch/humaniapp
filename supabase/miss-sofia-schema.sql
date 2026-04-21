-- ═══════════════════════════════════════
-- HumaniApp — Módulo Miss Sofia — Schema v1
-- Multi-tenant: cada academia es un tenant
-- ═══════════════════════════════════════

-- ─── TENANTS (cada academia de inglés) ──────────────────────────────────────

create table if not exists sofia_tenants (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,         -- ej: "humaniapp-sofia", "academia-karen"
  nombre_academia   text not null,                -- "HumaniApp English", "Academia Karen"
  nombre_profesora  text not null default 'Sofia', -- nombre de la IA profesora
  whatsapp_number   text not null,                -- número Twilio asignado
  yape_numero       text,
  yape_nombre       text,
  culqi_key         text,                         -- clave Culqi del tenant (opcional)
  metodologia       text default 'NAS',           -- NAS u otra
  activo            boolean default true,
  plan              text default 'starter',       -- starter | pro | enterprise
  -- Precios propios por tenant (en USD)
  precio_basico     numeric default 45,           -- A1->A2 pago único
  precio_intermedio numeric default 75,           -- B1->B2 pago único
  precio_avanzado   numeric default 140,          -- C1->C2 pago único
  precio_completo   numeric default 220,          -- completo pago único
  created_at        timestamptz default now()
);

-- ─── ALUMNOS ────────────────────────────────────────────────────────────────

create table if not exists sofia_alumnos (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references sofia_tenants(id) on delete cascade,
  telefono        text not null,
  nombre          text,
  email           text,
  nivel_detectado text check (nivel_detectado in ('A1','A2','B1','B2','C1','C2')),
  nivel_actual    text check (nivel_actual in ('A1','A2','B1','B2','C1','C2')),
  plan_activo     text check (plan_activo in ('basico','intermedio','avanzado','completo')),
  semana_actual   int default 1,
  estado          text default 'prospecto'
                    check (estado in ('prospecto','test_pendiente','test_completado','pagado','activo','pausado','completado')),
  created_at      timestamptz default now(),
  unique(tenant_id, telefono)
);

-- ─── TEST DE NIVEL ───────────────────────────────────────────────────────────

create table if not exists sofia_tests (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references sofia_tenants(id) on delete cascade,
  alumno_id   uuid references sofia_alumnos(id) on delete cascade,
  respuestas  jsonb default '[]',               -- array de {pregunta, respuesta, correcto}
  puntaje     int,                              -- 0-100
  nivel_resultado text,                         -- nivel detectado
  completado  boolean default false,
  created_at  timestamptz default now()
);

-- ─── PAGOS ──────────────────────────────────────────────────────────────────

create table if not exists sofia_pagos (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references sofia_tenants(id) on delete cascade,
  alumno_id     uuid references sofia_alumnos(id) on delete cascade,
  plan          text not null,
  monto_usd     numeric not null,
  monto_pen     numeric,                        -- equivalente en soles
  metodo        text check (metodo in ('yape','culqi','stripe')),
  estado        text default 'pendiente' check (estado in ('pendiente','confirmado','fallido')),
  referencia    text,
  created_at    timestamptz default now()
);

-- ─── SESIONES DE CLASE ───────────────────────────────────────────────────────

create table if not exists sofia_sesiones (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references sofia_tenants(id) on delete cascade,
  alumno_id   uuid references sofia_alumnos(id) on delete cascade,
  semana      int not null,
  tema        text not null,                    -- tema de la semana
  completada  boolean default false,
  fecha       timestamptz,
  created_at  timestamptz default now()
);

-- ─── CONVERSACIONES WHATSAPP ─────────────────────────────────────────────────

create table if not exists sofia_conversaciones (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references sofia_tenants(id) on delete cascade,
  telefono    text not null,
  alumno_id   uuid references sofia_alumnos(id),
  estado_chat text default 'inicio',
  messages    jsonb default '[]',
  updated_at  timestamptz default now(),
  created_at  timestamptz default now(),
  unique(tenant_id, telefono)
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

alter table sofia_tenants        enable row level security;
alter table sofia_alumnos        enable row level security;
alter table sofia_tests          enable row level security;
alter table sofia_pagos          enable row level security;
alter table sofia_sesiones       enable row level security;
alter table sofia_conversaciones enable row level security;

create policy "service access" on sofia_tenants        for all using (true);
create policy "service access" on sofia_alumnos        for all using (true);
create policy "service access" on sofia_tests          for all using (true);
create policy "service access" on sofia_pagos          for all using (true);
create policy "service access" on sofia_sesiones       for all using (true);
create policy "service access" on sofia_conversaciones for all using (true);

-- ─── TENANT PILOTO (HumaniApp propia) ────────────────────────────────────────

insert into sofia_tenants (
  slug, nombre_academia, nombre_profesora, whatsapp_number,
  yape_numero, yape_nombre,
  precio_basico, precio_intermedio, precio_avanzado, precio_completo
) values (
  'humaniapp-sofia', 'HumaniApp English', 'Sofia', '+12182315961',
  '998102258', 'Percy Roj*',
  45, 75, 140, 220
) on conflict (slug) do nothing;
