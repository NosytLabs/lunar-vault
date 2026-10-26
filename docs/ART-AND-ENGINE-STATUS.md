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
- The bonus intros/outros, audio and several minor effects still reference upstream sample content. Engine requires original assets before review.
- A real Engine staging session, authenticated bet states, loss/no-end-round, active-round resume, replay URL, currency formatting, social wording, minimum bet, responsive screenshots and human art signoff remain unverified.
- The 3:4 Studio lobby tile and 16:9 wide cover must be prepared in Studio before approval.

Run `node tools/check-original-art.mjs` for source asset checks, `python3 tools/audit-assets.py` for every referenced asset, and `node tools/release-gate.mjs` for explicit blockers. The release gate is **supposed to fail** until actual math, audio and UI requirements are met.

Official: https://studio.engine.io/docs/approval-guidelines , https://studio.engine.io/docs/approval-guidelines/math-verification , https://studio.engine.io/docs/distribution .
