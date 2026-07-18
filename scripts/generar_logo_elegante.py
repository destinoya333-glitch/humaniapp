"""3 versiones elegantes del Mandala naranja TuDestinoYa - estilo premium foto perfil."""
import os, json, urllib.request, urllib.error, base64
from pathlib import Path

OPENAI_KEY = open(os.path.expandvars(r"%LOCALAPPDATA%/Temp/oai-key.txt")).read().strip()

VARIANTES = {
    "elegante_v1_marco_dorado": (
        "Premium professional logo for TuDestinoYa Peru. Centerpiece is a 3-sector circular mandala "
        "with crescent moon, balance scale and lightning bolt icons in vibrant orange #E08821, connected "
        "at center dot. The mandala sits inside an elegant double-circle frame with thin GOLDEN decorative "
        "border (#D4A017). Background is rich deep navy blue (#0B1F3A) with subtle radial gradient lighter "
        "in center. Below the mandala, centered wordmark 'TuDestinoYa' in elegant serif typography "
        "(like Playfair Display), color cream white (#F5E6CC). Below the wordmark, smaller text 'PERU' "
        "in spaced letters, golden color. Sophisticated luxury feel, like a high-end brand emblem. "
        "Square 1:1, perfect for premium social media profile picture."
    ),
    "elegante_v2_emblema_insignia": (
        "Premium corporate emblem-style logo for TuDestinoYa. Mandala with 3 line-art icons in orange "
        "#E08821 (crescent moon, scale, lightning bolt) at center. The mandala is wrapped in TWO concentric "
        "thin orange rings forming a heraldic seal. Between the two rings, in the upper arc, the text "
        "'TUDESTINOYA' is curved following the ring (uppercase spaced letters, orange). In the lower arc, "
        "curved text 'CONSULTAS · ASESORIA · ESOTERICO' very small. Five-pointed tiny stars at the 4 "
        "cardinal positions between rings. Background pure white. Looks like an elegant professional badge "
        "or seal. Square 1:1, vector style, premium feel."
    ),
    "elegante_v3_cosmic_gradient": (
        "Elegant modern logo for TuDestinoYa. Center: 3-sector mandala in glowing orange #E08821 (crescent "
        "moon, balance scale, lightning bolt) with thin gold outline highlight (#FFD700) on the icons. "
        "Background: a soft cosmic gradient from deep purple-blue (#1F1338) at edges to warm dark orange "
        "(#3A1F0B) near center, with tiny subtle stars sparkling in the background. "
        "Below the mandala, centered wordmark 'TuDestinoYa' in modern elegant sans-serif typography, "
        "color warm cream (#FFE8C7). Below, smaller subtitle in italic 'Tu Asesor Inteligente' in same cream. "
        "Premium nightlife/luxury app aesthetic, like a sophisticated Peruvian brand. "
        "Square 1:1, professional foto-perfil quality."
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
        return f"FAIL {e.code}: {e.read().decode()[:300]}"


OUT = Path("logos_destinoya_elegante")
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
print(f"\n3 logos en: {OUT.resolve()}")
