-- ═══════════════════════════════════════
-- TuCuentoYa — Schema v1
-- 6to activo ActivosYA - aprobado 2026-05-10
-- ═══════════════════════════════════════

-- ─── Clientes ─────────────────────────────────
create table if not exists tci_clientes (
  id              uuid primary key default gen_random_uuid(),
  celular         text unique not null,
  nombre          text,
  nombre_papa     text,                          -- el adulto que pide (papá/mamá/abuelo)
  rol             text default 'papa',           -- papa | mama | abuelo | abuela | tio | otro
  nombres_hijos   jsonb default '[]'::jsonb,     -- [{nombre, edad, genero}, ...]
  plan            text default 'gratis',         -- gratis | suelto | estrella | magico
  wallet_balance  numeric default 0,             -- saldo en soles para descontar cuentos
  cuentos_bonus_restantes integer default 0,     -- cuentos bonus (recargas) no monetarios
  tenant_id       uuid,                          -- multi-tenant futuro (NULL = master)
  created_at      timestamptz default now(),
  last_seen       timestamptz default now()
);

-- ─── Conversaciones (máquina de estados) ──────
create table if not exists tci_conversaciones (
  celular       text primary key,
  estado        text default 'inicio',          -- inicio | recolectando | esperando_pago | generando | entregado
  contexto      jsonb default '{}'::jsonb,      -- {nombre_hijo, edad, escenario, personajes, duracion_min, ...}
  ultimo_mensaje_at timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── Pedidos / Cuentos ───────────────────────
create table if not exists tci_pedidos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references tci_clientes(id),
  celular         text not null,
  duracion_min    integer not null,            -- 2 | 3 | 5
  escenario       text,                        -- "bosque con lobo", "espacio", etc.
  personajes      jsonb default '[]'::jsonb,   -- [{nombre, rol_en_cuento, descripcion}]
  prompt_input    text,                        -- lo que escribió/dijo el cliente original
  claude_text     text,                        -- cuento generado en texto
  audio_url       text,                        -- URL pública del MP3
  pdf_url         text,                        -- URL del PDF ilustrado si add-on
  monto           numeric default 0,           -- precio cobrado
  fuente_pago     text,                        -- wallet | yape_directo | vip_estrella | vip_magico | bonus | gratis
  status          text default 'pendiente',    -- pendiente | pagado | generando | entregado | fallido
  rating_cliente  integer,                     -- 1-5 si cliente lo califica
  created_at      timestamptz default now(),
  entregado_at    timestamptz
);

-- ─── Métricas de generación (costo real) ─────
create table if not exists tci_cuentos_generados (
  id                  uuid primary key default gen_random_uuid(),
  pedido_id           uuid references tci_pedidos(id),
  prompt_used         text,
  claude_tokens_in    integer,
  claude_tokens_out   integer,
  azure_chars         integer,
  duracion_audio_seg  numeric,
  costo_real_usd      numeric,
  modelo_claude       text default 'claude-sonnet-4-6',
  voz_principal       text default 'es-PE-CamilaNeural',
  voz_secundaria      text default 'es-PE-AlexNeural',
  regeneraciones      integer default 0,
  created_at          timestamptz default now()
);

-- ─── VIP Suscripciones ───────────────────────
create table if not exists tci_vip (
  id                uuid primary key default gen_random_uuid(),
  celular           text not null,
  plan              text not null,             -- estrella_mensual | magico_mensual | estrella_anual | magico_anual
  cap_cuentos_mes   integer not null,          -- 20 estrella, 50 magico
  cuentos_used_mes  integer default 0,
  mes_reset_at      timestamptz default now(), -- cuándo se resetea el contador mensual
  fecha_inicio      timestamptz default now(),
  fecha_vencimiento timestamptz not null,
  activo            boolean default true,
  monto_pagado      numeric,
  yape_ref          text,
  hermanito_addon   boolean default false,     -- +S/9/mes second kid (gratis en Mágico)
  familia_grande    boolean default false,     -- +S/19/mes 3-5 niños
  created_at        timestamptz default now()
);

-- ─── Recargas Wallet ─────────────────────────
create table if not exists tci_recargas (
  id                  uuid primary key default gen_random_uuid(),
  celular             text not null,
  pack                text not null,           -- chica | media | grande | magica
  monto_pagado        numeric not null,        -- S/15 | 30 | 50 | 100
  bonus_cuentos       integer not null,        -- 1 | 2 | 5 | 12
  cuentos_equivalente integer not null,        -- 6 | 12 | 21 | 45 (total con bonus)
  yape_ref            text,
  captura_url         text,
  validado            boolean default false,
  created_at          timestamptz default now()
);

-- ─── Yape Pagos (verificación) ───────────────
create table if not exists tci_yape_pagos (
  id              uuid primary key default gen_random_uuid(),
  celular         text not null,
  concepto        text not null,               -- "suelto_3min" | "recarga_chica" | "vip_estrella_mensual" | ...
  pedido_id       uuid,
  recarga_id      uuid,
  vip_id          uuid,
  monto_esperado  numeric not null,
  monto_pagado    numeric,
  referencia      text,                        -- código operación Yape
  captura_url     text,                        -- imagen subida por cliente
  validado_por    text,                        -- "claude_vision" | "manual_admin"
  validado        boolean default false,
  motivo_rechazo  text,
  created_at      timestamptz default now()
);

