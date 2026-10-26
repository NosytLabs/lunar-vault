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

## Build the upload folder

```bash
pnpm run build --filter=lunar-vault
```

Per the SDK docs, the Engine upload folder is assembled from the build
output like this:

```
upload/
  index.html        <- apps/lunar-vault/.svelte-kit/output/prerendered/pages/index.html
  _app/             \
  assets/            >- everything in apps/lunar-vault/.svelte-kit/output/client/
  favicon.svg       /
  loader.gif
  stake-engine-loader.gif
```

(`apps/lunar-vault/build/` contains the same static site already assembled.)

Upload via the Engine Studio **Files** page, then **Publish Game → Front
End**, and test from the **Developer** page with **Start game session**.

## Asset audit

Every asset reference in the game (asset manifest URLs, Spine atlas page
images, spritesheet images, bitmap-font pages, audio resources) can be
checked with:

```bash
python3 tools/audit-assets.py
```

It exits non-zero and lists any missing file. See `docs/AUDIT.md` for the
audit that produced this repo.

## Art status

- Static reel symbols (H1–H5, L1–L4) are an original Lunar Vault set —
  drawn into the existing spritesheet frames by `tools/reskin-symbols.py`
  (frame geometry, rotations and trims are unchanged, so the manifest and
  paytable wiring are untouched).
- Spine win animations, background and feature screens are still the SDK
  sample art. They are licensed sample placeholders from the SDK and must
  be replaced with final Spine exports before an Engine review submission.
- The server-side **math model** (reel strips, paytable weights, RTP) is
  not part of a frontend repo: it is authored and certified on the Engine
  side. The values in `apps/lunar-vault/src/game/config.ts` describe this
  frontend and must match the certified math before submission.
