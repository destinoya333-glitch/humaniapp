-- =====================================================================
-- VENTANA DE PUBLICIDAD — esquema base (Fase 1: análisis de efectividad)
-- Aplicar en Supabase Dashboard EN INCÓGNITO (regla bug removeChild Chrome).
-- Idempotente: se puede correr varias veces sin romper nada.
-- =====================================================================

-- 1) Catálogo de publicaciones detectadas en cada red ------------------
create table if not exists marketing_posts (
  uid          uuid primary key default gen_random_uuid(),
  red          text not null check (red in ('facebook','instagram','tiktok')),
  post_id      text not null,                 -- id nativo en la red
  marca        text not null default 'ecodrive',
  tipo         text,                          -- post | photo | video | reel | story | carousel
  permalink    text,
  caption      text,
  thumbnail_url text,
  publicado_at timestamptz,
  raw          jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (red, post_id)
);
create index if not exists idx_mkt_posts_pub on marketing_posts (publicado_at desc);
create index if not exists idx_mkt_posts_marca on marketing_posts (marca, red);

-- 2) Snapshot diario de métricas por publicación ----------------------
-- Una fila por (post, día). El cron re-escribe la fila del día (upsert).
create table if not exists marketing_metricas (
  id           bigserial primary key,
  post_uid     uuid not null references marketing_posts(uid) on delete cascade,
  fecha        date not null,
  alcance      integer not null default 0,
  impresiones  integer not null default 0,
  likes        integer not null default 0,
  comentarios  integer not null default 0,
  compartidos  integer not null default 0,
  guardados    integer not null default 0,
  clics        integer not null default 0,
  video_views  integer not null default 0,
  engagement   integer not null default 0,   -- likes + 3*coment + 5*compart + 4*guard
  engagement_rate numeric(8,4) not null default 0, -- engagement / max(alcance,1)
  score        integer not null default 0,   -- round(engagement_rate * 1000)
  raw          jsonb not null default '{}'::jsonb,
  captured_at  timestamptz not null default now(),
  unique (post_uid, fecha)
);
create index if not exists idx_mkt_met_post on marketing_metricas (post_uid, fecha desc);
create index if not exists idx_mkt_met_score on marketing_metricas (score desc);

-- 3) Snapshot diario a nivel de cuenta (followers / alcance página) ----
create table if not exists marketing_cuenta_diario (
  id          bigserial primary key,
  red         text not null,
  marca       text not null default 'ecodrive',
  fecha       date not null,
  seguidores  integer,
  alcance     integer,
  impresiones integer,
  raw         jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  unique (red, marca, fecha)
);

-- 4) Credenciales OAuth de redes (TikTok, etc.) — ya la usa el callback -
create table if not exists marketing_credentials (
  red           text primary key,            -- 'tiktok' | 'facebook' | 'instagram'
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  meta          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- 5) Cola de publicación (Fase 2 — publicar con aprobación por WhatsApp)-
create table if not exists marketing_cola (
  id           bigserial primary key,
  marca        text not null default 'ecodrive',
  redes        text[] not null default '{}',   -- ['facebook','instagram','tiktok']
  caption      text,
  media_url    text,
  estado       text not null default 'borrador'
                 check (estado in ('borrador','pendiente_aprobacion','aprobado','publicado','rechazado','error')),
  programado_para timestamptz,
  aprobado_por text,
  publicado_ids jsonb not null default '{}'::jsonb, -- {facebook: id, instagram: id}
  creado_por   text default 'ia',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_mkt_cola_estado on marketing_cola (estado, programado_para);
