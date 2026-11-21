# Asset manifest — 2026-11-21 (text sheets, bitmap fonts, coin)

Original Lunar Vault art replacing the remaining borrowed Mining Mayhem
baked-text sheets, bitmap fonts, and the coin sprite. Follow-up to
`docs/ASSET-MANIFEST-2026-11-21.md` (press-to-continue sheet), which
listed these pieces as still-sample art.

## Changed

| Asset | File | Format | Bytes before → after |
|---|---|---|---|
| Win text sheet (16 languages) | `apps/lunar-vault/static/assets/sprites/winSmall/MM_Localisation_winsmall.png` | PNG 512×520 RGBA | 405,930 → 267,500 |
| Same sheet, web build | `apps/lunar-vault/static/assets/sprites/winSmall/MM_Localisation_winsmall.webp` | WebP 512×520 RGBA | 118,312 → 118,750 |
| Free-spins text sheet (16 languages) | `apps/lunar-vault/static/assets/sprites/freeSpins/freeSpins.png` | PNG 932×981 RGBA | 1,191,193 → 639,758 |
| Same sheet, web build | `apps/lunar-vault/static/assets/sprites/freeSpins/freeSpins.webp` | WebP 932×981 RGBA | 323,194 → 267,048 |
| Gold bitmap font | `apps/lunar-vault/static/assets/fonts/goldFont/mm_gold.png` | PNG 1482×214 RGBA | 324,997 → 277,794 |
| Same font, web build | `apps/lunar-vault/static/assets/fonts/goldFont/mm_gold.webp` | WebP 1482×214 RGBA | 261,378 → 131,768 |
| Silver bitmap font | `apps/lunar-vault/static/assets/fonts/silverFont/mm_silver.png` | PNG 2025×1864 RGBA | 809,227 → 764,542 |
| Purple bitmap font | `apps/lunar-vault/static/assets/fonts/purpleFont/mm_purple.png` | PNG 1122×177 RGBA | 48,354 → 112,589 |
| Gold-blur bitmap font | `apps/lunar-vault/static/assets/fonts/goldBlur/miningfont_gold_blur.png` | PNG 1265×378 RGBA | 384,721 → 171,166 |
| Same font, web build | `apps/lunar-vault/static/assets/fonts/goldBlur/miningfont_gold_blur.webp` | WebP 1265×378 RGBA | 80,994 → 58,490 |
| Coin spin sheet (12 frames) | `apps/lunar-vault/static/assets/sprites/coin/SD2_Coin.png` | PNG 1889×1152 RGBA | 2,495,661 → 1,373,202 |

All replacements are drop-in: every atlas JSON, BMFont XML and JSON
metrics file is unchanged — same sheet dimensions, same frame rects,
same glyph rects, advances, line heights and per-language source
sizes/offsets — so no code changes were needed.

## Text sheets

Every translation is kept word-for-word with the same line breaks
(transcribed from the original tiles before replacement) and re-set
programmatically in the same gold-gradient serif treatment as the
press-to-continue sheet (Noto Serif Display Bold; Noto Naskh Arabic
Bold for Arabic, RTL; Noto Serif Devanagari Bold for Hindi; Noto Serif
CJK Bold for Japanese/Korean/Chinese), fitted into each frame's
original ink box. The winSmall lines are set in gold. The freeSpins
sheet keeps the original two-tone hierarchy: the congratulations line
in gold, the "you won" line and the FREE SPINS / TOTAL WIN headers in
silver serif. All 16 languages in both sheets were visually checked
frame by frame against the originals.

## Bitmap fonts

Each glyph was re-rendered in the matching treatment (gold / silver /
purple gradient serif with dark outline and drop shadow) and fitted to
the original glyph's exact ink box inside its unchanged rect, so text
layout is identical. Glyph sets are unchanged, including the silver
font's currency and symbol extras (₩, ₱, ₽, €, ₹, ¥, ฿, Ŕ, Ķ, Ŗ, ‘, })
and the gold font's ₺, ₫, ł and ×.

One judgement call: the shipped `miningfont_gold_blur` sheet (both PNG
and WebP) was a vertically smeared conversion artifact — the digits
were stretched into illegible gold columns roughly 3.4× too tall. The
replacement restores legible gold digits at the font family's
proportions (ink height ≈ 1.94× the advance, as in `mm_gold`), centred
in each rect's original ink footprint, with a soft gold halo for the
"blur". Rects, advances and line height are unchanged.

## Coin

The original sheet was a pre-rendered 3D tumble of a Japanese-style
coin (centre hole, cat face, flower back). The replacement is an
original design drawn programmatically: a solid gold coin with a
beaded rim, a crescent-moon-and-star face and a vault-wheel face,
spun around the vertical axis. It is a clean in-place spin, not a
tumble replica: each of the 12 frames keeps its atlas rect and takes
the original frame's measured ink footprint (width, height and centre)
inside the 684×684 source box, including the vertically squashed
mid-spin poses and the edge-on bars. The centre hole is gone — it was
part of the borrowed 5-yen design. Note the shipped atlas has four
frame rects (4, 5, 10, 11) that run past the bottom edge of the
1152 px sheet; the replacement keeps its content in the same visible
footprint as the original.

## Still sample art after this pass

The Spine animations — symbol win states (`spines/symbols*`, including
the shared explosion), `bigwin`, `fsIntro`, `anticipation`,
`clusterWin`, `tumbleWin`, `globalMultiplier`, `reelhouse`,
`transition` — and the audio sound sprite. Those remain borrowed
Mining Mayhem assets, unchanged by this pass. Everything else on the
2026-11-16 still-sample list has now been replaced with original art.
