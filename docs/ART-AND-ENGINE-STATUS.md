# Lunar Vault implementation status — 2026-10-26

The canonical game remains the official Engine Web SDK fork in `apps/lunar-vault`: Svelte 5, PixiJS 8, the SDK event-book player and RGS request/state-machine flow. The client does not generate gambling outcomes.

## Presentation and interaction

- A new original painted observatory, orbital seal, star flare and precisely fitted reel frame join the original celestial symbols. Backgrounds cover the canvas at every tested aspect ratio.
- Symbol landing/win pulses and the orbital transition complete through the book event contract. Reduced motion suppresses symbol scaling and the transition. Strong effects accompany awards, not idle play.
- Game-owned rules and sample symbol values replace placeholder screens. Only `base` and `bonus` appear in the mode menu; inherited ante/super modes and their unsupported claims are removed from app metadata.
- Header, board, dialog and win-count sizing are corrected. Long rules/paytables scroll from their heading; phone feature cards use readable text and an original orbital seal. Popup content renders once. A dragged/released control no longer activates unless it was pressed on that control; dialogs block spin hotkeys.
- Server default bet levels and disabled space/turbo/autoplay/feature/slam-stop flags are respected by the affected controls. Social menus use play terminology and SDK XSC/XGC formatting.
- Replay has a Play Again control that reuses the supplied book, with no new wallet requests. Replay mode cost is displayed from the configured mode metadata.
- Unused sample Spine scenes, spritesheets, bitmap fonts and their runtime registrations are removed. Original WAV audio is reproducibly generated during build.

## Evidence boundary

`pnpm run test:viewport` runs the production build with **local intercepted HTTP fixtures**. It checks viewport bounds, input, SDK event completion, win/loss request behavior, resume, replay and selected restrictions. Screenshots are captured for visual review. These are frontend regression checks, not an Engine staging acceptance report, certified math simulation, complete jurisdiction matrix, device lab test or human art-rights review.

The inherited `config.ts` still says 0.97 RTP, 5,000× maximum and a 100× feature cost. These values are explicitly marked **unverified sample metadata**; no number was edited to imply compliance. The sample books are not a Lunar Vault math distribution. No real-money launch readiness is claimed.

See the dated [frontend verification report](VERIFICATION-2026-10-26.md) for test coverage, environment and remaining lint/device/live-RGS limitations.

`node tools/release-gate.mjs` intentionally exits 1. Adding a publish index or changing RTP alone cannot clear it. `docs/release-evidence.json` records missing independent reports for matched math, staging, recovery, replay, jurisdiction, asset rights, Studio media and Engine approval. A future verified entry needs a report reference, reviewer and both artifact SHA-256 values; the script does not verify the truth of those attestations or issue a certificate.

## Official requirements checked

- [Web SDK](https://github.com/engineio/web-sdk): static frontend build, ordered event books, RGS configuration, resume and replay paths.
- [General approval](https://studio.engine.io/docs/approval-guidelines): one frontend/math version pair is reviewed together; original design and final approval are required.
- [Math verification](https://studio.engine.io/docs/approval-guidelines/math-verification): every mode needs 96.0–96.7% RTP and the cheapest mode costs 1×; further distribution, volatility and operator-risk tests apply.
- [Jurisdiction requirements](https://studio.engine.io/docs/approval-guidelines/jurisdiction-requirements): social=true affects all player-facing copy, uses XSC/XGC and requires English. Local checks here cover selected paths only.

Still needed: matching certified Engine math, live staging and interruption/replay testing, full jurisdiction/currency matrix, human asset signoff, final 3:4 and 16:9 Studio tiles, AI/human review and explicit Engine approval.
