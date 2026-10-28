# Lunar Vault Engine self-check — 26 October 2026

> **Historical record — superseded on 2026-10-28.** Use the [current project README](../README.md) and [current Engine approval review](quality/engine-approval-fix-review-20261028.md) for this candidate. Figures, asset lists and pending-work statements below describe the earlier version.

7 AT RISK · 29 PASS · 3 NEEDS A HUMAN · 1 FAIL · 1 N/A.

Scope: source inspection, local playthrough, **36 production Chromium fixture checks**, seven sample-math tests and six RGS/currency unit tests. PASS establishes the cited local frontend behavior, not Engine staging, certification or approval. The supplied self-check is the rubric; its read-only workflow is superseded by the user's explicit request to fix and test the game.

## Failures first

**[25] FAIL:** inherited 97% / 5,000× metadata is explicitly unverified and lacks matching math. A matched model, weighted verification and independent review are needed; editing a label is not calibration.

**[24/26/27/29] AT RISK:** sample rules validate locally; authoritative publication math is missing. Fifteen retrigger-position warnings remain in five inherited sample books. Rendering skips invalid animation positions without changing totals.

**[181/77] AT RISK:** no live Engine session was supplied. Verify real authentication/rejection, all errors/settings/social paths, interruptions, all replay scenarios and the full currency/jurisdiction/timing matrix. Minimum-round-duration units are not guessed.

**[213/217/253/107] Human review:** clear title/asset rights and distinctness, content suitability, physical devices and audible all-audio mute.

## Full checklist

