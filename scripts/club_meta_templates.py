"""
Crea los 8 templates Meta WhatsApp del programa EcoDrive+ Club.

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
        "name": "club_ticket_confirmado",
        "language": "es",
        "category": "UTILITY",
        "components": [
            {"type": "HEADER", "format": "TEXT", "text": "EcoDrive+ Club"},
            {"type": "BODY", "text": "¡Listo {{1}}! Tu ticket #{{2}} para el sorteo del {{3}} está confirmado. Te avisamos por aquí cuando se ejecute el sorteo.",
             "example": {"body_text": [["Percy", "0042", "BYD Yuan Pro"]]}},
            {"type": "FOOTER", "text": "EcoDrive Plus SAC"},
        ],
    },
    {
        "name": "club_pass_confirmado",
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
        "name": "club_pass_renovacion",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "Hola {{1}}, tu Club Pass vence en 30 días. Renová ahora con 20% off ({{2}}) y mantené tu bonus de lealtad de {{3}} tickets por sorteo.",
             "example": {"body_text": [["Percy", "S/.79", "3"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Renovar Pass", "url": "https://ecodriveplus.com/club?renovar=1"}
            ]},
        ],
    },
    {
        "name": "club_edicion_abierta",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "HEADER", "format": "TEXT", "text": "Nueva edición Club #{{1}}"},
            {"type": "BODY", "text": "{{1}}, abrimos la edición #{{2}} con {{3}} de premio. Tu Pass te asignó automáticamente el ticket #{{4}}. Suerte!",
             "example": {"body_text": [["Percy", "2", "BYD Dolphin Mini", "0123"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Ver edición", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_progreso_milestone",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "Ya vendimos {{1}} tickets de {{2}} para el sorteo del {{3}}. Faltan {{4}} para sortear el premio. Comprá el tuyo antes que se acabe.",
             "example": {"body_text": [["1500", "3000", "BYD Yuan Pro", "1500"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Comprar ticket", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_ultimos_100",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "{{1}}, quedan solo {{2}} tickets para sortear el {{3}}. No te quedes afuera — comprá el tuyo ahora.",
             "example": {"body_text": [["Percy", "100", "BYD Yuan Pro"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Comprar ahora", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_ganador_anuncio",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "HEADER", "format": "TEXT", "text": "Tenemos ganador!"},
            {"type": "BODY", "text": "El ganador del {{1}} es {{2}} con el ticket #{{3}}. Felicitaciones! Mira el video del sorteo en el link.",
             "example": {"body_text": [["BYD Yuan Pro", "Juan P.", "1847"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Ver sorteo en video", "url": "https://ecodriveplus.com/club"}
            ]},
        ],
    },
    {
        "name": "club_no_ganador_descuento",
        "language": "es",
        "category": "MARKETING",
        "components": [
            {"type": "BODY", "text": "Hola {{1}}, no ganaste esta edición pero te damos 20% off en tu próximo ticket Club. Codigo: {{2}}. Válido 30 días.",
             "example": {"body_text": [["Percy", "GAR20"]]}},
            {"type": "BUTTONS", "buttons": [
                {"type": "URL", "text": "Usar descuento", "url": "https://ecodriveplus.com/club?promo=GAR20"}
            ]},
        ],
    },
]

URL = f"https://graph.facebook.com/v21.0/{WABA}/message_templates"

ok = 0
fail = 0
for tpl in TEMPLATES:
    body = json.dumps(tpl).encode("utf-8")
    req = urllib.request.Request(URL, data=body, method="POST",
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        resp = json.loads(r.read().decode("utf-8"))
        print(f"[OK]   {tpl['name']:35s} id={resp.get('id')} status={resp.get('status')}")
        ok += 1
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode("utf-8"))
        if err.get("error", {}).get("error_subcode") == 2388023:
            print(f"[SKIP] {tpl['name']:35s} ya existe")
            ok += 1
        else:
            print(f"[FAIL] {tpl['name']:35s} {err.get('error',{}).get('message')}")
            fail += 1

print(f"\nTotal: {ok} ok, {fail} fail de {len(TEMPLATES)}")
