"""Sube el logo TuDestinoYa al perfil del WhatsApp Business + Facebook Page (si hay)."""
import os, json, urllib.request, urllib.error
from pathlib import Path

TOKEN = "EAAXArM7CUzUBRTZC2gBCdq0NNS4SFbk5TPE0aZAMC4dqAIZBzZAOebRxdwLDUymRudvaRzQZCS2suZBLn8DLyu9cAIyRYP8L2ZB0f2OIeEQh60ItJSOMGQLjZAZBr6StC6DiXLpkX0oI9JQBNRWl9v7ZByZBoAPZBcX72bALTsVeNJI9eIHELY7ZAo9KZBbHZCxEuq010TLTQZDZD"
PHONE_ID = "1080734831795014"
WABA_ID = "2751228831929476"
LOGO = Path("logos_destinoya_brillo/brillo_v3_bokeh_estrellas.png")

API = "https://graph.facebook.com/v22.0"


def listar_pages():
    """Lista paginas Facebook que el token puede manejar."""
    req = urllib.request.Request(
        f"{API}/me/accounts?access_token={TOKEN}",
    )
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()[:500]}


def subir_perfil_wa():
    """1) Resumable upload  2) Set como profile pic del WhatsApp Business."""
    file_size = LOGO.stat().st_size
    # Necesita APP_ID, no PHONE_ID
    APP_ID = "4329763313935325"  # DestinoYA app (de memoria)
    print(f"\n=== WhatsApp Profile Pic ===")
    r = urllib.request.Request(
        f"{API}/{APP_ID}/uploads?file_name=logo.png&file_length={file_size}&file_type=image/png&access_token={TOKEN}",
        method="POST",
    )
    try:
        sess = json.loads(urllib.request.urlopen(r, timeout=30).read())
        sid = sess.get("id")
        print(f"  Session: {sid}")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"  ERR session: {body}")
        return False
    # Upload bytes
    with open(LOGO, "rb") as f:
        data = f.read()
    r = urllib.request.Request(
        f"{API}/{sid}",
        data=data, method="POST",
        headers={"Authorization": f"OAuth {TOKEN}", "file_offset": "0"},
    )
    try:
        up = json.loads(urllib.request.urlopen(r, timeout=120).read())
        handle = up.get("h")
        print(f"  Handle: {handle[:40] if handle else 'NONE'}...")
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"  ERR upload: {body}")
        return False
    # Set profile pic
    body = json.dumps({"messaging_product": "whatsapp", "profile_picture_handle": handle}).encode()
    r = urllib.request.Request(
        f"{API}/{PHONE_ID}/whatsapp_business_profile",
        data=body, method="POST",
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    try:
        resp = json.loads(urllib.request.urlopen(r, timeout=30).read())
        print(f"  PROFILE PIC OK: {resp}")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"  ERR set: {body}")
        return False


def subir_foto_pagina(page_id, page_token):
    """Sube foto y la setea como profile pic de la pagina."""
    # POST /{page_id}/photos con multipart
    boundary = "----DyaBoundary"
    crlf = b"\r\n"
    parts = []
    for k, v in [("access_token", page_token), ("published", "true")]:
        parts += [f"--{boundary}".encode(), f'Content-Disposition: form-data; name="{k}"'.encode(), b"", str(v).encode()]
    parts += [f"--{boundary}".encode(),
              f'Content-Disposition: form-data; name="source"; filename="logo.png"'.encode(),
              "Content-Type: image/png".encode(), b"",
              LOGO.read_bytes()]
    parts.append(f"--{boundary}--".encode())
    body = crlf.join(parts)
    req = urllib.request.Request(
        f"{API}/{page_id}/picture",
        data=body, method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=60).read())
        print(f"  FB profile pic OK: {resp}")
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        print(f"  ERR fb: {body}")
        return False


# 1. Listar Facebook pages
print("=== FACEBOOK PAGES disponibles ===")
pages = listar_pages()
if "data" in pages:
    for p in pages.get("data", []):
        print(f"  - {p.get('name', '?'):40} id={p.get('id')}")
else:
    print(f"  Error: {pages.get('error', pages)}")

# 2. Subir profile pic WhatsApp
subir_perfil_wa()