-- ─── Saldo a favor (sobrepago) ───────────────
create table if not exists tci_saldo_movimientos (
  id          uuid primary key default gen_random_uuid(),
  celular     text not null,
  tipo        text not null,                   -- credito | debito
  monto       numeric not null,
  motivo      text,                            -- sobrepago | uso_cuento | ajuste_admin | promo_lanzamiento
  pedido_id   uuid,
  recarga_id  uuid,
  created_at  timestamptz default now()
);

-- ─── Add-ons solicitados (PDFs, música extra) ─
create table if not exists tci_addons (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid references tci_pedidos(id),
  celular     text not null,
  tipo        text not null,                   -- pdf_ilustrado | musica_personalizada | capitulo_continuacion
  precio      numeric not null,
  entregado   boolean default false,
  asset_url   text,
  created_at  timestamptz default now()
);

-- ─── Voces / Personajes recurrentes ──────────
-- Catálogo simple de personajes recurrentes (papá, mamá, hermano, mascota)
-- para reuso sin re-preguntar.
create table if not exists tci_personajes (
  id           uuid primary key default gen_random_uuid(),
  cliente_id   uuid references tci_clientes(id),
  nombre       text not null,
  rol          text,                           -- hijo | papa | mama | hermano | abuelo | mascota | otro
  edad         integer,
  genero       text,                           -- m | f | otro
  descripcion  text,                           -- "moreno, cabello rizado, le gustan los dinos"
  created_at   timestamptz default now()
);

-- ─── Sagas (cuentos en capítulos) ────────────
create table if not exists tci_sagas (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid references tci_clientes(id),
  titulo          text not null,               -- "Mateo y la aventura del bosque"
  personajes      jsonb,
  escenario_base  text,
  capitulos       integer default 1,
  ultimo_capitulo_id uuid,
  created_at      timestamptz default now()
);

-- ─── Promos / Cupones ────────────────────────
create table if not exists tci_promos (
  id              uuid primary key default gen_random_uuid(),
  celular         text,
  tipo            text not null,               -- primer_cuento_gratis | bonus_primera_recarga | cupon_descuento
  monto_bonus     numeric default 0,
  cuento_gratis   boolean default false,
  usado           boolean default false,
  fecha_otorgado  timestamptz default now(),
  fecha_uso       timestamptz,
  metadata        jsonb
);

-- ─── Índices ─────────────────────────────────
create index if not exists idx_tci_clientes_celular         on tci_clientes(celular);
create index if not exists idx_tci_clientes_tenant          on tci_clientes(tenant_id);
create index if not exists idx_tci_pedidos_celular          on tci_pedidos(celular);
create index if not exists idx_tci_pedidos_status           on tci_pedidos(status);
create index if not exists idx_tci_pedidos_created          on tci_pedidos(created_at desc);
create index if not exists idx_tci_vip_celular              on tci_vip(celular);
create index if not exists idx_tci_vip_activo               on tci_vip(activo) where activo = true;
create index if not exists idx_tci_recargas_celular         on tci_recargas(celular);
create index if not exists idx_tci_yape_celular             on tci_yape_pagos(celular);
create index if not exists idx_tci_yape_validado            on tci_yape_pagos(validado);
create index if not exists idx_tci_saldo_celular            on tci_saldo_movimientos(celular);
create index if not exists idx_tci_personajes_cliente       on tci_personajes(cliente_id);
create index if not exists idx_tci_sagas_cliente            on tci_sagas(cliente_id);
create index if not exists idx_tci_promos_celular           on tci_promos(celular);

-- ─── Row Level Security ──────────────────────
alter table tci_clientes            enable row level security;
alter table tci_conversaciones      enable row level security;
alter table tci_pedidos             enable row level security;
alter table tci_cuentos_generados   enable row level security;
alter table tci_vip                 enable row level security;
alter table tci_recargas            enable row level security;
alter table tci_yape_pagos          enable row level security;
alter table tci_saldo_movimientos   enable row level security;
alter table tci_addons              enable row level security;
alter table tci_personajes          enable row level security;
alter table tci_sagas               enable row level security;
alter table tci_promos              enable row level security;

create policy "access all" on tci_clientes            for all using (true);
create policy "access all" on tci_conversaciones      for all using (true);
create policy "access all" on tci_pedidos             for all using (true);
create policy "access all" on tci_cuentos_generados   for all using (true);
create policy "access all" on tci_vip                 for all using (true);
create policy "access all" on tci_recargas            for all using (true);
create policy "access all" on tci_yape_pagos          for all using (true);
create policy "access all" on tci_saldo_movimientos   for all using (true);
create policy "access all" on tci_addons              for all using (true);
create policy "access all" on tci_personajes          for all using (true);
create policy "access all" on tci_sagas               for all using (true);
create policy "access all" on tci_promos              for all using (true);

-- ─── Vistas útiles ───────────────────────────
create or replace view tci_vista_metricas_dia as
select
  date_trunc('day', created_at) as dia,
  count(*)                       as total_pedidos,
  count(*) filter (where status = 'entregado') as entregados,
  count(*) filter (where status = 'fallido')   as fallidos,
  sum(monto)                                  as ingresos_brutos,
  avg(duracion_min)                           as duracion_promedio
from tci_pedidos
group by 1
order by 1 desc;

create or replace view tci_vista_vip_activos as
select
  v.*,
  c.nombre_papa,
  c.nombres_hijos
from tci_vip v
join tci_clientes c on c.celular = v.celular
where v.activo = true
  and v.fecha_vencimiento > now();

-- ═══════════════════════════════════════
-- Fin schema TuCuentoYa v1
-- ═══════════════════════════════════════
