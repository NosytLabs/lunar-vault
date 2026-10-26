# Salmon Run — playable concept

An original adult fishing-slot presentation study from NosytLabs: a cold teal river at copper dawn, silver fish, brass tackle and a six-cast journey to the Headwaters. This app is separate from Lunar Vault and does not change its Svelte/PixiJS Engine SDK implementation.

## Play locally

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter salmon-run build
pnpm --filter salmon-run preview
```

Open `http://127.0.0.1:4174`. Use **Cast**, or **River Run** for a free feature preview. Space casts when no dialog/focused control is active. The field guide explains the sequence and offers reduced motion / demo-point refill. The build in `dist/` can be served by any ordinary static HTTP server; opening `index.html` directly through `file:` is not supported.

## Scope and outcome contract

This is **scripted concept play with demo points**, not a gambling/RGS integration, complete slot ruleset or Engine submission candidate. There is no random result generator, wallet, persistence, production math distribution, RTP claim, maximum-win promise or cash play. Local points reset on reload. All awards and highlighted positions come from the authored `src/books.ts` examples.

- Base sequence: quiet cast, five-reel example award (12× cast size), five-salmon trigger. It repeats deliberately; it is not a simulated probability model.
- River Run: six player-controlled casts, collecting 1/0/2/1/0/2 fish and supplied awards 2/0/4/3/0/6 × the locked cast size. Total 15×. New river stages are visual progression, not additional payout multipliers.
- Preview deducts no points. Base casts deduct the selected 1, 2 or 5 demo points. Awards settle exactly once after reveal. Stop accelerates presentation and never selects an outcome.
- State: idle → spinning → award → idle, with entry/completion dialogs at feature boundaries. Busy state locks size/menu/preview; native dialogs trap input. Reduced motion disables scrolling/scaling and shortens holds. Pending timers are resolved and cancelled on teardown.

Svelte 5 with native DOM/CSS reels keeps this early concept small and accessible to inspect. Future Engine work must replace the authored-example source with matching certified math and SDK event books, add authoritative wallet/recovery/replay and jurisdiction handling, and undergo all required approval. The concept does not inherit Lunar Vault's sample RTP or event schema by implication.

## Verification

`pnpm --filter salmon-run test` runs eight production-build Chromium tests: four viewports (1280×720, 800×450, 425×812, 400×225), all primary targets ≥44px, full six-cast settlement and base return, base trigger / locked size, modal keyboard safety and stop without duplicate debit/credit. Console/page errors fail tests; screenshots are captured and visually reviewed. Manual desktop playthrough also reviews the award and feature states.

These are local concept checks, not live Engine acceptance, full accessibility signoff, physical-device testing or math certification. See [art provenance](PROVENANCE.md).
