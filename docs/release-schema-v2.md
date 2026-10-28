# Release packages and evidence schema 2

The release tools check local consistency and whether explicitly supplied evidence is bound to the packaged versions. They do not create certifications, submit an approval, establish ownership or replace Engine/publisher/human decisions.

## Commands and order

1. Freeze both app sources, shared runtime sources, current production builds, verified math publications and curated media.
2. Run `python3 tools/package-release.py --check`. This is read-only and validates both apps. It performs the original-art/reference checks, compares each public runtime asset with its built counterpart, checks publication hashes and computes exact weighted RTP and maxima from each game's own CSVs.
3. After the release owner confirms the freeze, run `python3 tools/package-release.py --output ../release-20261028`. `--game lunar-vault` or `--game salmon-run` can select one game; omit it for both. A final two-game gate requires both games in one manifest.
4. Populate the root-owned `docs/release-evidence.json` using the exact ZIP hashes from `release-manifest.json` and actual reviewed browser results. Do not change a missing external check to verified based on a local build or script pass.
5. Run `node tools/release-gate.mjs --local --manifest ../release-20261028/release-manifest.json`. A pass covers current packaged bytes and the recorded local browser evidence only.
6. Run `node tools/release-gate.mjs --manifest ../release-20261028/release-manifest.json` to check the eight additional independent gates separately for each game. An incomplete external record deliberately blocks this command.

The gate also accepts `--evidence PATH`. The packager also accepts `--check --verify-manifest PATH` to inspect existing ZIP contents against current files. Its `--check --json` emits the machine-readable current records without writing packages. Release output must be outside the repository. The default is its sibling `release-20261028` directory.

## ZIP contents and reproducibility

Each game produces these three archives:

| Archive | Root and contents |
| --- | --- |
| `<game>-frontend.zip` | Contents of `apps/lunar-vault/build` or `apps/salmon-run/dist`, with `index.html` directly at ZIP root. |
| `<game>-math.zip` | Only `index.json` plus its referenced event-book and lookup CSV files from `math/<game>/publish_files`. Reports and generator sources are referenced in the manifest rather than mixed into Engine publication files. |
| `<game>-media.zip` | All accepted public files under `media/<game>`, including the foreground and wide/portrait editor background layers, plus common `STUDIO-SETUP.md` and every public `media/studio/` wordmark, font licence and README file at `studio/`. |

Entry names are sorted, timestamps are fixed at 1980-01-01 00:00:00, permissions are fixed to regular mode 0644, and entries use ZIP_STORED without host-dependent compression. There are no directory entries, archive comments, repository checkouts, credentials, private dotfiles, browser screenshots, traces or test reports. Media/editor files must each be strictly smaller than 10,000,000 bytes. Unexpected file types, private paths and symbolic links fail instead of silently disappearing from an archive.

The frontend check rejects graph-unreachable generated hashed JS/CSS as well as missing root `index.html`, retired assets listed in the retirement manifest, known SDK runtime directories/audio, logo placeholders and the inherited external sample font. It also requires current public/static files to match built bytes. The original-art and asset-reference checks must pass before any ZIP is written.

Math validation compares the publication's mode names and costs to the current config and report; verifies the report's event/CSV SHA256 hashes; requires zero verifier errors; and reconciles CSV counts, positive integer weights, sequential IDs, total weights, exact rational RTP and maxima to the report and verification record. It enforces the local numeric limits including RTP range, 1× base mode, base deviation, maximum cost and maximum award. This does **not** rerun exhaustive decoding of every book. The completed exhaustive verifier evidence remains a separately reviewed source report.

An unchanged input produces identical archive bytes. The packager checks source bytes again after writing each archive to detect changes during packaging. Re-run the package and compare archive SHA256 values when validating reproducibility.

## Package manifest

`release-manifest.json` uses `schemaVersion: 2` and contains:

- `sharedSource`: ordered source-file records and `directorySha256` for shared packages and root dependency manifests.
- `games.<game>.source`: ordered app source/config records and their directory digest.
- `games.<game>.frontend`, `.math`, `.media`: source directory, ordered `files`, `directorySha256` and an `archive` record containing ZIP filename, byte size, SHA256, format and file count.
- Every file record: `path`, `bytes`, `sha256`. Archive file paths are relative to the corresponding archive root. Source/report paths are relative to the repository. Shared media entries also include `source`, a repository-relative input path, while their `path` remains the intended ZIP entry name.
- `.math.modes`: exact RTP fraction, cost, book count, total weight, maximum multiplier and zero error count for each mode.
- `.math.reports`: file records for that game's `config.json`, `report.json`, and `verification.json`.
- `games.<game>.frontendSha256` and `.mathSha256`: the **ZIP SHA256 hashes**, matching their archive records. These bind approval records to distributable artifacts rather than an ambiguous source directory.

