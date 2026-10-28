# Browser QA — UI/UX acceptance review

Date: 2026-10-28. Runtime source: 7810f66931341a8a94489df469bf653b564a87fe.

## Result

All **117 distinct scenarios have a passing latest result: 79 Lunar Vault and 38 Salmon Run**. This is a main run plus a targeted follow-up, not a claim of one clean 117-case run.

| Run | Passed | Failed / timed out | Skipped | Duration |
| --- | ---: | ---: | ---: | ---: |
| Main 117-case acceptance | 115 | 2 | 0 | 999.37 s |
| Eight focused presentation/dialog scenarios after harness corrections | 8 | 0 | 0 | 117.93 s |

Both runs report no runner-level errors. The main phone-rotation case exceeded the 45-second overall budget after its containment, overlap, zero-play and no-error assertions completed successfully. Trace events show two individual protocol geometry reads taking 7.39 and 12.54 seconds. The follow-up batches the same presentation rectangles into one browser evaluation. Its two dense dialog cases use the lighter trace-off, failure-screenshot-only configuration that previously passed, after a recorded INFO run reached its last assertion with Menu already active. All focus, scrolling, Space, Escape, geometry and no-play assertions and the 45-second limit are preserved. These are test-harness changes only; game source, builds and package bytes remain frozen. Both main timeouts are preserved in the raw report and the [portrait diagnosis](portrait-timeout-ui-20261028.json) and [INFO diagnosis](info-timeout-ui-20261028.json).

The [canonical case index](browser-ui-results-20261028.json) retains every main/follow-up result. Raw reports: [main](browser-ui-main-20261028.json), [follow-up](browser-ui-followup-20261028.json). Raw logs and executable runner configurations are adjacent to these records. The earlier 100-case review at runtime bc9a8111f95cb46c6364603ef2cc29cc2854b465 remains historical evidence for that earlier source.

## Environment and execution

Production static builds were served at http://127.0.0.1:4173/ (Lunar) and http://127.0.0.1:4174/ (Salmon). Browser launches used existing Chromium 134.0.6998.35, one worker, with RGS requests intercepted at https://rgs.invalid/. Sessions, amounts and balances were fixtures. Real publication books supplied loss, win, feature, retrigger, recovery and replay events; no live wallet or real wagering was used. No dependencies were installed.

Both games were exercised at 1024×576, 800×450, 400×225 and touch-enabled 425×812. After-play captures show an actual base:loss publication and the resulting session net, then the rules screen. Feature/retrigger, collection, confirmation and small replay scenarios add their own screenshots. Source and the exact package manifest bind the results; a later report-only or test-helper commit does not change the tested game bytes.

## Changed behavior covered

- Lunar menu opens by keyboard and pointer, exposes its expanded state, closes on Escape and restores focus.
- Named native dialogs contain focus, expose keyboard-scrollable content, preserve safe Space handling, restore Menu and keep a named close and master sound control.
- Three sound sliders have distinct names and respond to Home/ArrowRight; changes do not send a play request.
- A 400×225 feature confirmation keeps 100×, the base amount, full amount and Confirm reachable without a request on opening.
- Missing features, feature amount limits and insufficient full-cost balance give distinct explanations.
- Lunar frame bounds remain above the control rail and clear of side disclosures at 400×225 and 800×450 after a real publication loss. Required disclosures remain visible on phone and compact layouts.
- Salmon guide/confirmation focus, Escape, native modality, disclosure contrast and feature-feedback cases pass. Its native dialog may move focus to browser chrome while the game remains inert; this is not treated as background-control access.
- Existing session, currency, sub-cent, replay, social wording, recovery, checkpoint, settlement, request cost, mute access and held-Space scenarios were rerun.

## Honest development history

The first layout candidate put Lunar's new horizontal disclosure strip over the bottom reel row at 400×225 and 800×450. The corrected sidebar then exposed a separate compact pointer bug: it painted above INFO in the open menu. Both were fixed before the current runtime freeze. The pointer failure log, source change and strengthened 400×225/425×812 checks remain recorded.

An earlier 17-case UX preflight passed before the final menu stacking fix; its JSON is [preserved as preflight history](browser-ui-preflight-20261028.json). Two strengthened pointer cases then passed on the current runtime ([pointer preflight](browser-ui-pointer-preflight-20261028.json)). Initial diagnostic list-only runs included ambiguous status selectors, a native BODY-focus assumption, startup timing and combined modal workloads. No raw JSON was fabricated for those earlier runs. Their diagnostic captures are not substituted for final-build evidence.

## Screenshots and package binding

Current screenshot inventory: [hashes](browser-ui-screenshots-20261028.json), with 29 PNG files under screenshots/20261028-ui. The lead reviewer inspected compact Lunar after-play/rules, compact and portrait Salmon, and current feature/confirmation/replay captures. Local visual inspection and emulated touch do not certify actual iOS/Android hardware or frame pacing.

Manifest SHA-256: 0a97485051846e4fb3c7e645af855ed7630b899db26d943aef66b940e79d4c9d.

| Game | Frontend ZIP SHA-256 | Math ZIP SHA-256 |
| --- | --- | --- |
| Lunar Vault | 5c36b14ef4f70cafd1ab08553586949204bf23fcbb4c56ed81be0e4109460cfb | ee973f629c69250cd944b1101e28632ea6f1fe32e890eecf45a98593b3a94218 |
| Salmon Run | 5c03f2cc558892342bd15f7de9571dbdc16b274f25cfe0b61fd022c9d30131e5 | c4f8cdf891731077399c27e5eab3b24c48c0698aa9361ae1c20e7d4ccf9f7448 |

The math and media archives are unchanged from the prior release; current validation still passes asset checks and verifies every packaged entry. Retained exhaustive math and unit evidence remains attributed to its earlier checks. This browser report establishes local engineering evidence only. Engine staging, matched independent math review, native-device behavior, audible mute, title/originality, rights and listing approval remain separate requirements.
