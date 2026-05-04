# Miss Sofia — Briefing Maestro del Método Cuna

> **Para la ventana de Claude Code que esté trabajando en Miss Sofia después de mí.**
> Léeme entero antes de tocar nada relacionado con Miss Sofia. Soy la ventana
> que reescribió el backend completo del Método Cuna y configuró el sistema
> de monetización entre 2026-05-03 y 2026-05-04.
> Si haces algo que contradiga este documento, vas a romper el producto.
>
> **Última actualización:** 2026-05-04 (Plan Premium SIN sesión humana decidido).

---

## 🆕 ACTUALIZACIÓN 2026-05-04 (LEE PRIMERO)

Cambios relevantes desde la versión inicial del briefing:

### Sistema de monetización LIVE en producción
- **Plan Free:** OpenAI Nova @ speed 0.9. Tier Cuna: 3 días ilimitado + 6 min/día × 30 días → bloqueo.
- **Plan Regular S/39/mes (S/349/año):** OpenAI Nova @ speed 0.9. Ilimitado.
- **Plan Premium S/89/mes (S/799/año):** ElevenLabs Sofia con cap 45 min/mes (después switch automático a Nova). **NO incluye sesión humana** (decisión Percy 2026-05-04).
- **Free tier check** está en `lib/.../tier.ts` → `getFreeTierStatus()` y `hasSecondsAvailable()`.
- **Premium voice cap** está en `lib/.../tier.ts` → `premiumVoiceQuota()` y `getEffectivePlanForVoice()`.

### TTS Router (`lib/.../ai/tts-router.ts`)
- `synthesizeForPlan({text, plan, context})` decide motor por plan + context.
- Hero context (`'hero'`) = audio Día 1, capítulos novela, audio-diario inmediato. **SIEMPRE ElevenLabs sin importar el plan.**
- Chat context (`'chat'`) = ruteo por plan: premium → ElevenLabs (con cap), regular/free → Nova.

### OpenAI TTS configurado
- API: `lib/.../ai/openai-tts.ts`. Modelo `tts-1`, voz `nova`, speed 0.9 (configurable via `OPENAI_TTS_SPEED` env).
- Necesita `OPENAI_API_KEY` en Vercel (ya configurada).

### Audio-diario inmediato (Opción B)
- `/api/missions/diary-translate` recibe audio español → Whisper STT → Claude narrador → ElevenLabs TTS → upload a `sofia-tts/diary/<userId>/<date>.mp3`.
- UI inline en `/sofia-chat` dentro de MissionCard cuando título matchea "Cuéntame tu día".
- Reemplaza el comportamiento "te lo devuelvo mañana" por respuesta en segundos.

### Tono Sofia limpiado (sin pet names)
- `master-prompt.ts` v2.0 prohíbe explícitamente: "mi amor", "mi vida", "linda", "lindo", "campeón", "superstar", "cariño", "amiga", "bro".
- Personalidad: PROFESSIONAL & WARM (profesora ejecutiva-cercana). Llama por nombre del estudiante. Mantiene mezcla bilingüe.

### Tags `<session_report>` no leakean al chat
- Master prompt v2 prohíbe explícitamente emitir tags en turnos regulares.
- Defensa adicional: endpoints `/api/conversation/start` y `/turn` aplican `cleanTextForTTS()` antes de retornar texto al frontend (también strippea tags).
- Transcript en DB conserva el texto raw para que `/api/conversation/end` lo procese con generateShadowCoachReport + extractPhaseProgress.

### Endpoints debug ELIMINADOS
- Borrados: `/api/sofia-debug/env`, `/api/sofia-debug/voice-comparison`, `/api/sofia-auth/dev-bypass`.
- Si necesitas debugging, recreas localmente o crea endpoints temporales con auth.

