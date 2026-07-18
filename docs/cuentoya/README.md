# TuCuentoYa — Documentación

Cuentos infantiles personalizados por audio IA · 6to activo de ActivosYA.

## 📂 Documentos

| Archivo | Contenido |
|---|---|
| [SETUP.md](./SETUP.md) | **Empieza aquí.** Setup paso a paso de infra (Azure, Meta, DNS, env vars). |
| [META_TEMPLATES.md](./META_TEMPLATES.md) | Los 5 templates Meta WhatsApp listos para subir en Business Manager. |
| [MARKETING_COPY.md](./MARKETING_COPY.md) | Reels, posts FB/IG/TikTok, Meta Ads copy listos. |

## 🚀 Quick start

1. Lee `SETUP.md` completo
2. Aplica migración SQL: `supabase/migrations/20260511_cuentoinfantil_schema.sql`
3. Crea cuenta Azure Speech Service + saca key
4. Compra chip celular + registra en Meta WABA EcoDriveBot
5. Crea templates Meta (24-48h aprobación) — usa copy de `META_TEMPLATES.md`
6. DNS `cuento.activosya.com` → Vercel CNAME
7. Env vars Vercel (lista completa en `SETUP.md`)
8. Configura webhook Meta → `https://activosya.com/api/whatsapp/cuento-meta`
9. Smoke test end-to-end
10. Lanza promo "primer cuento gratis" + post inicial Marketing

## 🏗️ Arquitectura

```
WhatsApp Meta Cloud (chip +51 9XX XXX XXX)
   ↓ webhook
app/api/whatsapp/cuento-meta/route.ts
   ↓
lib/cuentoinfantil/
  ├── agent.ts         (máquina de estados conversación)
  ├── prompts.ts       (system prompts Claude)
  ├── generator.ts     (orquestador Claude → Azure → Storage)
  ├── azure-tts.ts     (síntesis voz peruana)
  ├── audio-mixer.ts   (ffmpeg mezcla música ambient — opcional)
  ├── wallet.ts        (recargas + bonus + débito)
  ├── yape-verify.ts   (Claude Vision verifica captura Yape)
  ├── safety.ts        (filtro contenido infantil pre+post Claude)
  ├── meta-cloud-sender.ts  (envío WhatsApp)
  ├── storage.ts       (Supabase Storage MP3/PDF)
  └── db.ts            (CRUD clientes, pedidos, VIP, métricas)
   ↓
Supabase Postgres (12 tablas tci_*)
+ Supabase Storage (buckets tci-audios, tci-pdfs)
```

## 🎨 Frontend (mismo repo)

- `cuento.activosya.com` → `app/cuento/page.tsx` (landing principal)
- `cuento.activosya.com/precios` → `app/cuento/precios/page.tsx`
- `cuento.activosya.com/politica` → `app/cuento/politica/page.tsx`

## 💰 Pricing snapshot

| Producto | Precio | Costo real | Margen |
|---|---|---|---|
| Cuento 2 min | S/2 | S/0.23 | 88% |
| Cuento 3 min | S/3 | S/0.30 | 90% |
| Cuento 5 min | S/5 | S/0.40 | 92% |
| Wallet S/15 (6 cuentos) | S/15 | S/1.80 | 88% |
| VIP Estrella | S/18/mes | S/5.84 | 68% |
| VIP Mágico | S/30/mes | S/15.10 | 50% |

## 🎯 Lanzamiento target

**Día del Padre 2026: viernes 21 junio 2026**

6 semanas desde 2026-05-10 (aprobación) → 2026-06-21 (lanzamiento).
