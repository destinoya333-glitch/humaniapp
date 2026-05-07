#!/usr/bin/env python3
"""
Envia un Flow Sofia directo via Meta Cloud Graph API al numero de Percy.
Solo funciona si Percy tiene 24h-window activa con el sender Sofia +51977100718.
"""
import json
import os
import sys
import urllib.request
import urllib.error


PHONE_ID = os.environ["META_SOFIA_PHONE_ID"]
TOKEN = os.environ["META_SOFIA_ACCESS_TOKEN"]
TARGET = os.environ.get("TARGET_PHONE", "+51964304268")  # Percy default
FLOW_ID = os.environ.get("FLOW_ID", "2099053120678509")  # Pacto Cuna default


def send_flow():
    url = f"https://graph.facebook.com/v22.0/{PHONE_ID}/messages"
    body = {
        "messaging_product": "whatsapp",
        "to": TARGET,
        "recipient_type": "individual",
        "type": "interactive",
        "interactive": {
            "type": "flow",
            "header": {"type": "text", "text": "Pacto Cuna"},
            "body": {
                "text": "Hola Percy. Para conocernos y armar tu Pacto Cuna necesito 60 segundos. Abre el formulario y empezamos."
            },
            "footer": {"text": "Miss Sofia · Metodo Cuna"},
            "action": {
                "name": "flow",
                "parameters": {
                    "flow_message_version": "3",
                    "flow_token": f"miss-sofia:pacto-cuna:{TARGET}",
                    "flow_id": FLOW_ID,
                    "flow_cta": "Sellar Pacto",
                    "flow_action": "data_exchange",
                },
            },
        },
    }
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            print(f"Status {r.status}")
            print(r.read().decode())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}")
        print(e.read().decode())


if __name__ == "__main__":
    send_flow()