`directorySha256` hashes UTF-8 JSON of the ordered file-record array using sorted object keys, compact separators, ASCII escapes and no trailing newline. The release gate recomputes current source, directory and report records and checks every archive's actual size and hash. It also opens the ZIPs and hashes every entry against the current public files, rejecting duplicate, extra, missing or stale entries. Changed sources, assets, reports, build output or archives invalidate the recorded package binding.

## Evidence document

The evidence file is maintained by the release owner. Its required structure is:

```json
{
  "schemaVersion": 2,
  "games": {
    "lunar-vault": {
      "frontendSha256": "<actual frontend ZIP SHA256>",
      "mathSha256": "<actual math ZIP SHA256>",
      "local": {
        "browser": {
          "status": "missing",
          "report": "<actual local report path, relative to repository or absolute>",
          "reviewer": "<person or agent who reviewed the local evidence>",
          "frontendSha256": "<actual frontend ZIP SHA256>",
          "mathSha256": "<actual math ZIP SHA256>",
          "results": { "passed": 0, "failed": 0 },
          "viewports": ["400x225", "800x450", "1024x576", "425x812"],
          "touch": false
        }
      },
      "checks": {
        "matchedMath": { "status": "missing" },
        "engineStaging": { "status": "missing" },
        "activeRoundRecovery": { "status": "missing" },
        "replay": { "status": "missing" },
        "jurisdiction": { "status": "missing" },
        "assetRights": { "status": "missing" },
        "studioMedia": { "status": "missing" },
        "engineApproval": { "status": "missing" }
      }
    },
    "salmon-run": {
      "frontendSha256": "<actual frontend ZIP SHA256>",
      "mathSha256": "<actual math ZIP SHA256>",
      "local": { "browser": { "status": "missing" } },
      "checks": {
        "matchedMath": { "status": "missing" },
        "engineStaging": { "status": "missing" },
        "activeRoundRecovery": { "status": "missing" },
        "replay": { "status": "missing" },
        "jurisdiction": { "status": "missing" },
        "assetRights": { "status": "missing" },
        "studioMedia": { "status": "missing" },
        "engineApproval": { "status": "missing" }
      }
    }
  }
}
```

This example is intentionally incomplete and cannot pass. Repeat the complete browser structure for Salmon Run when actual evidence is available.

A local browser record passes only with `status: "verified"`, a named reviewer, an existing local report, exact package hashes, a positive integer `results.passed`, zero `results.failed`, all four after-play viewport entries and `touch: true`. These fields must describe inspected results; resizing alone does not establish touch, and initial-load screenshots do not establish feature/playback geometry. A report can optionally include `reportSha256`, which is checked against the local file. The gate checks the explicit recorded results and report existence; it cannot infer truth from prose or establish that a reviewer actually inspected the report.

Each of the eight independent checks additionally requires all these fields:

```json
{
  "status": "verified",
  "independent": true,
  "report": "<actual independent local report or HTTPS issuer reference>",
  "reviewer": "<independent reviewer or issuing authority>",
  "frontendSha256": "<matching frontend ZIP SHA256>",
  "mathSha256": "<matching math ZIP SHA256>"
}
```

The additional `independent` field is a declaration to audit, never a self-issued certification. Leave it absent and leave the status missing/pending if no independent evidence exists. Local consistency, mock-wallet playback and generated artwork do not establish live staging acceptance, rights clearance, human listening/originality judgments or Engine approval. HTTPS report references are recorded but not authenticated by this offline gate. A full gate pass means all required records are present and hash-bound; verify them with their issuers before submission or distribution.

## Root visual-review correction

The root reviewer found that Salmon Run’s original 400×225 after-play bounds checks passed while its 5–6px feature/session labels remained unreadable and the board was unnecessarily small. The compact CSS now reserves readable 9px session text, 10px feature labels/multipliers and 8px minor labels, uses the available track width, and removes the duplicate feature status line to recover board height. The compact regression checks computed font sizes, board width and separation from the mute control in addition to geometry. This correction requires the rebuilt Salmon frontend and fresh after-play viewport/replay evidence before packaging; it is a concrete visual-review fix, not a discretionary redesign.

## Derived build cleanup

Mirrored workspaces can restore old hashed JS/CSS files after a clean Vite build. `python3 tools/package-release.py --prune-generated` performs the separately authorized cleanup and exits without packaging. Use `--game salmon-run` or `--game lunar-vault` to limit it. It reports every kept path and every removed path with bytes and SHA256 as JSON on stdout; save that output as release engineering evidence. Only the known generated `assets/index-<hash>.js/css` and `_app/immutable/bundle.<hash>.js` / `assets/style.<hash>.css` filename classes are eligible. The current index and graph-reachable references, plus CSS whose exact bytes are inlined in the index, determine what stays. Source files, static/media assets and unrecognized filenames are never pruned. Run this only after the final build has completed. Validation rejects remaining orphan generated files instead of silently packaging them.