### Pricing en código (`/sofia-upgrade` + `/api/sofia-flows/payment`)
- Regular: monthly 39, yearly 349.
- Premium: monthly 89, yearly 799.
- Constraint en DB: `mse_users.plan IN ('free', 'regular', 'premium')`. `mse_payments.plan IN ('regular', 'premium')`.

### UI nueva en `/sofia-chat`
- `TierBadge`: estado del tier free (trial/limited/blocked).
- `PremiumVoiceBadge`: solo visible para Premium users. Muestra X/45 min usados con barra de progreso. Estados morado → ámbar → gris (agotado).
- `MissionCard`: incluye recorder inline cuando misión es la del diario.

### Estado actual de la cuenta de Percy
- `rojas_percy@hotmail.com` está en plan **`premium`** (manual via SQL).
- Email confirmado, profile creado con Pacto Cuna sellado, Fase 0 día 1.

---

## 1. ¿Qué es el Método Cuna?

Decisión de Percy del 2026-05-03: pivote total del modelo CEFR (A1-C1, weeks,
days) hacia **6 fases neurolingüísticas** que respetan cómo aprenden los
niños la lengua materna. Disruptivo, único en LATAM, pricing único, garantía
6 meses Klaric.

**Tesis:** "Aprende inglés como aprendiste español: viviéndolo, no estudiándolo."

### Las 6 fases (memoriza la tabla)

| Fase | Nombre | Días | Lo que SÍ hace | Lo que NO hace | Hito de salida |
|---|---|---|---|---|---|
| 0 | 🌙 Cuna (Despertar Silencioso) | 1-30 | Solo escucha. Marca 👍/👎. | NO habla. NO traduce. NO memoriza. | Entiende un audio del día 30 que el día 1 no entendía |
| 1 | 💧 Primera Palabra | 31-60 | Una palabra real. "Thanks". "Hungry". | NO frases. NO conjugaciones. | 30 palabras inglesas USADAS en su vida real |
| 2 | ⚡ Telegráfico | 61-90 | 2-3 palabras. "Want water." | NO estrés por gramática. | Audio de 60 seg sin tirar al español |
| 3 | 🌱 Tu Voz | 91-150 | Conversaciones 3-5 min. Errores OK. Empieza novela. | NO tablas de verbos. | Cuenta recuerdo de infancia en 2 min |
| 4 | 🌊 Tu Mundo | 151-240 | Series con subs en inglés. Misiones reales. | NO baby-talk. | Cuenta trama serie favorita 5 min sin prepararlo |
| 5 | 🔥 Tu Yo en Inglés | 241-365 | Debates. Inglés industria. Sello Cuna. | NO paternalismo. | Nativo USA no detecta hispanohablante |

**Total: 12 meses. Pricing: S/49/mes (Sofia Cuna) o S/89/mes (Sofia Cuna VIP).**

---

## 2. Tono de Sofia (CRÍTICO — no romper)

Sofia es **profesora ejecutiva-cercana**, NO bestie. Background: 35 años,
TESOL NYU, vive entre Miami y Lima.

### ❌ NUNCA usar
- "mi amor", "mi vida", "linda", "lindo", "campeón", "campeona", "superstar", "cariño", "amiga", "bro"
- 💕💔 emojis románticos en mensajes operativos
- "qué bien", "ay", "tranqui" (jerga peruana o coloquial)
- "te quiero" como despedida
- Diminutivos ("audito", "minutito", "rapidito")

### ✅ SÍ usar
- Nombre del estudiante cuando aporta calidez ("Hola, Percy.")
- "Excelente", "muy bien", "perfect", "exacto"
- "Sin problema", "sin presión"
- Mezcla bilingüe español/inglés (es la firma de Sofia)
- Lenguaje claro, adulto, motivador
- Emojis funcionales: 👍 👎 🌙 ⚡ 🎯 🤝 (no decorativos)

Si tu Flow muestra texto en español, respeta este tono. Si muestra texto en
inglés, es natural y profesional como cualquier profe universitaria americana.

