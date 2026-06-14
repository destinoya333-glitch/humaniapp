-- ═══════════════════════════════════════
-- TuDramaYa — Schema v1
-- Activo ActivosYA · micro-dramas verticales (PWA web + cobro Yape/Culqi)
-- Identidad: Supabase Auth (user_id). Cobro reusa el motor existente.
-- Precios: cap S/1 · pack 5 caps S/3.30 · serie completa S/12
-- ═══════════════════════════════════════

-- ─── Series (catálogo de dramas) ──────────────
create table if not exists tdy_series (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,            -- "casada-con-un-don-nadie"
  titulo        text not null,
  sinopsis      text,
  portada_url   text,                            -- póster vertical 1080x1920
  total_caps    integer default 0,               -- total planificado (ej. 63)
  caps_gratis   integer default 3,               -- cuántos caps son gratis (anzuelo)
  precio_cap    numeric default 1.0,             -- S/ por capítulo suelto
  precio_pack5  numeric default 3.30,            -- S/ por pack de 5 caps
  precio_full   numeric default 12.0,            -- S/ por la serie completa
  estado        text default 'activo',           -- activo | borrador | archivado
  created_at    timestamptz default now()
);

-- ─── Episodios ────────────────────────────────
create table if not exists tdy_episodios (
  id            uuid primary key default gen_random_uuid(),
  serie_id      uuid references tdy_series(id) on delete cascade,
  numero        integer not null,                -- 1, 2, 3, ...
  titulo        text,
  sinopsis      text,
  video_url     text,                            -- URL de streaming (Bunny Stream)
  miniatura_url text,                            -- portada del cap
  duracion_seg  numeric,
  gratis        boolean default false,           -- true = visible sin pago
  publicado     boolean default true,
  created_at    timestamptz default now(),
  unique (serie_id, numero)
);

-- ─── Perfil del usuario en TuDramaYa ──────────
-- Liga la cuenta Supabase Auth con su celular (clave para casar pagos Yape).
create table if not exists tdy_usuarios (
  user_id       uuid primary key,                -- = auth.users.id (Supabase Auth)
  celular       text,                            -- para casar el Yape/MacroDroid
  nombre        text,
  created_at    timestamptz default now(),
  last_seen     timestamptz default now()
);
create index if not exists idx_tdy_usuarios_celular on tdy_usuarios(celular);

-- ─── Pagos (Culqi tarjeta · Yape captura · MacroDroid) ──
create table if not exists tdy_pagos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,                           -- auth.users.id (puede ser null si pago anónimo)
  celular        text,                           -- para casar Yape entrante
  serie_id       uuid references tdy_series(id),
  tier           text not null,                  -- cap | pack5 | completo
  episodio       integer,                        -- nº de cap si tier=cap
  monto_esperado numeric not null,               -- 1.00 | 3.30 | 12.00
  monto_pagado   numeric default 0,
  metodo         text,                           -- culqi | yape | macrodroid
  estado         text default 'pendiente',       -- pendiente | validado | rechazado
  referencia     text,                           -- nº operación Yape / charge_id Culqi
  captura_url    text,                           -- captura Yape (si aplica)
  validado_por   text,                           -- culqi | claude_vision | macrodroid | manual_admin
  validado       boolean default false,
  validado_at    timestamptz,
  metadata       jsonb default '{}'::jsonb,
  created_at     timestamptz default now()
);
create index if not exists idx_tdy_pagos_celular   on tdy_pagos(celular);
create index if not exists idx_tdy_pagos_estado    on tdy_pagos(estado);
create index if not exists idx_tdy_pagos_user      on tdy_pagos(user_id);
create index if not exists idx_tdy_pagos_ref       on tdy_pagos(referencia);
create index if not exists idx_tdy_pagos_pendiente on tdy_pagos(estado, monto_esperado) where estado = 'pendiente';

-- ─── Accesos (qué episodios desbloqueó el usuario) ──
-- Regla de lectura: el usuario puede ver el cap N de una serie si existe una fila
-- con alcance='serie'  (todos)  ó  (N entre episodio_desde y episodio_hasta).
create table if not exists tdy_accesos (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null,                  -- auth.users.id
  serie_id       uuid references tdy_series(id),
  alcance        text not null,                  -- cap | pack | serie
  episodio_desde integer,                        -- nulo si alcance=serie
  episodio_hasta integer,                        -- nulo si alcance=serie
  origen         text,                           -- culqi | yape | macrodroid | cortesia | promo
  pago_id        uuid references tdy_pagos(id),
  created_at     timestamptz default now()
);
create index if not exists idx_tdy_accesos_user  on tdy_accesos(user_id);
create index if not exists idx_tdy_accesos_serie on tdy_accesos(serie_id);

