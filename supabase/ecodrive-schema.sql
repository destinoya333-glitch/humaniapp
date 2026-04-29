-- ═══════════════════════════════════════
-- EcoDrive+ — Schema MVP
-- Rideshare WhatsApp Trujillo
-- Multi-rol: un mismo celular puede ser passenger Y driver.
-- ═══════════════════════════════════════

-- Users (perfil base con multi-rol)
create table if not exists ecodrive_users (
  id          uuid primary key default gen_random_uuid(),
  celular     text unique not null,
  nombre      text,
  roles       text[] not null default array['passenger']::text[],
  status      text not null default 'active', -- active | suspended | banned
  city        text default 'Trujillo',
  created_at  timestamptz default now(),
  last_seen   timestamptz default now()
);

-- Driver profile (existe si user tiene rol 'driver')
create table if not exists ecodrive_drivers (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references ecodrive_users(id) on delete cascade,
  celular                  text unique not null,
  dni                      text,
  reniec_verified          boolean default false,
  vehicle_type             text not null,            -- auto | moto | mototaxi
  vehicle_brand            text,
  vehicle_model            text,
  vehicle_plate            text not null,
  vehicle_year             int,
  vehicle_color            text,
  modes_supported          text[] default array[]::text[], -- regular, eco, express, mujer, familia, mascotas, abuelo, empresa
  status                   text not null default 'pending', -- pending | approved | rejected | suspended
  approved_at              timestamptz,
  total_trips              int default 0,
  rating_avg               numeric(3,2) default 0,
  current_lat              numeric(10,7),
  current_lng              numeric(10,7),
  current_location_at      timestamptz,
  online                   boolean default false,
  created_at               timestamptz default now()
);

-- Passenger profile
create table if not exists ecodrive_passengers (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references ecodrive_users(id) on delete cascade,
  celular                  text unique not null,
  default_mode             text default 'regular',
  emergency_contact_name   text,
  emergency_contact_phone  text,
  total_trips              int default 0,
  rating_avg               numeric(3,2) default 0,
  legacy_imported          boolean default false,    -- de los 231 clientes legacy
  created_at               timestamptz default now()
);

-- Solicitudes de viaje (pasajero pidiendo)
create table if not exists ecodrive_trip_requests (
  id                  uuid primary key default gen_random_uuid(),
  passenger_celular   text not null,
  origin_lat          numeric(10,7),
  origin_lng          numeric(10,7),
  origin_address      text,
  destination_lat     numeric(10,7),
  destination_lng     numeric(10,7),
  destination_address text,
  distance_km         numeric(5,2),
  mode                text not null default 'regular',
  passenger_offer     numeric(8,2),                  -- precio que sugiere el pasajero
  status              text not null default 'open',  -- open | matched | cancelled | expired
  matched_offer_id    uuid,
  created_at          timestamptz default now(),
  expires_at          timestamptz default now() + interval '3 minutes'
);

-- Ofertas de choferes
create table if not exists ecodrive_trip_offers (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references ecodrive_trip_requests(id) on delete cascade,
  driver_celular  text not null,
  price           numeric(8,2) not null,
  eta_minutes     int,
  status          text not null default 'pending',   -- pending | accepted | rejected | expired
  created_at      timestamptz default now()
);

-- Viajes confirmados
create table if not exists ecodrive_trips (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid references ecodrive_trip_requests(id),
  offer_id           uuid references ecodrive_trip_offers(id),
  passenger_celular  text not null,
  driver_celular     text not null,
  origin_address     text,
  destination_address text,
  distance_km        numeric(5,2),
  mode               text,
  price              numeric(8,2) not null,
  commission_pct     numeric(4,2) default 6.30,
  driver_earning     numeric(8,2),
  status             text not null default 'pickup_pending', -- pickup_pending | in_progress | completed | cancelled
  started_at         timestamptz,
  completed_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text,
  payment_method     text default 'wallet',          -- wallet | cash | yape
  created_at         timestamptz default now()
);

