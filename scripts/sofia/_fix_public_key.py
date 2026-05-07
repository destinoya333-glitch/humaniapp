#!/usr/bin/env python3
"""
Extrae la public key real desde WA_FLOWS_PRIVATE_KEY (Vercel) y la registra
en el phone Sofia, reemplazando la mismatched.
"""
import os
import re
import sys
import urllib.parse
import urllib.request
import urllib.error

from cryptography.hazmat.primitives import serialization


def load_env(path):
    out = {}
    with open(path, encoding="utf-8") as f:
        content = f.read()
    # Match KEY="VALUE" multi-line
    for m in re.finditer(r'^([A-Z_]+)="(.*?)"$', content, re.MULTILINE | re.DOTALL):
        out[m.group(1)] = m.group(2)
    return out


def main():
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.vercel.tmp")
    env = load_env(env_path)
    raw_pk = env.get("WA_FLOWS_PRIVATE_KEY", "")
    # Convert literal \r\n / \n to real newlines (vercel pull guarda con \r\n literales)
    pk_pem = raw_pk.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\r", "\n")
    print(f"Private key length after fix: {len(pk_pem)}")
    print(f"Starts with: {pk_pem[:60]!r}")

    # Cargar private + extraer public
    priv = serialization.load_pem_private_key(pk_pem.encode(), password=None)
    pub = priv.public_key()
    pub_pem = pub.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()

    print("\n--- Public key derivada de la private de Vercel ---")
    print(pub_pem)

    # Registrar en phone Sofia
    token = os.environ.get("META_SOFIA_ACCESS_TOKEN", "")
    phone_id = os.environ.get("META_SOFIA_PHONE_ID", "")
    if not token or not phone_id:
        print("Set META_SOFIA_ACCESS_TOKEN + META_SOFIA_PHONE_ID")
        sys.exit(1)

    url = f"https://graph.facebook.com/v22.0/{phone_id}/whatsapp_business_encryption"
    data = urllib.parse.urlencode({"business_public_key": pub_pem}).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            print(f"\nRegister response: {r.read().decode()}")
    except urllib.error.HTTPError as e:
        print(f"Error: {e.code} {e.read().decode()}")

    # Verificar
    req2 = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req2) as r:
        print(f"\nVerify: {r.read().decode()}")


if __name__ == "__main__":
    main()
