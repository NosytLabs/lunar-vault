# Lunar Vault

A 5-reel, 20-line slot frontend built on the official Engine (Stake Engine)
Web SDK — Svelte 5 + PixiJS 8, TurboRepo monorepo.

Proposed local identifiers (not proof of registered Engine IDs):

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
`apps/lunar-vault/src/stories/data/` (600 sample rounds across base and bonus modes kept in-repo;
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

The game uses a painted observatory plus original celestial raster sprites, frame, orbital seal and star effects. Locally bundled Cinzel and Barlow Condensed fonts sharpen titles, awards and controls. A compact 44px control bar supports the smallest landscape preview. Unused sample Spine/spritesheet/bitmap-font assets have been removed. See [asset provenance and generation prompt](docs/ASSET-PROVENANCE.md).

A deterministic Python standard-library generator creates the 52-cue original WAV audio sprite automatically through the app’s prebuild/predev/prestorybook hooks. The generated WAV is not checked in.

```bash
python3 tools/generate-audio.py
pnpm run check:assets
```

## Build and test

```bash
pnpm install --frozen-lockfile
pnpm run build --filter=lunar-vault
pnpm exec playwright install chromium
pnpm run test:viewport
pnpm run audit:math
pnpm run test:math
node tools/release-gate.mjs # expected to fail: independent release evidence is missing
```

The built app resides under `apps/lunar-vault/build/` and includes an `index.html` at its root. Storybook can play sample books without a live session, but the real game requires published, matching Engine math and RGS session parameters. The release gate intentionally fails until publication-critical conditions are satisfied.

## Release blockers

- **Math:** The frontend is inherited from a 20-line SDK sample, with unverified 97% sample RTP metadata and a high-cost bonus mode. No matching certified engine math exists in the repository yet. The previous 10-line standalone demo's book cannot be reused.
- **Art:** All active game artwork is now local and original; human rights/originality signoff and final Studio tile composition remain required.
- **Quality:** Stake Engine preview must be tested for active-round resume, betting configurations, payouts, replay, social mode, mobile and small popout sizes. Local HTTP-fixture browser tests and screenshots do not constitute live Engine approval.
- **Studio:** Finish original tile composition (3:4 and 16:9), complete official AI/human review and submit one matched math/frontend pair.

See [release plan](docs/NOSYTLABS-RELEASE-PLAN.md) and [implementation status](docs/ART-AND-ENGINE-STATUS.md). This code is a development candidate, **not a live casino game**.

Official references: https://github.com/engineio/web-sdk and https://studio.engine.io/docs .

The [revamp audit](docs/REVAMP-AUDIT-2026-10-26.md) records font/animation changes, retrigger and recovery fixes, the 600-book audit and remaining release limitations.

## Separate Salmon Run development slot

[Salmon Run](apps/salmon-run/README.md) now has original raster symbols, real travelling reels, Engine wallet/replay requests and a matching finite weighted-book development math package. Its 96.50% computed RTP applies only to that checked-in Salmon distribution. The loopback preview supplies test funds and outcomes from the weighted files; live Engine acceptance and certification remain open. Lunar Vault's SDK fork and unmatched sample math remain separate.
