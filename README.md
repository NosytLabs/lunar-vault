# Nosyt games: Lunar Vault and Salmon Run

Two original slot frontends and their matching finite weighted math publications for Engine. This branch contains the art, animation, session/replay, layout and mathematical consistency fixes prepared on 2026-10-28. It is a review candidate; Engine/Stake approval is not claimed.

## Games

| Game | Frontend | Feature | Entry | Exact RTP | Maximum × selected base amount |
| --- | --- | --- | ---: | ---: | ---: |
| Lunar Vault | SvelteKit / Pixi / shared state machine | Eclipse Chamber | 100× | 96.50% in each mode | Base 287.4×; feature 654× |
| Salmon Run | Svelte / Vite / DOM animation | River Run | 20× | 96.50% in each mode | Base 101.5×; feature 155.6× |

There are 100,000 positive-weight books per mode. The feature maxima are **6.54× and 7.78× their respective full entry amounts**, not 654×/155.6× of that full amount. The math verifiers recompute awards and exact weighted return independently of the generators. Browser code does not determine a wallet outcome.

## Build and local preview

Use Node 22.16 or newer, pinned pnpm 10.5.0 and the checked-in lockfile. Install the locked workspace with `pnpm install --frozen-lockfile`. Math tooling supports Python 3.14+ standard-library Zstandard or Python 3.12+ with `zstandard`. Image export/check tooling uses Pillow and fontTools.

```sh
npm --prefix apps/lunar-vault run build
npm --prefix apps/salmon-run run build
python3 tools/serve-static.py --directory apps/lunar-vault/build --port 4173
```

Serve Salmon's static `dist` directory on 4174 in a separate terminal:

```sh
python3 tools/serve-static.py --directory apps/salmon-run/dist --port 4174
```

Both production frontends require an Engine launch URL with `rgs_url` and `sessionID`. There is no production fallback wallet. Automated tests intercept a loopback-served frontend's RGS requests and supply genuine published books; they never place real-money plays. `tools/serve-salmon.py` is a separately marked loopback-only development wallet, not a deployable service.

For development, Lunar's Vite port is 3001 and Salmon's is 3002. Use the app-local npm `dev` scripts. Use installed binaries or app npm scripts after dependency installation; a package-manager upgrade is not required to run a build.

## Verification

```sh
npm run check:assets
npm run test:publication
npm run verify:math
npm run audit:exposure
```

Lunar's prebuild synthesizes its local original sound sprite. Run `python3 tools/generate-audio.py` before an asset-only audit in a fresh checkout.

The new Lunar compressed publication streams are supplied in the separate math ZIP because of their size. Extract that ZIP into `math/lunar-vault/publish_files/` before exhaustive verification, or reproduce them with:

```sh
node tools/python-runner.mjs math/lunar-vault/generate.py --books 100000 --spins 20000000
```

Generation replaces the publication, fixtures and report; reverify and repackage afterward. Config, generator, verifier, regression tests, fixtures, CSVs and reports are maintained with the source. Existing Salmon publication streams remain in the repository. The game-specific math READMEs document rules, seeds, units and compression-version considerations.

Browser tests cover authenticated limits, currencies, recoveries/checkpoints, full-cost guards, replay isolation, asset failures, keyboard/modals and running features at 1024×576, 800×450, 400×225 and touch 425×812. The final evidence report records actual runs and their limitations. Historical or interrupted runs are not proof for a new build.

## Artwork and Studio media

The shipping symbol set has twenty transparent 512×512 WebP sprites. Original generated PNGs are retained under `art/`; runtime registrations use explicit versioned paths. Two feature environments, finished portrait tiles/wide covers, title-free editor backgrounds, transparent foregrounds and a white publisher wordmark are supplied. Twenty-three superseded runtime assets have been removed.

See [asset provenance](docs/ASSET-PROVENANCE.md), [current sprite identities](docs/assets/generated-art-recovered-20261028.json), [current media identities](docs/assets/studio-media-recovered-20261028.json) and [Studio setup/listing copy](media/STUDIO-SETUP.md). Historical artwork notes remain as history, not as a list of current files.

## Release packages

After sources, production builds, math and media are frozen and verified:

```sh
python3 tools/package-release.py --check
python3 tools/package-release.py --output ../release-20261028
python3 tools/package-release.py --check --verify-manifest ../release-20261028/release-manifest.json
node tools/release-gate.mjs --local
node tools/release-gate.mjs
```

Each game has a frontend ZIP, math ZIP and media ZIP. Archives have deterministic paths, timestamps and byte identities. `release-manifest.json` binds every entry to its source, app/shared source digests and exact math records. `docs/release-evidence.json` binds inspected browser evidence to those ZIPs. Changed sources or artifacts invalidate their bindings.

The local gate checks the prepared candidate. The default full gate remains blocked until actual Engine/live/human evidence is supplied separately for both games. See [schema and gate documentation](docs/release-schema-v2.md) and [the full approval review](docs/quality/engine-approval-fix-review-20261028.md). No script grants Engine approval, establishes naming/asset rights or accepts publisher licence terms.

Positive `minimumRoundDuration` requirements currently fail visibly because the official public schema does not define their units or timing semantics. Confirm the intended live jurisdiction profile before release. Available modes come from the authenticated server list: omitted features cannot start a new play, while a valid already-started round can still be recovered.

## Workspace recovery record

A prolonged connector interruption removed the local workspace before the first handoff completed. Original artwork was recovered byte for byte, math sources and streams were reproduced against recorded identities, and application changes were restored and tested again. GitHub checkpoints and final package persistence are part of this handoff. Only the final current review, manifest and browser results should be used for release decisions.
