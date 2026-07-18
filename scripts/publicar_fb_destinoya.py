"""Sube video TuDestinoYa al FB Page + crea publicacion con copy 1 + boton WhatsApp."""
import urllib.request, json, urllib.error
from pathlib import Path

USER_TOKEN = "EAA9h5ZARJ490BRar6JKn6UZC3CTGTxZAl3jDqDPfJUZCZBe7Q4JZBi6B20piYX114hCL8YKpBmDZCznLLPH1fReh80WdDlZCKi4H3o3pasJ2I5x1sJucZAcPfN2iNSNSRTnHtbryx0erJ0BhUDNRuLlRb3Gy9aGZBkNFHBuOTcNVUdwrK28GZB8aoqBGMNPsWpI4vIdZB7mQ43fZBGfWyg3F8V1dBcEyJfRgBxgNNUlTc10klZCBWYzORpfH7xbyCqTZCjo29I5hpmjAk0YqGylb5EZBmEznzdIZD"
PAGE_ID = "940199969169221"
VIDEO = Path(r"C:/Users/ECO DRIVE PLUS SAC/Downloads/TuDestinoYa Facebook2_1080p.mp4")
WHATSAPP_NUMBER = "51980423754"  # TuDestinoYa WhatsApp

COPY_1 = """¿Sientes que tu vida está estancada y no entiendes por qué? 🌙

Tomas decisiones a ciegas. Discutes con tu pareja. Algo te frena pero no le pones nombre.

🇵🇪 TuDestinoYa es una IA peruana que te lee la mano, traza tu carta astral y revela qué bloquea tu camino. Por solo S/3.

✨ Tu primera lectura de mano es GRATIS.

👇 Toca el botón "Enviar mensaje" y escribe "Hola". Te respondo en segundos."""

API = "https://graph.facebook.com/v22.0"

# 1. Obtener Page Access Token
r = json.loads(urllib.request.urlopen(f"{API}/{PAGE_ID}?access_token={USER_TOKEN}&fields=access_token,name", timeout=20).read())
PAGE_TOKEN = r["access_token"]
print(f"Page: {r['name']} (token obtenido)")

# 2. Subir video con copy (resumable o single-step si <100MB)
print(f"\nSubiendo video {VIDEO.name} ({VIDEO.stat().st_size//1024//1024} MB)...")
boundary = "----DyaFB"
crlf = b"\r\n"
parts = []
for k, v in [
    ("access_token", PAGE_TOKEN),
    ("description", COPY_1),
    ("title", "TuDestinoYa - Tu IA Peruana"),
    ("published", "true"),
]:
    parts += [f"--{boundary}".encode(), f'Content-Disposition: form-data; name="{k}"'.encode(), b"", str(v).encode()]
parts += [
    f"--{boundary}".encode(),
    'Content-Disposition: form-data; name="source"; filename="video.mp4"'.encode(),
    "Content-Type: video/mp4".encode(),
    b"",
    VIDEO.read_bytes(),
]
parts.append(f"--{boundary}--".encode())
body = crlf.join(parts)

req = urllib.request.Request(
    f"{API}/{PAGE_ID}/videos",
    data=body, method="POST",
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
)
try:
    resp = json.loads(urllib.request.urlopen(req, timeout=300).read())
    print(f"OK VIDEO PUBLICADO: {resp}")
except urllib.error.HTTPError as e:
    body = e.read().decode()[:600]
    print(f"ERR HTTP {e.code}: {body}")
