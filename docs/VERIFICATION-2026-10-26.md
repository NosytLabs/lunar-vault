# Frontend verification — 2026-10-26

Inspected `main` at `ee51b01a07adad4a8d8ce57f589d0206391aea4e` and draft PR #2 at `579bf2076d2c8e2987fe7d77fed867356d761861` before continuing on its existing `feat/original-celestial-art-ux` branch. The Svelte/PixiJS SDK architecture, book playback and RGS state machine remain in place.

## Automated evidence

- Production TurboRepo build: passed; static output includes root `index.html` (about 5.7 MiB including generated audio).
- Original-art smoke check: passed, 20 SVG textures plus the painted observatory WebP.
- Asset-reference audit: 20 checks, no missing references.
- Browser regression suite: 14 tests, with screenshots and an HTML report produced by `pnpm run test:viewport`.
- Whitespace/error-marker check: `git diff --check` passed.
- Submission evidence gate: deliberately blocked, exit 1, with ten missing/out-of-range conditions. This is not a release approval check that has passed.

The browser suite uses the real production frontend with intercepted local HTTP fixtures. It covers:

1. Visible controls and no document overflow at 1280×720, 1024×576, 800×450, 400×225, 425×812, 768×1024 and 800×800; each layout can start a supplied losing round.
2. Server default play amount, lowercase base mode and USD request payload; inactive losses cause no end-round request.
3. A supplied win settles once; pressing outside a control and releasing inside does not start a round; rules/paytable render once and block Space. Dialog headings start in view and the last paytable row is reachable by scrolling.
4. Disabled Space, turbo, autoplay, feature and slam-stop controls; autoplay cancellation remains available when slam-stop alone is disabled.
5. One implemented feature option, readable phone card text, social wording and XSC display; no external asset requests on tested paths.
6. Active-round recovery without a new wager; replay and Play Again without wallet requests, with the replay action clear of the amount label.
7. A complete supplied twelve-spin feature, reduced-motion preference and portrait-to-landscape resizing, followed by one end-round request and an idle spin control.

Screenshots are reviewed for the seven layouts, rules/paytable, social feature menu, replay, feature intro and completed feature. CI uploads browser evidence for seven days and the static preview for three days.

## Limits and outstanding checks

Local execution uses macOS, Node 26.12.0, pnpm 10.5.0 and Playwright 1.64.1 Chromium. CI pins Ubuntu 24.04 and Node 22.16.0, downloading only Chromium's headless shell and using the runner's existing shared libraries/Latin fonts. Resizing a Chromium viewport is not physical-device, Safari or Firefox testing.

The first Linux CI run passed 12/14 checks. Its trace showed the combined win/dialog test reaching its last scroll assertion with less than four seconds of its original 45-second total budget left; that multi-step check now has a 90-second budget. The autoplay check now holds the first fixture response until cancellation is observed, so a completed round cannot race the click on slower runners. These are test synchronization changes; gameplay assertions remain in place.

The inherited lint command does not run under its ESLint 9 dependency: the repository still supplies legacy configuration instead of an `eslint.config.*` file. No clean lint result is claimed. Vite also reports the SDK's runtime-resolved static asset URLs during build; the browser network checks confirm those files resolve in the tested build.

No live Engine RGS session was available. These tests do not validate exhaustive interruptions, server-side duplicate settlement handling, a complete currency/jurisdiction matrix, minimum round duration, mathematical distributions, certified return, or production operator behavior. Sample 97% RTP, 5,000× maximum and 100× feature cost remain explicitly unverified. Matching certified math, independent reports, asset-rights signoff, Studio media and explicit Engine approval remain release blockers.

See [implementation status](ART-AND-ENGINE-STATUS.md), [asset provenance and exact generation prompt](ASSET-PROVENANCE.md), and [missing release evidence](release-evidence.json).
