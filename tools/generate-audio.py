#!/usr/bin/env python3
"""Reproducible original celestial sound sprite for NosytLabs Games.

Synthesizes ambient music and UI/slot cues from first principles (no recordings
or licensed samples). Uses only Python's standard library. The committed JSON
sprite manifest defines the key, offset, duration and loop semantics.
"""
from __future__ import annotations

import array
import hashlib
import json
import math
import os
from pathlib import Path
import random
import wave

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "apps/lunar-vault/static/assets/audio"
MANIFEST = AUDIO / "sounds.json"
TARGET = AUDIO / "nosyt-sprite.wav"
RATE = 22_050
TAU = 2 * math.pi


def kind(name: str) -> str:
    if name == "bgm_main": return "ambient"
    if name == "bgm_freespin": return "feature"
    if name.startswith("bgm_winlevel_"): return "victory"
    if name == "sfx_bigwin_coinloop": return "loop"
    if "btn" in name: return "tap"
    if "reel_stop" in name: return "reel"
    if "scatter" in name: return "scatter"
    if any(w in name for w in ("wild", "explode", "explosion")): return "burst"
    if "multiplier" in name: return "rise"
    if "tumble" in name: return "tumble"
    if any(w in name for w in ("fs", "free", "intro")): return "featurecue"
    if any(w in name for w in ("win", "youwon")): return "win"
    return "chime"


def tone(freq: float, sec: float, richness: float = 0.2) -> float:
    return (
        math.sin(TAU * freq * sec)
        + richness * math.sin(TAU * 2 * freq * sec + 0.2)
        + richness * 0.32 * math.sin(TAU * 3 * freq * sec)
    ) / (1 + 1.32 * richness)


def sample(category: str, t: float, duration: float, seed: float) -> float:
    """Bounded, smooth audio; cue timbre depends on event category."""
    u = min(1, t / duration)
    attack = min(1.0, t / 0.03)
    fade = min(1.0, (duration - t) / 0.16)
    if category in ("ambient", "feature", "victory"):
        notes = (174.61, 207.65, 261.63, 311.13, 349.23, 415.30, 523.25)
        subdivision = 0.45 if category == "feature" else 0.68
        idx = int(t / subdivision)
        pitch = notes[(idx * (2 if category == "feature" else 1) + int(seed * 13)) % len(notes)]
        envelope = math.exp(-2.9 * ((t % subdivision) / subdivision))
        pad = (tone(notes[0] / 2, t) + tone(notes[2] / 2, t + 0.05)) * 0.19
        bell = tone(pitch, t, 0.5) * envelope * 0.34
        shimmer = tone(pitch * 2, t + 0.017, 0.08) * envelope * 0.06
        return (pad + bell + shimmer) * min(1, t / 0.24, (duration - t) / 0.24)
    if category == "loop":
        beat = t % 0.38
        return 0.2 * tone(392 + 70 * math.exp(-12 * beat), beat) * math.exp(-14 * beat)
    if category in ("tap", "reel", "tumble"):
        low = 240 if category == "reel" else 410 if category == "tap" else 620
        shift = -110 if category == "reel" else 210
        return 0.4 * tone(low + shift * u, t, 0.23) * attack * math.exp(-11 * u)
    if category == "scatter":
        return 0.32 * (tone(587.33 + 310 * u, t, 0.28) +
                       0.45 * tone(880 + 240 * u, t, 0.1)) * attack * fade
    if category == "burst":
        ripple = math.sin(TAU * (84 + 620 * u) * t + 12 * t * t)
        return 0.34 * ripple * attack * math.exp(-4.8 * u)
    if category == "rise":
        return 0.36 * tone(370 + 520 * (u ** 2), t, 0.25) * attack * fade
    if category in ("win", "victory", "featurecue"):
        notes = (523.25, 659.25, 783.99, 1046.5)
        q = min(3, int(u * 4))
        pulse = t - q * duration / 4
        return 0.38 * tone(notes[q], t, 0.4) * max(0, 1 - pulse / (duration / 4)) * fade
    return 0.25 * tone(523.25, t) * attack * math.exp(-4 * u)


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["src"] == ["./assets/audio/nosyt-sprite.wav"]
    cues = manifest["sprite"]
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(TARGET), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        cursor = 0
        silence = b"\0\0"
        for name, parts in cues.items():
            offset_ms, length_ms = parts[:2]
            first = round(RATE * offset_ms / 1000)
            if first < cursor:
                raise ValueError(f"Overlapping sound sprite region: {name}")
            out.writeframesraw(silence * (first - cursor))
            cursor = first
            duration = length_ms / 1000
            frames = round(RATE * duration)
            seed = int.from_bytes(hashlib.sha256(name.encode()).digest()[:4], "big") / (2**32)
            category = kind(name)
            pcm = array.array("h")
            for i in range(frames):
                t = i / RATE
                v = sample(category, t, duration, seed)
                v = math.tanh(v * 1.75) * 0.65
                pcm.append(max(-32767, min(32767, int(v * 32767))))
            if os.sys.byteorder != "little":
                pcm.byteswap()
            out.writeframesraw(pcm.tobytes())
            cursor += frames
        out.writeframesraw(silence * (RATE // 8))
    print(f"Generated {TARGET.relative_to(ROOT)}: {TARGET.stat().st_size:,} bytes, {len(cues)} original cues")


if __name__ == "__main__":
    main()
