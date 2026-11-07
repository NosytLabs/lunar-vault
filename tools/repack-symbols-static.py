#!/usr/bin/env python3
"""Repack symbolsStatic with the 2026-11-06 generated lunar art.

- H1-H5 / L1-L5: AI-generated emblems composited into the game's medallion
  treatment (accent metallic rim + bevel) so the set stays cohesive with the
  Oct-26 art direction.
- W: generated gold medallion, circular-cropped as-is.
- S: generated crystal cluster + PIL 'SCATTER' caption.
- Multipliers + explodedW: redrawn in PIL in the same medallion language
  (the sample pickaxe/dynamite art is gone).
- L5 (NEW): the game config pays L5 but the sheet never had a frame. The sheet
  canvas is extended and an l5.webp frame appended; all existing frame
  geometry is preserved byte-for-byte in the JSON.
Outputs: symbolsStatic.png / .webp / .json + individual 512px master PNGs.
"""
import json, math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(REPO, 'apps/lunar-vault/static/assets/sprites/symbolsStatic')
ART = os.environ.get('LV_ART_DIR', os.path.expanduser('~/workspace/lv-art'))
OUT_SYMBOLS = os.path.join(REPO, 'apps/lunar-vault/static/assets/symbols')

ICON = {
    'h1': 'media-generation-lv-h1-0-31ec5f9b-4dbf-42bd-8706-c93d6512b147.webp',
    'h2': 'media-generation-lv-h2-0-08de8604-7303-4a7f-8512-0a2de942964c.webp',
    'h3': 'media-generation-lv-h3-0-8488069a-b7d5-4f6f-ad40-c79921dd0ec6.webp',
    'h4': 'media-generation-lv-h4-0-6797cfce-c26c-4962-be62-1c0a7152b8e8.webp',
    'h5': 'media-generation-lv-h5-0-deadd2dd-3415-4756-96d8-0dbd57a40c49.webp',
    'l1': 'media-generation-lv-l1-0-ded4656e-c32b-4678-b1c1-cbf942be444c.webp',
    'l2': 'media-generation-lv-l2-0-9fcc6478-1c71-4ba1-8135-56dbb742e7be.webp',
    'l3': 'media-generation-lv-l3b-0-d8c76c1d-989a-40c6-9dbd-0f3c9807af78.webp',
    'l4': 'media-generation-lv-l4-0-0bd62a94-34e4-4b24-a883-d09eb65961b8.webp',
    'l5': 'media-generation-lv-l5b-0-f5c0b389-4b27-4e52-8f0c-878bf8bca9ef.webp',
    'w':  'media-generation-lv-w-0-3e6f1879-73ae-4f92-893a-e0fafc445dc7.webp',
    's':  'media-generation-lv-s-0-1da9aef0-57f7-4687-9861-1bb91e3380a3.webp',
}
ACCENT = {
    'h1': (255, 210, 87), 'h2': (255, 233, 168), 'h3': (201, 167, 255),
    'h4': (179, 136, 255), 'h5': (127, 231, 255), 'l1': (159, 216, 255),
    'l2': (255, 224, 102), 'l3': (138, 255, 209), 'l4': (255, 179, 226),
    'l5': (232, 236, 245),
}
NAVY = (16, 18, 43)
M = 800  # master canvas

def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)

