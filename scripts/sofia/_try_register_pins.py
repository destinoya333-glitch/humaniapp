#!/usr/bin/env python3
"""Prueba PINs comunes para registrar el phone Sofia."""
import json
import os
import sys
import urllib.request
import urllib.error

TOKEN = os.environ["META_SOFIA_ACCESS_TOKEN"]
PHONE_ID = "993581680516098"

CANDIDATES = [
    "100718",   # ultimos 6 del phone
    "977100",   # primeros 6 sin 51
    "519771",   # 51977100 truncado
    "123456",   # default obvio
    "000000",   # default obvio
    "111111",
    "999999",
]


def try_pin(pin):
    url = f"https://graph.facebook.com/v22.0/{PHONE_ID}/register"
    data = json.dumps({"messaging_product": "whatsapp", "pin": pin}).encode()
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
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")


for pin in CANDIDATES:
    s, b = try_pin(pin)
    if s == 200 or s == 201:
        print(f"OK PIN={pin}: {b[:200]}")
        sys.exit(0)
    if "133005" in b or "PIN Mismatch" in b or "PIN incorrecto" in b:
        print(f"NO {pin}")
        continue
    # Otros errores raros
    print(f"OTHER {pin}: {s} {b[:200]}")

print("\nNinguno funciono. Hay que resetear PIN en Meta UI o usar Twilio API.")
