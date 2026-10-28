"""Deterministic exports from the original generated PNGs and bundled font."""
from pathlib import Path
from PIL import Image, ImageOps, ImageFont, ImageDraw
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
import hashlib, json, shutil, io

ROOT = Path(__file__).resolve().parents[1]
records = []

def record(path, source):
    records.append({"path": str(path.relative_to(ROOT)), "source": source,
                    "bytes": path.stat().st_size,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})

for game in ("lunar-vault", "salmon-run"):
    original = ROOT / "art" / game
    output = ROOT / "media" / game
    (output / "editor").mkdir(parents=True, exist_ok=True)
    for shape in ("portrait", "wide"):
        source = original / f"studio-background-{shape}-v5.png"
        path = output / "editor" / f"background-{shape}.webp"
        Image.open(source).convert("RGB").save(path, "WEBP", quality=94, method=6)
        record(path, str(source.relative_to(ROOT)))
    foreground = original / ("scatter-v4.png" if game == "lunar-vault" else "salmon-v4.png")
    path = output / "editor" / "foreground.png"
    shutil.copy2(foreground, path)
    record(path, str(foreground.relative_to(ROOT)))
    for size in ((408, 544), (408, 546), (1080, 1440)):
        source = original / "tile-portrait-v4.png"
        image = ImageOps.fit(Image.open(source).convert("RGB"), size, method=Image.Resampling.LANCZOS)
        path = output / f"tile-{size[0]}x{size[1]}.png"
        image.save(path, "PNG", optimize=True)
        record(path, str(source.relative_to(ROOT)))
    source = original / "cover-landscape-v4.png"
    for size, suffix in (((640, 360), "png"), ((1600, 900), "webp")):
        image = ImageOps.fit(Image.open(source).convert("RGB"), size, method=Image.Resampling.LANCZOS)
        path = output / f"cover-{size[0]}x{size[1]}.{suffix}"
        if suffix == "png": image.save(path, "PNG", optimize=True)
        else: image.save(path, "WEBP", quality=94, method=6)
        record(path, str(source.relative_to(ROOT)))

studio = ROOT / "media" / "studio"
studio.mkdir(parents=True, exist_ok=True)
type_dir = ROOT / "apps/lunar-vault/static/assets/type"
font = instantiateVariableFont(TTFont(type_dir / "Cinzel-Variable.ttf"), {"wght": 700})
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
x = 0
paths = []
for character in "NOSYT":
    glyph = glyphs[cmap[ord(character)]]
    pen = SVGPathPen(glyphs)
    glyph.draw(pen)
    paths.append(f'<path transform="translate({x},0)" d="{pen.getCommands()}"/>')
    x += glyph.width + 45
padding = 100
height = (x + padding * 2) * 427 / 1600
baseline = (height + 720) / 2
svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="427" '
       f'viewBox="0 0 {x + padding * 2} {height}"><title>Nosyt</title>'
       f'<g fill="#ffffff" transform="translate({padding},{baseline}) scale(1,-1)">'
       + ''.join(paths) + '</g></svg>\n')
(studio / "nosyt-white.svg").write_text(svg)
font_bytes = io.BytesIO()
font.save(font_bytes)
font_bytes.seek(0)
scale = 1600 / (x + padding * 2)
render_font = ImageFont.truetype(font_bytes, size=round(font['head'].unitsPerEm * scale))
png = Image.new('RGBA', (1600, 427), (0, 0, 0, 0))
draw = ImageDraw.Draw(png)
offset = 0
for character in 'NOSYT':
    draw.text(((padding + offset) * scale, baseline * scale), character,
              font=render_font, fill=(255, 255, 255, 255), anchor='ls')
    offset += glyphs[cmap[ord(character)]].width + 45
png.save(studio / 'nosyt-white.png', 'PNG', optimize=True)
shutil.copy2(type_dir / "Cinzel-OFL.txt", studio / "Cinzel-OFL.txt")
(studio / "README.md").write_text('# Nosyt publisher wordmark\n\nWhite single-colour lettering on a transparent background. Use the SVG when accepted; PNG is 1600×427. The editable vector uses outlined Cinzel Bold glyphs from the bundled, unmodified SIL Open Font License font. This is prepared publisher artwork, pending the publisher’s approval.\n')
for path in sorted(studio.iterdir()): record(path, "Bundled Cinzel font; original text layout" if path.suffix in (".svg", ".png") else "Publisher media documentation/font licence")
manifest = ROOT / "docs/assets/studio-media-recovered-20261028.json"
manifest.write_text(json.dumps({"date": "2026-10-28", "files": records}, indent=2) + '\n')
assert all(item["bytes"] < 10000000 for item in records)
print(json.dumps({"exportedFiles": len(records), "allUnder10MB": True}, indent=2))
