-- ═══════════════════════════════════════
-- DestinoYA — Schema v2 (extensión)
-- NO toca tablas existentes, solo agrega
-- ═══════════════════════════════════════

-- Conversaciones (historial chat por celular)
create table if not exists destinoya_conversaciones (
  id          uuid primary key default gen_random_uuid(),
  celular     text unique not null,
  estado      text default 'inicial', -- inicial | esperando_pago | esperando_consulta | activo
  servicio_actual text,                -- servicio_1 | servicio_2 | servicio_3 | vip | gratis
  plan_actual text,                    -- basico | intermedio | premium | pro | vip_mensual | vip_anual
  pago_id     uuid,
  messages    jsonb default '[]'::jsonb,
  updated_at  timestamptz default now()
);

-- Documentos de sustento (Servicio 2 Profesional)
create table if not exists destinoya_documentos (
  id          uuid primary key default gen_random_uuid(),
  celular     text not null,
  pago_id     uuid,
  tipo        text,        -- imagen | pdf | texto
  url         text,
  contenido   text,        -- OCR extraído o texto crudo
  created_at  timestamptz default now()
);

-- VIP Clientes (tabla separada para rapidez)
create table if not exists destinoya_vip (
  id                uuid primary key default gen_random_uuid(),
  celular           text unique not null,
  plan              text not null,    -- mensual | anual
  fecha_inicio      timestamptz not null default now(),
  fecha_vencimiento timestamptz not null,
  activo            boolean default true,
  created_at        timestamptz default now()
);

-- Lectura gratuita usada (tracking)
create table if not exists destinoya_lectura_gratuita (
  id          uuid primary key default gen_random_uuid(),
  celular     text unique not null,
  usada_en    timestamptz default now()
);

-- Reconsultas (limites por plan)
create table if not exists destinoya_reconsultas (
  id          uuid primary key default gen_random_uuid(),
  celular     text not null,
  pago_id     uuid not null,
  servicio    text,
  pregunta    text,
  respuesta   text,
  created_at  timestamptz default now()
);

-- Indices
create index if not exists idx_destconv_celular on destinoya_conversaciones(celular);
create index if not exists idx_destdocs_celular on destinoya_documentos(celular);
create index if not exists idx_destvip_celular on destinoya_vip(celular);
create index if not exists idx_destrec_pago on destinoya_reconsultas(pago_id);

-- RLS
alter table destinoya_conversaciones    enable row level security;
alter table destinoya_documentos        enable row level security;
alter table destinoya_vip               enable row level security;
alter table destinoya_lectura_gratuita  enable row level security;
alter table destinoya_reconsultas       enable row level security;

create policy "access all" on destinoya_conversaciones    for all using (true);
create policy "access all" on destinoya_documentos        for all using (true);
create policy "access all" on destinoya_vip               for all using (true);
create policy "access all" on destinoya_lectura_gratuita  for all using (true);
create policy "access all" on destinoya_reconsultas       for all using (true);
