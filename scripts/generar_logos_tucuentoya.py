"""3 logos para TuCuentoYa (cuentos infantiles personalizados con audio)."""
import os, json, urllib.request, urllib.error, base64
from pathlib import Path

OPENAI_KEY = open(os.path.expandvars(r"%LOCALAPPDATA%/Temp/oai-key.txt")).read().strip()

VARIANTES = {
    "tucuento_v1_libro_magico": (
        "Logo design for TuCuentoYa, a Peruvian app of personalized audio bedtime stories for kids (2 to 10 years old). "
        "Centerpiece: an open storybook viewed from above, slightly tilted in 3/4 perspective, with sparkling "
        "magic dust and 5-pointed stars rising from the pages. A small crescent moon floats above the book. "
        "Style: modern children-friendly illustration but elegant, like a premium kids brand. "
        "Color palette: deep purple (#5B2A86), soft gold (#F2C94C), and a touch of pastel cyan (#6FC1D9). "
        "Clean vector style, soft rounded shapes, no text. Square 1:1 aspect ratio, "
        "perfect as profile picture for Facebook or Instagram. Magical, warm, dreamy mood."
    ),
    "tucuento_v2_nino_audifonos": (
        "Logo design for TuCuentoYa, a kids audio storytelling app. Cute minimalist child silhouette "
        "(could be a small character with big rounded head, kawaii style) wearing oversized headphones, "
        "with a small thought-bubble above containing a tiny crescent moon or a 5-pointed star. "
        "The child has a gentle peaceful smile (eyes closed listening). "
        "Color palette: pastel pink (#FFB5C9), sky blue (#A8DBF0), warm yellow (#FFE066). "
        "Style: modern Pixar-inspired vector flat illustration, very cute but sophisticated, "
        "appealing to young parents. NO TEXT. Square 1:1, transparent or white background, "
        "perfect for kids app brand profile picture."
    ),
    "tucuento_v3_casa_cuento": (
        "Logo design for TuCuentoYa, Peruvian audio story app for children. A small charming cottage house "
        "with a giant open book as its roof, glowing windows with warm yellow light, and a fairy-tale tree "
        "with star-shaped leaves next to it. A path of glowing dots leads to the door. "
        "Style inspired by Studio Ghibli and modern children illustration, cozy and inviting. "
        "Color palette: mint green (#A8D8B9), warm cream (#FFF5E1), terracotta orange (#E07A5F), "
        "small touches of golden yellow. Soft rounded shapes, no harsh lines. NO TEXT. "
        "Square 1:1 aspect ratio, vector style, profile picture quality."
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


OUT = Path("logos_tucuentoya")
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
