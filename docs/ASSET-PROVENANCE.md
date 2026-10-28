# Current asset production — 2026-10-28

The shipping art is the original Nosyt celestial and Canadian-river set. The current build uses twenty individually generated alpha-transparent reel symbols, two feature environments, a retained quiet Lunar base environment, original locally synthesized audio, and licensed local typography. It does not copy another slot’s artwork.

## Current files

- Lunar: ten ordinary `h1–h5`/`l1–l5` v5 sprites; Wild and Eclipse v4 sprites; `eclipse-chamber-v4.webp`; the retained `observatory-quiet-v3.webp` base scene.
- Salmon: six v5 canoe/compass/fly/leaf/reel/scatter sprites; v4 salmon/Wild sprites; `headwaters-v4.webp`.
- Runtime reel sprites are 512×512 WebP, quality 90, with original alpha retained. Current source/runtime identities and dimensions are in `docs/assets/generated-art-recovered-20261028.json`. This manifest, not historical export hashes, is authoritative for the recovered release.
- Thirty original generated PNGs are retained under `art/lunar-vault/` and `art/salmon-run/`. Their bytes were recovered exactly against the pre-interruption Git-blob inventory. All sixteen v5 runtime sprite exports also match their original recorded Git-blob hashes. The four earlier special symbols are newly exported at full 512-pixel detail; the two feature backgrounds are newly exported at 1600×900.
- Lobby files and title-free Media Editor layers are under `media/<game>/`. The current export manifest is `docs/assets/studio-media-recovered-20261028.json`. `tools/export-game-media.py` reproduces these exports. Each media file is below 10 MB.
- The publisher wordmark is outlined Cinzel Bold lettering, white on transparent, in SVG and PNG. Its SIL Open Font License travels with the media files. It remains subject to the publisher’s branding approval.
- Twenty-three unreferenced older runtime sprites/background/frame files were removed. Their exact pre-deletion identities are recorded in `docs/assets/retired-assets-20261028.json`; the guarded prune script refuses changed or still-referenced files.

## Generation and recovery record

The originals were produced through OpenAI’s native image-generation tool for this task. Their common direction was readable individual silhouettes, controlled metallic highlights and sufficient clear space around each symbol: sapphire, silver and gold for Lunar Vault; forest green, amber, polished brass and natural river colours for Salmon Run. These are descriptions of the art direction, not invented verbatim generation prompts.

A workspace interruption removed local generation-prompt manifests and previously built archives before source delivery completed. Original PNG bytes were recovered from their saved generated-image records, matched to the earlier SHA inventory, and re-exported. The recovery manifests explicitly record current file identities. Earlier review results and archive hashes are historical; current production checks, package hashes and the final review must be used for release decisions.

All twenty symbols were inspected together after recovery. They show celestial objects, fishing equipment, fish, a leaf and a river arch; no people or prohibited imagery were observed. Automated asset checks verify dimensions, alpha, source/runtime hashes and local asset references. A publisher must still judge originality, naming and asset rights; generated origin is not legal clearance.

## Audio and typography

`tools/generate-audio.py` synthesizes the original local Lunar sound sprite (52 cues). Salmon’s local Web Audio motifs and effects share its master mute and cancellation controller. Physical-device listening across launch, base play, feature, large awards and dialogs is still required to confirm audible silence and balance.

Cinzel and Barlow are licensed third-party fonts, with their unmodified licence files bundled locally. No external font service is needed at runtime.

## Historical record

The earlier production record follows for traceability. Paths and versions explicitly superseded above are not the current release.

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
