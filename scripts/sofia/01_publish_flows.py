#!/usr/bin/env python3
"""
Sube los 5 JSON specs de Miss Sofia Flows a Meta Graph API y los publica.

Uso:
    META_SOFIA_ACCESS_TOKEN=EAAxxx \\
    META_SOFIA_WABA_ID=1623262362222343 \\
    python3 scripts/sofia/01_publish_flows.py

Lo que hace:
    1. Lista flows actuales en el WABA Sofia.
    2. Para cada spec local en docs/flows-specs/sofia/*.json:
        a) Si no existe en Meta -> crea como DRAFT con el name del spec.
        b) Sube el JSON spec via /flows/{flow_id}/assets.
        c) Si esta en DRAFT -> publica.
    3. Imprime tabla resumen con flow_id Meta + status.

Requiere: solo stdlib (urllib + json + os).
"""

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


GRAPH = "https://graph.facebook.com/v22.0"
SPECS_DIR = Path(__file__).resolve().parent.parent.parent / "docs" / "flows-specs" / "sofia"
ENDPOINT_URI = os.environ.get(
    "WA_FLOWS_ENDPOINT_URI", "https://activosya.com/api/whatsapp-flows/webhook"
).strip()

# Mapeo nombre archivo -> nombre flow Meta + descripcion
FLOW_DEFS = {
    "flow_pacto_cuna_spec.json":     ("Sofia_Pacto_Cuna_v1",     "Pacto Cuna - quien eres"),
    "flow_plan_estudio_spec.json":   ("Sofia_Plan_Estudio_v1",   "Plan de estudio diario"),
    "flow_pago_spec.json":           ("Sofia_Pago_v1",           "Pago Regular o Premium"),
    "flow_progreso_spec.json":       ("Sofia_Progreso_v1",       "Progreso semanal"),
    "flow_pronunciacion_spec.json":  ("Sofia_Pronunciacion_v1",  "Test pronunciacion"),
}


def env(name: str, required: bool = True) -> str:
    v = os.environ.get(name, "").strip()
    if required and not v:
        print(f"ERROR: env var {name} requerida.", file=sys.stderr)
        sys.exit(1)
    return v


def request_json(method: str, url: str, token: str, body=None, files=None):
    """GET/POST JSON o multipart contra Graph API."""
    headers = {"Authorization": f"Bearer {token}"}
    data = None
    if files is not None:
        # multipart manual: separator boundary
        boundary = "----SofiaFlowsBoundary"
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        parts = []
        for k, v in (body or {}).items():
            parts.append(f"--{boundary}".encode())
            parts.append(f'Content-Disposition: form-data; name="{k}"'.encode())
            parts.append(b"")
            parts.append(str(v).encode())
        for fname, fcontent, ctype in files:
            parts.append(f"--{boundary}".encode())
            parts.append(f'Content-Disposition: form-data; name="file"; filename="{fname}"'.encode())
            parts.append(f"Content-Type: {ctype}".encode())
            parts.append(b"")
            parts.append(fcontent)
        parts.append(f"--{boundary}--".encode())
        data = b"\r\n".join(parts)
    elif body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()

    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="ignore")
        print(f"HTTP {e.code} {method} {url}\n{body_err}", file=sys.stderr)
        raise


def list_existing_flows(waba_id: str, token: str):
    url = f"{GRAPH}/{waba_id}/flows?limit=100"
    out = []
    while url:
        r = request_json("GET", url, token)
        out.extend(r.get("data", []))
        url = (r.get("paging") or {}).get("next") or None
    return out


def create_flow(waba_id: str, token: str, name: str, categories=None):
    body = {
        "name": name,
        "categories": json.dumps(categories or ["OTHER"]),
    }
    url = f"{GRAPH}/{waba_id}/flows"
    return request_json("POST", url, token, body=body)


def upload_flow_asset(flow_id: str, token: str, spec_path: Path):
    url = f"{GRAPH}/{flow_id}/assets"
    body = {"name": "flow.json", "asset_type": "FLOW_JSON"}
    files = [("flow.json", spec_path.read_bytes(), "application/json")]
    return request_json("POST", url, token, body=body, files=files)


def set_endpoint_uri(flow_id: str, token: str, endpoint_uri: str):
    """Setea el endpoint_uri (webhook) del flow. Requerido antes de publish."""
    url = f"{GRAPH}/{flow_id}"
    return request_json("POST", url, token, body={"endpoint_uri": endpoint_uri})


def publish_flow(flow_id: str, token: str):
    url = f"{GRAPH}/{flow_id}/publish"
    try:
        return request_json("POST", url, token, body={})
    except urllib.error.HTTPError as e:
        body_err = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else ""
        if "4016006" in body_err or "invalid state" in body_err.lower():
            print(f"  -> ya estaba PUBLISHED")
            return {"success": True, "already_published": True}
        raise


def main():
    token = env("META_SOFIA_ACCESS_TOKEN")
    waba_id = env("META_SOFIA_WABA_ID")  # ej "1623262362222343"

    if not SPECS_DIR.exists():
        print(f"ERROR: no encuentro {SPECS_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"Listando flows existentes en WABA {waba_id}...")
    existing = list_existing_flows(waba_id, token)
    by_name = {f.get("name"): f for f in existing}
    print(f"  Encontrados: {len(existing)}")

    results = []
    for spec_file, (flow_name, descr) in FLOW_DEFS.items():
        spec_path = SPECS_DIR / spec_file
        if not spec_path.exists():
            print(f"SKIP {spec_file} (no existe)")
            continue

        print(f"\n=== {flow_name} ({descr}) ===")
        existing_flow = by_name.get(flow_name)
        if existing_flow:
            flow_id = existing_flow["id"]
            print(f"  Ya existe id={flow_id}, status={existing_flow.get('status')}")
        else:
            print(f"  Creando como DRAFT...")
            r = create_flow(waba_id, token, flow_name)
            flow_id = r.get("id")
            print(f"  Creado id={flow_id}")

        print(f"  Subiendo spec ({spec_path.stat().st_size} bytes)...")
        upload_flow_asset(flow_id, token, spec_path)
        print(f"  OK")

        print(f"  Seteando endpoint_uri = {ENDPOINT_URI}")
        set_endpoint_uri(flow_id, token, ENDPOINT_URI)
        print(f"  OK")

        print(f"  Publicando...")
        publish_flow(flow_id, token)
        print(f"  PUBLISHED")

        results.append({"name": flow_name, "id": flow_id, "spec": spec_file})

    print("\n=== RESUMEN ===")
    for r in results:
        print(f"  {r['name']:30s} id={r['id']}  spec={r['spec']}")
    print(f"\nTotal: {len(results)} flows publicados.")


if __name__ == "__main__":
    main()