| ID | Guideline | Verdict | Evidence |
|---|---|---|---|
| 181 | RGS launch | AT RISK | `packages/components-shared/src/components/Authenticate.svelte:4` — Local fixture returns 200 at the supplied host; real Engine acceptance is untested. |
| 274 | Invalid RGS | PASS | `packages/rgs-fetcher/src/endpoint.ts:1` — Missing/invalid addresses fail, with no fallback host; the invalid-host browser test confirms a clear error and no alternate destination. |
| 183 | Play request | PASS | `tests/lunar-vault.spec.ts:246` — Correct local request and complete ordered event playback. |
| 275 | Own loader | PASS | `apps/lunar-vault/src/components/LoadingScreen.svelte:26` — Own title/orbital loader; forbidden SDK loader removed. |
| 213 | Title restrictions | AT RISK | `apps/lunar-vault/src/routes/+layout.svelte:14` — Lunar Vault avoids restricted words; global title/trademark clearance is open. |
| 217 | Content suitability | NEEDS A HUMAN | `docs/assets/lunar-sprites-v2.json:3` — Objects/environment visually reviewed, no minors observed; final content signoff is human. |
| 253 | Distinct identity | NEEDS A HUMAN | `docs/ASSET-PROVENANCE.md:25` — Original directed sprites; final similarity and rights review remains open. |
| 242 | Server bet configuration | PASS | `packages/components-shared/src/components/Authenticate.svelte:49` — Min/max/step/default/levels all read and validated; no balance-derived unsupported fractions. |
| 187 | Active-round amount | PASS | `tests/lunar-vault.spec.ts:540` — 0.50 overrides a 0.10 default and the next request still sends 500000. |
| 219 | Currencies | PASS | `tests/lunar-vault.spec.ts:478` — USD/EUR/CAD/MXN/JPY/XSC/XGC show native precision and exact requested units on phone. |
| 273 | Sub-unit awards | PASS | `tests/lunar-vault.spec.ts:552` — The 0.002 award displays as $0.002, with all meaningful wallet precision. |
| 221 | Open-round settlement | PASS | `tests/lunar-vault.spec.ts:246` — Win settles once; loss has no end-round; replay has no wallet calls. |
| 222 | Insufficient balance | PASS | `tests/lunar-vault.spec.ts:506` — Insufficient balance explanation; pointer/Space send no play request. |
| 228 | Space | PASS | `tests/lunar-vault.spec.ts:282` — Window hotkey follows round/modal/session restrictions. |
| 227 | No frame scroll | PASS | `tests/lunar-vault.spec.ts:198` — Seven viewport bounds checks; only modal content scrolls. |
| 104 | Autoplay confirmation | PASS | `tests/lunar-vault.spec.ts:307` — Settings/confirmation precede automatic requests; cancellation remains available. |
| 31 | High-cost confirmation | PASS | `tests/lunar-vault.spec.ts:394` — 100× is displayed; confirmation sends exactly one bonus request. |
| 107 | Master mute | NEEDS A HUMAN | `apps/lunar-vault/src/components/Sound.svelte:1` — Browser regression keeps mute available on the feature introduction; listen on physical devices across base/feature/large wins. |
| 25 | RTP/max win | FAIL | `apps/lunar-vault/src/components/GameInformation.svelte:27` — Explicitly unverified 97% / 5000× sample metadata; missing matching certified math and outside the current RTP band. |
| 24 | Symbol awards | AT RISK | `apps/lunar-vault/src/components/GameInformation.svelte:38` — Table matches sample config and audited examples; authoritative publication math is absent. |
| 26 | Win rules | AT RISK | `apps/lunar-vault/src/components/GameInformation.svelte:52` — Twenty line diagrams/Wild rules match examples; recheck against published math. |
| 27 | All mode costs | AT RISK | `apps/lunar-vault/src/components/GameInformation.svelte:87` — Base/bonus and 100× described; no authoritative published index. |
| 29 | Free games/retrigger | AT RISK | `apps/lunar-vault/src/components/GameInformation.svelte:86` — 8/12/15 sample spins explained; fifteen stale/offscreen sample retrigger warnings remain. |
| 235 | Control guide | PASS | `apps/lunar-vault/src/components/GameInformation.svelte:90` — Amounts, +/−, spin/stop, turbo, sound/settings/menu, autoplay, feature confirmation and replay covered. |
| 185 | Disclaimer | PASS | `apps/lunar-vault/src/components/GameInformation.svelte:110` — Covers malfunction, connection/reload, long-run return, illustrative device, RGS settlement and TM/© 2026 Engine. |
| 266 | Mystery probabilities | N/A | `apps/lunar-vault/src/game/config.ts:9` — Only base/bonus; no Mystery Mode or displayed odds. RTP is separately failed. |
| 193 | Laptop 1024×576 | PASS | `tests/lunar-vault.spec.ts:198` — Viewport test and screenshot review; physical-device signoff open. |
| 195 | Popouts 400×225 / 800×450 | PASS | `tests/lunar-vault.spec.ts:198` — Viewport tests, compact controls and screenshot review. |
| 194 | Phone 425×812 | PASS | `tests/lunar-vault.spec.ts:198` — Portrait controls, currency checks and screenshot review. |
| 223 | Double-tap zoom | PASS | `apps/lunar-vault/src/app.html:6` — Viewport suppresses double-tap zoom. |
| 239 | English | PASS | `apps/lunar-vault/src/components/GameInformation.svelte:24` — Exercised UI/rules are English, without observed missing keys or glyphs. |
| 240 | Unknown language | PASS | `tests/lunar-vault.spec.ts:496` — lang=zz falls back to English and completes a request. |
| 77 | Social text everywhere | AT RISK | `tests/lunar-vault.spec.ts:515` — Complete game-owned rules/exercised feature paths pass; full shared errors/settings/timing matrix remains open. |
| 78 | SC/GC display | PASS | `tests/lunar-vault.spec.ts:478` — Both token suffixes, no dollar prefix, exact request units. |
| 225 | Neutral mode names | PASS | `tests/lunar-vault.spec.ts:327` — ECLIPSE CHAMBER is consistent in exercised menus; published index still pending. |
| 188 | Social replay copy | PASS | `tests/lunar-vault.spec.ts:559` — Neutral PLAY AMOUNT / TOTAL PLAY labels at 400×225. |
| 171 | Replay playback | PASS | `tests/lunar-vault.spec.ts:354` — Correct replay endpoint, no wallet calls; live event IDs still need staging. |
| 172 | Replay options | PASS | `tests/lunar-vault.spec.ts:559` — Amount/currency/social applied; invalid amount defaults safely and language falls back. |
| 173 | Play again | PASS | `tests/lunar-vault.spec.ts:354` — Reuses supplied round, without another wallet request. |
| 174 | Replay actual cost | PASS | `tests/lunar-vault.spec.ts:559` — Server 42× produces TOTAL PLAY 4.20 SC, independently of local 100× metadata. |
| 243 | Small replay | PASS | `tests/lunar-vault.spec.ts:559` — Loads and offers replay controls at 400×225. |


## For a person to check

Inspect base/feature/large-win/replay screens at 1024×576, 800×450, 400×225 and 425×812 on physical devices. Confirm font readability, every touch control, performance, all-audio mute and art/title rights. Use Studio for a real session, all required replay event IDs, jurisdiction tests and both Media Editor tile formats. No submission or distribution choice has been made, and no quality star rating is claimed.

Official sources: [Web SDK](https://studio.engine.io/docs/front-end), [frontend](https://studio.engine.io/docs/approval-guidelines/front-end-communication), [math](https://studio.engine.io/docs/approval-guidelines/math-verification), [disclaimer](https://studio.engine.io/docs/approval-guidelines/general-disclaimer), [jurisdiction](https://studio.engine.io/docs/approval-guidelines/jurisdiction-requirements), [replay](https://studio.engine.io/docs/approval-guidelines/game-replay-requirements), [tiles](https://studio.engine.io/docs/approval-guidelines/game-tile-requirements), [quality](https://studio.engine.io/docs/approval-guidelines/game-quality-rankings), [distribution](https://studio.engine.io/docs/distribution), [RGS example](https://studio.engine.io/docs/rgs/example).
