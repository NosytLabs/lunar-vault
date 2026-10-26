# Lunar Vault revamp audit — 26 October 2026

Lunar Vault remains the Svelte 5 / PixiJS Engine Web SDK fork. Results come from ordered RGS event books; the frontend does not generate, select or recalculate gambling outcomes. This is a development preview, not a launch approval.

## Findings and changes

| Priority | Finding                                                                                                                      | Result                                                                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | The inherited retrigger event had no handler, and mid-feature recovery repeated the feature introduction.                    | Added ordered retrigger playback, total/current accounting, an extension banner and silent snapshot restoration. Browser checks complete all 14 spins and resume inside the feature.                                                  |
| High     | A decimal amount such as 2.01 could become 2009999.9999999998 wallet units.                                                  | Round the SDK request amount to integer micro-units. A browser test checks 2010000 and server-authoritative balance handling.                                                                                                         |
| Medium   | Fourteen sample `freeSpinEnd.amount` summaries were one book unit below the recorded feature award through float truncation. | Corrected those summaries with integer rounding. Final round outcomes, `finalWin` and payout multipliers are unchanged.                                                                                                               |
| Medium   | Text shrank with the desktop canvas at 400×225; the small control surface was hard to read or tap.                           | Added native compact controls with 44px targets, a 56px spin button, readable amounts and a menu. SDK restrictions and round state still control interaction.                                                                         |
| Medium   | Font hierarchy, small-win spectacle and long count-ups obscured normal play.                                                 | Bundled licensed Cinzel / Barlow Condensed fonts; clearer title, labels and amounts; original brass spin ornament; shorter reel/award timing; gold paths through supplied winning positions; large effects reserved for large awards. |
| Medium   | Sprite win pulses did not enter the symbol animation state; reduced motion still scrolled reels.                             | Correct sprite animation state, use static reveal settlement with a short hold for reduced motion, and suppress scaling/particles. Count-up promises are cancelled on teardown.                                                       |
| Open     | Fifteen warnings in five inherited sample books reference stale or offscreen retrigger symbols.                              | Reported in the checked-in audit. The renderer skips invalid animation positions without altering the announced feature total or payout. These samples need replacement from matching math before release.                            |

Rules now include twenty line diagrams, additive Wild multipliers, sample scatter awards, feature-cost confirmation and plain-language controls. Each line selects its highest base paytable award before applying multipliers, following Engine Math SDK `Lines.get_lines` semantics. Multipliers equal to one do not add to the multiplier sum.

## What the math audit establishes

`pnpm run audit:math` checks all 600 supplied illustration books against the sample paytable and paylines, using an independent offline line evaluator. It checks event order/coverage, board shape, line positions and values, spin/cumulative/final totals, feature counters and feature-summary units. It reports **0 errors and 15 warnings**. Seven corruption/edge-case regression tests exercise the auditor, including selection of a Wild base award before multipliers.

| Mode  | Books | Cost | Unweighted mean payout / base amount | Largest example | Feature / retrigger books |
| ----- | ----: | ---: | -----------------------------------: | --------------: | ------------------------: |
| Base  |   500 |   1× |                              1.2232× |           53.1× |                    61 / 3 |
| Bonus |   100 | 100× |                               5.033× |             63× |                   100 / 2 |

These are descriptive statistics of deliberately selected **unweighted examples**, not return-to-player estimates, hit-rate predictions or evidence of a fair production distribution. There is no authoritative reel probability model, lookup weighting, publish index or matched certified math package. Theoretical RTP, simulated RTP and confidence intervals are therefore deliberately null. Re-sampling these books cannot verify RTP.

