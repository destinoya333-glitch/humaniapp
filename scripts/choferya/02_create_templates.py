#!/usr/bin/env python3
"""
Crea los 7 templates Meta de TuChoferYa.

Uso:
    META_CHOFERYA_ACCESS_TOKEN=EAAxxx \\
    META_CHOFERYA_WABA_ID=XXXXX \\
    python3 scripts/choferya/02_create_templates.py

Si META_CHOFERYA_* no estan setteadas, intenta caer en ECODRIVE_META_ACCESS_TOKEN
y pide WABA_ID como argv[1].

Templates creados (todos en 'es', tono ejecutivo, sin emojis decorativos):
    - choferya_nueva_reserva       UTILITY · quick_reply [Confirmar, Rechazar]
    - choferya_reserva_confirmada  UTILITY · url_button (perfil)
    - choferya_recordatorio_24h    UTILITY · texto
    - choferya_calificar           UTILITY · url_button (form)
    - choferya_renta_t3            UTILITY · texto
    - choferya_renta_t0            UTILITY · texto
    - choferya_bienvenida          MARKETING · url_button (panel)

Notar que Meta tarda 24-48h en aprobar cada template. Verificar status en
https://business.facebook.com/wa/manage/message-templates/
"""

import json
import os
import sys
import urllib.error
import urllib.request


GRAPH = "https://graph.facebook.com/v22.0"


TEMPLATES = [
    # ──────────────────────────────────────────────────────────────────────
    # 1) Nueva reserva al chofer (quick_reply Confirmar / Rechazar)
    # ──────────────────────────────────────────────────────────────────────
    {
        "name": "choferya_nueva_reserva",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Nueva reserva TuChoferYa",
            },
            {
                "type": "BODY",
                "text": (
                    "Pasajero: {{1}}\n"
                    "Fecha: {{2}} {{3}}\n"
                    "Origen: {{4}}\n"
                    "Destino: {{5}}\n"
                    "Precio: S/. {{6}}\n\n"
                    "Tienes 60 minutos para responder."
                ),
                "example": {
                    "body_text": [
                        [
                            "Maria Perez",
                            "viernes 14 nov",
                            "07:30",
                            "Av. Espana 234",
                            "Aeropuerto",
                            "18.00",
                        ]
                    ]
                },
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {"type": "QUICK_REPLY", "text": "Confirmar"},
                    {"type": "QUICK_REPLY", "text": "Rechazar"},
                ],
            },
        ],
    },
    # ──────────────────────────────────────────────────────────────────────
    # 2) Reserva confirmada (al pasajero, con url al perfil chofer)
    # ──────────────────────────────────────────────────────────────────────
    {
        "name": "choferya_reserva_confirmada",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": (
                    "{{1}} confirmo tu reserva para {{2}} a las {{3}}.\n\n"
                    "Yape al chofer: {{4}}\n"
                    "Precio: S/. {{5}}\n\n"
                    "Para coordinar el punto de encuentro, escribele directo."
                ),
                "example": {
                    "body_text": [
                        ["Carlos", "viernes 14 nov", "07:30", "999 888 777", "18.00"]
                    ]
                },
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "URL",
                        "text": "Ver perfil del chofer",
                        "url": "https://chofer.activosya.com/c/{{1}}",
                        "example": ["https://chofer.activosya.com/c/carlos-tru"],
                    }
                ],
            },
        ],
    },
    # ──────────────────────────────────────────────────────────────────────
    # 3) Recordatorio 24h antes (al pasajero)
    # ──────────────────────────────────────────────────────────────────────
    {
        "name": "choferya_recordatorio_24h",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": (
                    "Recordatorio: manana {{1}} a las {{2}} viajas con {{3}} "
                    "({{4}} placa {{5}}).\n\n"
                    "Si necesitas cancelar, escribele directo."
                ),
                "example": {
                    "body_text": [
                        ["viernes 14", "07:30", "Carlos", "Toyota Yaris", "ABC-123"]
                    ]
                },
            }
        ],
    },
    # ──────────────────────────────────────────────────────────────────────
    # 4) Pedir calificacion (al pasajero post-viaje)
    # ──────────────────────────────────────────────────────────────────────
    {
        "name": "choferya_calificar",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": (
                    "Hola {{1}}, gracias por viajar con {{2}}.\n\n"
                    "Tu calificacion ayuda a otros pasajeros a confiar. Toma 10 segundos."
                ),
                "example": {"body_text": [["Maria", "Carlos"]]},
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "URL",
                        "text": "Calificar viaje",
                        "url": "https://chofer.activosya.com/calificar/{{1}}",
                        "example": ["https://chofer.activosya.com/calificar/abc-123"],
                    }
                ],
            },
        ],
    },
    # ──────────────────────────────────────────────────────────────────────
    # 5) Renta T-3 (3 dias antes del vencimiento)
    # ──────────────────────────────────────────────────────────────────────
    {
        "name": "choferya_renta_t3",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": (
                    "Tu suscripcion TuChoferYa vence en 3 dias ({{1}}).\n\n"
                    "Plan {{2}} · S/. {{3}}/mes\n\n"
                    "Para renovar, Yapea S/. {{3}} a 998 102 258 (Percy R.) con detalle TuChoferYa."
                ),
                "example": {"body_text": [["15 dic", "Pro", "79"]]},
            }
        ],
    },
    # ──────────────────────────────────────────────────────────────────────
    # 6) Renta T-0 (dia del vencimiento)
    # ──────────────────────────────────────────────────────────────────────
    {
        "name": "choferya_renta_t0",
        "category": "UTILITY",
        "language": "es",
        "components": [
            {
                "type": "BODY",
                "text": (
                    "Tu suscripcion TuChoferYa vence HOY.\n\n"
                    "Yapea S/. {{1}} a 998 102 258 (Percy R.) con detalle TuChoferYa "
                    "para mantener tu pagina y reservas activas."
                ),
                "example": {"body_text": [["79"]]},
            }
        ],
    },
    # ──────────────────────────────────────────────────────────────────────
    # 7) Bienvenida post-pago (marketing por contener promo y link a panel)
    # ──────────────────────────────────────────────────────────────────────
    {
        "name": "choferya_bienvenida",
        "category": "MARKETING",
        "language": "es",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Cuenta TuChoferYa activada",
            },
            {
                "type": "BODY",
                "text": (
                    "Bienvenido, {{1}}.\n\n"
                    "Tu plan {{2}} esta activo hasta {{3}}. Tu pagina publica esta lista en "
                    "chofer.activosya.com/c/{{4}}\n\n"
                    "Primeros pasos:\n"
                    "1) Configura tus tarifas planas (Centro a Aeropuerto, etc.)\n"
                    "2) Define tus horarios disponibles\n"
                    "3) Descarga tu QR y pegalo en el auto"
                ),
                "example": {
                    "body_text": [["Carlos", "Pro", "15 dic 2026", "carlos-tru"]]
                },
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "URL",
                        "text": "Abrir mi panel",
                        "url": "https://mi.choferya.activosya.com/?token={{1}}",
                        "example": ["https://mi.choferya.activosya.com/?token=xyz"],
                    }
                ],
            },
        ],
    },
]


