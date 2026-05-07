#!/usr/bin/env python3
"""Inspecciona el token EcoDrive: dueno, app, scopes, businesses."""
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


def call(url):
    try:
        with urllib.request.urlopen(url) as r:
            return r.status, r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")


def main():
    env = load_env(os.path.join(os.path.dirname(__file__), "..", "..", ".env.vercel.tmp"))
    token = env.get("ECODRIVE_META_ACCESS_TOKEN", "")

    print("--- /me (quien es el actor) ---")
    s, b = call(f"https://graph.facebook.com/v22.0/me?access_token={token}")
    print(f"Status: {s}")
    print(b)

    print("\n--- /me/businesses (Business Managers que el actor puede ver) ---")
    s, b = call(f"https://graph.facebook.com/v22.0/me/businesses?fields=id,name&access_token={token}")
    print(f"Status: {s}")
    print(b)

    print("\n--- debug_token (scopes + app + business) ---")
    s, b = call(
        f"https://graph.facebook.com/v22.0/debug_token?input_token={token}&access_token={token}"
    )
    print(f"Status: {s}")
    print(b)


if __name__ == "__main__":
    main()
