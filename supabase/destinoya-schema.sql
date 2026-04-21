-- ═══════════════════════════════════════
-- DestinoYA — Schema v1
-- Migración desde Google Sheets
-- ═══════════════════════════════════════

-- Clientes
create table if not exists destinoya_clientes (
  id          uuid primary key default gen_random_uuid(),
  celular     text unique not null,
  nombre      text,
  created_at  timestamptz default now(),
  last_seen   timestamptz default now()
);

-- Lecturas / Consultas
create table if not exists destinoya_lecturas (
  id          uuid primary key default gen_random_uuid(),
  celular     text not null,
  lectura     text not null,
  servicio    text default 'lectura_mistica',
  created_at  timestamptz not null default now()
);

-- Pagos
create table if not exists destinoya_pagos (
  id          uuid primary key default gen_random_uuid(),
  celular     text not null,
  monto       numeric not null default 0,
  estado      text not null default 'esperando_pago', -- esperando_pago | pago_confirmado | lectura_entregada
  servicio    text,
  temas       text,
  operacion   text,
  nombre1     text,
  fecha1      text,
  nombre2     text,
  fecha2      text,
  created_at  timestamptz not null default now()
);

-- Planes / Suscripciones
create table if not exists destinoya_planes (
  id                uuid primary key default gen_random_uuid(),
  celular           text not null,
  plan              text not null default 'gratis', -- gratis | basico | premium | vip
  monto             numeric default 0,
  estado            text not null default 'activo', -- activo | usado | vencido
  fecha_inicio      timestamptz not null default now(),
  fecha_vencimiento timestamptz not null default now(),
  created_at        timestamptz default now()
);

-- ─── Row Level Security ───────────────
alter table destinoya_clientes  enable row level security;
alter table destinoya_lecturas  enable row level security;
alter table destinoya_pagos     enable row level security;
alter table destinoya_planes    enable row level security;

create policy "access all" on destinoya_clientes  for all using (true);
create policy "access all" on destinoya_lecturas  for all using (true);
create policy "access all" on destinoya_pagos     for all using (true);
create policy "access all" on destinoya_planes    for all using (true);
