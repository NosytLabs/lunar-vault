# Asset manifest — games build pass, 2026-11-16

Original art generated for Lunar Vault to retire the borrowed
Mining Mayhem sample assets named as release blockers in
`docs/ENGINE-FRONTEND-AUDIT.md` (item 2.2). Wiring follows the SDK
asset pipeline (`packages/pixi-svelte` assetLoad): a `type: 'sprite'`
manifest entry registers its texture under the manifest key, and
components render it with `<Sprite key="…">`.

## Added

| Asset | File | Format | Wired as |
|---|---|---|---|
| Title logo | `apps/lunar-vault/static/assets/sprites/titleLogo/lunar-vault-title.png` | PNG 1100×773, RGBA (black keyed to alpha) | `titleLogo` in `src/game/assets.ts` (preload), rendered by `LoadingScreen.svelte` at 560×394 |
| Base-game background | `apps/lunar-vault/static/assets/sprites/backgrounds/bg-base.webp` | WebP 2039×1000 (the game's `backgroundRatio.normal`) | `backgroundBase` (preload), rendered by `Background.svelte` for `gameType === 'basegame'` |
| Feature background | `apps/lunar-vault/static/assets/sprites/backgrounds/bg-feature.webp` | WebP 2039×1000 | `backgroundFeature` (preload), rendered by `Background.svelte` for `gameType === 'freegame'` |

Scenes: base = lunar surface with a golden vault door set into a
rocky mountain under a teal star sky; feature = the vault interior,
gold coin piles and teal crystals. Both match the established
symbol art (gold on deep navy/teal).

## Removed (borrowed Mining Mayhem art)

- `assets.ts` entries `loader`, `foregroundAnimation`,
  `foregroundFeatureAnimation`.
- Static files `static/assets/spines/loader/`,
  `static/assets/spines/foregroundAnimation/`,
  `static/assets/spines/foregroundFeatureAnimation/` (SvelteKit
  ships `static/` wholesale, so deleting the manifest entries alone
  would still have shipped the borrowed art).

Behaviour notes: the loader spine's `title_screen` animation and
the backgrounds' looping `dust` overlay track have no equivalent in
static sprites; nothing consumed the spines' events, and the
base/feature crossfade (`FadeContainer`, 1s) is unchanged.

## Still sample art after this pass (Studio work — see audit 2.2)

Symbol **win-state Spine animations** (`spines/symbols*`, incl. the
shared explosion), `bigwin`, `fsIntro`, `anticipation`,
`clusterWin`, `tumbleWin`, `globalMultiplier`,
`reelhouse`, `transition`, the Mining Mayhem bitmap fonts
(`mm_gold`, `mm_silver`, `mm_purple`, `miningfont_gold_blur`), the
audio sound sprite, `sprites/coin/SD2_Coin.png`,
`sprites/freeSpins/freeSpins.png`, and the baked-text
`pressToContinueText` sheet (16 language frames — replacing it
needs all 16 re-authored or a move to the bitmap-font text layer).
None of these can be produced without Spine/Studio authoring; the
SDK FAQ's sanctioned alternative is sprite-sheet animation
(`SpriteSheet` component + a `spriteSheet` manifest entry), which
the symbol win states could adopt frame-by-frame.
