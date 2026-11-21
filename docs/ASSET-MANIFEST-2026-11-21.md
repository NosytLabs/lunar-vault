# Asset manifest — press-to-continue sheet, 2026-11-21

Original Lunar Vault art replacing the last borrowed Mining Mayhem
piece on the loader/title screen (see `docs/ASSET-MANIFEST-2026-11-16.md`,
which retired the loader spine and backgrounds; the baked-text
press-to-continue sheet was listed there as still-sample art).

## Changed

| Asset | File | Format |
|---|---|---|
| Press-to-continue text sheet (16 languages) | `apps/lunar-vault/static/assets/sprites/pressToContinueText/MM_pressanywhere.png` | PNG 1748×960 RGBA |
| Same sheet, web build | `apps/lunar-vault/static/assets/sprites/pressToContinueText/MM_pressanywhere.webp` | WebP 1748×960 RGBA |

Drop-in replacement: the TexturePacker atlas
(`MM_pressanywhere.json`) is unchanged — same sheet size, same frame
rects, same per-language source sizes and offsets — so
`PressToContinue.svelte` and `spriteTextLanguage.ts` need no changes.

## What changed visually

The old sheet was Mining Mayhem's: the 16 translations set in a white
western slab face. The new sheet keeps every translation word-for-word
(same line breaks) and re-sets them in a gold-gradient serif with a
dark bronze outline, matching the Lunar Vault title logo
(`sprites/titleLogo/lunar-vault-title.png`, gold on deep navy).
Latin/Cyrillic/Vietnamese: Noto Serif Display Bold; Arabic: Noto Naskh
Arabic Bold; Hindi: Noto Serif Devanagari Bold; Japanese/Korean/
Chinese: Noto Serif CJK Bold. Text was rendered programmatically
(rasterised type) rather than painted, so all 16 scripts — Arabic
shaping and RTL order included — are letter-accurate.

## Still sample art after this pass (unchanged from 2026-11-16 list)

Symbol win-state Spine animations (`spines/symbols*`, incl. the shared
explosion), `bigwin`, `fsIntro`, `anticipation`, `clusterWin`,
`tumbleWin`, `globalMultiplier`, `reelhouse`, `transition`, the Mining
Mayhem bitmap fonts (`mm_gold`, `mm_silver`, `mm_purple`,
`miningfont_gold_blur`), the audio sound sprite,
`sprites/coin/SD2_Coin.png`, `sprites/freeSpins/freeSpins.png`, and the
baked-text `winSmall` sheet. None of these are on the loader/title
screen.
