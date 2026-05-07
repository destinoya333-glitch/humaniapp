#!/usr/bin/env python3
"""Prueba diferentes schemas de twilio/flows hasta encontrar el correcto."""
import base64
import json
import os
import sys
import urllib.request
import urllib.error


SID = os.environ["TWILIO_SOFIA_ACCOUNT_SID"]
TOK = os.environ["TWILIO_SOFIA_AUTH_TOKEN"]
FLOW_ID = "2099053120678509"  # Pacto Cuna

AUTH = "Basic " + base64.b64encode(f"{SID}:{TOK}".encode()).decode()


def post(body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        "https://content.twilio.com/v1/Content",
        data=data,
        method="POST",
        headers={"Authorization": AUTH, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()


# Variantes a probar
variants = [
    {
        "name": "v1: solo flow_id + pages [] + type",
        "body": {
            "friendly_name": "sofia_test_v1",
            "language": "es",
            "types": {
                "twilio/flows": {
                    "body": "Test",
                    "button_text": "Open",
                    "subtype": "data_exchange",
                    "flow_id": FLOW_ID,
                    "type": "WhatsAppFlows",
                    "pages": [],
                }
            },
        },
    },
    {
        "name": "v2: subtype + pages con 1 page dummy",
        "body": {
            "friendly_name": "sofia_test_v2",
            "language": "es",
            "types": {
                "twilio/flows": {
                    "body": "Test",
                    "button_text": "Open",
                    "subtype": "data_exchange",
                    "flow_id": FLOW_ID,
                    "type": "WhatsAppFlows",
                    "pages": [{"id": "PACTO", "title": "Pacto Cuna"}],
                }
            },
        },
    },
    {
        "name": "v3: sin flow_id, solo pages inline",
        "body": {
            "friendly_name": "sofia_test_v3",
            "language": "es",
            "types": {
                "twilio/flows": {
                    "body": "Test",
                    "button_text": "Open",
                    "subtype": "data_exchange",
                    "type": "WhatsAppFlows",
                    "pages": [
                        {
                            "id": "PACTO",
                            "title": "Pacto Cuna",
                            "layout": [
                                {"type": "TextHeading", "text": "Test"},
                            ],
                            "actions": [
                                {"type": "complete", "name": "submit", "label": "OK"}
                            ],
                        }
                    ],
                }
            },
        },
    },
    {
        "name": "v4: usar twilio/whatsapp-card en lugar",
        "body": {
            "friendly_name": "sofia_test_v4",
            "language": "es",
            "types": {
                "twilio/card": {
                    "title": "Pacto Cuna",
                    "subtitle": "60 segundos",
                    "actions": [
                        {
                            "type": "FLOW",
                            "flow_id": FLOW_ID,
                            "title": "Sellar Pacto",
                        }
                    ],
                }
            },
        },
    },
]


for v in variants:
    print(f"\n=== {v['name']} ===")
    s, b = post(v["body"])
    if s == 200 or s == 201:
        d = json.loads(b)
        print(f"  OK sid={d.get('sid')}")
    else:
        print(f"  FAIL {s}: {b[:300]}")
