# Lunar Vault — Engine Web SDK artwork upgrade

The canonical game lives at `apps/lunar-vault`, using the official Engine Web SDK (Svelte 5 and PixiJS 8). This change set contains 17 **original** SVG textures in `static/assets/nosyt/`: five high symbols, five low symbols, Wild, Eclipse, two observatory backgrounds, reel frame, win aura, and NosytLabs Games logo.

## Changes

- `game/assets.ts` registers locally hosted Pixi textures, preloaded by the SDK.
- `game/constants.ts` uses game-owned artwork for the normal `static`, `spin`, `land`, `win` and `postWinStatic` symbol states. The RGS event contract, board math and result selection are unchanged.
- `SymbolSprite.svelte` resolves visual win/land completions asynchronously so the book player can present highlights before continuing; no frontend randomness changes outcomes.
- `Background.svelte`, `BoardFrame.svelte`, `LoadingScreen.svelte`, `TransitionAnimation.svelte`, `WinAnimation.svelte` and `FreeSpinAnimation.svelte` no longer render inherited sample scenes for those visual paths.
- `+layout.svelte` removes the SDK-branded splash that Engine expressly disallows.

## Remaining release blockers (not claimed fixed)

- The repo still uses sample 0.97 RTP math metadata, which is outside Engine's 96.0%–96.70% approval band. Do **not** edit this to a plausible number without calculating and publishing a matching certified math book; the standalone prototype's 10-line math is not compatible with the 20-line Web SDK fork.
- Original Eclipse Chamber intro/outro and centered free-spin counter now replace sample visuals. A deterministic Python generator creates 52 original audio cues in one WAV sprite; SDK sample audio binaries have been removed. Some secondary Spine/particle effects and sample resources remain and need an originality audit before approval.
- A real Engine staging session, authenticated bet states, loss/no-end-round, active-round resume, replay URL, currency formatting, social wording, minimum bet, responsive screenshots and human art signoff remain unverified.
- The 3:4 Studio lobby tile and 16:9 wide cover must be prepared in Studio before approval.

Run `node tools/check-original-art.mjs` for source asset checks, `python3 tools/audit-assets.py` for every referenced asset, and `node tools/release-gate.mjs` for explicit blockers. The release gate is **supposed to fail** until actual math, remaining sample effects and UI requirements are met.

Official: https://studio.engine.io/docs/approval-guidelines , https://studio.engine.io/docs/approval-guidelines/math-verification , https://studio.engine.io/docs/distribution .

## Asset build and distribution size

The CI job runs `python3 tools/generate-audio.py` prior to asset checks and builds all dependent Web SDK workspace packages through TurboRepo. The old stock OGG/MP3/M4A/AC3 recordings and splash GIFs were removed from the game static directory. This changes audio composition and media size but does not affect the game logic or payouts.
