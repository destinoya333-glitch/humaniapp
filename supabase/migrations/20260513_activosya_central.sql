-- ════════════════════════════════════════════════════════════════
-- ActivosYA Central — Centro de comando + B2B sales
-- 2026-05-13
-- ════════════════════════════════════════════════════════════════

-- Eventos cross-bot (notifs que llegan a Percy via ActivosYA bot)
CREATE TABLE IF NOT EXISTS public.ay_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN (
    'yape_confirmado','cliente_nuevo','error_bot','lead_b2b',
    'cuento_generado','consulta_vip','plan_activado','plan_renovado',
    'plan_vencido','referido','feedback'
  )),
  servicio text NOT NULL CHECK (servicio IN (
    'destinoya','sofia','cuento','ecodrive','choferya','activosya','sistema'
  )),
  monto numeric(10,2),
  cliente_phone text,
  cliente_nombre text,
  detalle jsonb DEFAULT '{}'::jsonb,
  mensaje_corto text,
  notificado boolean DEFAULT false,
  notificado_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ay_eventos_tipo_fecha
  ON public.ay_eventos (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ay_eventos_servicio_fecha
  ON public.ay_eventos (servicio, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ay_eventos_pendientes
  ON public.ay_eventos (notificado, created_at)
  WHERE notificado = false;

-- Leads B2B (emprendedores que quieren alquilar franquicia)
CREATE TABLE IF NOT EXISTS public.ay_leads_b2b (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  nombre text,
  ciudad text,
  capital_disponible numeric(10,2),
  servicio_interes text CHECK (servicio_interes IN (
    'sofia','destinoya','cuento','ecodrive','choferya','varios'
  )),
  plan_interes text CHECK (plan_interes IN ('local','comunidad','lider','vip','custom')),
  estado text DEFAULT 'nuevo' CHECK (estado IN (
    'nuevo','en_conversacion','pidio_llamada','propuesta_enviada',
    'cerro_renta','no_interesado','perdido'
  )),
  fuente text DEFAULT 'wa_directo',
  notas text,
  yapeo boolean DEFAULT false,
  monto_renta_mensual numeric(10,2),
  chat_data jsonb DEFAULT '{}'::jsonb,
  chat_messages jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ay_leads_b2b_estado
  ON public.ay_leads_b2b (estado, created_at DESC);

-- KPI snapshots (calculados por cron diario para queries rapidos)
CREATE TABLE IF NOT EXISTS public.ay_kpi_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  servicio text NOT NULL,
  ingresos_dia numeric(10,2) DEFAULT 0,
  clientes_nuevos int DEFAULT 0,
  pagos_count int DEFAULT 0,
  errores_count int DEFAULT 0,
  detalle jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fecha, servicio)
);

CREATE INDEX IF NOT EXISTS idx_ay_kpi_fecha
  ON public.ay_kpi_snapshots (fecha DESC, servicio);

-- Estado de conversación del bot ActivosYA con cada usuario
CREATE TABLE IF NOT EXISTS public.ay_conv (
  phone text PRIMARY KEY,
  modo text DEFAULT 'b2b' CHECK (modo IN ('ceo','b2b','soporte')),
  estado text DEFAULT 'nuevo',
  chat_data jsonb DEFAULT '{}'::jsonb,
  chat_messages jsonb DEFAULT '[]'::jsonb,
  ultimo_mensaje_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ay_conv_actividad
  ON public.ay_conv (ultimo_mensaje_at DESC);

COMMENT ON TABLE public.ay_eventos IS
  'Eventos de TODOS los bots (Destino/Sofia/Cuento/Eco/ChoferYa) — el bot ActivosYA notifica a Percy';
COMMENT ON TABLE public.ay_leads_b2b IS
  'Emprendedores interesados en alquilar franquicia ActivosYA';
COMMENT ON TABLE public.ay_kpi_snapshots IS
  'Métricas diarias por servicio (calculadas por cron)';
COMMENT ON TABLE public.ay_conv IS
  'Conversación del bot ActivosYA con cada usuario (CEO mode si es Percy, B2B si es prospect)';
