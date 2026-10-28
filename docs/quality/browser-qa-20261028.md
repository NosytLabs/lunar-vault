# Browser QA — final reconstructed release, 2026-10-28

**79 distinct scenarios have a passing latest result: Lunar Vault 51; Salmon Run 28. No unresolved automated failure remains.** This combines the main run and the explicitly recorded follow-ups; it is not a single clean 79-case run.

Runtime source checkpoint: `159efd249f09ba9387f39062c6bffb707458875f`. Test-only timing/harness refinements after the main run did not change Lunar runtime. The final Salmon error-code fix was rebuilt and its entire focused group rerun. Canonical evidence: [browser-results-20261028.json](browser-results-20261028.json).

## Exact fresh results

| Run                                                    | Lunar Vault     | Salmon Run      | Total                     | Duration |
| ------------------------------------------------------ | --------------- | --------------- | ------------------------- | -------- |
| Main production run                                    | 49 pass, 2 fail | 26 pass, 1 fail | **75 pass, 3 fail / 78**  | 17.8 min |
| Lunar targeted follow-up, same runtime                 | 2 pass          | —               | **2 pass / 2**            | 23.2 sec |
| Final Salmon build, full focused group plus collection | —               | 28 pass         | **28 pass / 28**          | 1.9 min  |
| Distinct scenarios, latest relevant result             | **51 pass**     | **28 pass**     | **79 pass, 0 unresolved** | —        |

All three fresh runs have zero skips and zero flaky outcomes. `npm run test:session` also passed all **4 test files, containing 25 logical cases** (7 shared configuration/replay, 14 Salmon session, 4 count-up formatting cases). The runner's summary is by file; it does not directly list 25 top-level files.

## Resolved failures and bounded follow-ups

The main checkpoint case completed all five event acknowledgements and a successful end-round in the trace, but reached settlement at 11.63 seconds after play, beyond its 10-second poll. Its focused contract test now uses an 800×450 reduced-motion scene and a semantic HTML Spin locator; the exact ordered checkpoint and single-settlement assertions and poll budget remain. It passed in 8.8 seconds. Normal-motion win/dialog settlement also passed separately.

The compound base-only case exhausted its 45-second overall budget after traversing pointer, Space and autoplay paths. Whole-Pixi text/bounds walks were unnecessarily used to operate HTML buttons. The follow-up uses semantic DOM locators and a physical bounding-box click for the disabled feature control at 800×450. It preserves every wallet/mode assertion and the 45-second budget; it passed in 12.4 seconds.

The Salmon failure exposed a real integration defect: shared fetching rejects structured HTTP/service errors, but the client catch discarded the known error code before its existing message map could use it. The corrected adapter uses one own-property whitelist for known codes, keeps generic messages for transport/unknown/replay failures, and never displays raw server text. Three regression cases were added. The corrected Salmon frontend passed all 27 focused cases plus the normal-motion collection/stage case; the old Salmon frontend result is not substituted for that new-build verification.

Earlier full-Chrome diagnostics were stopped after excessive software-renderer delays. Final evidence uses the restored official Chromium headless shell revision 1161, version 134.0.6998.35, with one worker. No blanket timeout increase or production animation change was used to fix test timing. The collection case retains the existing Salmon project's 60-second budget; ordinary cases retain 45 seconds and pre-existing long feature/dialog cases retain their individual budgets.

Held-Space release is verified both after focus moves to the mute button and after dispatching a window blur event while a first play is held pending. TURBO clears and no subsequent play occurs after the first completes. Headless shell cannot demonstrate native OS/tab focus loss consistently, even when Playwright focus emulation is disabled; the blur-event test is labelled honestly. Physical native-focus loss remains a manual check.

## Coverage and boundaries

Both games' fresh coverage includes documented mode arrays and exact server spelling, valid base-only playable subsets, absent-feature blocking, omitted-feature recovery without a new feature debit, mismatched cost/missing-base failures, full-cost balance guards, currencies USD/EUR/CAD/MXN/JPY/XSC/XGC, unsupported-language English fallback, dynamic amounts, replay-only/no-wallet paths, checkpoint ordering, recovery and settlement. Lunar also covers sprite retry/permanent failure, sub-cent awards, Space/autoplay/modal interaction, numeric 100× confirmation, readable replay errors, count-up precision and actual publication base/full twelve-spin feature books.

Running features were checked at 1024×576, 800×450, 400×225 and touch-enabled 425×812, including rotation and small feature replay. Salmon compact checks assert session fonts ≥9px, major feature text ≥10px, minor labels ≥8px, board width ≥200px and mute separation. Selected current captures were visually inspected; bounds alone are not treated as visual-quality proof.

All wallet endpoints were mocked. Genuine publication books were used in the relevant scenarios; no live wallet action occurred. The source and builds were reconstructed after workspace loss, and these fresh results supersede the lost earlier 48-case evidence. Earlier preflight/harness diagnostics are retained under `/tmp/lunar-qa-recovery-20261028/` but are not presented as final passing runs.

Positive `minimumRoundDuration` still fails visibly before play because official units remain unconfirmed; zero/missing values work. Lunar accepts a versioned replay's authoritative cost (including a historical 42× fixture), while current Eclipse Chamber play/replay is verified at 100×. Salmon deliberately requires current known replay costs, so historical different-cost replays may fail readably. Live Engine profile validation, physical-device performance/touch, audible mute, and publisher naming/originality decisions remain separate checks.

## Immutable release binding

