# Lunar Vault — Engine Front-End Review Audit

**Date:** 2026-11-03
**Scope:** Front-end compliance against the official Engine.io review guidelines.
**Reference:** `https://studio.engine.io/docs/approval-guidelines` and the official
AI-review prompt (`engine-review-prompt.md`, copied from Engine's docs).

**Method:** every finding below was verified against the source or against a
running instance of the game (local mock RGS + headless Chrome). Findings that
could not be proven are marked `UNVERIFIED` rather than assumed.

---

## 1. Summary

Lunar Vault now builds clean and passes 5/5 automated compliance check suites.
**23 front-end defects were found and fixed.** Two release blockers remain that
cannot be closed from code alone: the RTP is outside Engine's certified band
(issue #4) and the game's art is borrowed from a different title.

---

## 2. Blocking issues

### 2.1 RTP is outside the Engine band — **BLOCKER**

`apps/lunar-vault/src/game/config.ts` declares `rtp: 0.97` for the game, base
and bonus modes. Engine requires **96.0–96.70%**. 97.0% is above the band.

This cannot be fixed by editing a number. The RTP is a property of the
certified math package; changing the declared value without regenerating and
re-verifying the math would make the game dishonest. **Requires Engine-certified
math generation.** Tracked as `NosytLabs/lunar-vault#4`.

`apps/lunar-vault/scripts/check-certified-rtp.mjs` correctly fails: there is no
certified math package in the repository.

### 2.2 The game's art is borrowed from a different title — **BLOCKER**

The repository contains **no Lunar Vault art**. Every asset is from
**Mining Mayhem**, another game on the same SDK:

| Asset | Actually contains |
| --- | --- |
| `static/assets/spines/loader/loader.*` | The Mining Mayhem miner character (atlas regions: `beard`, `eye_back`, `eye_pup`), the **"MINING MAYHEM"** title logo, mine cart, pickaxe |
| `static/assets/spines/foregroundAnimation/mm_bg.*` | The mine/snow background with a mine cart and purple crystals |

The in-game board (moon, planets, gems) and the `favicon.svg` (gold moon) are
Lunar Vault's, so the game reads as two different games stitched together.

`docs/NOSYTLABS-RELEASE-PLAN.md` already requires "Avoid ... borrowed game
sprites", so this is a known gap — it needs an artist, not a code change.

---

## 3. Fixed defects

### 3.1 Currency formatting — guidelines [219], [78]

`packages/utils-shared/amount.ts` formatted every currency with exactly two
decimals and rendered the social currencies with the code *before* the amount.

| Input | Before | After (Engine table) |
| --- | --- | --- |
| `USD` | `$10.00` | `$10.00` |
| `EUR` | `€10.00` | `€10.00` |
| `CAD` | `CA$10.00` | `CA$10.00` |
| `MXN` | `MX$10.00` | `MX$10.00` |
| `JPY` | `¥10.00` ✗ | `¥10` ✓ (0 decimals) |
| `XSC` | `SC 10.00` ✗ | `10.00 SC` ✓ |
| `XGC` | `GC 10.00` ✗ | `10.00 GC` ✓ |

Real ISO currencies now use their own `Intl` decimal count; `XSC`/`XGC` are
rendered as suffixes.

### 3.2 Social-mode restricted wording — guideline [225]

Only two strings were being replaced (`BET` → `SPIN`, `BUY BONUS` → `PLAY
BONUS`). Engine's table lists ~25 restricted terms that must be replaced
anywhere a player can see them.

Added `packages/state-shared/src/socialText.ts`: a central whole-word,
case-insensitive replacement layer, wired into both
`packages/components-ui-pixi/src/i18n/i18nDerived.ts` and
`packages/components-ui-html/src/i18n/i18nDerived.ts` so every player-facing
string passes through it, including modal, rules and error text.

The replacement table is Engine's own, stored verbatim in
`tools/engine-restricted-words.json` (33 terms) and parsed from the official
review prompt, so it cannot drift from Engine's wording.

Three further defects were found while verifying this in the browser:

1. **The layer only matched whole strings.** `socialText('BET')` worked, but
   `socialText('INSUFFICIENT FUNDS TO PLACE THIS BET')` did not, because the
   lookup was an exact string match. Engine requires the replacement *anywhere*
   in the text. Rewritten to do whole-word replacement inside longer strings,
   with phrases applied before single words so "buy bonus" is not mangled into
   "play bonus".
2. **Game metadata bypassed the layer.** `LabelBet` reads its label from
   `stateMeta.betModeMeta[...].text.betAmountLabel` — raw game text that never
   went through the translation layer, so the label stayed "BET" in social
   mode. `GameRuleContent.svelte`, `BonusCards.svelte` and `LabelBet.svelte`
   now all call `translate()`.
3. **`Buys` was not in the table.** The game's own rule text read *"Buys the
   FEATURE ROUND for 100x the player bet amount"*. `bought` and `buy` are
   listed by Engine but `buys` is not, so it survived the rewrite. The text was
   reworded to "Instantly triggers the FEATURE ROUND ...".

The plural forms Engine does not list explicitly (`funds`, `deposits`,
`stakes`, `wagers`, `credits`, `currencies`, `purchases`, `gambles`, `buys`)
are covered too, because the SDK's own strings use them — for example
"INSUFFICIENT **FUNDS** TO PLACE THIS **BET**".

### 3.3 Sample SDK metadata shipped to players

Lunar Vault did not override `stateMeta`, so it inherited the SDK's sample
game: **"SAMURAI SPIN"**, "DOUBLE BOOST", "SUPER BOOST", a **200x "SUPER
BONUS"** mode, and a placeholder CDN bucket. None of these exist in Lunar
Vault, which declares exactly two modes (base 1x, feature round 100x).

Added `apps/lunar-vault/src/game/gameMeta.ts` and installed it through
`apps/lunar-vault/src/game/context.ts`.

### 3.4 Paytable and game rules were placeholders

`ModalPayTable.svelte` rendered **"ADD YOUR PAY TABLE"** and
`ModalGameRules.svelte` rendered **"ADD YOUR GAME RULES"**, both with empty
children.

Added `packages/components-ui-html/src/components/GameRuleContent.svelte`,
which renders the Lunar Vault paytable and rules from `stateMeta.gameRuleMeta`.
The paytable now lists all nine paying symbols (`LOW GEM 1`–`5`,
`HIGH GEM 1`–`4`) with explicit 5/4/3-of-a-kind payouts.

### 3.5 Missing general disclaimer and control explanations

Added a general disclaimer and a full control guide (every button explained) to
`gameMeta.ts`. `tools/check-game-rules.mjs` now asserts their presence.

### 3.6 Double-tap zoom was not disabled — guideline [223]

`app.html` had only `width=device-width`. Added
`initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`, plus
`touch-action: manipulation`, `overflow: hidden`, `overscroll-behavior: none`
and full-height html/body in `packages/components-ui-html/src/components/global.scss`.

### 3.7 Stake Engine branded loader — guideline [275]

`+layout.svelte` rendered `<LoaderStakeEngine />` and the SDK's
`LoaderExample.svelte` drew an **"Add Your Loader"** placeholder over it.

- Removed the Stake Engine loader component and its
  `static/stake-engine-loader.gif` asset.
- Switched to the game's own `loader.gif`.
- Removed the placeholder text from `LoaderExample.svelte`.
- Added `<title>Lunar Vault</title>` and a description meta tag (the app had
  **no `<title>` at all** — guideline [213]).

### 3.8 The build loaded external hosts — guideline "Static files only"

The build fetched from three foreign hosts:

| Host | Where | Fix |
| --- | --- | --- |
| `use.typekit.net` | `app.html` `<link>` + `packages/pixi-svelte/src/lib/utils.svelte.ts` | Removed. The game's fonts ship inside the Pixi spine atlases. |
| `staging-1-0.twist-game.app` | 28 URLs in `packages/state-shared/src/constants.ts` (sample paytable art) | Neutralised to `''`. |
| `test-fart-cdn-bucket.s3.ap-southeast-2.amazonaws.com` | 25 URLs in the same file (sample bet-mode art) | Neutralised to `''`. |

The last two pointed at *another game's* art, including an `rtp97.svg` that
would have advertised the wrong RTP. They are now empty strings so no game
built on this SDK can ship someone else's CDN assets.

### 3.9 A debug overlay shipped to players

`apps/lunar-vault/src/components/I18nTest.svelte` was mounted in `Game.svelte`.
It renders a **"TRANSLATIONS TEST"** panel listing every untranslated key —
visible on the real game screen. Removed from `Game.svelte`.

### 3.10 Replay had no "Play Again" control — guideline [173]

The replay fetched and displayed bet/win labels but offered no way to play
again. Added:

- `packages/state-shared/src/stateBet.svelte.ts` — `replayBet` cache.
- `packages/components-shared/src/components/Authenticate.svelte` — caches the
  replay bet data.
- `apps/lunar-vault/src/components/EnableGameActor.svelte` — handles
  `replayPlayAgain` and re-triggers `RESUME_BET`.
- `packages/components-ui-pixi/src/components/ButtonReplayPlayAgain.svelte` —
  the Pixi control.
- `packages/components-ui-pixi/src/components/UIReplay.svelte` — mounts it.

The replay restarts locally from the cached bet; it does not request a new bet
from the RGS (replay mode has no active session).

### 3.11 The bet label hid the real cost of a bought mode — guideline [174]

`stateBetDerived.betCostMultiplier()` applied the multiplier only to
`type: 'activate'` modes, so a 100x bought mode displayed the **base** bet, and
the affordability check (`isBetCostAvailable`) compared the wrong number.

Fixed in `packages/state-shared/src/stateBet.svelte.ts` so `buy` modes apply
their `costMultiplier` too, and `LabelBet.svelte` now renders the multiplier
next to the label (`FEATURE ROUND · 100x`) with the real cost as the value.

### 3.12 The game metadata bypassed the social translation layer

See 3.2 — `betAmountLabel`, the paytable/rules text and the bonus-card text
were rendered raw, so social mode left "BET" on screen.

### 3.13 The RGS URL scheme was hardcoded to HTTPS

`packages/rgs-fetcher/src/rgsFetcher.ts` built `https://${rgsUrl}`, so an
operator URL with an explicit `http://` scheme became
`https://http//host/...`. Now preserves an explicit `http://` or `https://`
and defaults to HTTPS only when no scheme is given.

---

### 3.14 The opening bet was hardcoded, not taken from the RGS — guidelines [242], [187]

`packages/state-shared/src/stateBet.svelte.ts` initialised `betAmount: 1`, and
`packages/components-shared/src/components/Authenticate.svelte` never read
`defaultBetLevel` from the authenticate response. The field was present in
`packages/rgs-fetcher/src/schema.ts` but consumed nowhere, so the game always
opened on $1.00 no matter what the operator configured.

Engine guideline **[242]** requires `minBet`, `maxBet`, `stepBet`,
`defaultBetLevel` and `betLevels` to come from the authenticate response.
Guideline **[187]** requires an active round's amount to take precedence over
the default and to survive the round ending.

**Fixed:**

- `stateConfig.svelte.ts` gained a `defaultBetLevel` field.
- `Authenticate.svelte` reads `authenticateData.config.defaultBetLevel`,
  converts it from the RGS's integer units, and applies it to both
  `stateBet.betAmount` and `stateBet.wageredBetAmount` — but only when there
  is no active round, so an in-flight round's amount still wins.
- `stateBet.svelte.ts` now starts at `betAmount: 0` instead of `1`. The bet
  button is gated on `stateBetDerived.isBetCostAvailable()`, which requires
  `betCost() > 0`, so no zero bet can be placed while the RGS value is still
  loading.

**Verified** against a mock RGS that deliberately serves
`defaultBetLevel: 25`: the first `/wallet/play` request carried
`2500000000` (=$25.00), not the old hardcoded 100000000 (=$1.00).
`tools/qa-default-bet.py` asserts this, and `tools/check-bet-config.mjs`
guards the source against regressing.

---

## 4. Verified compliant (no change needed)

| Guideline | What was checked | Result |
| --- | --- | --- |
| [25] | RTP and max win stated | Present in `config.ts` and the rules (RTP value is the open blocker) |
| [31] | High-cost modes need confirmation | `ModalBuyBonusConfirm` states the cost before the purchase |
| [172] | Optional URL parameters | `currency`, `lang`, `amount` are read in `stateUrl.svelte.ts` |
| [188] | Replay restricted words | Replay strings pass through the social translation layer |
| [213] | Unique title | `<title>Lunar Vault</title>` |
| [221] | Zero-win rounds send no end-round | `createPrimaryMachines.ts` skips the end-round call for `noWin` |
| [222] | Insufficient balance sends no play request | `isBetCostAvailable()` gates the bet button, the space bar, autoplay and bonus purchase **before** the request |
| [240] | Invalid languages fall back | The i18n loader falls back to English |
| [243] | Replay works at 400×225 | The four layout modes (desktop / tablet / landscape / portrait) cover the reviewer sizes |
| — | Space bar bets | `ButtonBet` + a global handler that calls `preventDefault()` |
| — | Autoplay confirmation | Opens a confirmation modal before starting |
| — | Bonus purchase confirmation | Opens `buyBonusConfirm` |
| — | Sound | All three audio players are gated by the master volume, so the player can mute everything |
| — | Unfinished-round recovery | `Authenticate.svelte` restores amount, mode and bet data |
| — | Currency fallback | Invalid/missing currency falls back without breaking the display |

---

## 5. Static files only — verified

After the fixes, the production build references no external host other than
the RGS. Verified by scanning the built JS and HTML for `http://` and
`https://` URLs.

---

## 6. Automated checks

| Script | Covers |
| --- | --- |
| `tools/check-currency-format.mjs` | [219] currency table |
| `tools/check-social-wording.mjs` | [225] restricted words |
| `tools/check-game-rules.mjs` | [25] paytable, RTP, max win, modes, disclaimer, controls |
| `tools/check-engine-compliance.mjs` | [213] title, [223] zoom, [227] no scroll, [275] loader, [219] currency |
| `tools/check-bet-config.mjs` | [242] defaultBetLevel, [187] active-round precedence |

```
$ for f in check-currency-format check-social-wording check-game-rules check-engine-compliance check-bet-config; do
    node tools/$f.mjs && echo "PASS $f"; done
All checks passed.
PASS check-currency-format
PASS check-social-wording
PASS check-game-rules
PASS check-engine-compliance
PASS check-bet-config
```

The Engine-certified RTP check (`apps/lunar-vault/scripts/check-certified-rtp.mjs`)
still fails — correctly, because no certified math package exists yet.

---

## 7. Gameplay verification

Verified against a local mock RGS (`tools/mock-rgs.py`) in headless Chrome:

- `/wallet/authenticate` → balance and config load.
- `/wallet/play` → a real bet is placed with the space bar.
- `/wallet/end-round` → sent only for a winning round.
- Replay endpoint returns a valid replay payload.
- All assets load with **zero 404s**.
- The board renders the Lunar Vault theme (moon, planets, gems) with the full
  UI: bet, balance, win, spin, auto-spin, turbo, menu, sound.

---

## 8. Open items

1. **Engine-certified math** for RTP 96.0–96.70% — blocks submission
   (`NosytLabs/lunar-vault#4`).
2. **Original Lunar Vault art** — the loader/title screen still shows Mining
   Mayhem's character and logo.
3. The `rtp97.svg` and bet-mode art in the SDK defaults were emptied, not
   replaced. Any game that relies on the SDK's sample metadata now shows blank
   images rather than another game's assets.
