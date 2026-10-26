# Lunar Vault

A 5-reel, 20-line slot frontend built on the official Engine (Stake Engine)
Web SDK — Svelte 5 + PixiJS 8, TurboRepo monorepo.

- Provider: `nosytlabs`
- Game name: `lunar_vault`
- Game ID: `0_0_lunar_vault`
- App package: `apps/lunar-vault` (forked from the SDK's `lines` sample game,
  per the SDK docs: "start your own codebase based on this repo")
- Live Engine documentation: https://studio.engine.io/docs
  (note: the `docs.engine.io` subdomain returns 404; Studio hosts the docs)

## Setup

Prerequisites (from the Web SDK docs): Node **22.16.0**, pnpm **10.5.0**.

```bash
pnpm install
```

## Run it locally (no RGS needed)

Storybook runs the game against the sample book data in
`apps/lunar-vault/src/stories/data/` (500 sample rounds kept in-repo;
the upstream SDK ships 10,000):

```bash
pnpm run storybook --filter=lunar-vault
```

Then open the `MODE_BASE/book/random` story and press **Action** to play a
round. This is the fastest way to check art, animation and layout.

Dev mode (`pnpm run dev --filter=lunar-vault`) shows the SDK's auth error
screen until it is connected to a live RGS session — that is expected; see
the SDK README's "Run in DEV Mode" / "Launch a Game" sections.

## Studio art and audio

This SDK-derived app now uses 17 locally bundled original SVG assets in `apps/lunar-vault/static/assets/nosyt`: ten main symbols plus Wild and Eclipse, observatory/base-feature backgrounds, frame, win effect and logo.

The audio system is also original and reproducible. The game generates a single ~72-second WAV sound sprite of 52 unique celestial cues using only Python's standard library:

```bash
python3 tools/generate-audio.py
```

The app's pnpm `prebuild`, `predev` and `prestorybook` scripts automatically generate it. This deliberately replaces the SDK sample MP3/OGG/M4A/AC3; do not commit those tracks again. All audio can be muted through the standard UI.

```bash
node tools/check-original-art.mjs
python3 tools/audit-assets.py
```

## Build and test

```bash
pnpm install --frozen-lockfile
pnpm run build --filter=lunar-vault
node tools/release-gate.mjs
```

The built app resides under `apps/lunar-vault/build/` and includes an `index.html` at its root. Storybook can play sample books without a live session, but the real game requires published, matching Engine math and RGS session parameters. The release gate intentionally fails until publication-critical conditions are satisfied.

## Release blockers

- **Math:** The frontend is inherited from a 20-line SDK sample, with unverified 97% sample RTP metadata and a high-cost bonus mode. No matching certified engine math exists in the repository yet. The previous 10-line standalone demo's book cannot be reused.
- **Art:** Primary symbols, frame, backgrounds and bonus screens are original, but some legacy effects and fallback Spine resources still need original replacement and human asset-rights review.
- **Quality:** Stake Engine preview must be tested for active-round resume, betting configurations, payouts, replay, social mode, mobile and small popout sizes. No unverified layout is claimed approved.
- **Studio:** Finish original tile composition (3:4 and 16:9), complete official AI/human review and submit one matched math/frontend pair.

See [release plan](docs/NOSYTLABS-RELEASE-PLAN.md) and [implementation status](docs/ART-AND-ENGINE-STATUS.md). This code is a development candidate, **not a live casino game**.

Official references: https://github.com/engineio/web-sdk and https://studio.engine.io/docs .
