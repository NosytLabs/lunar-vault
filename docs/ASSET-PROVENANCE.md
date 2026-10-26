# New celestial artwork — 2026-10-26

All files are local under `apps/lunar-vault/static/assets/nosyt/`. No external artwork was scraped or copied. The twelve initial SVG reel symbols have been replaced by the individual raster sprites documented below; editable SVG frame and effect ornaments remain.

| File                     | Production                                                               | Use                                                |
| ------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------- |
| observatory-quiet-v3.webp | OpenAI built-in Image Generation tool; PNG encoded to WebP at quality 88 | Full-canvas painted environment                    |
| orbital-seal.svg         | Original hand-authored SVG geometry                                      | Loading, feature and transition ornament           |
| star-flare.svg           | Original hand-authored SVG geometry                                      | Award particles and sprite explosion state         |
| reel-frame-v3.svg        | Original hand-authored SVG geometry                                      | 600×360 opening aligned to the five 120-unit reels |

## Image generation prompt

Create an original premium celestial observatory environment background for the browser slot game Lunar Vault by NosytLabs. Wide landscape 16:9 composition, painterly polished fantasy game art with precise architectural detail, restrained sapphire midnight blue, aged brass and silver moonlight. An ancient astronomical vault opens onto a deep star field; elegant curved brass armillary instruments, engraved dark stone columns framing the far left and right, a luminous crescent moon near upper left, subtle violet nebula and distant planets. The center 65 percent must remain dark, calm and mostly empty because a five reel grid will cover it. Strong framing at outer edges, subtle depth and atmospheric dust, beautiful but readable at small sizes. No text, no letters, no logos, no slot reels, no symbols, no UI, no characters, no casino brand imitation. Original scene, cinematic hand-painted texture. Output image meant for direct use as a game background.

Generated using the built-in tool, not a paid-provider CLI workflow. The WebP is the repository-owned shipping output. SVG source is editable. Human originality, trademark and asset-rights review remains required before submission; this provenance record is not legal clearance.

## Typography and primary control — second pass

- `spin-orbit.svg`: original editable SVG, a brass orbital spin control.
- `assets/type/Cinzel-Variable.ttf`: unmodified Cinzel variable font from [google/fonts](https://github.com/google/fonts/tree/main/ofl/cinzel), SIL Open Font License 1.1, included as `Cinzel-OFL.txt`.
- `assets/type/BarlowCondensed-{SemiBold,Bold}.ttf`: unmodified Barlow Condensed from [google/fonts](https://github.com/google/fonts/tree/main/ofl/barlowcondensed), SIL Open Font License 1.1, included as `Barlow-OFL.txt`.
- Font families are locally registered as Lunar Display and Lunar Sans; no external font service is used. Files have not been modified or renamed internally. These fonts are licensed third-party typography, not original studio illustrations.

## Raster symbol revamp

All twelve original vector symbol stand-ins have been replaced by individually generated, transparent 512×512 WebP sprites under `assets/nosyt/sprites/`. The obsolete symbol SVGs are removed. Art direction uses aged brass, sapphire enamel, silver and selective violet light, with distinct instrument silhouettes. The image-generation tool produced alpha-transparent originals; `cwebp` preserved alpha during resizing/encoding. Each source was inspected for transparency and the full set was reviewed in the live game. Exact prompts and shipping paths are recorded in [lunar-sprites-v2.json](assets/lunar-sprites-v2.json). This is generated artwork requiring human originality/rights signoff, not a quality-ranking claim.

The rules body now uses the unmodified normal-width Barlow Regular font under the same included OFL, while display and compact controls retain their separate typography.

## Quiet cabinet pass

The current original observatory plate is `observatory-quiet-v3.webp`, generated with the built-in image tool and encoded at WebP quality 88. Its exact prompt is recorded in `docs/assets/lunar-background-v3.json`; it replaces the initial oversized moon/mirrored-machinery scene described in the historical prompt above. `reel-frame-v3.svg` is original editable geometry with a thinner border, replacing v2. Neither retired environment/frame ships.

Normal-width Barlow SemiBold/Bold now supplies `Lunar Sans` at every viewport, with Barlow Regular for body copy. The retired Condensed font files listed in the historical second pass above are removed. Cinzel remains the title face. All current font licenses remain bundled. Native controls replace the large canvas button panels while the board and animation remain PixiJS/SDK-driven.
