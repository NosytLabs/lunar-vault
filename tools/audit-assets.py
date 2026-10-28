import json, os, re, sys, hashlib
from PIL import Image
from pathlib import Path
root=Path(__file__).resolve().parent.parent
issues=[]
checks=0
# 1) new URL refs in each app's src/game/assets.ts -> static path by stripping leading ../../
for app in sorted((root/'apps').iterdir()):
    f=app/'src/game/assets.ts'
    if not f.exists(): continue
    for u in re.findall(r"new URL\('([^']+)'", f.read_text()):
        checks+=1
        rel=u
        while rel.startswith('../'): rel=rel[3:]
        cand=app/'static'/rel
        if not cand.exists(): issues.append(f"{app.name}: assets.ts URL {u} -> missing {cand.relative_to(root)}")
# 2) Atlas page images: first nonempty line is page image in Spine atlas format
for atlas in sorted(root.glob('apps/*/static/**/*.atlas')):
    lines=[x.strip() for x in atlas.read_text(errors='ignore').splitlines() if x.strip()]
    if not lines: issues.append(f"{atlas.relative_to(root)}: empty atlas"); continue
    checks+=1
    if not (atlas.parent/lines[0]).exists(): issues.append(f"{atlas.relative_to(root)}: missing page image {lines[0]}")
# 3) Spritesheet JSON meta.image
for js in sorted(root.glob('apps/*/static/**/*.json')):
    try: d=json.load(open(js))
    except Exception: continue
    meta=d.get('meta') if isinstance(d,dict) else None
    if isinstance(meta,dict) and isinstance(meta.get('image'),str):
        checks+=1
        if not (js.parent/meta['image']).exists(): issues.append(f"{js.relative_to(root)}: missing spritesheet image {meta['image']}")
    # Spine skeleton JSON should parse and have animations/skins sanity (parse only)
    if isinstance(d,dict) and 'skeleton' in d:
        checks+=1
        if 'animations' not in d: issues.append(f"{js.relative_to(root)}: spine json has no animations key")
# 4) Bitmap font XML image refs
for xml in sorted(root.glob('apps/*/static/**/*.xml')):
    txt=xml.read_text(errors='ignore')
    for m in re.findall(r'file="([^"]+)"', txt):
        checks+=1
        if not (xml.parent/m).exists(): issues.append(f"{xml.relative_to(root)}: missing font page {m}")
# 5) Sound sprites JSON resources if present
for js in sorted(root.glob('apps/*/static/assets/audio/sounds.json')):
    try: d=json.load(open(js))
    except Exception as e: issues.append(f"{js.relative_to(root)}: sounds.json parse error {e}"); continue
    for r in d.get('resources',[]) if isinstance(d,dict) else []:
        checks+=1
        if not (js.parent/r).exists(): issues.append(f"{js.relative_to(root)}: missing audio resource {r}")
manifest = root/'docs/assets/generated-art-recovered-20261028.json'
if not manifest.exists(): issues.append('Generated artwork provenance manifest is missing')
else:
    for asset in json.loads(manifest.read_text())['assets']:
        for field in ['source', 'runtime']:
            checks += 1
            path = root/asset[field]
            if not path.exists(): issues.append(f'Missing asset: {asset[field]}'); continue
            if hashlib.sha256(path.read_bytes()).hexdigest() != asset[field+'Sha256']:
                issues.append(f'Asset hash mismatch: {asset[field]}')
        path = root/asset['runtime']
        if path.exists():
            checks += 1
            with Image.open(path) as image:
                if list(image.size) != asset['size']: issues.append(f'Unexpected dimensions: {asset["runtime"]}')
                if asset.get('alpha') and ('A' not in image.getbands() or image.getextrema()[3][0] != 0):
                    issues.append(f'Missing transparency: {asset["runtime"]}')
print(f"checks={checks} issues={len(issues)}")
for i in issues: print(i)
sys.exit(bool(issues))
