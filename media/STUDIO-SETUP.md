# Nosyt — Engine Studio media and listing setup

Prepared 2026-10-28 for Lunar Vault and Salmon Run. These are upload-ready files and suggested listing copy; their existence does not mean the account fields were saved or Engine approved a listing.

## Media Editor

Engine's current [tile requirements](https://studio.engine.io/docs/approval-guidelines/game-tile-requirements) use the Studio Media Editor for a portrait 3:4 tile and a 16:9 cover. Upload the following layers from the chosen game's media folder:

1. Portrait: `editor/background-portrait.webp` as the background; `editor/foreground.png` as the transparent foreground. Add a restrained bottom gradient and the exact title in the editor. Keep the title large and unobstructed. The background deliberately contains no text.
2. Wide cover: `editor/background-wide.webp` plus the same foreground and exact title. Keep the outer framing visible; leave ample space around the title.
3. Export the Studio editor's current 408×546 portrait and 640×360 cover. The supplied finished `tile-408x546.png` and `cover-640x360.png` are review-ready alternatives if the account accepts direct finished-image upload. The 408×544 and 1080×1440 files provide exact 3:4 variants.
4. Publisher settings: use `studio/nosyt-white.svg` or `studio/nosyt-white.png`. The wordmark is white on transparent, with the font licence alongside it.

All individual media files are smaller than 10 MB. Use the game's exact title only; no promotional slogans, currency amounts, RTP percentage or other publisher branding is baked into the title-free editor layers. Finished promotional artwork and in-game symbols come from original generated PNGs retained in `art/` with provenance records in `docs/assets/`.

## Lunar Vault

**Title:** Lunar Vault  
**Publisher display name:** Nosyt / NosytLabs, subject to the account owner's actual publisher name  
**Category:** Slot

Suggested description:

Explore an ancient astronomical vault across twenty celestial lines. Crown, planet and gemstone symbols surround Wilds with visible multipliers. Eclipse symbols open the Eclipse Chamber, where free spins can extend the journey. Clear controls, a full symbol guide and round replays keep every result easy to follow.

| Mode | Display name | Entry multiplier | RTP | Maximum × selected base amount |
| --- | --- | ---: | ---: | ---: |
| `base` | Lunar Vault | 1× | 96.50% | 287.4× |
| `bonus` | Eclipse Chamber | 100× | 96.50% | 654× |

Eclipse Chamber's maximum is 6.54× its full entry amount. Do not describe this version as having a 5,000× or 10,000× maximum. The paid feature starts twelve spins; organic entries award 8/12/15 for 3/4/5-or-more Eclipse symbols, with +4 retriggers up to thirty total.

## Salmon Run

**Title:** Salmon Run — publisher naming clearance remains open  
**Publisher display name:** Nosyt / NosytLabs, subject to the account owner's actual publisher name  
**Category:** Slot

Suggested description:

Travel through Canadian headwaters with silver salmon, hand-tied flies and warm brass fishing gear. Twenty river paths lead into River Run, where visible fish values meet Wild collectors and collections advance through 1×, 2× and 3× stages. Follow each catch as it reaches the collector and see the feature's total clearly.

| Mode | Display name | Entry multiplier | RTP | Maximum × selected base amount |
| --- | --- | ---: | ---: | ---: |
| `base` | Salmon Run | 1× | 96.50% | 101.5× |
| `river` | River Run | 20× | 96.50% | 155.6× |

River Run's maximum is 7.78× its full entry amount. The optional feature starts six casts; 3/4/5-or-more River arches award 6/8/10, with +2 retriggers up to twelve. Extra Wilds do not collect the same fish more than once.

## Upload and review sequence

Upload each game's matching frontend ZIP and math ZIP from the same release manifest. The frontend has `index.html` at its root. The math archive contains `index.json` and its two books/two lookup tables. Let Studio complete the math and bet-level analysis, launch actual authenticated preview and replay URLs, and record the resulting version identifiers and tests before requesting approval.

Use actual account information for legal name, business address, jurisdiction, contact details and licence acceptance. None of those facts should be invented from a repository name. The prepared descriptions, images and wordmark can be reviewed and entered after account access is available.

Local verification does not assign an Engine operator-risk rating, establish asset/title clearance or constitute Engine/Stake approval. Keep independent review records bound to the actual frontend and math ZIP hashes in `docs/release-evidence.json`.
