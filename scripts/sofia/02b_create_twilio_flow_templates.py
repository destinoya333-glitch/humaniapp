#!/usr/bin/env python3
"""
Crea los 5 Twilio Content Templates tipo twilio/flows para Miss Sofia.

A diferencia del script 02_create_templates.py (que crea templates Meta Cloud
directo), ESTE crea templates Twilio Content API que renderizan los Flows del
WABA Sofia. Sirve cuando Sofia se mantiene en Twilio (Plan Master 2026-05-03)
en lugar de migrar a Meta Cloud directo.

Twilio recibe el flow_id de Meta y se encarga del rendering. La WABA Sofia
debe estar conectada a Twilio (que es el caso, sender +51977100718 ya esta
sobre el WABA Sofia 1623262362222343).

Uso:
    TWILIO_SOFIA_ACCOUNT_SID=ACxxx \\
    TWILIO_SOFIA_AUTH_TOKEN=xxx \\
    SOFIA_FLOW_ID_PACTO_CUNA=12345 \\
    SOFIA_FLOW_ID_PLAN_ESTUDIO=12346 \\
    SOFIA_FLOW_ID_PAGO=12347 \\
    SOFIA_FLOW_ID_PROGRESO=12348 \\
    SOFIA_FLOW_ID_PRONUNCIACION=12349 \\
    python3 scripts/sofia/02b_create_twilio_flow_templates.py

Despues de crear los templates Twilio:
    1. Obtener los ContentSid (HX...) que Twilio devuelve.
    2. Submitir cada uno para approval Meta via /Content/{Sid}/ApprovalRequests/whatsapp
    3. Una vez approved, mandarlos con sendContentTemplate({contentSid: HX..., variables}).

Doc: https://www.twilio.com/docs/content/twilioflows
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request


TWILIO_API = "https://content.twilio.com/v1/Content"


TEMPLATES = [
    {
        "friendly_name": "sofia_pacto_invite",
        "flow_env": "SOFIA_FLOW_ID_PACTO_CUNA",
        "body": "Hola. Para conocernos y armar tu Pacto Cuna necesito 60 segundos. Abre el formulario y empezamos.",
        "button": "Sellar Pacto Cuna",
        "approval": {
            "name": "sofia_pacto_invite",
            "category": "MARKETING",
        },
    },
    {
        "friendly_name": "sofia_plan_estudio_invite",
        "flow_env": "SOFIA_FLOW_ID_PLAN_ESTUDIO",
        "body": "Configura tu rutina diaria: hora del audio matutino, modo de practica y dias de la semana.",
        "button": "Configurar plan",
        "approval": {
            "name": "sofia_plan_estudio_invite",
            "category": "UTILITY",
        },
    },
    {
        "friendly_name": "sofia_pago_invite",
        "flow_env": "SOFIA_FLOW_ID_PAGO",
        "body": "Activa tu plan Regular o Premium. Yape persona-a-persona, sin tarjetas, sin renovaciones automaticas.",
        "button": "Ver planes y pagar",
        "approval": {
            "name": "sofia_pago_invite",
            "category": "MARKETING",
        },
    },
    {
        "friendly_name": "sofia_progreso_invite",
        "flow_env": "SOFIA_FLOW_ID_PROGRESO",
        "body": "Aqui esta tu progreso de esta semana: fase, tiempo de boca, palabras tuyas y proximo capitulo de tu novela.",
        "button": "Ver mi progreso",
        "approval": {
            "name": "sofia_progreso_invite",
            "category": "UTILITY",
        },
    },
    {
        "friendly_name": "sofia_pronunciacion_invite",
        "flow_env": "SOFIA_FLOW_ID_PRONUNCIACION",
        "body": "Test rapido de pronunciacion. Te muestro una frase, la grabas en audio y te puntuo 0-100 con feedback.",
        "button": "Empezar test",
        "approval": {
            "name": "sofia_pronunciacion_invite",
            "category": "UTILITY",
        },
    },
]


def env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "").strip()
    if required and not v:
        print(f"ERROR: env var {name} requerida.", file=sys.stderr)
        sys.exit(1)
    return v


def basic_auth(sid: str, token: str) -> str:
    return base64.b64encode(f"{sid}:{token}".encode()).decode()


def post_json(url: str, auth: str, body: dict):
    headers = {
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="ignore")
        print(f"HTTP {e.code} POST {url}\n{body_err}", file=sys.stderr)
        raise


def create_twilio_flow_template(auth: str, tpl: dict) -> dict:
    """Crea un Content Template tipo twilio/flows."""
    flow_id = env(tpl["flow_env"])
    # Twilio Content API estructura para flows
    body = {
        "friendly_name": tpl["friendly_name"],
        "language": "es",
        "types": {
            "twilio/flows": {
                "body": tpl["body"],
                "button_text": tpl["button"],
                "subtype": "data_exchange",
                "flow_id": flow_id,
            }
        },
    }
    return post_json(TWILIO_API, auth, body)


def submit_approval(auth: str, content_sid: str, approval: dict) -> dict:
    """Manda el template a aprobacion Meta."""
    url = f"{TWILIO_API}/{content_sid}/ApprovalRequests/whatsapp"
    return post_json(
        url,
        auth,
        {
            "name": approval["name"],
            "category": approval["category"],
        },
    )


def main():
    sid = env("TWILIO_SOFIA_ACCOUNT_SID")
    token = env("TWILIO_SOFIA_AUTH_TOKEN")
    auth = basic_auth(sid, token)

    print(f"Creando {len(TEMPLATES)} templates Twilio Content API tipo twilio/flows\n")

    for tpl in TEMPLATES:
        print(f"=== {tpl['friendly_name']} ===")
        try:
            r = create_twilio_flow_template(auth, tpl)
            content_sid = r.get("sid")
            print(f"  Creado. ContentSid={content_sid}")

            print(f"  Enviando a aprobacion Meta...")
            ar = submit_approval(auth, content_sid, tpl["approval"])
            print(f"  Approval status: {ar.get('status', '?')}")
            print(f"  Para usar: sendContentTemplate({{contentSid: '{content_sid}', ...}})")
        except urllib.error.HTTPError as e:
            print(f"  ERROR: {e}")

    print("\nListo. Espera aprobacion Meta (~minutos a horas).")
    print("Verifica status con: GET https://content.twilio.com/v1/Content/{Sid}/ApprovalRequests")


if __name__ == "__main__":
    main()
