"""Genera 9 logos TuDestinoYa v2 con mezcla esoterico+profesional+rapido."""
import os, json, urllib.request, urllib.error, base64
from pathlib import Path

OPENAI_KEY = open(os.path.expandvars(r"%LOCALAPPDATA%/Temp/oai-key.txt")).read().strip()

PROMPTS = {
    "A1_trinity_triangulo": (
        "Logo design for TuDestinoYa, Peruvian AI app combining ESOTERIC readings, "
        "PROFESSIONAL advice and QUICK consultations. Equilateral triangle with three icons at each vertex: "
        "top vertex a mystical eye, bottom-left a legal scale (balance scales), bottom-right a lightning bolt. "
        "The three icons are connected by thin golden lines forming the triangle. "
        "Color: navy blue background, gold accents, single purple touch. "
        "Modern geometric minimal style. NO TEXT. Vector, square 1:1, transparent background."
    ),
    "A2_mandala_tres_sectores": (
        "Logo design for TuDestinoYa, a 3-in-1 AI consultation app. "
        "A circular mandala divided in 3 equal pie slices, each containing a single symbol: "
        "first slice a crescent moon (mystic), second slice a balance scale (advisory), "
        "third slice a lightning bolt (speed). The 3 symbols converge to a small dot in the center. "
        "Color: gradient purple to gold, on dark navy background. Sacred geometry style. "
        "NO TEXT. Vector, square 1:1, modern elegant feel for social media profile."
    ),
    "A3_maletin_constelacion": (
        "Logo design for TuDestinoYa, AI life advisor. An elegant minimalist briefcase silhouette "
        "from whose handle emerges an upward burst of golden constellation stars connected by thin lines. "
        "The briefcase represents professional advice, the stars represent mystical insight. "
        "Color palette: deep emerald green and gold, single touch of cream white. "
        "Premium sophisticated style. NO TEXT. Vector, square 1:1, transparent background."
    ),
    "B1_brujula_estrellas": (
        "Logo design for TuDestinoYa. A modern compass with 4 cardinal points, but instead of N/S/E/W "
        "the points are tiny stars and constellation symbols. The compass needle points to a 5-pointed star. "
        "The whole compass is inside a thin double circle. Professional yet mystical. "
        "Color: navy blue and rose gold. Elegant adult-oriented design. NO TEXT. "
        "Vector style, square 1:1, suitable for premium brand."
    ),
    "B2_reloj_zodiaco": (
        "Logo design for TuDestinoYa. A vintage pocket watch face seen from above, but the 12 numbers "
        "are replaced by 12 zodiac symbols (Aries, Taurus, etc as tiny glyphs). The clock hands are golden "
        "lightning bolts pointing at random positions. Background dark with gold accents. "
        "Hybrid of esoteric and time/speed. Elegant, mysterious. NO TEXT. "
        "Vector style, square 1:1, transparent background."
    ),
    "B3_sello_lacrado": (
        "Logo design for TuDestinoYa. A wax seal stamp (like a notary or legal seal) viewed from above, "
        "circular with decorative scalloped edges. Inside the seal: a crescent moon embracing a single star, "
        "and below them a small lightning bolt. The seal looks elegant, professional, like an official emblem. "
        "Color: deep burgundy wax with gold embossed details. Premium brand feel. NO TEXT. "
        "Vector, square 1:1."
    ),
    "C1_mano_datos": (
        "Logo design for TuDestinoYa. An open palm hand (palm reading style) viewed from the palm side, "
        "but the lines on the palm are not natural creases — they form thin bar chart bars and a small "
        "ascending arrow. Combines palm reading mysticism with data analytics. "
        "Color: gradient from deep purple to gold. Minimal line art, elegant. NO TEXT. "
        "Vector style, square 1:1, modern young feel."
    ),
    "C2_iris_dashboard": (
        "Logo design for TuDestinoYa. A stylized human eye in profile or front view, where the iris/pupil "
        "is a tiny circular dashboard with ascending bar chart and one star floating above. "
        "Combines mystical eye symbolism with data/analytics visualization. "
        "Color: cyan and gold on midnight blue background. Sophisticated, intelligent design. NO TEXT. "
        "Vector, square 1:1."
    ),
    "C3_libro_aura": (
        "Logo design for TuDestinoYa. An open book at center, from whose pages emerges a soft glowing "
        "aura/halo. Floating above the aura are 3 small icons in a row: a small balance scale, "
        "a tiny lightning bolt, and a 5-pointed star. Symbolizes wisdom, advice, speed and mysticism united. "
        "Color: warm golden cream with deep purple accents. Elegant, mature, premium. NO TEXT. "
        "Vector style, square 1:1."
    ),
}


def generar(prompt):
    body = json.dumps({"model": "gpt-image-1", "prompt": prompt, "n": 1, "size": "1024x1024", "quality": "high"}).encode()
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body, method="POST",
        headers={"Authorization": f"Bearer {OPENAI_KEY}", "Content-Type": "application/json"},
    )
    try:
        resp = json.loads(urllib.request.urlopen(req, timeout=180).read())
        item = resp["data"][0]
        return item.get("b64_json"), item.get("revised_prompt", "")
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}: {e.read().decode()[:300]}"

OUT_DIR = Path("logos_destinoya_v2")
OUT_DIR.mkdir(exist_ok=True)

for name, prompt in PROMPTS.items():
    print(f"\n=== {name} ===")
    b64, info = generar(prompt)
    if not b64:
        print(f"  FAIL: {info}")
        continue
    local = OUT_DIR / f"{name}.png"
    local.write_bytes(base64.b64decode(b64))
    print(f"  Saved: {local.stat().st_size//1024} KB")

print(f"\nListo. 9 logos en: {OUT_DIR.resolve()}")
