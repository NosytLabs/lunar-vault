# Salmon Run

An original five-reel, three-row, twenty-line fishing slot from NosytLabs. Silver salmon, brass tackle and Canadian headwaters frame the River Run collection feature. Its native Svelte 5 / Vite reel player is separate from Lunar Vault's Svelte/PixiJS Engine SDK frontend; both use the shared Engine request adapter.

This application is part of the repository's current review candidate. Use the [root approval review](../../docs/quality/engine-approval-fix-review-20261028.md), [current QA and release evidence bindings](../../docs/release-evidence.json), and [package manifest](../../docs/quality/release-manifest-20261028.json) for release decisions. Follow the browser report referenced by the evidence record for actual run results and limitations. Do not substitute the dated app self-check or a historical test count for fresh evidence. Engine/Stake approval is not claimed.

## Build and play locally

Use Node 22.16.0 or newer, pinned pnpm 10.5.0 and the checked-in lockfile. The preview and math tools support **Python 3.12+ with the `zstandard` package**, or **Python 3.14+ with standard-library `compression.zstd`**. `tools/python-runner.mjs` selects a compatible executable; set `SALMON_PYTHON` if it is not discoverable on PATH. The static production frontend itself does not require Python.

From the repository root:

```sh
pnpm install --frozen-lockfile
npm --prefix apps/salmon-run run build
npm --prefix apps/salmon-run run preview
```

Open <http://127.0.0.1:4174/>. The loopback preview creates a temporary wallet and supplies explicit launch parameters. It selects from the checked-in weighted books. All balances are local test data, and sessions live only in memory: after restarting the server, open its root URL for a fresh session. This developer wallet must not be deployed as a service.

For a static launch without the developer wallet:

```sh
python3 tools/serve-static.py --directory apps/salmon-run/dist --port 4174
```

Supply a valid Engine launch URL. A plain static server does not create sessions or outcomes.

## Outcome and wallet contract

The production `dist/index.html` requires an explicit `rgs_url` and `sessionID`, or replay parameters. It contains no local outcome generator or automatic RGS fallback.

- Authentication supplies amounts, min/max/step/default, the documented playable-mode array, per-mode costs and maxima, currency, restrictions and an optional active round. Unknown, duplicate or invalid mode entries and mismatched costs fail clearly. Known optional modes may be omitted; an unavailable mode cannot start a new play.
- `/wallet/play` supplies the complete event book and authoritative balance. Every landing comes from its `reveal` board. Reel filler is deterministic visual travel; Stop changes presentation speed only.
- `winInfo` carries monetary awards; `setTotalWin` and `finalWin` reconcile the display. `collectFish` updates progression without adding an award twice.
- Active rounds record the next unpresented event after each completed event and settle once with `/wallet/end-round`. Closed rounds and replays do not send extra settlement requests. Recovery retains the original amount, board, awards and counters without another debit; a valid already-started feature can be recovered even when it is no longer offered for new play.
- Replay uses only `/bet/replay/...`, displays the selected base amount, authoritative mode multiplier and full total, and repeats the same book without wallet traffic.
- Pointer, keyboard and feature actions check validated availability, maximum and full-cost affordability. Space leaves native selectors, editable fields, buttons and dialogs to their own controls.

## River Run and mathematical values

Base play costs **1×** the selected base amount. Direct River Run entry costs **20×**, displays the full total and requires confirmation. Availability depends on the authenticated mode list, amount limits, balance and jurisdiction restrictions.

Twenty left-to-right lines award their highest qualifying 3–5 symbol combination. Wild substitutes for ordinary symbols and has its own symbol table. Three/four/five-or-more River arches trigger six/eight/ten free casts; retriggers add two casts up to twelve total. Direct entry starts six casts.

During River Run, at least one Wild collects all visible fish once; extra Wilds do not repeat the collection. Fish show 1×, 2×, 3×, 5×, 10× or 20× values. After collecting three fish, future collections use 2×; after six fish, 3×. Each collection uses the stage multiplier active before progression advances. Line awards remain additive.

The [matching math package](../../math/salmon-run/README.md) defines 100,000 distinct positive-weight books per mode and an exact weighted RTP of **96.50% per mode**. Maxima are **101.5× for base** and **155.6× for River Run**, both measured against the selected base amount. River Run's maximum is therefore **7.78× its full 20× entry amount**. These figures describe the finite published distribution, not a larger hypothetical headline maximum. Independent local recomputation and platform acceptance remain distinct; use the root review and release gates for their actual status.

## Presentation, assets and controls

The current set uses six ordinary/scatter `*-v5.webp` symbols, `salmon-v4.webp`, `wild-v4.webp`, the quiet `river-mist-v3.webp` base environment and `headwaters-v4.webp` feature environment. Current generated PNG originals, runtime identities, export records and licences are documented in the [root asset provenance](../../docs/ASSET-PROVENANCE.md), [sprite identity manifest](../../docs/assets/generated-art-recovered-20261028.json) and [media identity manifest](../../docs/assets/studio-media-recovered-20261028.json). The app's older [provenance note](PROVENANCE.md) is retained as iteration history.

Reels travel and stop in stages onto the server board. Fish sprites fly to the supplied Wild collector before the authoritative award receipt appears. The feature strip shows casts, collected fish and the active 1×/2×/3× stage. Compact layouts reserve readable feature/session labels and a separate mute target; portrait play retains the controls and feature count.

The field guide explains player rules, awards and controls. Less motion replaces reel travel and collection flights with a still presentation, also following the device preference. Fast reels shortens permitted presentation; Stop accelerates it where allowed. Master mute is accessible during motion and in dialogs. Engineering review and certification status belong in the repository's release documentation. A DEMO badge identifies the explicitly requested local preview.

Authenticated restrictions control Space, Stop, Fast reels and direct feature entry. Required RTP, net-position-since-open and time-open displays use the available local session context and authoritative balances. **Absent/zero `minimumRoundDuration` is supported; a positive value currently fails with a clear unsupported-profile message.** The official public schema and SDK do not establish its units or timing anchor. Confirm the intended Engine profile before release, and implement positive timing only after authoritative semantics are available.

## Verification and release evidence

From the repository root after building:

```sh
node tools/python-runner.mjs math/salmon-run/verify.py
node tools/python-runner.mjs -m unittest discover -s math/salmon-run -p test_math.py
npm run test:session
npm run test:publication
npm --prefix apps/salmon-run test
```

The browser suite exercises current mode arrays/subsets and limits, native currency precision, full-cost guards, recovery/checkpoint ordering, replay isolation and errors, protected keyboard input, mute access, ordered reel stops, authoritative collection and running feature layouts. Required viewport evidence includes 1024×576, 800×450, 400×225 and touch/mobile 425×812. Actual pass counts, failures, inspected captures and test-environment limitations are recorded by the [current QA binding](../../docs/release-evidence.json) and [root approval review](../../docs/quality/engine-approval-fix-review-20261028.md); this README does not predeclare the result of an in-progress run.

The [2026-10-26 app self-check](ENGINE-SELF-CHECK-2026-10-26.md) is historical and superseded. Real Engine staging, supported jurisdiction profiles, naming/originality/rights clearance, physical-device listening/touch review, Studio media acceptance and final platform approval require their own evidence. The [release schema and gates](../../docs/release-schema-v2.md) keep local consistency separate from those independent requirements. See [Studio setup and listing copy](../../media/STUDIO-SETUP.md) for the prepared editable media.