-- ─── Eventos (métricas de validación: vistas / retención) ──
create table if not exists tdy_eventos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid,
  episodio_id  uuid references tdy_episodios(id),
  tipo         text not null,                    -- play | complete | compartir | paywall_visto | checkout_iniciado
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);
create index if not exists idx_tdy_eventos_tipo on tdy_eventos(tipo);
create index if not exists idx_tdy_eventos_ep   on tdy_eventos(episodio_id);

-- ─── Row Level Security ──────────────────────
-- Catálogo: lectura pública. Datos de usuario: cada quien ve lo suyo.
-- (El service-role del backend ignora RLS y hace las escrituras de pago.)
alter table tdy_series     enable row level security;
alter table tdy_episodios  enable row level security;
alter table tdy_usuarios   enable row level security;
alter table tdy_pagos      enable row level security;
alter table tdy_accesos    enable row level security;
alter table tdy_eventos    enable row level security;

-- catálogo público (solo lectura)
create policy "tdy_series_read"    on tdy_series    for select using (true);
create policy "tdy_episodios_read" on tdy_episodios for select using (true);

-- datos del usuario: solo el dueño los ve
create policy "tdy_usuarios_own" on tdy_usuarios for select using (auth.uid() = user_id);
create policy "tdy_pagos_own"    on tdy_pagos    for select using (auth.uid() = user_id);
create policy "tdy_accesos_own"  on tdy_accesos  for select using (auth.uid() = user_id);
create policy "tdy_eventos_own"  on tdy_eventos  for all    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Vistas útiles ───────────────────────────
-- Ingresos por día
create or replace view tdy_vista_ventas_dia as
select
  date_trunc('day', created_at) as dia,
  count(*)                                          as total_pagos,
  count(*) filter (where validado)                 as validados,
  sum(monto_pagado) filter (where validado)        as ingresos_pen,
  count(*) filter (where tier = 'completo' and validado) as ventas_full
from tdy_pagos
group by 1
order by 1 desc;

-- Retención por episodio (señal de validación del piloto)
create or replace view tdy_vista_retencion_ep as
select
  e.serie_id,
  e.numero,
  e.titulo,
  count(*) filter (where ev.tipo = 'play')     as plays,
  count(*) filter (where ev.tipo = 'complete') as completes,
  case when count(*) filter (where ev.tipo = 'play') > 0
    then round(100.0 * count(*) filter (where ev.tipo = 'complete')
              / count(*) filter (where ev.tipo = 'play'), 1)
    else 0 end                                  as pct_retencion
from tdy_episodios e
left join tdy_eventos ev on ev.episodio_id = e.id
group by e.serie_id, e.numero, e.titulo
order by e.numero;

-- ═══════════════════════════════════════
-- SEED — Serie piloto "Casada con un Don Nadie"
-- (video_url/miniatura_url se llenan tras subir a Bunny Stream)
-- ═══════════════════════════════════════
insert into tdy_series (slug, titulo, sinopsis, total_caps, caps_gratis)
values (
  'casada-con-un-don-nadie',
  'Casada con un Don Nadie',
  'Valentina es obligada a casarse con Adrián, el "fracasado" al que todos desprecian. Nadie sabe que él es el heredero secreto del Grupo Castellano.',
  63, 3
)
on conflict (slug) do nothing;

insert into tdy_episodios (serie_id, numero, titulo, gratis)
select s.id, v.numero, v.titulo, v.numero <= 3
from tdy_series s,
  (values
    (1, 'La boda de la vergüenza'),
    (2, 'La primera noche'),
    (3, 'El dueño regresa'),
    (4, 'La guerra por el imperio')
  ) as v(numero, titulo)
where s.slug = 'casada-con-un-don-nadie'
on conflict (serie_id, numero) do nothing;

-- ═══════════════════════════════════════
-- Fin schema TuDramaYa v1
-- ═══════════════════════════════════════
