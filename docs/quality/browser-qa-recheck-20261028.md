# Browser QA — official-prompt recheck, 2026-10-28

**100 distinct browser scenarios passed in one clean production run: Lunar Vault 68; Salmon Run 32. There were zero failures, skips or flaky outcomes.** The run includes all 79 previous scenarios and 21 new regressions. The original 79-case report and raw results remain unchanged as history; no historical pass is substituted for a current-build result.

Tested runtime commit: `bc9a8111f95cb46c6364603ef2cc29cc2854b465` (tree`8c7b948785ab6e97e4afc1b1b4d4d50a01a2fc33`). Official prompt: [Engine prompt](https://studio.engine.io/docs-content/prompt.md), SHA-256`7e8b516503c3b94db9514420523514952f871827d5750cc49b8a0882479f603f`.

## What changed and what passed

Four concrete review findings were repaired before the build freeze:

- Invalid optional Lunar replay amounts now default to 1,000,000 micro-units; valid positive safe integer amounts remain unchanged. Eight browser cases cover text, zero, negative, nonfinite, fractional, unsafe and empty values.
- Lunar replay responses must include a finite positive authoritative `costMultiplier`. Missing cost fails visibly, persists through Escape/Space, and cannot reach a wallet. Unit cases reject missing/invalid costs and retain valid historical prices, including 42×. Unfinished wallet rounds use a separate envelope validator and may still omit the replay-only field.
- Lunar error guidance selects only own, string-valued known codes. Three prototype-name browser cases use generic guidance; the known `ERR_VAL` case retains actionable guidance. Raw server detail is never displayed. Replay keeps its fixed recovery guidance.
- Currency metadata lookups use own properties for both symbols and precision. Invalid optional replay currency defaults to USD in both clients (four browser cases per game). Unknown authenticated currency codes remain readable with their own code suffix; they are never silently relabelled USD. Existing USD/EUR/CAD/MXN/JPY/XSC/XGC cases all passed again.

The three targeted browser checks failed on the old build before implementation, and the currency unit reproduced the inherited-metadata TypeError. Final `npm run test:session` passed all 5 test files; the expanded run lists **31 logical cases passed, zero failed**, including 6 new cases. New specs are discoverable by the ordinary repository Playwright configurations, and the new unit file is included in `test:session`.

## Run and evidence

| Group | Passed |
| --- | ---: |
| Lunar existing presentation |8|
| Lunar existing contracts |43|
| Lunar new regressions |17|
| Salmon existing contracts |27|
| Salmon existing collection/stage scenario |1|
| Salmon new regressions |4|
| **Total** |**100**|

The one-worker run took **888,626.983ms (14min48.627sec)**. Every unique case has exactly one passed result; top-level errors are empty. It used the existing official Chromium headless shell revision 1161, version 134.0.6998.35. Ordinary 45-second budgets, existing per-case longer budgets, and the existing 60-second collection budget were retained. No runtime or test changes were made during the full run.

Canonical case identities, source/build/archive bindings and screenshot hashes: [browser-results-recheck-20261028.json](browser-results-recheck-20261028.json). Raw Playwright output: [browser-results-recheck-main-20261028.json](browser-results-recheck-main-20261028.json). Run log: [browser-recheck-20261028.log](browser-recheck-20261028.log). Exact runner configuration: [browser-recheck-runner-20261028.mjs](browser-recheck-runner-20261028.mjs). Unit evidence: [session-unit-recheck-20261028.log](session-unit-recheck-20261028.log). Baseline browser failures: [browser-results-recheck-red-20261028.json](browser-results-recheck-red-20261028.json); baseline currency failure: [replay-currency-recheck-red-20261028.log](replay-currency-recheck-red-20261028.log).

The raw 100-case JSON SHA-256 is`e92077ffb68b38022d532353ba3b67bbdc623f0e42a01624123c4a95aa2462a6`; full log SHA-256 is`de30f49efe841a039cc260d986ccab9682c516fe3b82ae8280183b9adbe75486`.

## Release binding

Current [release manifest](release-manifest-20261028.json) SHA-256:`c416ba8108152638e53baabf5b729144ac336582d401d9c8543ccba1e5139f26`.

| Tested frontend | Archive SHA-256 |
| --- | --- |
| Lunar `bundle.SjWMbrUk.js` / `style.BAOjlYup.css` |`a6104504ab369900ad6867cfdf18d5493ff42670e139f8fa5dae099b7e2b681f`|
| Salmon `index-BzIUtORk.js` / `index-DkyT2mbV.css` |`6918e737724afd80d61983f187756475b8dee98e61a5c9fa3dab71e7dc10b0ca`|

Both production builds succeeded. All reachable generated JS/CSS hashes were checked against this manifest. The canonical JSON records all six archive identities, including unchanged math archives; this browser recheck did not change math or art.

## Current captures and remaining boundaries

The 13 selected current-run screenshots and their hashes are listed in the canonical JSON under `screenshots`; they live in [screenshots/20261028-recheck](screenshots/20261028-recheck/). They cover both games at 1024×576, 800×450, 400×225 and touch 425×812, Lunar rules/mute, numeric full-cost confirmation, small replay and feature completion, and Salmon collection. Small feature layouts, the confirmation and collection were visually inspected; no clipping or overlap was observed. Automated bounds are not treated as visual-quality proof.

Coverage retains real publication rounds, recovery/checkpoint/settlement ordering, base-only mode subsets and omitted-feature recovery, balance/full-cost guards, social wording, keyboard/autoplay cancellation, asset recovery, native currencies and unknown-language fallback. Wallet endpoints were mocked; no live wallet action occurred. Physical native-window blur remains a manual check (the automated case honestly tests the blur event). Positive `minimumRoundDuration` remains a visible fail-closed session gate pending documented units. Live Engine profile, physical-device performance/touch and audible mute remain separate checks; this report does not claim publisher approval.