def vgrad(size, top, bottom):
    g = Image.new('RGB', (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((size, size))

def circle_mask(d, fill=255):
    m = Image.new('L', (d, d), 0)
    ImageDraw.Draw(m).ellipse([0, 0, d - 1, d - 1], fill=fill)
    return m

def medallion(icon_path, accent, master=M):
    """Icon art disc + metallic accent rim, transparent outside."""
    img = Image.new('RGBA', (master, master), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # metallic rim: vertical-gradient disc masked to outer circle
    rim = vgrad(master, shade(accent, 1.25), shade(accent, 0.55)).convert('RGBA')
    img.paste(rim, (0, 0), circle_mask(master))
    d = ImageDraw.Draw(img)
    d.ellipse([6, 6, master - 7, master - 7], outline=shade(accent, 0.35) + (255,), width=4)
    # bevel
    bevel_r = int(master * 0.465)
    c = master // 2
    d.ellipse([c - bevel_r, c - bevel_r, c + bevel_r, c + bevel_r], fill=shade(accent, 0.30) + (255,))
    # art disc
    art_d = int(master * 0.90)
    icon = Image.open(icon_path).convert('RGB').resize((art_d, art_d), Image.LANCZOS)
    off = (master - art_d) // 2
    img.paste(icon, (off, off), circle_mask(art_d))
    # top sheen
    sheen = Image.new('RGBA', (master, master), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen)
    sd.ellipse([int(master * 0.18), int(master * 0.04), int(master * 0.82), int(master * 0.42)],
               fill=(255, 255, 255, 46))
    sheen = sheen.filter(ImageFilter.GaussianBlur(30))
    img.alpha_composite(sheen)
    return img

def gold_text(draw, xy, text, font, top=(255, 240, 190), bottom=(232, 164, 32)):
    """Gradient-filled text with dark outline, drawn centred at xy."""
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=6)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    layer = Image.new('RGBA', (w + 16, h + 16), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.text((8 - bbox[0], 8 - bbox[1]), text, font=font, fill=(20, 14, 4, 255), stroke_width=6,
            stroke_fill=(58, 38, 6, 255))
    grad = vgrad(max(w, h) + 16, top, bottom).resize((w + 16, h + 16)).convert('RGBA')
    tmask = Image.new('L', (w + 16, h + 16), 0)
    ImageDraw.Draw(tmask).text((8 - bbox[0], 8 - bbox[1]), text, font=font, fill=255)
    layer.paste(grad, (0, 0), tmask)
    return layer, (int(xy[0] - layer.width / 2), int(xy[1] - layer.height / 2))

def scatter(master=M):
    img = Image.new('RGBA', (master, master), (0, 0, 0, 0))
    icon = Image.open(os.path.join(ART, ICON['s'])).convert('RGB')
    w = int(master * 0.96)
    icon = icon.resize((w, w), Image.LANCZOS)
    # keep the crystal mass: crop centre square, place high
    img.paste(icon, ((master - w) // 2, -int(master * 0.10)), circle_mask(w))
    font = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 118)
    d = ImageDraw.Draw(img)
    layer, pos = gold_text(d, (master / 2, master * 0.86), 'SCATTER', font)
    img.alpha_composite(layer, pos)
    return img

def wild(master=M):
    icon = Image.open(os.path.join(ART, ICON['w'])).convert('RGB').resize((master, master), Image.LANCZOS)
    img = Image.new('RGBA', (master, master), (0, 0, 0, 0))
    img.paste(icon, (0, 0), circle_mask(master))
    return img

def exploded_wild(master=M):
    img = Image.new('RGBA', (master, master), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = master / 2
    # gold starburst
    spikes = 12
    for i in range(spikes):
        a = 2 * math.pi * i / spikes
        half = math.pi / spikes * 0.62
        r1, r2 = master * 0.50, master * 0.30
        p1 = (c + r1 * math.cos(a), c + r1 * math.sin(a))
        p2 = (c + r2 * math.cos(a + half), c + r2 * math.sin(a + half))
        p3 = (c + r2 * math.cos(a - half), c + r2 * math.sin(a - half))
        d.polygon([p1, p2, p3], fill=(255, 190, 50, 255) if i % 2 == 0 else (238, 148, 26, 255))
    glow = Image.new('RGBA', (master, master), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([master * 0.16, master * 0.16, master * 0.84, master * 0.84],
                                 fill=(255, 170, 40, 120))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(24)))
    w = wild(int(master * 0.66))
    img.alpha_composite(w, (int(master * 0.17), int(master * 0.17)))
    return img

def multiplier(label, accent, master=M):
    img = medallion.__wrapped__ if False else None
    base = Image.new('RGBA', (master, master), (0, 0, 0, 0))
    rim = vgrad(master, shade(accent, 1.25), shade(accent, 0.55)).convert('RGBA')
    base.paste(rim, (0, 0), circle_mask(master))
    d = ImageDraw.Draw(base)
    c = master // 2
    r = int(master * 0.415)
    d.ellipse([c - r, c - r, c + r, c + r], fill=NAVY + (255,))
    d.ellipse([c - r, c - r, c + r, c + r], outline=shade(accent, 0.4) + (255,), width=5)
    font = ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf', 300)
    layer, pos = gold_text(d, (c, c + 8), label, font,
                           top=shade(accent, 1.35) if max(accent) < 250 else (255, 255, 255),
                           bottom=accent)
    base.alpha_composite(layer, pos)
    return base

def build():
    data = json.load(open(os.path.join(SRC_DIR, 'symbolsStatic.json')))
    frames = data['frames']
    old = Image.open(os.path.join(SRC_DIR, 'symbolsStatic.png')).convert('RGBA')
    W0 = old.size[0]
    # original content bottom, ignoring any previously appended l5 frame
    H0 = max(fd['frame']['y'] + fd['frame']['h'] for n, fd in frames.items() if n != 'l5.webp') + 2

    masters = {}
    for name in ['h1', 'h2', 'h3', 'h4', 'h5', 'l1', 'l2', 'l3', 'l4', 'l5']:
        masters[name] = medallion(os.path.join(ART, ICON[name]), ACCENT[name])
    masters['w'] = wild()
    masters['s'] = scatter()
    masters['explodedW'] = exploded_wild()
    masters['m1_2x'] = multiplier('2x', (88, 166, 255))
    masters['m1_4x'] = multiplier('4x', (88, 166, 255))
    masters['m2_5x'] = multiplier('5x', (176, 132, 255))
    masters['m2_7x'] = multiplier('7x', (176, 132, 255))
    masters['m3_10x'] = multiplier('10x', (255, 120, 110))

    # save individual masters (512px) for Studio/paytable reuse
    os.makedirs(OUT_SYMBOLS, exist_ok=True)
    label = {'w': 'wild', 's': 'scatter', 'explodedW': 'wild-exploded'}
    for name, mimg in masters.items():
        mimg.resize((512, 512), Image.LANCZOS).save(
            os.path.join(OUT_SYMBOLS, f"{label.get(name, name)}.png"))

    # extend sheet for the new l5 frame
    pad = 4
    new_h = H0 + 200 + pad * 2
    sheet = Image.new('RGBA', (W0, new_h), (0, 0, 0, 0))

    def place(frame_name, master_img):
        fd = frames[frame_name]
        fr = fd['frame']
        uw, uh = (fr['h'], fr['w']) if fd['rotated'] else (fr['w'], fr['h'])
        art = master_img.resize((uw, uh), Image.LANCZOS)
        if fd['rotated']:
            art = art.rotate(-90, expand=True)
        sheet.paste(art, (fr['x'], fr['y']), art)

    for name in ['h1', 'h2', 'h3', 'h4', 'h5', 'l1', 'l2', 'l3', 'l4']:
        place(f'{name}.webp', masters[name])
    place('w.png', masters['w'])
    place('s.png', masters['s'])
    place('explodedW.png', masters['explodedW'])
    for name in ['m1_2x', 'm1_4x', 'm2_5x', 'm2_7x', 'm3_10x']:
        place(f'{name}.png', masters[name])

    # l5 frame appended at the bottom
    l5y = H0 + pad
    art = masters['l5'].resize((200, 200), Image.LANCZOS)
    sheet.paste(art, (2, l5y), art)
    frames['l5.webp'] = {
        'frame': {'x': 2, 'y': l5y, 'w': 200, 'h': 200},
        'rotated': False, 'trimmed': False,
        'spriteSourceSize': {'x': 0, 'y': 0, 'w': 200, 'h': 200},
        'sourceSize': {'w': 200, 'h': 200},
    }
    data['meta']['size'] = {'w': W0, 'h': new_h}

    sheet.save(os.path.join(SRC_DIR, 'symbolsStatic.png'))
    sheet.save(os.path.join(SRC_DIR, 'symbolsStatic.webp'), lossless=True)
    with open(os.path.join(SRC_DIR, 'symbolsStatic.json'), 'w') as f:
        json.dump(data, f, indent='\t')
    print('sheet', sheet.size, 'frames', len(frames))
    for p in ['symbolsStatic.png', 'symbolsStatic.webp', 'symbolsStatic.json']:
        print(p, os.path.getsize(os.path.join(SRC_DIR, p)))

if __name__ == '__main__':
    build()
