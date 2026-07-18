"""
Crea los 8 templates Meta WhatsApp del programa EcoDrive+ Club.

Vocabulario: "ticket" se reemplaza por "Número de Socio" alineado con
el modelo full-membresía Club.

Uso:
  $env:ECODRIVE_META_ACCESS_TOKEN = "tu_token"
  $env:ECODRIVE_META_WABA_ID = "1312587653282767"
  python scripts/club_meta_templates.py

Cada template se valida y se crea via Graph API v21.0. Si ya existe (nombre+language),
Meta devuelve error 100 con subcode 2388023 — el script lo trata como exito.
"""
import os, json, urllib.request, urllib.error

TOKEN = os.environ.get("ECODRIVE_META_ACCESS_TOKEN")
WABA = os.environ.get("ECODRIVE_META_WABA_ID", "1312587653282767")
assert TOKEN, "Falta ECODRIVE_META_ACCESS_TOKEN en env"

TEMPLATES = [
    {
        "name": "club_numero_socio_confirmado_v2",
        "language": "es",
        "category": "UTILITY",
        "components": [
            {"type": "HEADER", "format": "TEXT", "text": "EcoDrive+ Club"},
            {"type": "BODY", "text": "¡Listo {{1}}! Tu Número de Socio #{{2}} para el sorteo del {{3}} está confirmado. Te avisamos por aquí cuando se ejecute el sorteo.",
             "example": {"body_text": [["Percy", "0042", "BYD Yuan Pro"]]}},
            {"type": "FOOTER", "text": "EcoDrive Plus SAC"},
        ],
    },
    {
        "name": "club_pass_confirmado_v2",
        "language": "es",
        "category": "UTILITY",
        "components": [
            {"type": "HEADER", "format": "TEXT", "text": "Club Pass activado"},
            {"type": "BODY", "text": "Hola {{1}}, tu Club Pass está activo hasta {{2}}. Participás automáticamente en cada sorteo del año + bonus por lealtad.",
             "example": {"body_text": [["Percy", "2027-05-17"]]}},
            {"type": "FOOTER", "text": "EcoDrive+ Club"},
        ],
    },
    {
        "name": "club_pass_renovacion_v2",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "Hola {{1}}, tu Club Pass vence en 30 días. Renová ahora con 20% off ({{2}}) y mantené tu bonus de lealtad de {{3}} Números de Socio por sorteo.",
             "example": {"body_text": [["Percy", "S/.79", "3"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Renovar Pass", "url": "https://ecodriveplus.com/club?renovar=1"}
            ]},
        ],
    },
    {
        "name": "club_edicion_abierta_v2",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "HEADER", "format": "TEXT", "text": "Nueva edición Club #{{1}}",
             "example": {"header_text": ["2"]}},
            {"type": "BODY", "text": "Hola {{1}}, abrimos la edición #{{2}} con {{3}} de premio. Tu Pass te asignó automáticamente el Número de Socio #{{4}}. ¡Suerte!",
             "example": {"body_text": [["Percy", "2", "BYD Dolphin Mini", "0123"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Ver edición", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_progreso_milestone_v2",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "Ya asignamos {{1}} Números de Socio de {{2}} para el sorteo del {{3}}. Faltan {{4}} para sortear el premio. Sumate antes que se complete.",
             "example": {"body_text": [["1500", "3000", "BYD Yuan Pro", "1500"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Hacerme socio", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_ultimos_100_v2",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "Hola {{1}}, quedan solo {{2}} Números de Socio disponibles para sortear el {{3}}. Sumate al Club antes que se complete.",
             "example": {"body_text": [["Percy", "100", "BYD Yuan Pro"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Hacerme socio", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_ganador_anuncio_v2",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "HEADER", "format": "TEXT", "text": "¡Tenemos ganador!"},
            {"type": "BODY", "text": "El ganador del {{1}} es {{2}} con el Número de Socio #{{3}}. ¡Felicitaciones! Mirá el video del sorteo en el link.",
             "example": {"body_text": [["BYD Yuan Pro", "Juan P.", "1847"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Ver sorteo en video", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_no_ganador_descuento_v2",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "Hola {{1}}, no ganaste esta edición pero te damos 20% off en tu próximo Club Pass. Código: {{2}}. Válido 30 días.",
             "example": {"body_text": [["Percy", "CLUB20"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Usar descuento", "url": "https://ecodriveplus.com/club?promo=CLUB20"}
            ]},
        ],
    },
]

URL = f"https://graph.facebook.com/v21.0/{WABA}/message_templates"

def list_existing():
    """Lista templates club_* existentes en el WABA."""
    req = urllib.request.Request(
        f"{URL}?fields=name,id,status,language&limit=100",
        headers={"Authorization": f"Bearer {TOKEN}"},
    )
    try:
        r = urllib.request.urlopen(req, timeout=30)
        data = json.loads(r.read().decode("utf-8"))
        return [t for t in data.get("data", []) if t["name"].startswith("club_")]
    except Exception as e:
        print(f"[WARN] No pude listar templates existentes: {e}")
        return []

def delete_template(name):
    """Borra un template por nombre (Meta acepta DELETE por name)."""
    req = urllib.request.Request(
        f"{URL}?name={name}",
        method="DELETE",
        headers={"Authorization": f"Bearer {TOKEN}"},
    )
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return True, r.read().decode("utf-8")[:200]
    except urllib.error.HTTPError as e:
        return False, e.read().decode("utf-8")[:200]

def create_template(tpl):
    body = json.dumps(tpl).encode("utf-8")
    req = urllib.request.Request(
        URL, data=body, method="POST",
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return True, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return False, json.loads(e.read().decode("utf-8"))

# 1. Inventario (no borra, solo informa)
print("=== Inventario actual de templates club_* ===")
existing = list_existing()
for t in existing:
    print(f"  - {t['name']:40s} id={t.get('id')} status={t.get('status')}")

# 2. Crear templates nuevos (los nombres reservados se reciclan con sufijo _v2)
print(f"\n=== Creando {len(TEMPLATES)} templates con copy 'Número de Socio' ===")
ok_count = 0
fail_count = 0
for tpl in TEMPLATES:
    ok, resp = create_template(tpl)
    if ok:
        print(f"[OK]   {tpl['name']:35s} id={resp.get('id')} status={resp.get('status')}")
        ok_count += 1
    else:
        err = resp.get("error", {})
        if err.get("error_subcode") == 2388023:
            print(f"[SKIP] {tpl['name']:35s} ya existe")
            ok_count += 1
        else:
            print(f"[FAIL] {tpl['name']:35s} {err.get('message')} (code={err.get('code')} sub={err.get('error_subcode')})")
            fail_count += 1

print(f"\nTotal: {ok_count} ok, {fail_count} fail de {len(TEMPLATES)}")