The inherited 97% RTP / 5,000× maximum metadata remains explicitly unverified. Current [official Engine math requirements](https://studio.engine.io/docs/approval-guidelines/math-verification) specify 96.0–96.7% for every mode; changing the displayed number would not calibrate the game. The release gate intentionally remains blocked by missing math/evidence and the out-of-range sample metadata.

## Playthrough and verification

- Production static build, asset/original-art checks, seven math regression tests and **18 local Chromium browser tests** pass.
- Browser coverage: seven viewports (including phone, landscape and 400×225), modal scrolling, pointer release/drag, spin locking, disabled controls, autoplay cancellation, social feature wording, bonus confirmation/cost then return to base, loss/win settlement, replay without wallet requests, unfinished-round recovery, reduced-motion complete feature and rotation, retrigger completion and mid-feature recovery. Console errors and page exceptions fail tests.
- Manual local playthrough uses intercepted deterministic RGS responses and reviews rendered screenshots, fonts, controls and award presentation. This is not live Engine/RGS acceptance. Public current Only on Stake lobby/game pages and the user's screenshots informed hierarchy and pacing; competitor art and mechanics were not copied. A geographically restricted public game page was not bypassed, and competitor gameplay is not claimed.
- Font loading completes before Pixi text measurement, with a retry path. Local licenses ship with the fonts. The production build is served as static files, matching the frontend delivery model.

Remaining limits: the inherited ESLint 9 configuration does not run successfully; full TypeScript/lint cleanup is not claimed. Physical-device, screen-reader, broad currency/jurisdiction, minimum-round-duration semantics, live interruption/replay and Engine staging acceptance remain open. Local fixture tests cannot certify these.

## Requested community skill and authoritative reconciliation

Used [Slot Casino Game Developer Skills for Stake Engine](https://github.com/egorfedorov/Slot-Casino-Game-Developer-Skills-for-Stake-Engine), commit `caf5de33a5b8da8b5ddb9fd770fd457a7242a04c`: developer, slot UX, event animation, senior math and QA instructions. The UX spec and animation timeline validators pass. Its event validator accepts all 600 rounds with 0 errors and 161 warnings for missing `enterBonus`; canonical SDK books use `freeSpinTrigger` to enter the feature, so no fictitious event was inserted. Its missing-index check correctly fails. Its compliance scanner skips `.svelte` and reports zero scanned files when aimed at the game information component; that result cannot assess the screen's compliance.

The community checklist's wider RTP range and example event/request fields are not authoritative. Follow the [official Web SDK](https://github.com/engineio/web-sdk), [Math SDK](https://github.com/engineio/math-sdk) (`a6dccd86de740cc5d318079483cb6204cc5c19bc` inspected), [approval rules](https://studio.engine.io/docs/approval-guidelines) and [jurisdiction requirements](https://studio.engine.io/docs/approval-guidelines/jurisdiction-requirements). Existing SDK end-round requests and event schema are preserved. No real-money readiness, certified RTP, jurisdiction compliance or approval is claimed.

Machine-readable evidence: `docs/quality/sample-books-audit.json`, `slot-ux-spec.json` and `animation-timeline.json`. The last two validate planning structure, not product certification.

## Further Engine self-check and sprite revision

The user supplied Engine's full self-check prompt and current documentation links. Its read-only workflow was superseded by the user's explicit request to fix and push changes. The checklist is used as evidence criteria, not as permission to claim approval.

Additional fixes: all twelve symbol sprites replaced with cohesive individual raster art; normal-width rules typography; JPY native precision and exact sub-unit awards; SC/GC suffixes; explicit HTTPS RGS addresses; unknown-language English fallback; all server min/max/step/default/level values checked; active-only recovery; selected amounts no longer clamped into unsupported balance-derived fractions; replay amount and actual server cost shown with amount menus locked; general operation disclaimer; insufficient-balance explanation; bounded asset-loading retries and a recovery screen for permanent failures. A sprite load failure can no longer silently enter an incomplete game.

Four pure contract tests cover fiat/social precision and RGS address construction. Expanded browser checks cover seven currencies, a non-default recovered amount, sub-cent awards, a small social replay with a differing server cost, social rules and transient/permanent asset failures. Final results and the full guideline matrix are recorded separately after the complete run. Live Engine evidence and certified math remain open.