def post_template(waba_id: str, token: str, tpl: dict) -> dict:
    url = f"{GRAPH}/{waba_id}/message_templates"
    body = json.dumps(tpl).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return {"error_status": e.code, "error_body": json.loads(body)}
        except json.JSONDecodeError:
            return {"error_status": e.code, "error_body": body}


def main():
    token = os.environ.get("META_CHOFERYA_ACCESS_TOKEN") or os.environ.get(
        "ECODRIVE_META_ACCESS_TOKEN"
    )
    waba_id = os.environ.get("META_CHOFERYA_WABA_ID") or (
        sys.argv[1] if len(sys.argv) > 1 else None
    )

    if not token:
        print("ERROR: necesito META_CHOFERYA_ACCESS_TOKEN o ECODRIVE_META_ACCESS_TOKEN")
        sys.exit(1)
    if not waba_id:
        print("ERROR: necesito META_CHOFERYA_WABA_ID o pasalo como argv[1]")
        sys.exit(1)

    print(f"WABA: {waba_id}\nCreando {len(TEMPLATES)} templates...\n")
    for tpl in TEMPLATES:
        name = tpl["name"]
        res = post_template(waba_id, token, tpl)
        if "id" in res:
            print(f"  ✓ {name}  →  id={res['id']}  status={res.get('status', '?')}")
        else:
            print(f"  ✗ {name}  →  {json.dumps(res, indent=2)}")
    print(
        "\nRevisa estado de aprobacion (24-48h) en:\n"
        "https://business.facebook.com/wa/manage/message-templates/"
    )


if __name__ == "__main__":
    main()
