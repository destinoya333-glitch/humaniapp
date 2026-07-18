# Ventana de Publicidad — ActivosYA / EcoDrive+

Panel único para **controlar la publicidad automatizada** en todas las redes y
**analizar la efectividad** de lo publicado, con interacción por el bot ActivosYA (WhatsApp).

Decisiones (2026-05-31, Percy):
- **Motor híbrido**: Publer publica (Fase 2); las **métricas** se jalan directo de Graph/TikTok/GA4.
- **Modo**: publicación requiere **aprobación por WhatsApp** antes de salir.
- **Fase 1 = REPORTE primero** (lo construido aquí). Publicación automática = Fase 2.

## Arquitectura (Fase 1 — construida)

| Pieza | Archivo |
|---|---|
| Esquema BD | `supabase/migrations/20260531_marketing_ventana.sql` |
| Motor métricas Meta (FB+IG) + score | `lib/marketing/meta.ts` |
| Capa de datos / queries del panel | `lib/marketing/db.ts` |
| Cron sync diario (8 UTC = 3am Lima) | `app/api/cron/marketing-sync/route.ts` |
| Cron reporte WhatsApp (lunes 13 UTC = 8am Lima) | `app/api/cron/marketing-report/route.ts` |
| **La Ventana** (panel) | `app/admin/marketing/page.tsx` → `/admin/marketing` |

Tablas: `marketing_posts`, `marketing_metricas`, `marketing_cuenta_diario`,
`marketing_credentials` (TikTok OAuth), `marketing_cola` (Fase 2).

**Score de efectividad** = `round( (likes + 3·coment + 5·compart + 4·guard) / max(alcance,1) · 1000 )`.
Pondera intención (guardar/compartir) por encima del like.

## Para que prenda (acción de Percy)

1. **Aplicar el SQL** en Supabase Dashboard (incógnito).
2. **Token Meta con insights**: en `business.facebook.com`, app *EcoDriveBot* (1619223319302965):
   - Asignar la Page EcoDrive+ y la cuenta IG como **activos** del System User.
   - Generar token con scopes: `pages_read_engagement`, `read_insights`,
     `pages_show_list`, `instagram_basic`, `instagram_manage_insights`, `business_management`.
   - Guardar en Vercel como **`ECODRIVE_MARKETING_TOKEN`** (NO tocar el de WhatsApp).
   - Opcional: `ECODRIVE_FB_PAGE_ID` y `ECODRIVE_IG_ID` (si no, se autodescubren).
3. Entrar a `/admin/marketing` (passcode `ECODRIVE_ADMIN_PASSCODE`) → **Sincronizar ahora**.

> El token actual del System User solo tiene scopes de WhatsApp
> (`whatsapp_business_*`, `public_profile`), por eso no puede leer insights.

## Pendientes

- **WhatsApp ventana 24h**: el reporte por texto libre solo llega si Percy escribió al bot
  en las últimas 24h. Para push garantizado → **template aprobado** (header con resumen).
- **TikTok**: OAuth ya pre-construido (`app/api/tiktok/oauth/callback`). Falta aprobar la app
  TikTok + setear `TIKTOK_CLIENT_KEY/SECRET/REDIRECT_URI` → métricas vía Business API.
- **GA4**: conectar service account + property id (Data API) para conversiones web.
- **Fase 2 — Publicación**: cola `marketing_cola` → genera copy con IA → te manda preview por
  WhatsApp → respondes ✅ → publica vía Publer API a la hora óptima (`mejorHora()`).
