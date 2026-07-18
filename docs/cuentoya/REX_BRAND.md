# Coqui 🦊 — Brand Pack de la Mascota

Coqui es el zorrito narrador, mascota oficial de TuCuentoYa. Identidad visual + prompts listos para generar todos los assets que necesites.

---

## 🎨 Identidad visual

| Atributo | Valor |
|---|---|
| **Especie** | Zorrito (fox) |
| **Color principal** | Naranja cálido `#F59E0B` (amber-500) |
| **Color secundario** | Crema/blanco `#FEF3C7` (panza, mejillas, pecho) |
| **Color acento** | Rosa pastel `#F472B6` (pink-400) — interior orejas, nariz |
| **Color magia** | Dorado `#FCD34D` (amber-300) — estrellas mágicas |
| **Personalidad** | Cálido, amigable, sabio pero tierno, paciente con peques |
| **Edad aparente** | Cachorro/adolescente (NO bebé, NO adulto) |
| **Estilo arte** | Cartoon flat moderno + outline suave, NO realista, NO chibi extremo |

### Características distintivas

- Orejas grandes triangulares, alertas pero relajadas
- Ojos grandes café oscuros expresivos, brillo blanco en pupila
- Cola esponjada con punta blanca (curveada hacia arriba)
- Pequeño libro o pluma mágica como prop opcional
- Aura sutil de partículas doradas alrededor (cuentos mágicos)

---

## 🤖 Prompts para IA (listos para copiar/pegar)

### Midjourney v6/v7

```
A friendly cartoon fox mascot named Coqui, warm amber-orange fur with cream belly,
big expressive dark brown eyes with white shine, fluffy bushy tail with white tip,
pointed ears with soft pink interior, holding a magical glowing storybook,
golden sparkles around him, cheerful storyteller expression, flat illustration style,
soft outline, vector-friendly, peruvian children's brand mascot, pastel background,
high quality, professional brand mascot --ar 1:1 --style raw --v 7
```

### Flux 1.1 Pro

```
A cute cartoon fox storyteller mascot, warm orange #F59E0B fur, cream-colored belly
and chest, big sparkling dark brown eyes, fluffy tail with white tip, soft pink
inner ears, holding a small glowing magic book, golden floating sparkles around him,
warm friendly smile, modern flat illustration style with soft outlines, kawaii but
not chibi, designed as a brand mascot for a Peruvian children's storytelling app,
clean white background, vector style
```

### DALL-E 3 / GPT-4o image

```
Create a cartoon mascot of a friendly young fox named "Coqui" for a children's
audio storytelling brand. He has warm amber-orange fur (#F59E0B), a cream-colored
belly, big expressive dark brown eyes, a fluffy bushy tail with a white tip, pointy
ears with pink interior. He holds a small magical glowing storybook and is
surrounded by tiny golden sparkles. The style is modern flat illustration with
soft outlines, designed as a brand mascot — friendly, warm, approachable to
Peruvian families with kids age 2-10. Square format, transparent or pastel
background, high quality vector-like rendering.
```

### Stable Diffusion XL / Flux Schnell

```
masterpiece, high quality, brand mascot, friendly cartoon fox, Coqui, warm amber
orange fur, cream belly, big expressive eyes, fluffy tail with white tip,
holding magical storybook, golden sparkles, flat vector illustration, modern
mascot design, children's brand, professional --negative blurry, low quality,
realistic, scary, dark, adult
```

---

## 📦 Sets a generar (10 variantes esenciales)

Pídele estos 10 prompts a tu generador IA preferido para tener el set completo:

### 1. Coqui Hero (avatar principal)
```
Coqui (friendly cartoon fox mascot, amber-orange fur, cream belly, fluffy tail
with white tip, big brown eyes, pointed ears with pink interior), waving hello,
warm smile, centered, transparent background, flat illustration style, square
1024x1024
```

### 2. Coqui contando cuento
```
Same fox mascot Coqui, sitting cross-legged on a cloud, reading from a glowing
magical book, golden sparkles floating around, peaceful storytelling expression,
flat illustration
```

### 3. Coqui en el bosque
```
Coqui standing in a magical forest at twilight, fireflies around, looking
adventurous and brave, holding a small lantern
```

