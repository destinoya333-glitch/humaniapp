# Miss Sofia Flows — Runbook de bootstrap

Scripts para publicar los 5 Flows de Miss Sofia y conectarlos a Meta + Twilio.

## Antes de empezar

Necesitas estas credenciales en el shell:

```bash
# Meta (Graph API)
export META_SOFIA_ACCESS_TOKEN="EAAxxx..."        # System user token con
                                                  # whatsapp_business_management +
                                                  # whatsapp_business_messaging
export META_SOFIA_WABA_ID="1623262362222343"      # WABA Sofia (no EcoDrive+)
export META_SOFIA_PHONE_ID="<phone_id_sofia>"     # ID del numero +51977100718 en Meta

# Twilio (Content API)
export TWILIO_SOFIA_ACCOUNT_SID="ACxxx..."        # ya en Vercel
export TWILIO_SOFIA_AUTH_TOKEN="xxx..."           # ya en Vercel
```

> **Si Twilio Sofia es subaccount:** usa SID + Token del subaccount, no del Master.

## Secuencia (orden importa)

### Paso 0 — Sanity check (opcional pero recomendado)

```bash
python3 scripts/sofia/00_list_existing.py
```

Lista flows + templates `sofia_*` ya en el WABA + estado encryption del phone.
Sirve para no crear duplicados ni sorpresas.

### Paso 1 — Registrar public key RSA en el phone Sofia

```bash
python3 scripts/sofia/03_register_encryption_key.py
```

Registra la misma public key que ya usa EcoDrive+. La privada vive en Vercel
como `WA_FLOWS_PRIVATE_KEY`. Sin esto Meta no puede encriptar requests al
webhook `/api/whatsapp-flows/webhook` y los Flows no abren.

Idempotente: si ya esta registrada con la misma huella, Meta no hace nada.

### Paso 2 — Publicar los 5 Flows en Meta

```bash
python3 scripts/sofia/01_publish_flows.py
```

Para cada `docs/flows-specs/sofia/flow_*_spec.json`:
1. Si no existe en Meta -> crea como DRAFT.
2. Sube el spec JSON via `/flows/{id}/assets`.
3. Publica (DRAFT -> PUBLISHED).

Output: tabla con `flow_name + flow_id_meta`. **Guarda esos 5 flow_id**, los
necesitas en el paso 3.

### Paso 3 — Crear los 5 templates Twilio Content API tipo `twilio/flows`

```bash
export SOFIA_FLOW_ID_PACTO_CUNA=<id_paso2_pacto>
export SOFIA_FLOW_ID_PLAN_ESTUDIO=<id_paso2_plan>
export SOFIA_FLOW_ID_PAGO=<id_paso2_pago>
export SOFIA_FLOW_ID_PROGRESO=<id_paso2_progreso>
export SOFIA_FLOW_ID_PRONUNCIACION=<id_paso2_pronunciacion>

python3 scripts/sofia/02b_create_twilio_flow_templates.py
```

Crea 5 Content Templates Twilio que renderizan los Flows Meta. Twilio se
encarga del rendering y el webhook universal `/api/whatsapp-flows/webhook`
sigue siendo el endpoint que Meta llama.

Output: tabla con `friendly_name + ContentSid (HX...)`. **Guarda esos 5
ContentSid**, son los que usa `sendContentTemplate({contentSid, variables})`
desde el bot Sofia.

> **Aprobacion Meta:** los templates van automaticamente a aprobacion. Tarda
> minutos a horas. Verifica con
> `GET https://content.twilio.com/v1/Content/{Sid}/ApprovalRequests`

### Paso 4 — Configurar webhook Sofia en Meta Cloud

Solo si **NO esta** ya configurado en el panel Meta:
- URL: `https://activosya.com/api/whatsapp-flows/webhook`
- Verify token: el mismo que usa EcoDrive+ (env var ya en Vercel)
- Subscribir a eventos: `messages` (no necesitas mas para Flows)

Si Sofia es Twilio (caso default Plan Master), Twilio ya enruta los Flow
requests via la WABA. **No necesitas tocar nada en Meta UI**.

## Test E2E

Una vez approved los templates:

```bash
# Mandar template Pacto desde Twilio (ejemplo curl)
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SOFIA_ACCOUNT_SID}/Messages.json" \
  -u "${TWILIO_SOFIA_ACCOUNT_SID}:${TWILIO_SOFIA_AUTH_TOKEN}" \
  --data-urlencode "From=whatsapp:+51977100718" \
  --data-urlencode "To=whatsapp:+51964304268" \
  --data-urlencode "ContentSid=<HX_pacto>" \
  --data-urlencode "ContentVariables={}"
```

El usuario ve el template, click el boton -> abre el Flow Pacto Cuna ->
completa -> ve `mse_whatsapp_leads` con `chat_state=dia_uno_sent`.

## Troubleshooting

| Sintoma | Causa probable |
|---|---|
| Flow boton no abre | Public key NO registrada. Corre paso 1. |
| Webhook recibe 401 | `WA_FLOWS_PRIVATE_KEY` mal seteada en Vercel (con `\n` extra). Usar `printf` o panel UI. |
| `Schema not matching` al abrir Flow | El JSON spec subido tiene `input-type: number` o init-values mal puestos. Ver gotchas en `docs/MISS_SOFIA_FLOWS_HANDOFF.md`. |
| Template no aparece aprobado | Verifica con `GET /Content/{Sid}/ApprovalRequests`. Meta puede tardar horas. |
| Pronunciation Flow no responde con score | El bot necesita el flag `cuna_pronunciation_pending` en `mse_student_profiles.personal_facts`. Verifica que el handler `pronunciacion.ts` lo este seteando. |
