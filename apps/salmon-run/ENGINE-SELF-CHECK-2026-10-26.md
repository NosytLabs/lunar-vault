# Salmon Run Engine self-check — 26 October 2026

Scope: **25 production Chromium fixture checks**, six shared contract tests, eight math regression tests, independent recomputation of **200,000 books**, and a local weighted-server playthrough. PASS means the cited local behavior; it does not establish live Engine acceptance, certification or approval. The supplied 41-item self-check is the rubric; direct user authorization covers the fixes and tests.

4 AT RISK · 32 PASS · 3 NEEDS A HUMAN · 2 N/A.

## Outstanding review

**[181] AT RISK:** real Engine authentication, live replay IDs, interruption and server acceptance have no supplied Studio session. **[25] AT RISK:** the development distribution is matched and independently verified locally, but has not received certification, Engine math/exposure review or approval. **[77] AT RISK:** broader social/jurisdiction/timing paths remain open. Minimum-round-duration units have not been guessed. **[213/217/253/107]:** human title/content/rights and physical-device audio review remain.

The exact model is finite weighted books, not the proposal-board RNG. See [math evidence](../../math/salmon-run/README.md). Final Studio tiles, distribution choice and human quality ranking are also open. No submission or real-money readiness is asserted.

## Full checklist

| ID | Guideline | Verdict | Evidence |
|---|---|---|---|
| 181 | RGS launch | AT RISK | `apps/salmon-run/src/engine.ts:2` — Configured-host fixture authentication and local mock pass; real Engine acceptance still needs a supplied Studio session. |
| 274 | Invalid RGS | PASS | `apps/salmon-run/tests/salmon.spec.ts:357` — Invalid configured host produces a readable failure; no destination fallback or wallet play. |
| 183 | Play request | PASS | `apps/salmon-run/tests/salmon.spec.ts:195` — Complete ordered book playback; local mock also exercised weighted server selection. |
| 275 | Own loader | PASS | `apps/salmon-run/src/App.svelte:578` — Own titled river loader; no SDK placeholder screen. |
| 213 | Title restrictions | AT RISK | `apps/salmon-run/index.html:7` — Salmon Run contains no restricted title terms. Global title/trademark clearance is open. |
| 217 | Content suitability | NEEDS A HUMAN | `apps/salmon-run/PROVENANCE.md:4` — Wildlife/objects have been visually inspected; human content suitability review remains. |
| 253 | Distinct identity | NEEDS A HUMAN | `apps/salmon-run/sprite-prompts-v2.json:3` — Eight separately directed new sprites and original environment. Human similarity/rights review remains. |
| 242 | Server bet configuration | PASS | `apps/salmon-run/src/engine.ts:123` — Reads/validates dynamic amounts, divisibility, defaults and known per-mode cost/max; browser checks block excess limits. |
| 187 | Active-round amount | PASS | `apps/salmon-run/src/App.svelte:306` — Active amount overrides default; recovery sends no new play/debit. |
| 219 | Currencies | PASS | `apps/salmon-run/tests/salmon.spec.ts:331` — JPY/SC/GC/CAD/MXN exact-unit browser checks plus the shared official currency table and six contract tests. |
| 273 | Sub-unit awards | PASS | `tools/engine-contracts.test.mjs:15` — Shared formatter retains meaningful wallet digits rather than rounding a small award to zero. |
| 221 | Open-round settlement | PASS | `apps/salmon-run/tests/salmon.spec.ts:232` — Winning active round ends once; zero result has no progress/end; replay has no wallet requests. |
| 222 | Insufficient balance | PASS | `apps/salmon-run/tests/salmon.spec.ts:316` — Pointer and Space cannot start a round; a lower-amount explanation is visible. |
| 228 | Space | PASS | `apps/salmon-run/tests/salmon.spec.ts:291` — Space follows Spin and respects dialog/focus/session restrictions. |
| 227 | No frame scroll | PASS | `apps/salmon-run/tests/salmon.spec.ts:154` — Five tested viewport bounds; only dialog content scrolls. |
| 104 | Autoplay confirmation | N/A | `apps/salmon-run/src/App.svelte:383` — No autoplay control or automatic new paid rounds. Automatic presentation of the already-returned feature is not autoplay. |
| 31 | High-cost confirmation | PASS | `apps/salmon-run/tests/salmon.spec.ts:241` — Confirmation shows 20× total cost before a single mode request. |
| 107 | Master mute | NEEDS A HUMAN | `apps/salmon-run/src/audio.ts:10` — All synthesized voices share master gain and mute stays accessible; listen on physical devices in every phase. |
| 25 | RTP/max win | AT RISK | `math/salmon-run/report.json:11` — Exact local 193/200 RTP per mode and matched finite maxima; Engine exposure-template review, certification and live math acceptance remain. |
| 24 | Symbol awards | PASS | `math/salmon-run/verify.py:72` — Independent evaluator checks every line/symbol award in all 200,000 books; UI reads the same paytable config. |
| 26 | Win rules | PASS | `apps/salmon-run/src/App.svelte:620` — Full twenty line diagrams and highest-combination/Wild rules; independent book recomputation. |
| 27 | All mode costs | PASS | `math/salmon-run/publish_files/index.json:2` — Only base 1× / river 20×; index, config, rules and confirmation agree; authenticated costs must match. |
| 29 | Free games/retrigger | PASS | `math/salmon-run/verify.py:100` — 3/4/5+ =>6/8/10, retrigger+2 capped12, collection stages and feature totals independently checked. |
| 235 | Control guide | PASS | `apps/salmon-run/src/App.svelte:666` — Spin, Stop, amounts, feature confirmation, guide, sound, fast reels, reduced motion, Space and replay explained. |
| 185 | Disclaimer | PASS | `apps/salmon-run/src/App.svelte:694` — Malfunction, connection/reload, long-run return, illustrative device, RGS settlement and TM/©2026 Engine included. |
| 266 | Mystery probabilities | N/A | `math/salmon-run/config.json:3` — No Mystery Mode or displayed probability promises. |
| 193 | Laptop 1024×576 | PASS | `apps/salmon-run/tests/salmon.spec.ts:149` — Laptop bounds and screenshot reviewed; physical device signoff open. |
| 195 | Popouts 400×225 / 800×450 | PASS | `apps/salmon-run/tests/salmon.spec.ts:150` — 400×225 and 800×450 geometry, fonts, primary44px controls and screenshots checked. |
| 194 | Phone 425×812 | PASS | `apps/salmon-run/tests/salmon.spec.ts:151` — Phone portrait bounds, controls and currencies checked with screenshot review. |
| 223 | Double-tap zoom | PASS | `apps/salmon-run/src/app.css:58` — Game/control surfaces suppress double-tap zoom while dialogs remain scrollable. |
| 239 | English | PASS | `apps/salmon-run/src/App.svelte:615` — All game-owned text is English; bundled fonts render without observed missing glyphs. |
| 240 | Unknown language | PASS | `apps/salmon-run/src/engine.ts:116` — English-only static text and request language; unknown lang query cannot select missing translations. |
| 77 | Social text everywhere | AT RISK | `apps/salmon-run/tests/salmon.spec.ts:344` — Social rules/controls/exercised replay use neutral words. Complete live platform error/settings/jurisdiction matrix remains open. |
| 78 | SC/GC display | PASS | `apps/salmon-run/tests/salmon.spec.ts:331` — Both XSC/XGC suffixes and exact units checked; no dollar replacement. |
| 225 | Neutral mode names | PASS | `apps/salmon-run/src/App.svelte:160` — Neutral River Run name is consistent across menu, confirmation and mode rules. |
| 188 | Social replay copy | PASS | `apps/salmon-run/tests/salmon.spec.ts:274` — Social replay has PLAY/TOTAL PLAY labels without a bet menu. |
| 171 | Replay playback | PASS | `apps/salmon-run/tests/salmon.spec.ts:274` — Only replay endpoint used, zero wallet/progress calls; live Engine replay IDs pending. |
| 172 | Replay options | PASS | `apps/salmon-run/src/engine.ts:166` — Amount/currency/social options supported; invalid amount defaults safely to1.00; English fallback. |
| 173 | Play again | PASS | `apps/salmon-run/tests/salmon.spec.ts:281` — Repeated Play uses the same loaded book and makes no new wallet request. |
| 174 | Replay actual cost | PASS | `apps/salmon-run/src/App.svelte:521` — Replay shows server cost multiplier and actual total amount, independent of local metadata. |
| 243 | Small replay | PASS | `apps/salmon-run/tests/salmon.spec.ts:277` — Replay loading/Play Again and social amounts tested at400×225. |

