-- 20260530 — Registrar pendiente migracion RN+Expo+EAS en ecodrive_pendientes
-- Aplicar en dashboard Supabase EN INCOGNITO despues de 20260530_ecodrive_pendientes.sql

insert into ecodrive_pendientes (
  key, titulo, descripcion, prioridad, bloqueante_cuando, archivos_clave, memoria_slug, doc_path
) values (
  'migracion_rn_expo_eas',
  'Migrar apps chofer y pasajero de Capacitor+Ionic a RN + Expo SDK 56 + EAS',
  'DECISION Percy 2026-05-30: migrar ambas apps moviles de Capacitor+Ionic a React Native + Expo SDK 56 estable + EAS Build/Update/Submit. Beneficios: OTA updates (EAS Update), performance nativa, builds en cloud (no Mac requerido para iOS), startup mas rapido con Hermes, push notifs simplificadas, mejor background GPS para chofer. Coexistencia: apps/chofer y apps/pasajero (Capacitor) se mantienen en prod hasta que apps/chofer-expo y apps/pasajero-expo pasen QA + submit. Despues archivar en apps/_legacy/. Duracion estimada 3-6 semanas. Plan completo: ecodrive-monorepo/docs/MIGRATION_RN_EXPO.md.',
  'alta',
  'Decidir despues del primer convenio firmado con caja financiera y/o cuando se planee lanzamiento regional masivo (Lima/Piura)',
  array[
    'ecodrive-monorepo/apps/chofer-expo/',
    'ecodrive-monorepo/apps/pasajero-expo/',
    'ecodrive-monorepo/docs/MIGRATION_RN_EXPO.md',
    'ecodrive-monorepo/DECISIONS.md',
    'ecodrive-monorepo/CLAUDE.md',
    'ecodrive-monorepo/packages/shared-ui-mobile/'
  ],
  'ecodrive_migracion_rn_expo_eas',
  'ecodrive-monorepo/docs/MIGRATION_RN_EXPO.md'
)
on conflict (key) do update set
  titulo = excluded.titulo,
  descripcion = excluded.descripcion,
  prioridad = excluded.prioridad,
  bloqueante_cuando = excluded.bloqueante_cuando,
  archivos_clave = excluded.archivos_clave,
  memoria_slug = excluded.memoria_slug,
  doc_path = excluded.doc_path;
