import json, os, re, sys
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
# 5) Sound sprites: validate every browser source and playback window.
for js in sorted(root.glob('apps/*/static/assets/audio/sounds.json')):
    try:
        d=json.loads(js.read_text())
    except Exception as e:
        issues.append(f"{js.relative_to(root)}: sounds.json parse error {e}")
        continue
    if not isinstance(d,dict):
        issues.append(f"{js.relative_to(root)}: sounds.json is not an object")
        continue
    for src in d.get('src',[]):
        checks += 1
        # The manifest's audio paths are relative to the application's static root.
        app_static=js.parents[2]
        path=app_static/src.removeprefix('./')
        if not path.exists():
            issues.append(f"{js.relative_to(root)}: missing audio source {src}")
    if not d.get('sprite'):
        issues.append(f"{js.relative_to(root)}: missing sprite definitions")
    for key, info in d.get('sprite',{}).items():
        checks += 1
        if not isinstance(info,list) or len(info)<2 or not all(isinstance(x,(int,float)) and x>=0 for x in info[:2]) or info[1]<=0:
            issues.append(f"{js.relative_to(root)}: invalid sprite window {key}")
print(f"checks={checks} issues={len(issues)}")
for i in issues: print(i)
if issues: sys.exit(1)