## Human/platform checks

Inspect base, large wins, feature entry/retrigger/summary, recovery and replay on physical phones/laptops and both popout sizes. Listen for complete mute, inspect all touch targets, verify English/neutral copy in live platform errors, test actual authenticated limits and jurisdiction timing, and validate matching frontend/math versions. Compose original 3:4 and16:9 Media Editor tiles and clear art/title rights. Quality stars are assigned by Engine human reviewers, not this report.

The community skill at commit `caf5de33a5b8da8b5ddb9fd770fd457a7242a04c` guided UX, event animation, math and QA. Its older RTP range/event assumptions and Svelte-blind compliance scanner do not override official requirements. Standard awards use `winInfo`; the independent verifier covers custom progress and every publication row.

Official sources: [frontend](https://studio.engine.io/docs/front-end), [dependencies](https://studio.engine.io/docs/front-end/dependencies), [communication](https://studio.engine.io/docs/approval-guidelines/front-end-communication), [math](https://studio.engine.io/docs/approval-guidelines/math-verification), [disclaimer](https://studio.engine.io/docs/approval-guidelines/general-disclaimer), [jurisdiction](https://studio.engine.io/docs/approval-guidelines/jurisdiction-requirements), [replay](https://studio.engine.io/docs/approval-guidelines/game-replay-requirements), [tiles](https://studio.engine.io/docs/approval-guidelines/game-tile-requirements), [quality](https://studio.engine.io/docs/approval-guidelines/game-quality-rankings), [distribution](https://studio.engine.io/docs/distribution), [RGS example](https://studio.engine.io/docs/rgs/example).
