#!/usr/bin/env python3
"""Valida el token nuevo de Percy contra ambos WABAs."""
import json
import sys
import urllib.request
import urllib.error


TOKEN = sys.argv[1] if len(sys.argv) > 1 else ""


def call(url):
    try:
        with urllib.request.urlopen(url) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")


def main():
    if not TOKEN:
        print("Pasa el token como arg.")
        sys.exit(1)

    print("--- /me ---")
    s, b = call(f"https://graph.facebook.com/v22.0/me?access_token={TOKEN}")
    print(f"  {s}: {b[:200]}")

    print("\n--- debug_token ---")
    s, b = call(f"https://graph.facebook.com/v22.0/debug_token?input_token={TOKEN}&access_token={TOKEN}")
    print(f"  {s}")
    if s == 200:
        d = json.loads(b)
        data = d.get("data", {})
        print(f"  app: {data.get('application')} ({data.get('app_id')})")
        print(f"  type: {data.get('type')}")
        print(f"  scopes: {data.get('scopes')}")
        print(f"  granular_scopes: {json.dumps(data.get('granular_scopes', []), indent=2)}")
        print(f"  expires_at: {data.get('expires_at')}")

    print("\n--- WABA EcoDrive 1312587653282767 ---")
    s, b = call(f"https://graph.facebook.com/v22.0/1312587653282767/phone_numbers?access_token={TOKEN}")
    print(f"  {s}: {b[:300]}")

    print("\n--- WABA Sofia 1623262362222343 ---")
    s, b = call(f"https://graph.facebook.com/v22.0/1623262362222343/phone_numbers?access_token={TOKEN}")
    print(f"  {s}: {b[:600]}")


if __name__ == "__main__":
    main()
