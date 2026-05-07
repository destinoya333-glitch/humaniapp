#!/usr/bin/env python3
"""
Lista flows + templates Meta del WABA Sofia + estado encryption del phone.

Uso:
    META_SOFIA_ACCESS_TOKEN=EAAxxx \\
    META_SOFIA_WABA_ID=1623262362222343 \\
    META_SOFIA_PHONE_ID=<phone_id_sofia>  \\
    python3 scripts/sofia/00_list_existing.py

Output:
    1. Lista de flows existentes (id, name, status, categories)
    2. Lista de templates con prefijo "sofia_" o que contengan flow buttons
    3. Estado de encryption registrada en el phone (public key configurada o no)

Sirve para saber QUE existe antes de crear cosas duplicadas.
"""

import json
import os
import sys
import urllib.error
import urllib.request


GRAPH = "https://graph.facebook.com/v22.0"


def env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "").strip()
    if required and not v:
        print(f"ERROR: env var {name} requerida.", file=sys.stderr)
        sys.exit(1)
    return v


def get_json(url: str, token: str):
    req = urllib.request.Request(
        url,
        method="GET",
        headers={"Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        return {"_error": True, "_status": e.code, "_body": body}


def list_flows(waba_id: str, token: str):
    out = []
    url = f"{GRAPH}/{waba_id}/flows?limit=100"
    while url:
        r = get_json(url, token)
        if r.get("_error"):
            print(f"  ERROR listar flows: {r['_status']} {r['_body'][:300]}")
            return out
        out.extend(r.get("data", []))
        url = (r.get("paging") or {}).get("next") or None
    return out


def list_templates(waba_id: str, token: str):
    out = []
    url = (
        f"{GRAPH}/{waba_id}/message_templates?"
        f"fields=name,language,status,category,components&limit=200"
    )
    while url:
        r = get_json(url, token)
        if r.get("_error"):
            print(f"  ERROR listar templates: {r['_status']} {r['_body'][:300]}")
            return out
        out.extend(r.get("data", []))
        url = (r.get("paging") or {}).get("next") or None
    return out


def has_flow_button(template: dict) -> bool:
    for c in template.get("components", []):
        if c.get("type") != "BUTTONS":
            continue
        for b in c.get("buttons", []):
            if b.get("type") == "FLOW":
                return True
    return False


def get_encryption_status(phone_id: str, token: str):
    url = f"{GRAPH}/{phone_id}/whatsapp_business_encryption"
    return get_json(url, token)


def main():
    token = env("META_SOFIA_ACCESS_TOKEN")
    waba_id = env("META_SOFIA_WABA_ID")
    phone_id = env("META_SOFIA_PHONE_ID", required=False)

    print(f"=" * 60)
    print(f"WABA Sofia: {waba_id}")
    print(f"=" * 60)

    print("\n--- FLOWS existentes ---")
    flows = list_flows(waba_id, token)
    if not flows:
        print("  (vacio o sin permisos)")
    for f in flows:
        cats = f.get("categories") or []
        print(f"  {f.get('id'):20s} {f.get('status', '?'):12s} {f.get('name')}  cats={cats}")

    print(f"\nTotal flows: {len(flows)}")

    print("\n--- TEMPLATES Sofia (prefijo sofia_*) o con FLOW button ---")
    templates = list_templates(waba_id, token)
    sofia_or_flow = [
        t for t in templates
        if t.get("name", "").startswith("sofia_") or has_flow_button(t)
    ]
    if not sofia_or_flow:
        print("  (sin templates sofia_* ni con flow button)")
    for t in sofia_or_flow:
        is_flow = has_flow_button(t)
        marker = "  [FLOW]" if is_flow else ""
        print(f"  {t.get('name'):35s} {t.get('language'):4s} {t.get('status'):10s} {t.get('category')}{marker}")

    print(f"\nTotal templates Sofia/Flow: {len(sofia_or_flow)} (de {len(templates)} totales)")

    if phone_id:
        print(f"\n--- ENCRYPTION del phone {phone_id} ---")
        enc = get_encryption_status(phone_id, token)
        if enc.get("_error"):
            print(f"  ERROR: {enc['_status']} {enc['_body'][:300]}")
        else:
            data = enc.get("data") or [enc] if not isinstance(enc.get("data"), list) else enc.get("data")
            print(json.dumps(data, indent=2)[:1000])

    print("\nListo. Usa esta info para decidir si crear nuevos templates o reusar.")


if __name__ == "__main__":
    main()
