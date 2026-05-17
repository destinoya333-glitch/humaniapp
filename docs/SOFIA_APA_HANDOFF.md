# Miss Sofia × Método APA — Handoff

Implementación 2026-05-17. Integración del ciclo **A**dquirir → **P**racticar → **A**justar (Teacher Poli) como capa complementaria al Método Cuna existente.

## Qué se construyó

### Sprint 1 — Revisión APA + Tap-to-Define
- `lib/miss-sofia-voice/review-extractor.ts` — Claude extrae 3-5 correcciones por sesión
- `app/api/sofia-review/{extract,list,dismiss}/route.ts`
- Hook async en `app/api/conversation/end/route.ts` vía `after()`
- `components/sofia-chat/ReviewTab.tsx` — cards estilo Teacher Poli, polling 8s
- `app/api/sofia-define/route.ts` + `components/sofia-chat/TappableText.tsx`
- Wire en `ConversationView` (tap a palabras inglesas en transcripts)

### Sprint 2 — Cápsulas APA temáticas
- `lib/miss-sofia-voice/passage-engine.ts` — cache sha1(topic+phase+difficulty)
- `lib/miss-sofia-voice/quiz-engine.ts` — 5 preguntas (3 MC + 2 open)
- Endpoints `/api/sofia-passage/{generate,suggestions}`, `/api/sofia-capsule/start`, `/api/sofia-quiz/{generate,score}`
- Página `app/sofia-capsule/page.tsx` con state machine: picker → reading → practice → quiz → done
- Componentes en `components/sofia-capsule/{TopicPicker,ReadAlongPlayer,QuizCard}.tsx`
- Link "🧠 Cápsula APA" agregado al header de `/sofia-chat`

### Sprint 3 — Role Play + Streak + WhatsApp bridge
- `lib/miss-sofia-voice/roleplay-scenarios.ts` — 12 escenarios por fase + dificultad
- `app/api/sofia-roleplay/list/route.ts` + `components/sofia-chat/RolePlaySelector.tsx`
- `app/api/sofia-progress/streak/route.ts` + `components/sofia-progress/StreakHeatmap.tsx` (90 días, sesiones + cápsulas)
- `lib/miss-sofia-voice/capsule-link.ts` — HMAC sign/verify TTL 36h
- `app/api/sofia-capsule/verify-link/route.ts` + auto-arranque en page
- `app/api/cron/sofia-capsula-diaria/route.ts` — schedule `0 14 * * *` (9am Lima)

---

## ✅ TODO APLICADO EN PRODUCCIÓN — 2026-05-17

### 1. Migraciones SQL ✅ HECHO
3 migraciones aplicadas via Supabase Management API a `rfpmvnoaqibqiqxrmheb`.
Tablas verificadas: `mse_review_cards`, `mse_passages`, `mse_capsule_sessions`, `mse_quiz_results`, `mse_capsula_diaria_log`.

### 2. Vercel env vars ✅ HECHO
- `SOFIA_CAPSULE_LINK_SECRET` seteado en production+preview+development (64 chars random).
- `CRON_SECRET` ya existía.

### 3. Template WhatsApp ✅ CREADO
- ID: `1915735729119274`
- Nombre: `sofia_capsula_apa`
- Estado al crear: **PENDING** (Meta aprueba en 1-24h, no requiere acción).
- Categoría: MARKETING (UTILITY no aplica para este caso de uso).
- Cuerpo: 2 variables (nombre, tópico) + footer "Miss Sofia · Metodo Cuna x APA".
- Botón URL: dinámico `https://sofia.activosya.com/sofia-capsule?{{1}}` (Meta rechazó la versión con emoji, se removió).

### 4. Wire roleplay ✅ HECHO
- `callMissSofia` acepta `extraSystem` opcional.
- `/api/conversation/start` lee `roleplay_id`, encoda `session_type='roleplay:<id>'`, usa `opener_en` directo.
- `/api/conversation/turn` decode `session_type` y reinyecta el overlay en cada turno.
- `sofia-chat/page.tsx` lee `?roleplay=` de URL o localStorage y lo pasa al /start.
- Click en RolePlaySelector → window.location.href con `?roleplay=<id>` → al iniciar sesión Sofia entra en personaje.

### 5. Smoke tests en producción ✅ PASS
| Endpoint | Esperado | Real |
|---|---|---|
| `/api/sofia-capsule/verify-link` (sig inválida) | 403 | 403 ✅ |
| `/api/sofia-capsule/verify-link` (sin params) | 400 | 400 ✅ |
| `/api/sofia-review/list` (sin user_id) | 400 | 400 ✅ |
| `/api/sofia-progress/streak` (sin user_id) | 400 | 400 ✅ |
| `/api/cron/sofia-capsula-diaria` (sin auth) | 401 | 401 ✅ |

### Lo único que aún depende de Meta (no Percy)
- Aprobación template `sofia_capsula_apa` — Meta tarda 1-24h. Cuando aprueben, el cron de las 9am Lima empieza a enviar automáticamente.

### Limpieza opcional (no urgente)
Si la cápsula generada usa OpenAI Nova y suena seca, en `passage-engine.ts:synthesizeAndUploadPassage()` cambiar `context: "chat"` a `context: "hero"` (cuesta ~15x más por palabra pero usa ElevenLabs Sofia).

---

## Métricas para validar el cambio
Después de 7 días en producción:
- **Review cards generadas / sesión cerrada** — target >70%
- **Dismiss rate** (cards descartadas / generadas) — si <40%, el extractor está pidiendo correcciones triviales
- **Cápsulas iniciadas / DAU** — target >10% (significa que el flujo APA atrae)
- **Quiz completados / cápsulas iniciadas** — target >50% (si baja, el quiz es muy largo)
- **Tap-to-define / sesión** — sin target, métrica de engagement de lectura