---

## 3. Schema Supabase ya en producción

Project: `rfpmvnoaqibqiqxrmheb` (URL: https://rfpmvnoaqibqiqxrmheb.supabase.co)

### Tablas Cuna (5 nuevas, NO modificar sin coordinar)

| Tabla | UNIQUE | Propósito |
|---|---|---|
| `mse_phase_progress` | — | Log inmutable de transiciones entre fases |
| `mse_personal_dictionary` | (user_id, word) | Palabras atadas a momentos emocionales |
| `mse_novel_chapters` | (user_id, chapter_number) | Capítulos novela personal |
| `mse_real_life_missions` | (user_id, assigned_date) | Misiones diarias |
| `mse_visceral_milestones` | (user_id, milestone_key) | Hitos viscerales (whitelist 11 valores) |

### Tablas existentes Cuna-aware

`mse_student_profiles` — extendida con 5 columnas Cuna nuevas:
- `current_phase` smallint (0-5) — DEFAULT 0
- `phase_day` integer — DEFAULT 1, autocalculado por cron diario
- `phase_started_at` timestamptz — DEFAULT now()
- `cuna_started_at` timestamptz
- `tiempo_de_boca_seconds` integer — DEFAULT 0

`mse_users.id` es **uuid**. FK desde todas las tablas Cuna con `ON DELETE CASCADE`.

### Funciones SQL útiles

`cuna_daily_tick()` RETURNS TABLE(updated_users int, max_phase_day int)
— recalcula `phase_day` desde `phase_started_at`. Self-healing. Cron Vercel
diario (`0 10 * * *` UTC = 5am Lima) en `vercel.json`.

### Storage buckets

- `sofia-tts` (público) — TTS Sofia. Path `cuna/dia-1-bienvenida.mp3` cacheado, `novel/<userId>/chapter-N.mp3` para novela.
- `sofia-evidence` (privado) — uploads de evidencia de misiones. Signed URLs 7 días.

---

## 4. Endpoints REST existentes (consumibles desde Flows)

| Método | Path | Propósito |
|---|---|---|
| POST | `/api/conversation/start` | Inicia sesión Cuna. Carga contexto (fase + ritual + novela + misión + diccionario + hitos), llama Sofia, retorna texto + audio. |
| POST | `/api/conversation/end` | Cierra sesión, genera Shadow Coach report, dispara `processSessionEnd` que persiste palabras / hitos / misión / capítulo / fase. |
| POST | `/api/conversation/turn` | Turno individual de conversación (audio o texto). |
| POST | `/api/missions/today/evidence` | Sube evidencia de misión (audio/foto/texto base64). Bucket privado + signed URL. |
| POST | `/api/novel/next` | Genera siguiente capítulo de la novela personal. |
| GET | `/api/novel/latest?user_id=` | Último capítulo del usuario. |
| GET | `/api/cron/cuna-daily-tick` | Cron diario. Auth `Bearer CRON_SECRET`. |
| POST | `/api/whatsapp/miss-sofia` | Webhook Twilio del funnel WhatsApp (Pacto Cuna conversacional). |

### Endpoints `/api/sofia-flows/*` (los estoy creando ahora)

Después de que termines de leer este briefing, mira los archivos en
`app/api/sofia-flows/`. Ahí están los 5 endpoints específicos para tus 5 Flows:

- `POST /api/sofia-flows/pacto` — submit Flow "Quién eres"
- `POST /api/sofia-flows/study-plan` — submit Flow plan estudio
- `POST /api/sofia-flows/payment` — submit Flow pago
- `GET  /api/sofia-flows/progress?user_id=` — data para Flow progreso
- `POST /api/sofia-flows/pronunciation` — submit Flow test pronunciación

Todos retornan JSON con shape consistente. Lee cada `route.ts` antes de
diseñar la `data_exchange` shape de tu Flow.

---

## 5. Los 5 Flows a implementar (alineados con Cuna)

### ⚠️ AVISO IMPORTANTE: el Flow #1 NO es placement test CEFR

El plan original (memoria `PercyIA/WhatsApp Flows multi-marca`) decía
"Placement test 10 preguntas multiple choice A1-C2". **Esto YA NO aplica.**
Tiramos CEFR. El Flow #1 es **"Quién eres" (Pacto Cuna)**.

### Flow #1 — "Quién eres" (Pacto Cuna)

**Reemplaza:** placement test CEFR.
**Una sola pantalla con:**
- Input texto: nombre (max 30 chars)
- Input texto: ciudad (max 50 chars)
- Radio: motivación (5 opciones — ver lista abajo)
- Radio: minutos al día (5 / 10 / 20)
- Checkbox obligatorio: "Me comprometo a 30 días de Fase Cuna (escuchar sin presión)"

**Submit endpoint:** `POST /api/sofia-flows/pacto`
**Body esperado:** `{ phone, name, city, motivation, minutes_per_day, committed }`
**Respuesta:** `{ ok, signup_url, day1_audio_url }`

**Motivaciones (radio):**
1. Trabajo
2. Viajar al extranjero
3. Ver series sin subtítulos
4. Hablarle a mi familia/hijos
5. Otro

### Flow #2 — Plan de estudio

**Una pantalla con:**
- Time picker: a qué hora del día prefiere recibir el audio matutino
- Radio: modo (estricto / suave)
- Multi-select: días de la semana que practica (default: todos)

**Submit:** `POST /api/sofia-flows/study-plan`
**Body:** `{ user_id, preferred_morning_time, mode, weekdays[] }`

### Flow #3 — Pago Pro/Elite

**2 pantallas:**

P1 — Comparativa visual:
- Card "Sofia Cuna" S/49/mes · S/449/año
- Card "Sofia Cuna VIP" S/89/mes · S/799/año (todo lo del Cuna + 2 sesiones video con Sofia humana real + Sello Cuna nativo USA)

P2 — Selección + Yape:
- Radio: plan + facturación
- Mostrar: "Yapea S/{monto} a Percy Roj* — 998 102 258"
- Input texto: "Operación Yape (escribe el código de operación)"

**Submit:** `POST /api/sofia-flows/payment`
**Body:** `{ user_id, plan: 'cuna' | 'cuna_vip', billing: 'monthly' | 'yearly', yape_operation_code }`
**Respuesta:** `{ ok, status: 'pending_validation', message }`
**Nota:** validación real del Yape se hace por MacroDroid Android (igual que TuDestinoYa).

### Flow #4 — Progreso semanal

**Una pantalla read-only que muestra:**
- 🌙 Fase actual (badge): "Cuna · Día 12 de 30"
- 🎙️ Tiempo de boca acumulado (minutos)
- 📚 Palabras tuyas (count del personal_dictionary)
- 🌟 Hitos viscerales desbloqueados (lista de keys con fecha)
- 📖 Capítulo actual de tu novela (link al audio)
- Próximo capítulo cuándo se desbloquea

**GET endpoint:** `GET /api/sofia-flows/progress?user_id={uuid}`
**Respuesta:** ya formateada con todos los campos arriba.

### Flow #5 — Test pronunciación

**3 pantallas:**

P1 — Sofia muestra una frase target en inglés: "I would like a coffee, please."
P2 — Botón grabar audio (15 seg max)
P3 — Resultado: score 0-100 + 1 frase de feedback

**Submit:** `POST /api/sofia-flows/pronunciation`
**Body:** `{ user_id, target_phrase, audio_base64, audio_mime }`
**Respuesta:** `{ score, transcription, feedback_es }`

---

## 6. Plataforma Flows (lo que estás haciendo)

Según el plan en memoria `PercyIA/WhatsApp Flows multi-marca`, la
arquitectura es multi-tenant:

```
humaniapp/
  lib/wa-flows-platform/         (TÚ ESTÁS HACIENDO ESTO)
    encryption.ts                # RSA-OAEP-256 + AES-128-GCM
    webhook-handler.ts           # routing por WABA/tenant
    template-registry.ts
    flow-versioning.ts
    yape-integration.ts          # opcional, compartido
  lib/wa-flows-tenants/
    miss-sofia/flows/
      pacto-cuna.ts              # JSON spec del Flow "Quién eres"
      plan-estudio.ts
      pago.ts
      progreso.ts
      pronunciacion.ts
  app/api/whatsapp-flows/
    webhook/route.ts             # ENDPOINT ÚNICO Meta llama
```

**Tablas Supabase para Flows (a crear):**
```sql
wa_flows           (id, tenant_id, flow_key, flow_id_meta, version, json_spec, status)
wa_flow_submissions (id, tenant_id, flow_key, user_phone, data jsonb, submitted_at)
wa_flow_templates  (id, tenant_id, template_name, body, variables, status_meta)
```

**Endpoint webhook Meta:**
- URL: `https://activosya.com/api/whatsapp-flows/webhook`
- Tu handler debe parsear el `data_exchange_action`, identificar el tenant
  por WABA (Miss Sofia WABA = `1623262362222343`), invocar el endpoint
  específico (`/api/sofia-flows/<flow_key>`), y devolver el next screen.

---

## 7. Convenciones del repo

### Stack
- Next.js **16.2.4** (App Router) — **¡ATENCIÓN!** El `humaniapp/AGENTS.md` dice:
  > "This is NOT the Next.js you know — APIs, conventions, and file structure
  > may all differ from training data. Read the relevant guide in
  > `node_modules/next/dist/docs/` before writing any code."

  En la práctica: para endpoints API simples (route.ts en `app/api/...`),
  el patrón funciona como Next 13+. Si vas a hacer algo fancy (Server
  Components con Cache Components, Server Actions con `use server`, etc.)
  lee los docs primero.

- TypeScript estricto. Validar SIEMPRE con `npx tsc --noEmit -p .` antes de
  considerar terminado.
- Supabase via `@supabase/supabase-js` con SERVICE_ROLE_KEY (server-side).
- Twilio Sofia subaccount: SID + Auth Token en env vars (`TWILIO_SOFIA_ACCOUNT_SID`, `TWILIO_SOFIA_AUTH_TOKEN`). Sender `+51977100718`. Para SIDs reales ver `~/.claude/projects/.../memory/PercyIA/Credenciales Referencias.md`.
- WABA Meta Sofia: ID en env vars (no commiteado por push protection).

### Env vars relevantes
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` (default `claude-sonnet-4-6`)
- `ELEVENLABS_API_KEY`, `ELEVENLABS_MISS_SOFIA_VOICE_ID`
- `TWILIO_SOFIA_ACCOUNT_SID`, `TWILIO_SOFIA_AUTH_TOKEN`, `TWILIO_SOFIA_FROM`
- `CRON_SECRET` (para cron diario)
- **Faltarán** para Flows: `META_FLOW_PRIVATE_KEY` (RSA), `META_FLOW_PUBLIC_KEY_PASSPHRASE`, `META_APP_SECRET` (para verificar firma webhook)

### Memorias relevantes (en `~/.claude/projects/.../memory/`)
- `PercyIA/Plan Master ActivosYA 2026` — decisiones consolidadas, cronograma
- `PercyIA/Miss Sofia Cuna - migración aplicada` — lo que hice yo
- `PercyIA/WhatsApp Flows multi-marca` — roadmap original Flows
- `PercyIA/Credenciales Referencias` — donde encontrar SIDs, tokens
- `PercyIA/Productos SaaS bajo ActivosYA` — naming, namespaces

---

## 8. Lo que NO debes hacer (red flags)

| ❌ NO hacer | 🤔 Por qué |
|---|---|
| Tocar `lib/miss-sofia-voice/master-prompt.ts` | Es sagrado. Si necesitas cambiar tono de Sofia, conversa primero. |
| Borrar columnas legacy de `mse_student_profiles` (current_level, current_week, current_day, cefr_estimate) | Quedan @deprecated por compatibilidad durante el cutover. |
| Implementar test 10 preguntas CEFR | Tiramos CEFR. Flow #1 es "Quién eres" (Pacto Cuna). |
| Usar "mi amor" / "mi vida" / "superstar" en cualquier copy de Flow | Tono ejecutivo profesional. |
| Borrar `mse_curriculum_*` tablas | Aún las usa el funnel WhatsApp legacy y `db.ts` exporta funciones deprecated. Coordinar antes de borrar. |
| Modificar el funnel WhatsApp `lib/miss-sofia-voice/whatsapp-agent.ts` | Es el funnel Pacto Cuna conversacional, ya migrado. Si los Flows lo reemplazan, cambiar al final. |
| Crear endpoints en `/api/conversation/*` o `/api/novel/*` o `/api/missions/*` | Son míos, ya hechos. Mira los existentes. |
| Hacer migration directa con `psql` | Usa el patrón `supabase/migrations/<timestamp>_<name>.sql` + aplicar via Management API (script Python con `urllib.request` al endpoint `/v1/projects/{ref}/database/query`). User-Agent debe ser un browser válido o Cloudflare bloquea con 1010. |

---

## 9. Cómo invocar mis endpoints desde tu webhook handler

Cuando el Flow hace `data_exchange_action`, tu webhook handler debe:

1. Decodificar + decriptar el payload (encryption.ts)
2. Identificar el flow_key (ej. "pacto-cuna", "study-plan", etc.)
3. Hacer fetch interno al endpoint REST correspondiente:

```ts
const resp = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://activosya.com'}/api/sofia-flows/${flowKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(decryptedSubmitData),
});
const result = await resp.json();
```

4. Empaquetar `result` en el shape que Meta espera (`screen` + `data`).
5. Encriptar respuesta y devolver.

Mis endpoints **no validan firma de Meta** — tu webhook ya hizo eso antes.
Mis endpoints sí validan que el `user_id` o `phone` exista y que la data
tenga la shape correcta.

---

## 10. Pendiente coordinado entre las dos ventanas

| Tarea | Quién |
|---|---|
| Plataforma Flows base (encryption, webhook, routing, tablas wa_*) | TÚ |
| 5 JSON specs de Flows Miss Sofia | TÚ |
| Submit a Meta para registrar Flows + templates | TÚ + Percy |
| 5 endpoints `/api/sofia-flows/*` | YO (después del briefing) |
| Push + deploy Vercel | Percy + cualquiera de las dos ventanas |
| Setear env vars Flows + CRON_SECRET en Vercel | Percy |
| Probar end-to-end con número real | Percy |

---

## 11. TL;DR ultra-corto

1. Leer este doc completo antes de tocar Miss Sofia.
2. Flow #1 = "Quién eres" (Pacto Cuna), NO placement test CEFR.
3. Mis 5 endpoints `/api/sofia-flows/*` están en `app/api/sofia-flows/` — léelos.
4. Tono Sofia: profesora ejecutiva. NO pet names. NO 💕.
5. Schema Cuna ya en producción Supabase. NO tocarlo sin coordinar.
6. Validar siempre con `npx tsc --noEmit -p .` antes de considerar terminado.
7. Si dudas, revisa `~/.claude/projects/.../memory/PercyIA/Miss Sofia Cuna - migración aplicada.md`.

¡Éxitos! Y si rompes algo, los commits de hoy 2026-05-03 tienen todo el
trabajo de Cuna. Puedes regresar a ellos.

— La otra ventana de Claude Code
