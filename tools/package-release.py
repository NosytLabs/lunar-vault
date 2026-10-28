#!/usr/bin/env python3
"""Validate and reproducibly package the two reviewed Engine distributions.

Only explicit public build, publication and listing-media roots enter archives.
No browser output, repository checkout, credentials or evidence reports are copied.
"""
from __future__ import annotations
import argparse
import csv
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
GAMES = ('lunar-vault', 'salmon-run')
BUILDS = {'lunar-vault': 'build', 'salmon-run': 'dist'}
STATIC = {'lunar-vault': 'static', 'salmon-run': 'public'}
ALLOWED_FRONT = {'.html', '.js', '.css', '.json', '.svg', '.webp', '.png', '.jpg', '.jpeg', '.ttf', '.woff', '.woff2', '.wav', '.ogg', '.mp3', '.ico', '.txt', '.webmanifest'}
ALLOWED_MEDIA = {'.png', '.webp', '.jpg', '.jpeg', '.svg', '.txt', '.md', '.json'}
SENSITIVE = re.compile(r'(^|/)(\.[^/]+|node_modules|test-results|playwright-report|screenshots|traces|credentials|secrets)(/|$)|\.(pem|key|p12|pfx|map)$', re.I)
SAMPLE = re.compile(r'(^|/)(sounds\.(ogg|mp3|m4a|ac3)|LoaderStakeEngine[^/]*)$', re.I)


def fail(message):
    raise ValueError(message)


def sha(file: Path):
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(file: Path):
    try:
        return json.loads(file.read_text())
    except (OSError, ValueError) as error:
        fail(f'{file.relative_to(ROOT) if file.is_relative_to(ROOT) else file.name}: {error}')


def record(file: Path, base: Path):
    if file.is_symlink() or not file.is_file():
        fail(f'Only regular files may be packaged: {file}')
    name = file.relative_to(base).as_posix()
    if any(ord(char) < 32 for char in name) or SENSITIVE.search(name):
        fail(f'Private or unsupported file path: {name}')
    return {'path': name, 'bytes': file.stat().st_size, 'sha256': sha(file)}


