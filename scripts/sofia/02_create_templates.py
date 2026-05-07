#!/usr/bin/env python3
"""
Crea los 5 templates Meta de Miss Sofia con flow_action DATA_EXCHANGE.

Uso:
    META_SOFIA_ACCESS_TOKEN=EAAxxx \\
    META_SOFIA_WABA_ID=1623262362222343 \\
    SOFIA_FLOW_ID_PACTO_CUNA=12345 \\
    SOFIA_FLOW_ID_PLAN_ESTUDIO=12346 \\
    SOFIA_FLOW_ID_PAGO=12347 \\
    SOFIA_FLOW_ID_PROGRESO=12348 \\
    SOFIA_FLOW_ID_PRONUNCIACION=12349 \\
    python3 scripts/sofia/02_create_templates.py

Los flow IDs se obtienen del output del script 01_publish_flows.py.

Templates creados (todos en lenguaje 'es'):
    - sofia_pacto_invite        Onboarding Pacto Cuna
    - sofia_plan_estudio_invite Configurar rutina diaria
    - sofia_pago_invite         Activar plan Regular o Premium
    - sofia_progreso_invite     Ver progreso semanal
    - sofia_pronunciacion_invite Test pronunciacion

Tono ejecutivo (no pet names ni emojis decorativos).
"""

import json
import os
import sys
import urllib.error
import urllib.request


GRAPH = "https://graph.facebook.com/v22.0"


TEMPLATES = [
    {
        "name": "sofia_pacto_invite",
        "category": "MARKETING",
        "language": "es",
        "flow_id_env": "SOFIA_FLOW_ID_PACTO_CUNA",
        "body_text": "Hola. Para conocernos y armar tu Pacto Cuna necesito 60 segundos. Abre el formulario y empezamos.",
        "button_text": "Sellar Pacto Cuna",
    },
    {
        "name": "sofia_plan_estudio_invite",
        "category": "UTILITY",
        "language": "es",
        "flow_id_env": "SOFIA_FLOW_ID_PLAN_ESTUDIO",
        "body_text": "Configura tu rutina diaria: hora del audio matutino, modo de practica y dias de la semana.",
        "button_text": "Configurar plan",
    },
    {
        "name": "sofia_pago_invite",
        "category": "MARKETING",
        "language": "es",
        "flow_id_env": "SOFIA_FLOW_ID_PAGO",
        "body_text": "Activa tu plan Regular o Premium. Yape persona-a-persona, sin tarjetas, sin renovaciones automaticas.",
        "button_text": "Ver planes y pagar",
    },
    {
        "name": "sofia_progreso_invite",
        "category": "UTILITY",
        "language": "es",
        "flow_id_env": "SOFIA_FLOW_ID_PROGRESO",
        "body_text": "Aqui esta tu progreso de esta semana: fase, tiempo de boca, palabras tuyas y proximo capitulo de tu novela.",
        "button_text": "Ver mi progreso",
    },
    {
        "name": "sofia_pronunciacion_invite",
        "category": "UTILITY",
        "language": "es",
        "flow_id_env": "SOFIA_FLOW_ID_PRONUNCIACION",
        "body_text": "Test rapido de pronunciacion. Te muestro una frase, la grabas en audio y te puntuo 0-100 con feedback.",
        "button_text": "Empezar test",
    },
]


def env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "").strip()
    if required and not v:
        print(f"ERROR: env var {name} requerida.", file=sys.stderr)
        sys.exit(1)
    return v


def post_json(url: str, token: str, body: dict):
    data = json.dumps(body).encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="ignore")
        print(f"HTTP {e.code} {url}\n{body_err}", file=sys.stderr)
        raise


def create_template(waba_id: str, token: str, tpl: dict):
    flow_id = env(tpl["flow_id_env"])
    body = {
        "name": tpl["name"],
        "language": tpl["language"],
        "category": tpl["category"],
        "components": [
            {
                "type": "BODY",
                "text": tpl["body_text"],
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "FLOW",
                        "text": tpl["button_text"],
                        "flow_id": flow_id,
                        "flow_action": "DATA_EXCHANGE",
                        "navigate_screen": None,
                    }
                ],
            },
        ],
    }
    url = f"{GRAPH}/{waba_id}/message_templates"
    return post_json(url, token, body)


def main():
    token = env("META_SOFIA_ACCESS_TOKEN")
    waba_id = env("META_SOFIA_WABA_ID")

    print(f"Creando {len(TEMPLATES)} templates en WABA {waba_id}...\n")

    for tpl in TEMPLATES:
        print(f"=== {tpl['name']} ===")
        try:
            r = create_template(waba_id, token, tpl)
            print(f"  Creado. status={r.get('status')} id={r.get('id')}")
        except urllib.error.HTTPError as e:
            body_err = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else ""
            if "2388024" in body_err or "already exists" in body_err.lower():
                print(f"  Template ya existe (skip).")
            else:
                print(f"  ERROR: {e}")

    print("\nListo. Espera aprobacion Meta (~minutos a horas).")
    print("Una vez APPROVED puedes mandarlos via Meta Cloud API.")


if __name__ == "__main__":
    main()
