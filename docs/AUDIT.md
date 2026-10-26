> Historical audit of the initial fork. Current implementation and verification limits are in [ART-AND-ENGINE-STATUS.md](ART-AND-ENGINE-STATUS.md). Sample art and several UI issues described below have since been replaced; math/Engine approval remain outstanding.

# Lunar Vault — audit notes (2026-10-26)

## What existed

- `NosytLabs/lunar-vault` contained **no game and no assets**. Its entire
  history was two commits: a sweep-added `LICENSE` (2026-10-25) and its
  removal the same night. Root listing: empty; size 0 KB.
- No Lunar Vault source or assets existed anywhere else that was checked:
  the Muse workspace (no matching files or `engine.io` references) and a
  GitHub code search across the NosytLabs org (0 results).

So there was nothing to debug in place — the repo was an empty shell. The
game below was built fresh from the official SDK, following its docs.

## What was built

- Base: official Engine Web SDK (`engineio/web-sdk`, the Stake Engine web
  SDK), sample game `lines` forked to `apps/lunar-vault`, per the SDK
  README's instruction to start a codebase from the repo.
- Identity set in `apps/lunar-vault/src/game/config.ts`
  (`nosytlabs` / `lunar_vault` / `0_0_lunar_vault`) and the on-screen game
  name set to `LUNAR VAULT`.
- Other sample apps (`cluster`, `ways`, `scatter`, `price`,
  `number-picker`) were dropped; all shared `packages/` are kept because
  the game depends on them.
- Two size trims for a sane repo: the SDK's `documentation/` screenshot
  folder (21 MB of docs images, not game files) is not included, and the
  Storybook sample dataset `base_books.ts` is trimmed from 10,000 sample
  books to 500 (20.6 MB -> 1.1 MB). Storybook uses the same code path with
  fewer sample rounds; the full dataset remains in the upstream SDK.

## Asset audit

Automated pass over the SDK sample the game is forked from
(`tools/audit-assets.py`, 633 checks): every `assets.ts` URL, Spine atlas
page image, spritesheet `meta.image`, bitmap-font page and audio resource
resolves to a real file — **0 missing**. The sample's asset set is
internally complete; the "broken assets" problem was that Lunar Vault had
none at all.

One false lead checked and cleared: `symbols.atlas` contains a region
literally named `heart_shadow.png` — that is a Spine region name (the
skeleton JSON references it verbatim), not a missing image file.

Static symbols were then reskinned to an original Lunar Vault set with
`tools/reskin-symbols.py`, which redraws only the H/L frame rectangles in
`symbolsStatic.png/.webp` and preserves all frame geometry. Extracted
frames were visually verified (including the rotated L-symbols, which are
stored turned -90° in the sheet).

## Verification

- `pnpm install` (pnpm 10.5.0) — OK.
- `pnpm run build --filter=lines` on the pristine SDK — used as the
  baseline before forking.
- `pnpm run build --filter=lunar-vault` — Vite production build completes
  and the static site is written to `apps/lunar-vault/build/`.
- Asset audit re-run against the finished repo — 0 missing.

## Known gaps before an Engine submission

1. **Math/RGS**: no certified math model exists yet; the frontend plays
   sample book data in Storybook. Production play needs the math files
   published on Engine and a live session to test against. Per the Math
   SDK docs, each bet mode needs an `index.json` (mode name, cost
   multiplier, file names), a CSV lookup table (ID, weight, payout — no
   header, plain integers, payouts in hundredths of the base bet) and
   the game logic as a zStandard-compressed JSON-lines file
   (`.jsonl.zst`).
2. **Art and audio originality**: Engine's approval guidelines require
   unique audio and visual assets — sample-game assets will not be
   approved. Static symbols and favicon are original here, but the
   background, win/feature Spine animations and the whole audio pack are
   still SDK sample material (placeholders) and must be replaced with
   final Lunar Vault art and audio before a review submission.
3. **Game tiles**: submission also requires lobby artwork built in
   Studio's Media Editor — a 3:4 portrait tile (408x546) set as cover
   plus a 16:9 cover-art version (640x360) of the same artwork.
4. **Review rules** (Engine docs, Oct 2026): RTP per bet mode must be
   96.0–96.70%, ≤10M outcomes per mode, $0.01 bet levels included, and
   every round must be replayable. These are math/config certifications,
   not frontend changes — the frontend `config.ts` RTP (0.97, inherited
   from the sample) must be aligned with the certified math before
   submitting. A submission covers one front-end version and one math
   version together, and the form stays locked until both are published,
   the math passes its critical tests, a bet-level template fits, and
   the game tiles (gap 4) exist.

## Follow-up verification (October 26, 2026)

- Official Engine math verification explicitly requires **96.0%–96.70% RTP** in every mode, with base 1.0× volatility standard deviation ≥0.6. The earlier 90.0% lower bound was incorrect.
- This repository is an **Engine Web SDK-derived Svelte/PixiJS game** with SDK sample Spine effects and not a certified, math-backed Lunar Vault release. The independent standalone prototype is a separate implementation and its math cannot be assumed compatible with this fork’s events, game modes or reel layout.
- The placeholder `ADD YOUR LOGO` has been replaced with `NOSYTLABS GAMES` in the game HUD. This text-only branding fix does not resolve remaining licensed art, branding, maths, or submission concerns.
- Before submission: replace SDK sample backgrounds/Spine/audio, author matching server math books, update client RTP/paytables, run RGS/replay and social-language audits, and inspect 1024×576, 800×450, 400×225, 425×812 in actual Engine preview.
- Source: https://studio.engine.io/docs/approval-guidelines/math-verification
