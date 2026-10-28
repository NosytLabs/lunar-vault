"""Remove only unchanged, explicitly retired game assets recorded in provenance."""
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'docs/assets/retired-assets-20261028.json').read_text())
removed = []
for entry in manifest['removed']:
    path = ROOT/entry['path']
    if not path.exists(): continue
    if hashlib.sha256(path.read_bytes()).hexdigest() != entry['sha256']:
        raise SystemExit('Refusing changed asset: '+entry['path'])
    app = ROOT.joinpath(*Path(entry['path']).parts[:2])
    refs = [str(p.relative_to(ROOT)) for p in (app/'src').rglob('*')
            if p.is_file() and p.suffix in ('.ts', '.js', '.svelte', '.css')
            and path.name in p.read_text()]
    if refs: raise SystemExit('Asset remains referenced: '+str(refs))
    path.unlink()
    removed.append(entry['path'])
print(json.dumps({'removed': removed}, indent=2))