def digest_records(records):
    # Lengths and JSON escaping make the path unambiguous; order and separators are fixed.
    payload = json.dumps(records, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()
    return hashlib.sha256(payload).hexdigest()


def tree(base: Path, allowed=None):
    if not base.is_dir() or base.is_symlink():
        fail(f'Required public directory is missing or symbolic: {base}')
    files = sorted((file for file in base.rglob('*') if file.is_file() or file.is_symlink()), key=lambda p: p.relative_to(base).as_posix())
    if not files:
        fail(f'Empty public directory: {base}')
    records = []
    for file in files:
        if allowed is not None and file.suffix.lower() not in allowed:
            fail(f'Unsupported public file: {file.relative_to(ROOT)}')
        records.append(record(file, base))
    return {'directory': base.relative_to(ROOT).as_posix(), 'directorySha256': digest_records(records), 'files': records}


def source_tree(game):
    app = ROOT / 'apps' / game
    files = list((app / 'src').rglob('*'))
    files += [file for file in app.iterdir() if file.is_file() and (file.suffix in ('.ts', '.js', '.json', '.html') and file.name not in ('package-lock.json',))]
    records = [record(file, ROOT) for file in sorted(set(files)) if file.is_file()]
    return {'directorySha256': digest_records(records), 'files': records}


def shared_source():
    files = []
    for package in sorted((ROOT / 'packages').iterdir()):
        if not package.is_dir() or package.is_symlink():
            continue
        for file in package.rglob('*'):
            rel = file.relative_to(package)
            if any(part.startswith('.') or part in ('node_modules', 'dist', 'build', 'coverage') for part in rel.parts):
                continue
            if file.is_file() and file.suffix in ('.ts', '.js', '.mjs', '.svelte', '.json', '.css'):
                files.append(file)
    files += [ROOT / name for name in ('package.json', 'pnpm-lock.yaml') if (ROOT / name).is_file()]
    records = [record(file, ROOT) for file in sorted(files)]
    return {'directorySha256': digest_records(records), 'files': records}


def generated_graph(game):
    base = ROOT / 'apps' / game / BUILDS[game]
    index = base / 'index.html'
    if not index.is_file():
        fail(f'{game}: frontend index.html is missing at archive root ({base})')
    pattern = re.compile(r'(?:assets/index-[A-Za-z0-9_-]+\.(?:js|css)|_app/immutable/(?:bundle\.[A-Za-z0-9_-]+\.js|assets/style\.[A-Za-z0-9_-]+\.css))$')
    candidates = {file.relative_to(base).as_posix(): file for file in base.rglob('*') if file.is_file() and pattern.fullmatch(file.relative_to(base).as_posix())}
    texts = {name: file.read_text() for name, file in candidates.items()}
    initial = index.read_text()
    inline_styles = {block.strip() for block in re.findall(r'<style\b[^>]*>(.*?)</style>', initial, re.S | re.I)}
    kept = set()
    queue = [initial]
    while queue:
        text = queue.pop()
        for name, file in candidates.items():
            if name in kept:
                continue
            # Vite/SvelteKit embed own bundle names and inline the current CSS.
            if file.name in text or (file.suffix == '.css' and texts[name].strip() and texts[name].strip() in inline_styles):
                kept.add(name)
                queue.append(texts[name])
    return base, {'kept': sorted(kept), 'orphans': sorted(set(candidates) - kept)}


def prune_generated(game):
    base, graph = generated_graph(game)
    removed = []
    for name in graph['orphans']:
        file = base / name
        item = record(file, base)
        # Only the exact generated hash filename class inspected above is eligible.
        if sha(file) != item['sha256']:
            fail(f'{game}: generated output changed during prune: {name}')
        file.unlink()
        removed.append(item)
    return {'game': game, 'kept': graph['kept'], 'removed': removed, 'policy': 'Only graph-unreachable generated hashed JS/CSS; current index references and exact inline CSS retained.'}


def check_front(game):
    base = ROOT / 'apps' / game / BUILDS[game]
    if not (base / 'index.html').is_file():
        fail(f'{game}: frontend index.html is missing at archive root ({base})')
    _, graph = generated_graph(game)
    if graph['orphans']:
        fail(f'{game}: orphan generated runtime files remain: {", ".join(graph["orphans"])}; inspect then run --prune-generated')
    result = tree(base, ALLOWED_FRONT)
    retired = read_json(ROOT / 'docs/assets/retired-assets-20261028.json')['removed']
    prefix = f'apps/{game}/{STATIC[game]}/'
    retired_names = {item['path'][len(prefix):] for item in retired if item['path'].startswith(prefix)}
    for item in result['files']:
        name = item['path']
        if SAMPLE.search(name) or name in retired_names:
            fail(f'{game}: retired or sample runtime file remains: {name}')
        # Salmon's sprites are original and live in assets/sprites; the SDK pattern only applies to Lunar.
        if game == 'lunar-vault' and re.search(r'assets/(spines|sprites|fonts)/', name):
            fail(f'{game}: sample SDK runtime directory remains: {name}')
        if Path(name).suffix in ('.html', '.js', '.css', '.json'):
            text = (base / name).read_text(errors='replace')
            if 'ADD YOUR LOGO' in text or 'use.typekit.net' in text:
                fail(f'{game}: inherited placeholder or external sample font: {name}')
    # Public static assets must be byte-identical to the reviewed build, rather than merely present.
    public = ROOT / 'apps' / game / STATIC[game]
    for file in public.rglob('*'):
        if not file.is_file():
            continue
        rel = file.relative_to(public)
        built = base / rel
        if not built.is_file() or sha(file) != sha(built):
            fail(f'{game}: public asset absent or stale in build: {rel}')
    return result


def check_math(game):
    directory = ROOT / 'math' / game
    publication = directory / 'publish_files'
    config = read_json(directory / 'config.json')
    report = read_json(directory / 'report.json')
    verified = read_json(directory / 'verification.json')
    index = read_json(publication / 'index.json')
    modes = index.get('modes')
    if not isinstance(modes, list) or not modes:
        fail(f'{game}: publication modes array missing')
    names = [mode.get('name') for mode in modes]
    expected = set(config['modes'])
    if len(set(names)) != len(names) or set(names) != expected or set(report.get('modes', {})) != expected or set(verified) != expected:
        fail(f'{game}: publication/config/report/verification modes differ')
    files = {'index.json'}
    summaries = {}
    target = Fraction(str(config['targetRtp']))
    if not Fraction(96, 100) <= target <= Fraction(967, 1000):
        fail(f'{game}: configured RTP is outside Engine limits')
    for mode in modes:
        name = mode['name']
        cost = Fraction(str(mode['cost']))
        stats, check = report['modes'][name], verified[name]
        if cost != Fraction(str(config['modes'][name]['cost'])) or cost != Fraction(str(stats['cost'])) or cost < 1 or cost > 50000:
            fail(f'{game}/{name}: publication cost mismatch or invalid cost')
        if check.get('errors') != 0:
            fail(f'{game}/{name}: verifier errors are not zero')
        for key, digest_key in [('events', 'eventsSha256'), ('weights', 'weightsSha256')]:
            filename = mode.get(key)
            if not isinstance(filename, str) or Path(filename).name != filename or filename in files or not filename.endswith('.jsonl.zst' if key == 'events' else '.csv'):
                fail(f'{game}/{name}: invalid or duplicate publication filename')
            file = publication / filename
            if not file.is_file() or file.is_symlink() or file.stat().st_size > 4_200_000_000 or sha(file) != stats.get(digest_key):
                fail(f'{game}/{name}: missing or mismatched {key} file hash')
            files.add(filename)
        count = weight = weighted = maximum = 0
        with (publication / mode['weights']).open(newline='') as stream:
            for row in csv.reader(stream):
                if len(row) != 3 or not all(re.fullmatch(r'\d+', entry) for entry in row):
                    fail(f'{game}/{name}: invalid lookup row {count}')
                identifier, frequency, payout = map(int, row)
                if identifier != count or frequency <= 0:
                    fail(f'{game}/{name}: invalid ID or nonpositive weight at row {count}')
                count += 1
                weight += frequency
                weighted += frequency * payout
                maximum = max(maximum, payout)
        actual = Fraction(weighted, weight * 100) / cost if weight else Fraction(0)
        maximum_x = Fraction(maximum, 100)
        if actual != target or Fraction(stats.get('exactRtpFraction', '0')) != actual or Fraction(check.get('rtpFraction', '0')) != actual:
            fail(f'{game}/{name}: exact CSV RTP differs from config/report/verifier')
        if not math.isclose(stats.get('weightedRtp', -1), float(actual), abs_tol=1e-12, rel_tol=0):
            fail(f'{game}/{name}: numeric report RTP mismatch')
        if maximum_x > 1000000 or Fraction(str(stats.get('maximumWinX', -1))) != maximum_x or Fraction(str(check.get('maximumWinX', -1))) != maximum_x:
            fail(f'{game}/{name}: CSV maximum differs from report/verifier')
        if count != stats.get('books') or count != check.get('verifiedBooks') or count != stats.get('nonzeroWeightBooks') or weight != stats.get('totalWeight'):
            fail(f'{game}/{name}: CSV book/weight totals differ from report/verifier')
        if 'totalWeight' in check and check['totalWeight'] != weight:
            fail(f'{game}/{name}: verifier total weight mismatch')
        if name == 'base' and (cost != 1 or not math.isfinite(stats.get('standardDeviationPerCost', -1)) or stats.get('standardDeviationPerCost', -1) < .6):
            fail(f'{game}/{name}: cheapest base cost or deviation does not meet limits')
        summaries[name] = {'cost': float(cost), 'books': count, 'totalWeight': weight, 'exactRtpFraction': str(actual), 'maximumWinX': float(maximum_x), 'errors': 0}
    records = [record(publication / name, publication) for name in sorted(files)]
    return {'directory': publication.relative_to(ROOT).as_posix(), 'directorySha256': digest_records(records), 'files': records, 'modes': summaries, 'reports': [record(directory / name, ROOT) for name in ('config.json', 'report.json', 'verification.json')]}


def check_media(game):
    result = tree(ROOT / 'media' / game, ALLOWED_MEDIA)
    common = [ROOT / 'media' / 'STUDIO-SETUP.md']
    studio = tree(ROOT / 'media' / 'studio', ALLOWED_MEDIA)
    common += [ROOT / 'media' / 'studio' / item['path'] for item in studio['files']]
    for file in common:
        item = record(file, ROOT / 'media')
        item['source'] = file.relative_to(ROOT).as_posix()
        if item['path'] in {existing['path'] for existing in result['files']}:
            fail(f'{game}: duplicate shared media archive path {item["path"]}')
        result['files'].append(item)
    result['files'].sort(key=lambda item: item['path'])
    result['directorySha256'] = digest_records(result['files'])
    for item in result['files']:
        if item['bytes'] >= 10_000_000:
            fail(f'{game}: media/editor asset must be smaller than 10 MB: {item["path"]}')
    for name in ('editor/foreground.png', 'editor/background-wide.webp', 'editor/background-portrait.webp'):
        if name not in {item['path'] for item in result['files']}:
            fail(f'{game}: editor layer missing: {name}')
    return result


def asset_checks():
    results = []
    for command in ([ 'node', 'tools/check-original-art.mjs' ], [sys.executable, 'tools/audit-assets.py']):
        completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        if completed.returncode:
            fail(f'Asset check failed ({" ".join(command)}):\n{completed.stdout}{completed.stderr}')
        results.append({'command': ' '.join(command), 'status': 'passed', 'output': completed.stdout.strip()})
    return results


def write_archive(file: Path, artifact):
    temporary = file.with_suffix('.zip.tmp')
    base = ROOT / artifact['directory']
    with zipfile.ZipFile(temporary, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as archive:
        for item in artifact['files']:
            info = zipfile.ZipInfo(item['path'], date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            info.compress_type = zipfile.ZIP_STORED
            info.extra = b''
            with (ROOT / item.get('source', str(base / item['path']))).open('rb') as source, archive.open(info, 'w', force_zip64=item['bytes'] >= zipfile.ZIP64_LIMIT) as destination:
                for chunk in iter(lambda: source.read(1024 * 1024), b''):
                    destination.write(chunk)
    # Detect source changes during packaging before replacing the release artifact.
    for item in artifact['files']:
        source = ROOT / item.get('source', str(base / item['path']))
        if source.stat().st_size != item['bytes'] or sha(source) != item['sha256']:
            temporary.unlink(missing_ok=True)
            fail(f'Source changed during packaging: {source}')
    temporary.replace(file)
    return {'file': file.name, 'bytes': file.stat().st_size, 'sha256': sha(file), 'format': 'zip-stored', 'fileCount': len(artifact['files'])}


def verify_archives(file, current):
    packaged = read_json(file)
    if packaged.get('schemaVersion') != 2:
        fail('Package manifest must use schemaVersion 2')
    for game, entry in current['games'].items():
        for kind in ('frontend', 'math', 'media'):
            archive_record = packaged.get('games', {}).get(game, {}).get(kind, {}).get('archive', {})
            name = archive_record.get('file')
            if not isinstance(name, str) or Path(name).name != name:
                fail(f'{game}: missing or invalid {kind} archive filename')
            archive_file = file.parent / name
            if archive_file.is_symlink() or not archive_file.is_file():
                fail(f'{game}: missing or symbolic {kind} archive')
            if archive_file.stat().st_size != archive_record.get('bytes') or sha(archive_file) != archive_record.get('sha256'):
                fail(f'{game}: {kind} archive size/hash mismatch')
            expected = entry[kind]['files']
            with zipfile.ZipFile(archive_file) as archive:
                if archive.namelist() != [item['path'] for item in expected]:
                    fail(f'{game}: {kind} ZIP entries differ from current public files')
                for item, info in zip(expected, archive.infolist()):
                    if info.file_size != item['bytes'] or info.is_dir():
                        fail(f'{game}: {kind} ZIP size mismatch: {item["path"]}')
                    digest = hashlib.sha256()
                    with archive.open(info) as stream:
                        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                            digest.update(chunk)
                    if digest.hexdigest() != item['sha256']:
                        fail(f'{game}: {kind} ZIP file hash differs from current file: {item["path"]}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT.parent / 'release-20261028')
    parser.add_argument('--game', action='append', choices=GAMES, help='Repeat to select games; defaults to both.')
    parser.add_argument('--check', action='store_true', help='Validate only; write no archives or manifest.')
    parser.add_argument('--json', action='store_true', help='Emit machine-readable validation/manifest JSON.')
    parser.add_argument('--verify-manifest', type=Path, help='Also read and verify existing archives against current public file bytes; writes nothing with --check.')
    parser.add_argument('--prune-generated', action='store_true', help='Remove only graph-unreachable generated hash JS/CSS, print kept/removed records and exit without packaging.')
    args = parser.parse_args()
    if args.prune_generated:
        result = {'games': [prune_generated(game) for game in dict.fromkeys(args.game or GAMES)]}
        print(json.dumps(result, indent=2))
        return
    output = args.output.resolve()
    if output.is_relative_to(ROOT):
        fail('Release output must be outside the repository; choose --output ../release-20261028')
    checks = asset_checks()
    result = {'schemaVersion': 2, 'release': '2026-10-28', 'archivePolicy': 'sorted paths; fixed 1980 timestamp; mode 0644; ZIP_STORED; no directory entries', 'assetChecks': checks, 'sharedSource': shared_source(), 'games': {}}
    for game in dict.fromkeys(args.game or GAMES):
        result['games'][game] = {'source': source_tree(game), 'frontend': check_front(game), 'math': check_math(game), 'media': check_media(game)}
    if args.verify_manifest:
        verify_archives(args.verify_manifest.resolve(), result)
    if not args.check:
        output.mkdir(parents=True, exist_ok=True)
        for game, entry in result['games'].items():
            for kind in ('frontend', 'math', 'media'):
                entry[kind]['archive'] = write_archive(output / f'{game}-{kind}.zip', entry[kind])
            entry['frontendSha256'] = entry['frontend']['archive']['sha256']
            entry['mathSha256'] = entry['math']['archive']['sha256']
        (output / 'release-manifest.json').write_text(json.dumps(result, indent=2) + '\n')
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for game, entry in result['games'].items():
            print(f'{game}: validated frontend={len(entry["frontend"]["files"])} files, math={len(entry["math"]["files"])} files, media={len(entry["media"]["files"])} files')
            if not args.check:
                for kind in ('frontend', 'math', 'media'):
                    item = entry[kind]['archive']
                    print(f'  {item["file"]}: {item["bytes"]} bytes SHA256 {item["sha256"]}')
        print('Validation only; no files written.' if args.check else f'Manifest: {output / "release-manifest.json"}')
        print('Local consistency only. Engine, legal, human and publisher approval are not granted by this tool.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, csv.Error, zipfile.BadZipFile) as error:
        print(f'Release packaging BLOCKED: {error}', file=sys.stderr)
        sys.exit(1)