### 4. Coqui en el espacio
```
Coqui floating in space wearing tiny astronaut helmet, surrounded by planets
and stars, cute adventurous pose
```

### 5. Coqui en el mar
```
Coqui sitting on a wooden boat at sea, holding a treasure map, friendly pirate
hat (no skull, just stars), waves around
```

### 6. Coqui en el castillo
```
Coqui dressed as a small storytelling jester at a fairytale castle, holding
a tiny crown, magical aura
```

### 7. Coqui dormido
```
Coqui sleeping peacefully curled up with a small star pillow, "Zzz" floating
above, moon and stars background, perfect for "good night cuento"
```

### 8. Coqui pensando (emoji-style)
```
Coqui with one paw on chin, thinking expression, question marks floating,
isolated transparent background
```

### 9. Coqui celebrando
```
Coqui jumping with both arms up, confetti and sparkles around, big happy
smile, for "cuento entregado" celebration moments
```

### 10. Coqui logo final
```
Coqui mascot face (head only, smiling) inside a circular badge with "TuCuentoYa"
text below, flat vector logo style, amber + cream + pink palette
```

---

## 🎯 Donde usar cada variante

| Variante | Ubicación |
|---|---|
| 1 Hero | Avatar WhatsApp Profile + landing hero |
| 2 Contando | Landing "Cómo funciona" section |
| 3-6 Escenarios | Reels demo + posts FB por temática |
| 7 Dormido | Post "Cuento Dormir" + footer landing |
| 8 Pensando | Templates Meta "recolección datos" |
| 9 Celebrando | Template `cuento_listo` + email confirmación VIP |
| 10 Logo | Favicon + footer todas las páginas + share preview |

---

## 🎨 Color tokens (Tailwind / CSS)

```css
:root {
  /* Coqui palette */
  --coqui-amber: #F59E0B;      /* fur primary */
  --coqui-amber-light: #FBBF24; /* highlights */
  --coqui-cream: #FEF3C7;       /* belly, mejillas */
  --coqui-pink: #F472B6;        /* nariz, oreja interior */
  --coqui-pink-soft: #FBCFE8;   /* sombras suaves */
  --coqui-gold: #FCD34D;        /* sparkles mágicos */
  --coqui-eyes: #422006;        /* ojos */
  --coqui-white: #FFFFFF;       /* tip cola, brillo ojos */
}
```

En Tailwind ya usamos `amber-500`, `amber-400`, `pink-400`, etc. Coqui encaja perfecto con la paleta existente.

---

## 📐 Especificaciones técnicas para entregables

| Asset | Formato | Tamaño | Uso |
|---|---|---|---|
| Avatar WhatsApp Profile | PNG | 640×640 | Foto del número |
| Avatar chat (favicon) | ICO + PNG | 32, 64, 192, 512 | Pestañas browser + PWA |
| Hero landing | WebP + PNG fallback | 1200×1200 | Hero principal |
| OG/Twitter card | PNG | 1200×630 | Share preview redes |
| Reels intro | PNG | 1080×1920 | Vertical 9:16 |
| Posts cuadrados | PNG | 1080×1080 | Feed FB/IG |
| Sticker WhatsApp | WebP | 512×512 | Sticker pack (opcional) |

---

## 🔄 Iteración

Si la primera generación no captura la esencia, ajusta:
- Si sale muy adulto → agregar "young pup, cute small fox"
- Si sale muy chibi → agregar "modern flat illustration, not anime, not chibi"
- Si sale demasiado realista → agregar "vector style, illustration not photo"
- Si sale dark → agregar "warm bright cheerful palette, no shadows dark"

Genera **3-5 variantes** del Hero (variante 1) primero, elige una, y úsala como **referencia visual** para las demás (Midjourney `--cref URL`, Flux ref image).

---

## 📁 Donde guardar los assets generados

Cuando tengas los PNG/WebP:

```
humaniapp/public/cuento/
  ├── coqui-hero.webp
  ├── coqui-hero.png
  ├── coqui-contando.webp
  ├── coqui-celebrando.webp
  ├── coqui-dormido.webp
  ├── coqui-logo.svg
  └── (etc)
```

Luego reemplaza el SVG placeholder en `app/cuento/page.tsx` con `<Image src="/cuento/coqui-hero.webp" />`.
