"""Genera el logo final TuDestinoYa: A2 Mandala + naranja EcoDrive + wordmark."""
import os, json, urllib.request, urllib.error, base64
from pathlib import Path

OPENAI_KEY = open(os.path.expandvars(r"%LOCALAPPDATA%/Temp/oai-key.txt")).read().strip()

VARIANTES = {
    "final_v1_mandala_naranja": (
        "Logo design for TuDestinoYa, a Peruvian AI consultation app combining mystic, advisory and speed. "
        "A circular mandala divided in 3 sectors with line-art icons: top-left sector has a crescent moon, "
        "top-right sector has a balance scale (legal/advisory), bottom sector has a lightning bolt. "
        "The 3 icons connect at a small dot in the center of the circle. "
        "ALL LINES IN VIBRANT ORANGE COLOR #E08821 (warm orange, brand color similar to EcoDrive+). "
        "Pure white background. Minimal sacred geometry line-art style. "
        "BELOW the mandala, centered, add the wordmark 'TuDestinoYa' in elegant modern sans-serif typography, "
        "in the same orange #E08821. The 'Ya' suffix slightly bolder. "
        "Proportions: mandala occupies top 70%, wordmark in bottom 25%. "
        "Square 1:1 aspect ratio, vector style, clean professional logo design."
    ),
    "final_v2_mandala_naranja_negro": (
        "Logo design for TuDestinoYa, a Peruvian AI consultation app. Circular mandala divided in 3 sectors: "
        "crescent moon, balance scale, lightning bolt — all line-art icons converging to a center dot. "
        "Mandala lines all in vibrant orange #E08821 (EcoDrive brand orange). "
        "BELOW the mandala, centered wordmark 'TuDestinoYa' in modern sans-serif, where 'TuDestino' is in "
        "dark charcoal black and 'Ya' is in orange #E08821 for emphasis. "
        "White background. Premium professional logo. Square 1:1."
    ),
    "final_v3_mandala_naranja_gradiente": (
        "Logo for TuDestinoYa Peru. Three-sector mandala with moon, balance scale, lightning bolt converging "
        "to center dot. Lines in GRADIENT from warm orange #E08821 (top) to slightly darker orange-brown "
        "#B86A1A (bottom). Background pure white. Wordmark 'TuDestinoYa' below in same gradient orange, "
        "elegant rounded sans-serif. Square 1:1, professional clean vector look."
    ),
}


def generar(prompt):
    body = json.dumps({"model": "gpt-image-1", "prompt": prompt, "n": 1, "size": "1024x1024", "quality": "high"}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations",
        data=body, method="POST",
        headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"})
    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=180).read())
        return resp["data"][0].get("b64_json")
    except urllib.error.HTTPError as e:
        return f"FAIL {e.code}: {e.read().decode()[:200]}"


OUT = Path("logos_destinoya_final")
OUT.mkdir(exist_ok=True)
for name, prompt in VARIANTES.items():
    print(f"\n=== {name} ===")
    b64 = generar(prompt)
    if isinstance(b64, str) and b64.startswith("FAIL"):
        print(f"  {b64}")
        continue
    local = OUT / f"{name}.png"
    local.write_bytes(base64.b64decode(b64))
    print(f"  Saved {local.stat().st_size//1024} KB")
print(f"\nLogos en: {OUT.resolve()}")
