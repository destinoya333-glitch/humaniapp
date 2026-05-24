-- EcoDrive+ admin config: tarifas, multiplicadores, comision
-- Tabla simple key->jsonb (1 fila por clave)

create table if not exists eco_admin_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Seed inicial: tarifas default
insert into eco_admin_config (key, value)
values (
  'tarifas',
  jsonb_build_object(
    'banderazo', 4.50,
    'por_km', 1.20,
    'por_min', 0.15,
    'minimo', 5.00,
    'tipos', jsonb_build_object(
      'estandar', jsonb_build_object('label', 'EcoEstandar', 'multiplicador', 1.0),
      'vip',      jsonb_build_object('label', 'EcoVIP',      'multiplicador', 1.4),
      'xl',       jsonb_build_object('label', 'EcoXL',       'multiplicador', 1.5),
      'auto_nuevo', jsonb_build_object('label', 'EcoAutoNuevo', 'multiplicador', 1.2)
    ),
    'hora_pico', jsonb_build_object(
      'enabled', false,
      'multiplicador', 1.25,
      'horas', jsonb_build_array('07:00-09:30', '17:30-20:00')
    ),
    'comision_pct', 6.3,
    'service_fee', 0.50
  )
)
on conflict (key) do nothing;

-- RLS off: solo service_role accede via API admin
alter table eco_admin_config disable row level security;
