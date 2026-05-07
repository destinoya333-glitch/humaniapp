#!/usr/bin/env python3
"""Descubre el WABA Sofia real consultando Twilio sender."""
import base64
import os
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
            while v.endswith("\\n") or v.endswith("\\r"):
                v = v[:-2]
            v = v.rstrip("\n").rstrip("\r")
            out[k] = v
    return out


def get(url, auth_header):
    req = urllib.request.Request(url, headers={"Authorization": auth_header})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")


def main():
    env = load_env(os.path.join(os.path.dirname(__file__), "..", "..", ".env.vercel.tmp"))
    sid = env.get("TWILIO_SOFIA_ACCOUNT_SID", "")
    tok = env.get("TWILIO_SOFIA_AUTH_TOKEN", "")
    auth = "Basic " + base64.b64encode(f"{sid}:{tok}".encode()).decode()

    print(f"Twilio Sofia SID: {sid}")
    print(f"Auth len: {len(auth)}\n")

    # Lista senders WhatsApp
    print("--- Senders Twilio Sofia ---")
    s, b = get("https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp", auth)
    print(f"Status: {s}")
    print(b[:3000])

    # Twilio expone WABA configurado en cada sender en .properties.waba_id
    if s == 200:
        try:
            data = json.loads(b)
            for sender in data.get("senders", []):
                props = sender.get("properties", {})
                print(f"\nSender: {sender.get('sender_id', '?')}")
                print(f"  WABA ID: {props.get('waba_id', 'NO_WABA')}")
                print(f"  Phone Number ID Meta: {props.get('phone_number_id', '?')}")
        except Exception as e:
            print(f"Parse error: {e}")


if __name__ == "__main__":
    main()
