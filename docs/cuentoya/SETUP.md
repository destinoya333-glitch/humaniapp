# Setup TuCuentoYa — Guía paso a paso

Esta guía cubre TODOS los pasos infra que Percy necesita ejecutar manualmente para poner TuCuentoYa en producción. El backend ya está completo en `lib/cuentoinfantil/` y `app/api/whatsapp/cuento-meta/`.

**Tiempo total estimado:** ~3 horas + 24-48h de espera por aprobación de templates Meta.

---

## ✅ Checklist macro

- [ ] 1. Aplicar migración SQL en Supabase production
- [ ] 2. Crear buckets Supabase Storage
- [ ] 3. Crear cuenta Azure Cognitive Services + obtener key
- [ ] 4. Comprar chip celular + registrar phone_id Meta
- [ ] 5. Crear 5 templates Meta (esperar 24-48h)
- [ ] 6. Configurar DNS `cuento.activosya.com`
- [ ] 7. Agregar env vars en Vercel
- [ ] 8. Configurar webhook Meta Cloud
- [ ] 9. Smoke test end-to-end
- [ ] 10. Lanzar promo "primer cuento gratis"

---

## 1. Aplicar migración SQL en Supabase

```bash
# Opción A: desde Supabase Studio
# 1. https://supabase.com/dashboard/project/<TU_PROJECT_ID>/sql
# 2. New query
# 3. Pegar contenido de supabase/migrations/20260511_cuentoinfantil_schema.sql
# 4. Run

# Opción B: con psql desde tu máquina (necesita SUPABASE_DB_URL)
psql "$SUPABASE_DB_URL" -f supabase/migrations/20260511_cuentoinfantil_schema.sql
```

**Verifica:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'tci_%';
-- Debes ver 12 tablas
```

---

## 2. Crear buckets Supabase Storage

En **Supabase Dashboard → Storage**:

1. Click "New bucket"
2. Crear `tci-audios`:
   - Public: ✅ sí (para servir audios via URL pública)
   - File size limit: 5 MB
   - Allowed MIME types: `audio/mpeg, audio/mp3, audio/ogg`
3. Crear `tci-pdfs`:
   - Public: ✅ sí
   - File size limit: 2 MB
   - Allowed MIME types: `application/pdf`

**Política RLS de cada bucket** (permitir solo service_role escribir):

```sql
-- Service role puede insertar/update
CREATE POLICY "service_role write tci-audios"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tci-audios' AND auth.role() = 'service_role');

-- Cualquiera puede leer (público)
CREATE POLICY "public read tci-audios"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tci-audios');

-- Repetir para tci-pdfs
CREATE POLICY "service_role write tci-pdfs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'tci-pdfs' AND auth.role() = 'service_role');

