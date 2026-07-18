"""Genera los 3 logos TuDestinoYa via DALL-E 3, los descarga y sube a Supabase."""
import os
import json
import urllib.request
import urllib.error
from pathlib import Path

OPENAI_KEY = open(os.path.expandvars(r"%LOCALAPPDATA%/Temp/oai-key.txt")).read().strip()
SUPABASE_URL = "https://rfpmvnoaqibqiqxrmheb.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

PROMPTS = {
    "1_ojo_destino": (
        "Logo design for a modern Peruvian AI app called TuDestinoYa, which combines esoteric readings, "
        "legal advice and quick consultations. Centered mystical eye inside a thin double circle, "
        "with a small fibonacci spiral as pupil. Three constellation points above the eye. "
        "Dark cosmic background, gradient from deep purple to black, with golden accents and a single cyan touch. "
        "Minimalist line art, geometric, elegant, young modern vibe. NO TEXT inside the logo. "
        "Vector style, transparent or solid dark background, high contrast, square 1:1 aspect ratio "
        "suitable for Instagram or Facebook profile picture."
    ),
    "2_luna_conversacional": (
        "Logo design for an elegant AI consultation app called TuDestinoYa. A crescent moon that morphs into a chat bubble: "
        "the bottom-left of the crescent extends into a speech bubble tail. Inside the moon, one tiny star or dot. "
        "Color palette: deep purple, dusty pink, bone white. Minimal but feminine, sophisticated, "
        "young and modern. Flat illustration style, smooth curves, no harsh edges. NO TEXT. "
        "Vector look, transparent background, square 1:1 aspect ratio, perfect for Instagram profile."
    ),
    "3_y_cosmica": (
        "Premium minimalist logo design for TuDestinoYa, an AI life consultation platform. "
        "A central letter Y that branches into 3 elegant paths: the left branch ends in a tiny spiral (mystic), "
        "the middle branch is straight (advisory), the right branch ends in a thin arrow (speed). "
        "The Y emerges from a perfectly circular sun/moon shape with a subtle golden gradient. "
        "Background pure black or transparent. Sophisticated, balanced masculine and feminine, "
        "luxury feel. NO TEXT. Vector style, sharp lines, no shadows. Square 1:1 aspect ratio."
    ),
}


def generar(prompt):
    body = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "quality": "high",
    }).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {OPENAI_KEY}",
            "Content-Type": "application/json",
        },
    )
    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=180).read())
        item = resp["data"][0]
        b64 = item.get("b64_json")
        url = item.get("url")
        return url, b64, item.get("revised_prompt", "")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return None, None, f"HTTP {e.code}: {body[:500]}"


OUT_DIR = Path("logos_destinoya_generated")
OUT_DIR.mkdir(exist_ok=True)

import base64

for name, prompt in PROMPTS.items():
    print(f"\n=== Generando {name} ===")
    url, b64, info = generar(prompt)
    if not url and not b64:
        print(f"  FAIL: {info}")
        continue
    local = OUT_DIR / f"{name}.png"
    if b64:
        local.write_bytes(base64.b64decode(b64))
        print(f"  Saved from b64: {local} ({local.stat().st_size} bytes)")
    elif url:
        urllib.request.urlretrieve(url, local)
        print(f"  Saved from url: {local} ({local.stat().st_size} bytes)")
    print(f"  Info: {info[:200]}" if info else "")

print("\nListo. Imagenes en:", OUT_DIR.resolve())
