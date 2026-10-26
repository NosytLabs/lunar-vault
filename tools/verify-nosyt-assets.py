#!/usr/bin/env python3
"""Verify reproducible original art and common submission pitfalls without dependencies."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "apps/lunar-vault"
ART = APP / "static/assets/nosyt"
EXPECTED = {
    "h1.webp": "c22edcb5dcc4d8a9a8c988d10407597c795003c13180a7ba18572e97d9cb1919",
    "h2.webp": "640ff6af63cca6bc9adca0a2ba2f90448a25834f7ec8ea462a5b79ffb180f890",
    "h3.webp": "eb298fbeb39757398aaddeecc2edfb6912fe962523d857ea62f0ec5fce7c5b78",
    "h4.webp": "bd1026b4adf81a23f93ddf6271d4c575ba8201788b7831b187218a80caf89883",
    "h5.webp": "ae40b7814ba6796150e16ecdb8a498624ea52c077e7588a512c4fef3e127f5ce",
    "l1.webp": "af6036d82d5b0ee1ca9d6ecccd2ea9fcf60a2538b392ff55a6cec2150c21a555",
    "l2.webp": "014d2cc411228d8e38fc0c1596f5de84606d7952af1eff527d940c2f31554b9a",
    "l3.webp": "5a21e6b224fc8a2f61692d0b38a01c1eb15ac409d0cbd0bd2fa9dc370829908a",
    "l4.webp": "c71625e51a6076fbaf05b86301985bd2eeca0cdd899b8aad20b9f2c7ecd75b41",
    "l5.webp": "7df1134cf17e9a679a4ab23cf62dd430f101cad1163571cbac339db44c867a7d",
    "scatter.webp": "4db3165d12964930268c80b24b8822cada7ede5db8ae828ad92c70b6effefd01",
    "wild.webp": "8a32e757ea2a1f2f943f53d86f31dfff392a30d84f9f2868785a7ce188addf47",
    "observatory.webp": "19e926d5e282d7bc81806132503fbb94412cba2576cf40485c02e3bd5acab3d5",
    "observatory-feature.webp": "01e1616aa19fc12772b9f4a88a6cff1999046c5bd23a51b60e6c55669dd4a6be",
    "lobby-wide.webp": "aacf0defaa194e1eddb2ac5e84aa46d7f7be7f634ab877e114db7cd93deff6ac",
    "lobby-portrait.webp": "2aebeaff4e6c0a08868e8d4e0beb4b9c42cb19798bb9f02d2e4338de8b2b502d",
}

AUDIO_SHA256 = {
    "sounds.ogg": "3eaa7d4cc713b3eda57353ca3e85f3abe995dc6366719314255d48e935709400",
    "sounds.m4a": "0c83547ea605043a661e1b27e61f26e0103da860908bb93ec6a1e127fe471f48",
    "sounds.mp3": "f3ecb5abd89383d17a5778186f0d381b2d179d81dbf36dc4ae35147737535df4",
}

def main() -> None:
    failures = []
    manifest = (APP / "src/game/assets.ts").read_text()
    symbols = (APP / "src/game/constants.ts").read_text()
    shell = (APP / "src/routes/+layout.svelte").read_text()
    game = (APP / "src/components/Game.svelte").read_text()
    for name, digest in EXPECTED.items():
        path = ART / name
        if not path.exists():
            failures.append(f"missing original art: {path.relative_to(ROOT)}")
            continue
        data = path.read_bytes()
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            failures.append(f"not a WebP image: {name}")
        if hashlib.sha256(data).hexdigest() != digest:
            failures.append(f"asset hash mismatch: {name}")
        if f"assets/nosyt/{name}" not in manifest:
            failures.append(f"unregistered original asset: {name}")

    audio_dir = APP / "static/assets/audio"
    for name, digest in AUDIO_SHA256.items():
        path = audio_dir / name
        if not path.is_file():
            failures.append(f"missing original audio: {path.relative_to(ROOT)}")
        elif hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            failures.append(f"original audio checksum mismatch: {name}")
    audio = json.loads((audio_dir / "sounds.json").read_text())
    available = set(audio.get("sprite", {}))
    sound_types = (APP / "src/game/sound.ts").read_text()
    declared = set(re.findall(r"'((?:bgm_|sfx_|jng_|tumble_win_)[^']+)'", sound_types))
    for name in sorted(declared - available):
        failures.append(f"audio API references missing sound cue: {name}")
    if len(available) != 52:
        failures.append(f"expected 52 original sound cues, found {len(available)}")

    for symbol in ("h1", "h2", "h3", "h4", "h5", "l1", "l2", "l3", "l4", "l5", "wild", "scatter"):
        if f"assetKey: 'lunar_{symbol}'" not in symbols:
            failures.append(f"unmapped reel symbol: {symbol}")

    for banned in ("LoaderStakeEngine", "stake-engine-loader.gif", "LoaderExample"):
        if banned in shell:
            failures.append(f"sample loader still exposed: {banned}")
    if "ADD YOUR LOGO" in game:
        failures.append("upstream logo placeholder is visible")

    if failures:
        print("\n".join("FAIL: " + item for item in failures))
        raise SystemExit(1)
    print(f"PASS: {len(EXPECTED)} original assets match their recorded SHA-256 hashes")
    print("PASS: 52 original audio cues and their three original encoded sound banks")
    print("PASS: all 12 symbol keys are mapped; no prohibited sample loader or logo placeholder")
    print("IMPORTANT: this validates asset wiring, not math certification or Studio approval")

if __name__ == "__main__":
    main()
