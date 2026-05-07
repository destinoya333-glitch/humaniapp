#!/usr/bin/env python3
"""
Registra la public key RSA del par WA_FLOWS en el phone Sofia para que Meta
pueda firmar/verificar los Flow requests.

La privada vive en Vercel como WA_FLOWS_PRIVATE_KEY (compartida con EcoDrive+).
La publica esta en este script (literal). Es la MISMA key, registrada en el
phone Sofia como ya esta en el phone EcoDrive+.

Uso:
    META_SOFIA_ACCESS_TOKEN=EAAxxx \\
    META_SOFIA_PHONE_ID=<phone_id_sofia> \\
    python3 scripts/sofia/03_register_encryption_key.py

Notas:
- La key es la misma del repo EcoDrive+ (Documents/ECODRIVE+/.../flow_public.pem).
- Si ya esta registrada con la misma huella, Meta retorna 200 sin cambios.
- Se hace via /{phone_id}/whatsapp_business_encryption.
"""

import os
import sys
import urllib.error
import urllib.parse
import urllib.request


GRAPH = "https://graph.facebook.com/v22.0"

PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw1+aXxE555eRgJZVQLAi
iOQrQgyN3f64vlFVSnV1lIu5MHqk+zQ5WztuzaNzKP83gsWMyBXlWT+nDUG3hxlZ
vyYbL2mW1Xl0EqCu0wSygH4ITvyMCDe7aL9LQhWs/uhZ/hUYqzzTrNwajUt1fr/g
iZuHbzuim3Ji7XqNyQXz1fsQlVhvrqnv05gx7N8HGCQN2xRWtNVtgMdAwXRnbpBk
yI5hvV2bN3uJW53ixZMB/xIDeszRiRU+e6EwwwTcZEui5B3Dl+urYxklyj2GkhnH
k+QX/ppHIHV35aP9eyJIXPu1ba8LTERuWRHM+WNc1WSJrbY5vCGo0Z0Kjl5Pk9SS
0QIDAQAB
-----END PUBLIC KEY-----
"""


def env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "").strip()
    if required and not v:
        print(f"ERROR: env var {name} requerida.", file=sys.stderr)
        sys.exit(1)
    return v


def post_form(url: str, token: str, fields: dict):
    data = urllib.parse.urlencode(fields).encode()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode() or ""
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="ignore")
        print(f"HTTP {e.code} POST {url}\n{body_err}", file=sys.stderr)
        raise


def get_status(url: str, token: str):
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode() or ""
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="ignore")
        return f"HTTP {e.code}: {body_err}"


def main():
    token = env("META_SOFIA_ACCESS_TOKEN")
    phone_id = env("META_SOFIA_PHONE_ID")

    url = f"{GRAPH}/{phone_id}/whatsapp_business_encryption"

    print(f"Registrando public key en phone {phone_id}...")
    out = post_form(url, token, {"business_public_key": PUBLIC_KEY_PEM})
    print(f"  Response: {out}")

    print(f"\nVerificando estado...")
    status = get_status(url, token)
    print(f"  {status}")

    print("\nListo. La key registrada debe estar VALID. Si VALID, Sofia Flows ya pueden encriptar/decriptar.")


if __name__ == "__main__":
    main()