Canonical manifest: [release-manifest-20261028.json](release-manifest-20261028.json), SHA-256 `a045c2a3a54130f2249bb5f265e1d076710f568f63eea8750bcb88b2666faf38`. The following exact archives are bound by the tested frontend/math identities:

| Archive                    |      Bytes | SHA-256                                                            |
| -------------------------- | ---------: | ------------------------------------------------------------------ |
| `lunar-vault-frontend.zip` |  7,209,618 | `4d7465d8a42eeb87c57305516cc80a28ce52e2c0ff7f43de091ec4fcecb15c80` |
| `lunar-vault-math.zip`     | 75,340,368 | `ee973f629c69250cd944b1101e28632ea6f1fe32e890eecf45a98593b3a94218` |
| `lunar-vault-media.zip`    |  8,313,982 | `87c118d030b6188dba3af7a07334b6ff7490211d5dfb4424c1aa94c098e3c419` |
| `salmon-run-frontend.zip`  |  1,997,476 | `423c81f28a9b640d39dd9f1ffd7b495f6bdab2fe7475e52cadbf45601d6e39ab` |
| `salmon-run-math.zip`      | 42,517,941 | `c4f8cdf891731077399c27e5eab3b24c48c0698aa9361ae1c20e7d4ccf9f7448` |
| `salmon-run-media.zip`     |  8,047,061 | `48c740dbcc4657fcb8afa54cfdc5a782b3996492e362d9a0902ec2f43cd15aba` |

Current generated frontend files:

| File                                                              | SHA-256                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `apps/lunar-vault/build/_app/immutable/bundle.BjI8IWMl.js`        | `e4f8fddf3e03f2196a8137ce90b68d6298d2326c4c62fadc6cefd0053ae2901b` |
| `apps/lunar-vault/build/_app/immutable/assets/style.BAOjlYup.css` | `89f03bc93e0adfa82470523062803bdf40b14b2db8f67959a0359d5d9d31c8c6` |
| `apps/salmon-run/dist/assets/index-DkyT2mbV.css`                  | `8805d49993c6d28850eee6d02f6ef667ba4745f6071371c692be4c287f5419fd` |
| `apps/salmon-run/dist/assets/index-B1VPVeVk.js`                   | `9c5d215ee975a1a7c578659622e876dd1cfd745d6be013799df778c3e1df22c9` |

## Raw results and log hashes

| Run            | Committed raw JSON                                                                           | Raw JSON SHA-256                                                   | Log SHA-256                                                        |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| main           | [browser-results-main-20261028.json](browser-results-main-20261028.json)                     | `fdd6b4e36faecc70e2d411c07fa4b11d3ba3fd89cbd4fcbf6fcbf254771c27ea` | `4c0cc0b6c97ebccb2d7fe2dc10deaa7cdd77d99479e63bade8b98d6fd7975e22` |
| lunar-followup | [browser-results-lunar-followup-20261028.json](browser-results-lunar-followup-20261028.json) | `ddad0877cb52d69240b44a65975bebf26efa22cfb8ac4d30bcd483a7ec8ef130` | `8810205cfda5dad090198630a4fbef3fec64021058fb3a3164a8e7178014e3e0` |
| salmon-final   | [browser-results-salmon-final-20261028.json](browser-results-salmon-final-20261028.json)     | `df6741a47e897d5ee29f4c01cf089ed5a8c979c5361aac19f9a88d54abf75e08` | `6cf1a791b0f79aa034346ba0279ed14a19c59f281b014512399e96efcfd783fb` |

Logs are retained in `/tmp/lunar-qa-recovery-20261028/`: `final-headless-qa.log`, `lunar-contract-followup.log`, `salmon-final.log`, and `fresh-unit-final.log`. The canonical JSON also records all 79 case identities, latest run/status, archive/build hashes and screenshot hashes.

## Selected successful captures

| Evidence                                                 | Screenshot                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Lunar running retrigger 400×225                          | [lunar-feature-400x225.png](screenshots/20261028/lunar-feature-400x225.png)               |
| Lunar running retrigger 800×450                          | [lunar-feature-800x450.png](screenshots/20261028/lunar-feature-800x450.png)               |
| Lunar running retrigger 425×812                          | [lunar-feature-425x812.png](screenshots/20261028/lunar-feature-425x812.png)               |
| Lunar running retrigger 1024×576                         | [lunar-feature-1024x576.png](screenshots/20261028/lunar-feature-1024x576.png)             |
| Salmon running feature 425×812                           | [salmon-feature-425x812.png](screenshots/20261028/salmon-feature-425x812.png)             |
| Salmon running feature 800×450                           | [salmon-feature-800x450.png](screenshots/20261028/salmon-feature-800x450.png)             |
| Salmon running feature 1024×576                          | [salmon-feature-1024x576.png](screenshots/20261028/salmon-feature-1024x576.png)           |
| Salmon running feature 400×225                           | [salmon-feature-400x225.png](screenshots/20261028/salmon-feature-400x225.png)             |
| Lunar computed 100× confirmation and reachable mute      | [lunar-confirmation-total.png](screenshots/20261028/lunar-confirmation-total.png)         |
| Lunar running feature replay at 400×225                  | [lunar-feature-replay-400x225.png](screenshots/20261028/lunar-feature-replay-400x225.png) |
| Lunar feature completion with bounded count-up precision | [lunar-feature-completion.png](screenshots/20261028/lunar-feature-completion.png)         |
| Salmon authoritative fish collection                     | [salmon-collection.png](screenshots/20261028/salmon-collection.png)                       |
