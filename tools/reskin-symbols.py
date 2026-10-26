#!/usr/bin/env python3
"""
Lunar Vault static-symbol reskin.

Redraws the H1-H5 / L1-L4 frames of the symbolsStatic spritesheet in place,
keeping every frame rectangle, rotation flag and trim box from
symbolsStatic.json untouched, so the game's asset manifest, the Pixi
spritesheet loader and all symbol geometry stay exactly as the SDK expects.

Run from the repo root:  python3 tools/reskin-symbols.py
Requires: Pillow.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

SHEET_DIR = Path(__file__).resolve().parent.parent / (
    "apps/lunar-vault/static/assets/sprites/symbolsStatic"
)
SS = 4  # supersample factor

NAVY = (16, 18, 43, 255)
NAVY_LIGHT = (35, 38, 78, 255)


def medallion(size, rim, fill=NAVY):
    w, h = size
    img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = w * SS / 2, h * SS / 2
    r = min(w, h) * SS * 0.46
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rim)
    r2 = r * 0.86
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=fill)
    r3 = r * 0.78
    d.ellipse([cx - r3, cy - r3 * 1.15, cx + r3, cy + r3 * 0.85], fill=NAVY_LIGHT)
    return img, d, cx, cy, r2


def crescent(img, cx, cy, r, color):
    moon = Image.new("RGBA", img.size, (0, 0, 0, 0))
    md = ImageDraw.Draw(moon)
    md.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    punch = Image.new("L", img.size, 0)
    pk = ImageDraw.Draw(punch)
    pk.ellipse([cx - r * 0.30, cy - r * 1.02, cx + r * 1.30, cy + r * 0.98], fill=255)
    alpha = moon.getchannel("A")
    alpha = Image.composite(Image.new("L", img.size, 0), alpha, punch)
    moon.putalpha(alpha)
    img.alpha_composite(moon)


def star4(d, cx, cy, r, color):
    pts = []
    for i in range(8):
        ang = i * 3.14159265 / 4
        rad = r if i % 2 == 0 else r * 0.28
        import math
        pts.append((cx + rad * math.sin(ang), cy - rad * math.cos(ang)))
    d.polygon(pts, fill=color)


def vault_door(d, cx, cy, r, color):
    lw = max(3, int(r * 0.10))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=lw)
    r2 = r * 0.62
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=color, width=lw)
    import math
    for k in range(4):
        ang = k * math.pi / 4
        d.line([cx, cy, cx + r * math.cos(ang), cy + r * math.sin(ang)], fill=color, width=lw)
    hr = r * 0.22
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=color)


def crystal(d, cx, cy, r, color, dark):
    pts_top = [(cx - r * 0.55, cy + r * 0.1), (cx - r * 0.25, cy - r * 0.75),
               (cx + r * 0.15, cy - r * 0.85), (cx + r * 0.55, cy + r * 0.05),
               (cx, cy + r * 0.8)]
    d.polygon(pts_top, fill=color)
    d.polygon([(cx - r * 0.25, cy - r * 0.75), (cx + r * 0.15, cy - r * 0.85),
               (cx, cy + r * 0.8), (cx - r * 0.05, cy + r * 0.05)], fill=dark)
    d.line([cx - r * 0.55, cy + r * 0.1, cx + r * 0.55, cy + r * 0.05], fill=(255, 255, 255, 160), width=max(2, int(r * 0.05)))


def comet(d, cx, cy, r, color):
    for i, frac in enumerate((0.95, 0.7, 0.45)):
        x0 = cx - r * 0.15 + i * r * 0.16
        y0 = cy + r * 0.10 - i * r * 0.16
        d.polygon([(x0, y0), (cx + r * 0.95, cy - r * 0.95 + i * r * 0.13),
                   (cx + r * 0.80, cy - r * 0.72 + i * r * 0.13)], fill=color[:3] + (110,))
    hr = r * 0.34
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=color)


def planet(d, cx, cy, r, color):
    hr = r * 0.52
    d.ellipse([cx - hr, cy - hr, cx + hr, cy + hr], fill=color)
    d.arc([cx - r, cy - r * 0.42, cx + r, cy + r * 0.42], start=15, end=165, fill=(255, 255, 255, 220), width=max(3, int(r * 0.09)))
    d.arc([cx - r, cy - r * 0.42, cx + r, cy + r * 0.42], start=195, end=345, fill=(255, 255, 255, 90), width=max(3, int(r * 0.09)))


def full_moon(d, cx, cy, r, color, shade):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    for (ox, oy, cr) in ((-0.3, -0.2, 0.20), (0.25, 0.30, 0.26), (0.38, -0.35, 0.14), (-0.05, 0.42, 0.12)):
        d.ellipse([cx + (ox - cr) * r, cy + (oy - cr) * r, cx + (ox + cr) * r, cy + (oy + cr) * r], fill=shade)


ICONS = {
    # frame -> (rim/accent, draw fn)
    "h1.webp": ((255, 210, 87, 255), lambda img, d, x, y, r, c: vault_door(d, x, y, r * 0.62, c)),
    "h2.webp": ((255, 233, 168, 255), lambda img, d, x, y, r, c: full_moon(d, x, y, r * 0.60, c, (214, 188, 120, 255))),
    "h3.webp": ((201, 167, 255, 255), lambda img, d, x, y, r, c: (crescent(img, x - r * 0.08, y, r * 0.58, c), star4(d, x + r * 0.42, y - r * 0.38, r * 0.22, (255, 255, 255, 255)))),
    "h4.webp": ((179, 136, 255, 255), lambda img, d, x, y, r, c: crystal(d, x, y, r * 0.66, c, (126, 84, 214, 255))),
    "h5.webp": ((127, 231, 255, 255), lambda img, d, x, y, r, c: comet(d, x - r * 0.08, y + r * 0.08, r * 0.66, c)),
    "l1.webp": ((159, 216, 255, 255), lambda img, d, x, y, r, c: crescent(img, x, y, r * 0.58, c)),
    "l2.webp": ((255, 224, 102, 255), lambda img, d, x, y, r, c: star4(d, x, y, r * 0.62, c)),
    "l3.webp": ((138, 255, 209, 255), lambda img, d, x, y, r, c: crystal(d, x, y, r * 0.60, c, (64, 190, 150, 255))),
    "l4.webp": ((255, 179, 226, 255), lambda img, d, x, y, r, c: planet(d, x, y, r * 0.66, c)),
}


def main():
    meta = json.load(open(SHEET_DIR / "symbolsStatic.json"))
    frames = meta["frames"]
    for ext, kwargs in (("png", {}), ("webp", {"lossless": True})):
        path = SHEET_DIR / f"symbolsStatic.{ext}"
        sheet = Image.open(path).convert("RGBA")
        for name, (accent, draw_icon) in ICONS.items():
            f = frames[name]
            fr, rot = f["frame"], f["rotated"]
            w, h = fr["w"], fr["h"]
            uw, uh = (h, w) if rot else (w, h)  # upright canvas size
            art, d, cx, cy, r = medallion((uw, uh), accent)
            draw_icon(art, d, cx, cy, r, accent)
            art = art.resize((uw, uh), Image.LANCZOS)
            stored = art.rotate(-90, expand=True) if rot else art
            assert stored.size == (w, h), (name, stored.size, (w, h))
            sheet.paste(Image.new("RGBA", (w, h), (0, 0, 0, 0)), (fr["x"], fr["y"]))
            sheet.alpha_composite(stored, (fr["x"], fr["y"]))
        sheet.save(path, **kwargs)
        print("reskinned", path)


if __name__ == "__main__":
    main()