-- Wallet (saldo del celular, sirve para pasajero o chofer)
create table if not exists ecodrive_wallet (
  id          uuid primary key default gen_random_uuid(),
  celular     text unique not null,
  balance     numeric(10,2) not null default 0,
  updated_at  timestamptz default now()
);

-- Movimientos wallet
create table if not exists ecodrive_wallet_transactions (
  id              uuid primary key default gen_random_uuid(),
  celular         text not null,
  type            text not null,                     -- credit | debit
  amount          numeric(10,2) not null,
  reason          text not null,                     -- bono_inicial, viaje_pasajero, viaje_chofer, retiro_yape, recarga_yape, comision, cashback, referido
  trip_id         uuid references ecodrive_trips(id),
  reference       text,                              -- nro operación Yape, etc.
  balance_after   numeric(10,2),
  created_at      timestamptz default now()
);

-- Calificaciones bidireccionales
create table if not exists ecodrive_ratings (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references ecodrive_trips(id) on delete cascade,
  rater_celular   text not null,
  rated_celular   text not null,
  stars           int not null check (stars between 1 and 5),
  comment         text,
  created_at      timestamptz default now()
);

-- Conversaciones WhatsApp (historial para contexto Claude)
create table if not exists ecodrive_conversations (
  id          uuid primary key default gen_random_uuid(),
  celular     text unique not null,
  messages    jsonb not null default '[]'::jsonb,
  state       jsonb default '{}'::jsonb,             -- máquina de estado: en_pickup, evaluando_ofertas, etc.
  updated_at  timestamptz default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────
create index if not exists ecodrive_drivers_celular_idx           on ecodrive_drivers(celular);
create index if not exists ecodrive_drivers_online_idx            on ecodrive_drivers(online) where online = true;
create index if not exists ecodrive_passengers_celular_idx        on ecodrive_passengers(celular);
create index if not exists ecodrive_trip_requests_open_idx        on ecodrive_trip_requests(status) where status = 'open';
create index if not exists ecodrive_trip_requests_passenger_idx   on ecodrive_trip_requests(passenger_celular);
create index if not exists ecodrive_trip_offers_request_idx       on ecodrive_trip_offers(request_id);
create index if not exists ecodrive_trips_passenger_idx           on ecodrive_trips(passenger_celular);
create index if not exists ecodrive_trips_driver_idx              on ecodrive_trips(driver_celular);
create index if not exists ecodrive_wallet_tx_celular_idx         on ecodrive_wallet_transactions(celular);
create index if not exists ecodrive_conversations_celular_idx     on ecodrive_conversations(celular);

-- ─── Row Level Security (gestión vía service role key) ─────────────────────
alter table ecodrive_users                enable row level security;
alter table ecodrive_drivers              enable row level security;
alter table ecodrive_passengers           enable row level security;
alter table ecodrive_trip_requests        enable row level security;
alter table ecodrive_trip_offers          enable row level security;
alter table ecodrive_trips                enable row level security;
alter table ecodrive_wallet               enable row level security;
alter table ecodrive_wallet_transactions  enable row level security;
alter table ecodrive_ratings              enable row level security;
alter table ecodrive_conversations        enable row level security;

create policy "access all" on ecodrive_users                for all using (true);
create policy "access all" on ecodrive_drivers              for all using (true);
create policy "access all" on ecodrive_passengers           for all using (true);
create policy "access all" on ecodrive_trip_requests        for all using (true);
create policy "access all" on ecodrive_trip_offers          for all using (true);
create policy "access all" on ecodrive_trips                for all using (true);
create policy "access all" on ecodrive_wallet               for all using (true);
create policy "access all" on ecodrive_wallet_transactions  for all using (true);
create policy "access all" on ecodrive_ratings              for all using (true);
create policy "access all" on ecodrive_conversations        for all using (true);