CREATE POLICY "public read tci-pdfs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tci-pdfs');
```

---

## 3. Crear cuenta Azure Cognitive Services

### Paso a paso

1. Ir a https://portal.azure.com → crear cuenta (acepta tarjeta crédito; tienes $200 USD de crédito gratis primer mes)
2. Click "Create a resource" → buscar "Speech service" → Create
3. Configuración:
   - **Resource group:** crear nuevo `tucuentoya-rg`
   - **Region:** **Brazil South** (más cerca de Perú, ~50ms latencia menos que East US)
   - **Name:** `tucuentoya-tts`
   - **Pricing tier:** **Free F0** (5M chars/mes gratis) o **Standard S0** (pay-as-you-go $16/1M)
4. Click "Review + Create" → Create
5. Una vez creado, ir al recurso → **Keys and Endpoint** → copiar:
   - `KEY 1` → será tu `AZURE_TTS_KEY`
   - `Location/Region` → será tu `AZURE_TTS_REGION` (ej: `brazilsouth`)

### Probar voces (opcional, recomendado)

Ir a https://speech.microsoft.com/portal/voicegallery, filtrar por idioma "Spanish (Peru)" y probar:
- `es-PE-CamilaNeural` (femenina) — narradora principal
- `es-PE-AlexNeural` (masculino) — personajes

---

## 4. Comprar chip celular + registrar phone_id Meta

Replica el proceso que usaste para Sofia/Destino/EcoDrive (ver memoria `feedback_meta_cloud_migration.md`).

### Pasos

1. **Comprar chip Bitel/Claro de PE** (~S/30). Activarlo.
2. **NO instalar WhatsApp en el chip todavía** (puede causar rate limit Meta).
3. En **Meta Business Manager** → WhatsApp Manager → Phone Numbers:
   - Add phone number → ingresar +51 9XX XXX XXX
   - Verificar por SMS / llamada
   - Asociar a WABA **EcoDriveBot** (la misma de Sofia/Destino)
4. **Configurar 2FA off vía ImprovMX** (el truco de Sofia para evitar rate limit Meta):
   - Crear alias `tucuento@activosya.com` → tu email real
   - Usar ese email para configurar Meta Business
5. Una vez registrado el phone, obtener:
   - `phone_id` (numérico) → `META_CUENTO_PHONE_ID`
6. Reusar el system user token de EcoDriveBot (ya está en Vercel como `ECODRIVE_META_ACCESS_TOKEN`). El sender de TuCuentoYa hace fallback automático a este token.

### Gotchas conocidos (de memoria Sofia migración)

- **NO** intentar registro phone múltiples veces seguidas → rate limit 1h+
- **NO** activar WhatsApp app en el chip antes del Embedded Signup en Meta
- Si pega rate limit, esperar **2h mínimo** antes de retry

---

## 5. Crear templates Meta WhatsApp

Ver `docs/cuentoya/META_TEMPLATES.md` — copy listo para los 5 templates.

**Tiempo:** 24-48h de espera de aprobación por Meta.

---

## 6. Configurar DNS `cuento.activosya.com`

En tu proveedor DNS (Cloudflare/Namecheap):

```
Tipo:    CNAME
Nombre:  cuento
Valor:   cname.vercel-dns.com
TTL:     Auto
Proxy:   Off (DNS only, para que Vercel maneje SSL)
```

En **Vercel Dashboard → humaniapp project → Settings → Domains**:
1. Add domain → `cuento.activosya.com`
2. Vercel detecta el CNAME y emite SSL automático en 5 min

**Verifica:**
```bash
curl -I https://cuento.activosya.com
# Debe retornar HTTP/2 200
```

---

## 7. Agregar env vars en Vercel

En **Vercel → humaniapp → Settings → Environment Variables**, agregar para Production + Preview:

```bash
# Azure TTS
AZURE_TTS_KEY=<copia desde Azure portal>
AZURE_TTS_REGION=brazilsouth
AZURE_TTS_DEFAULT_VOICE_F=es-PE-CamilaNeural
AZURE_TTS_DEFAULT_VOICE_M=es-PE-AlexNeural

# Meta Cloud TuCuentoYa
META_CUENTO_PHONE_ID=<phone_id de Meta>
META_CUENTO_VERIFY_TOKEN=cuentoya_verify_xxxxxx
# (META_CUENTO_ACCESS_TOKEN opcional - si vacío, reusa ECODRIVE_META_ACCESS_TOKEN)

# Yape destino (reusa Percy)
TCI_YAPE_NUMERO=998 102 258
TCI_YAPE_NOMBRE=Percy Roj*

# Promo lanzamiento
TCI_PROMO_PRIMER_CUENTO_GRATIS=true

# Storage buckets
SUPABASE_BUCKET_CUENTOS=tci-audios
SUPABASE_BUCKET_PDFS=tci-pdfs

# Cron secret (genera uno random)
CRON_SECRET=<genera uno con: openssl rand -hex 32>

