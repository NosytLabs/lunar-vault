# Salmon Run — development slot

An original five-reel, three-row, twenty-line fishing slot from NosytLabs. Silver salmon, brass tackle and copper dawn frame an upstream collection feature. The native Svelte 5 reel player is separate from Lunar Vault's preserved Svelte/PixiJS Engine SDK fork. Engine permits custom static frontends; both apps use the shared Engine request adapter.

## Play locally

Node 22.16.0, pnpm 10.5.0 and **Python 3.14+** are required. Python's standard-library Zstandard support reads the published books; no Python package install is required. Set `SALMON_PYTHON` if the executable is not on PATH.

```sh
pnpm install --frozen-lockfile
pnpm --filter salmon-run build
pnpm --filter salmon-run preview
```

Open <http://127.0.0.1:4174/>. The loopback preview server creates a temporary wallet and supplies explicit launch parameters. It draws from the checked-in weighted books. Spin plays a base round; River Run confirms a 20× feature cost. Sound, reduced motion, speed and the complete rules are in the field guide. All preview balances are local test data. The server holds sessions only in memory: after restarting it, open the root URL again for a fresh session. Never deploy this development server as a wallet.

## Outcome and wallet contract

The production `dist/index.html` is a static frontend. It requires an explicit `rgs_url` and `sessionID`, or replay parameters. It contains **no local outcome generator, scripted round loop or automatic RGS fallback**. The loopback server is a separate developer tool; a plain static server does not create sessions.

- Authentication supplies allowed amounts, min/max/step/default, per-mode cost/maximum, currency, restrictions and an optional active round. Mismatched known mode costs and recovered payout totals fail before play.
- `/wallet/play` supplies the complete event book and authoritative post-debit balance. Ordered `reveal` events drive five genuinely travelling strips; stopping accelerates presentation only.
- Every award is a `winInfo` entry. `setTotalWin`/`finalWin` reconcile the display; `collectFish` records river progression without awarding twice.
- Active rounds record the next unpresented event index after each completed event and settle once with `/wallet/end-round`. Closed zero-result rounds do not call progress/end-round. Recovery restores the displayed board, award and counters before continuing, without another debit or repeated feature entry.
- Replay uses only `/bet/replay/...`, shows base amount, mode cost and total cost, and can play the same book again without wallet traffic.
- Space, fast reels, Stop and River Run respect the corresponding authenticated restrictions. Master mute remains accessible during motion and in prompts. The complete jurisdiction/timing matrix is still a release gap; minimum-round-duration units have not been assumed.

## Rules and development math

Base play costs 1×; River mode costs 20×. Twenty left-to-right lines award their highest 3–5 symbol combination. Wild substitutes for ordinary symbols and has its own table. Three/four/five-or-more river arches trigger six/eight/ten casts; retriggers add two, capped at twelve total.

During the feature, one or more Wilds collect every visible fish once. Fish carry 1/2/3/5/10/20× values. After three collected fish, future collections use 2×; after six, 3×. The stage before a collection determines that collection's multiplier. Extra Wilds do not duplicate it. Line awards remain additive.

The checked-in [math package](../../math/salmon-run/README.md) has **100,000 distinct positively weighted books per mode**, exact **96.50%** weighted RTP per mode, a 20-million-draw simulation per mode and a separate evaluator checking all 200,000 books. The finite distribution's maxima are **101.5× base** and **155.6× River**, expressed against the selected base amount. These figures describe this exact development package. They are **not certification, Engine acceptance, or Lunar Vault's math**.

## Verification and review

```sh
node tools/python-runner.mjs math/salmon-run/verify.py
node tools/python-runner.mjs -m unittest discover -s math/salmon-run -p test_math.py
pnpm run test:contracts
pnpm --filter salmon-run test
```

Run the commands above from the repository root after building. **25 production Chromium checks** cover five viewports (1280×720, 1024×576, 800×450, 425×812, 400×225), primary 44px targets, local fonts/images, real strip motion and ordered stops, wallet settlement, zero results, feature confirmation, recovery, replay, currency/social text, restrictions, limits and failure screens. Six shared contract tests and eight independent math regression tests also pass. CI verifies the committed books rather than regenerating them. Local manual play also exercised actual weighted selection, three base spins and a complete feature.

See the [41-item Engine self-check](ENGINE-SELF-CHECK-2026-10-26.md) and [asset provenance](PROVENANCE.md). Live Engine sessions, replay IDs, broad jurisdiction/interruption testing, physical-device/audio review, independent math certification, Studio tile composition, rights review and Engine approval remain open. No distribution option or submission has been selected.

## Interface and feature pass

A quieter original river plate replaces the giant-fish/tackle poster. A small fish-outline wordmark, mixed-case title and one compact action rail remove promotional clutter. The portrait board is taller, with functional 44px controls; development details remain in the guide and a small DEMO badge identifies local play.

Reels begin moving while the request is pending, then accelerate, cruise and brake onto the supplied board in reel order. Waiting loops contain deterministic visual filler only. The new collection overlay moves the actual fish values to the supplied Wild collector before adding its recorded award. The feature strip shows cast count, collected fish and current 1×/2×/3× stage; stage transitions explain the multiplier for future collections. A normal-speed complete retriggered River book and delayed-server motion are covered by regression tests.
