# Lunar Vault — NosytLabs Games

Lunar Vault is an **in-development 5×3, 20-payline celestial slot** built on the [Engine Web SDK](https://github.com/engineio/web-sdk) (Svelte 5, PixiJS 8, TurboRepo). The original reel art, observatory environment and game-shell UI are authored for NosytLabs Games.

**Status: visual integration candidate; NOT approved or ready for real-money launch.** The SDK-derived game still needs an Engine-compliant production math model, replacement of residual sample audio/effects, and complete RGS/replay, small-popout and social wording QA.

## Development

Requirements: Node 22.16.0, pnpm 10.5.0.

```bash
pnpm install --frozen-lockfile
pnpm run storybook --filter=lunar-vault
pnpm run dev --filter=lunar-vault
pnpm run build --filter=lunar-vault
python3 tools/audit-assets.py
python3 tools/verify-nosyt-assets.py
```

Without Engine launch credentials the regular dev game will show an authentication error, which is expected. For offline event playback use Storybook's sample-book stories under `MODE_BASE/book/random` and inspect the RGS event stream. These are **SDK sample outcomes**, not certified Lunar Vault math.

The uploadable static frontend is assembled from the SvelteKit prerendered page plus client assets. Do not include upstream `stake-engine-loader.gif` in the visible UI. Upload and test through the Engine Studio Developer page before any submission.

## What this project contains

- Engine Web SDK event player, wallet integration, base and bonus UI state and replay infrastructure.
- An original **16-asset** local art family in `apps/lunar-vault/static/assets/nosyt/`: twelve 264px reel symbols, normal and feature backdrops, portrait and wide lobby artwork.
- Original background transition, custom framed 5×3 reel viewport, pulse/bounce win and landing animations, feature and win screens.
- The Studio-independent test `tools/verify-nosyt-assets.py` hashes all 16 art files and verifies the bindings and disabled SDK-branded loader.
- Cost-capped pull-request build and asset validation under `.github/workflows/lunar-vault-ci.yml`.
- A release/QA checklist in `docs/NOSYTLABS-RELEASE-PLAN.md`.

## Important blockers

1. **Math** — The inherited sample `apps/lunar-vault/src/game/config.ts` currently specifies RTP `0.97` and sample max-win and mode data. **Engine requires RTP 96.0%–96.70% per mode**, and the repo does not yet contain the matching certified `index.json`, lookup CSV and game-event `.jsonl.zst`. Never change the displayed RTP without regenerating and verifying the math.
2. **Residual sample assets** — Some original SDK audio, particle/font data and effects remain. Engine requires final original or appropriately licensed visual and audio material; complete the asset audit before asking for approval.
3. **RGS and replay** — Authenticate, interrupted-round recovery, end-round only on active wins, balance and bet levels, multiple currencies, replay with no session, and social wording require real Studio developer-session testing.
4. **Responsive** — Inspect and screenshot 1024×576, 800×450, 400×225 and 425×812, including a bonus or win sequence. Source changes are not a substitute for a real visual pass.
5. **Studio submission** — Set up studio/provider account, publish matching math and frontend versions, prepare the tile in Studio Media Editor, select distribution and payment, then submit to human review.

A separate **standalone prototype** made earlier in this conversation uses a **different 10-line paytable and event model**. Its math and RTP cannot be loaded into this 20-line SDK fork unchanged.

Official references: [Engine docs](https://studio.engine.io/docs), [Approval](https://studio.engine.io/docs/approval-guidelines), [Math](https://studio.engine.io/docs/approval-guidelines/math-verification), [AI review](https://studio.engine.io/docs/ai-review), [Distribution](https://studio.engine.io/docs/distribution), [Payments](https://studio.engine.io/docs/payments).

## Credits

Original art direction and authored graphic assets: NosytLabs Games. Upstream SDK scaffold: engineio/web-sdk (see upstream license). All third-party sample material is provisional until removed or cleared for publication.
