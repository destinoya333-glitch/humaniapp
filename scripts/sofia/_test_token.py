#!/usr/bin/env python3
"""Helper para limpiar token y validar contra WABAs."""
import os
import sys
import json
import urllib.request
import urllib.error


def load_env(path):
    out = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            v = v.strip().strip('"').strip("'")
            # Remove trailing literal \n that Vercel CLI adds
            while v.endswith("\\n") or v.endswith("\\r"):
                v = v[:-2]
            v = v.rstrip("\n").rstrip("\r")
            out[k] = v
    return out


def get(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")


def main():
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.vercel.tmp")
    env = load_env(env_path)
    token = env.get("ECODRIVE_META_ACCESS_TOKEN", "")
    print(f"Token len: {len(token)}, ends with: ...{token[-10:]}")

    waba_eco = "1312587653282767"
    waba_sofia = "1623262362222343"

    print("\n--- EcoDrive WABA (debe responder OK) ---")
    s, b = get(f"https://graph.facebook.com/v22.0/{waba_eco}/phone_numbers", token)
    print(f"Status: {s}")
    print(b[:600])

    print("\n--- Sofia WABA (esperamos OK si el token tiene permisos cross-WABA) ---")
    s, b = get(f"https://graph.facebook.com/v22.0/{waba_sofia}/phone_numbers", token)
    print(f"Status: {s}")
    print(b[:600])


if __name__ == "__main__":
    main()
