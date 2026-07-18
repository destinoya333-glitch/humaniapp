"""3 versiones del Emblema TuDestinoYa con brillo/glow profesional."""
import os, json, urllib.request, urllib.error, base64
from pathlib import Path

OPENAI_KEY = open(os.path.expandvars(r"%LOCALAPPDATA%/Temp/oai-key.txt")).read().strip()

VARIANTES = {
    "brillo_v1_aura_radial": (
        "Premium emblem logo for TuDestinoYa. Circular seal/badge in vibrant orange #E08821 with intricate "
        "decorative mandala center (crescent moon, balance scale, lightning bolt icons line-art). Around the "
        "seal perimeter, curved text 'TUDESTINOYA' on top arc and 'CONSULTAS · ASESORIA · ESOTERICO' on bottom "
        "arc. Tiny stars between rings. "
        "EFFECT: The whole emblem GLOWS with a radiant golden-orange aura, like backlit neon or holy light, "
        "with soft radial gradient from bright orange center fading to deep black at edges. Lens flare halo "
        "effect. Background pure black (#000000) with the orange glow radiating outward. "
        "Ultra premium cinematic feel, like a luxury brand logo seen at night. Square 1:1, high contrast."
    ),
    "brillo_v2_metalico_dorado": (
        "Premium emblem logo for TuDestinoYa. Circular seal/badge with 3D embossed metallic effect: appears "
        "MOLDED IN BRUSHED GOLD AND ORANGE METAL with realistic highlights and shadows. Mandala center with "
        "moon, scale, lightning bolt as raised relief. Around perimeter: curved text 'TUDESTINOYA' top arc, "
        "'CONSULTAS · ASESORIA · ESOTERICO' bottom arc, both embossed in same metallic gold-orange. "
        "EFFECT: Photo-realistic metallic shine with light reflection coming from upper-left, slight bevel "
        "edges, brushed metal texture. Background is a dark midnight blue marble texture for contrast. "
        "Looks like a luxury executive coin or medallion. Square 1:1, premium 3D rendering style."
    ),
    "brillo_v3_bokeh_estrellas": (
        "Premium emblem logo for TuDestinoYa. Circular seal in golden orange (#E08821 to #FFD700 gradient) "
        "with decorative mandala center (moon, balance scale, lightning bolt) and curved text 'TUDESTINOYA' "
        "above + 'CONSULTAS · ASESORIA · ESOTERICO' below in same gold. "
        "EFFECT: Soft golden bokeh light particles scattered around the emblem, like tiny stars and dust "
        "of light floating in space. Subtle lens flare on upper right of the emblem. The emblem itself has "
        "a delicate inner glow as if backlit. Background is deep cosmic purple-black with a soft nebula hint. "
        "Ethereal magical professional feel, like a luxury mystic brand. Square 1:1, cinematic quality."
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


OUT = Path("logos_destinoya_brillo")
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