# Música ambient (opcional, dejar vacío si no usas ffmpeg)
TCI_AMBIENT_BOSQUE_URL=
TCI_AMBIENT_MAR_URL=
TCI_AMBIENT_ESPACIO_URL=
TCI_AMBIENT_CASTILLO_URL=
TCI_AMBIENT_CIUDAD_URL=
TCI_AMBIENT_SELVA_URL=
TCI_AMBIENT_NOCHE_URL=
```

Después de agregar, redeploy:
```bash
vercel --prod
```

---

## 8. Configurar webhook Meta Cloud

En **Meta Business Manager → WhatsApp Manager → tu phone TuCuentoYa → Configuration → Webhook**:

```
Callback URL: https://activosya.com/api/whatsapp/cuento-meta
Verify token: <el mismo que pusiste en META_CUENTO_VERIFY_TOKEN>
```

Click "Verify and save" → debe responder OK.

Suscribirse a los campos:
- ✅ messages
- ✅ message_status (opcional, para tracking de entregas)

---

## 9. Smoke test end-to-end

Con el número TuCuentoYa registrado, manda un mensaje desde tu WhatsApp personal:

```
1. "Hola"
   → debe responder con bienvenida de Rex

2. "Mateo, 5 años"
   → debe pedir escenario

3. "En un bosque, llega un lobo y yo (papá) lo salvo"
   → debe pedir duración

4. "3"
   → debe confirmar pedido

5. "sí"
   → como aún no tienes saldo, debe pedir Yape S/3

6. Yapeas S/3 al 998 102 258 → enviar captura
   → Claude Vision verifica → procede a generar cuento

7. ~30-60 seg después
   → recibe audio MP3 + texto del cuento
```

Si algo falla, revisar logs:
```bash
vercel logs --prod humaniapp --since 10m | grep -i cuento
```

---

## 10. Lanzar promo "primer cuento gratis"

Una vez todo verificado:

1. Verificar `TCI_PROMO_PRIMER_CUENTO_GRATIS=true` en Vercel
2. Publicar post #1 (carrusel) en FB/IG → ver `MARKETING_COPY.md`
3. Lanzar primer reel
4. Activar Meta Ads conversion campaign con CTA "Enviar mensaje a WhatsApp"

### Métricas a vigilar primera semana

```sql
-- Cuentos generados hoy
SELECT * FROM tci_vista_metricas_dia LIMIT 7;

-- Costo real promedio
SELECT
  AVG(costo_real_usd) * 3.75 AS costo_pen_promedio,
  COUNT(*) as cuentos
FROM tci_cuentos_generados
WHERE created_at > now() - interval '7 days';

-- Conversión promo → pago real
SELECT
  COUNT(*) FILTER (WHERE usado) AS gratis_otorgados,
  (SELECT COUNT(DISTINCT celular) FROM tci_recargas) AS recargaron
FROM tci_promos
WHERE tipo = 'primer_cuento_gratis';

-- VIPs activos
SELECT plan, COUNT(*) FROM tci_vista_vip_activos GROUP BY plan;
```

---

## 🐛 Troubleshooting

### "AZURE_TTS_KEY no configurada"
→ Faltaste agregar la key en Vercel env vars. Redeploy después de agregar.

### "META_CUENTO_* no configuradas"
→ Phone ID Meta sin configurar. Ver paso 4.

### Webhook recibe pero no responde
→ Revisar `vercel logs` filtrando por `cuento-meta`. Verifica que el verify token coincida.

### Audio sale sin voces correctas
→ Validar que las voces `es-PE-CamilaNeural` y `es-PE-AlexNeural` estén disponibles en tu región Azure. Si no, cambiar a `es-MX-DaliaNeural` y `es-MX-JorgeNeural`.

### Claude Vision no verifica Yape
→ Verificar `ANTHROPIC_API_KEY` existente en Vercel. Es la misma para todos los productos.

### Cron no corre
→ Revisar `vercel.json` tiene la entrada `cuento-reset-vip`. Vercel Cron solo corre en producción.

---

## 📞 Soporte

Si pega algún error que no resuelve esta guía:
1. Revisar memoria: `~/.claude/projects/.../memory/feedback_meta_cloud_migration.md`
2. Revisar logs Vercel: `vercel logs --prod`
3. Revisar Supabase Storage para audios generados: si están allí, problema es en envío
4. Revisar tabla `tci_pedidos` con `status='fallido'` para ver mensajes de error
