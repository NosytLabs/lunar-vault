# NosytLabs Games — Lunar Vault art direction and publication gate

**Current status: pre-release SDK fork. Not approved for real-money publication.**

## Visual identity

- Studio name: **NosytLabs Games**
- Game: **Lunar Vault**
- Art direction: adult-oriented astronomical observatory; deep indigo stone, polished brass, sapphire/amber/violet gem highlights, etched astrolabe details and restrained lens-glow effects.
- Avoid childlike characters, trademarked casino themes, borrowed game sprites, misleading win imagery, and graphics that claim unsupported mechanics.
- Source art and export scripts must remain in version control. Spine atlas regions, trim/rotation flags and pivot points must match original skeletons; do not replace isolated atlas PNGs without checking animation bindings.
- Base, feature, mobile, mini-player, replay, rules and game tiles must use a coherent asset family.

## UX/animation acceptance

1. Reel strips and settle events are *visual*. The Engine book is authoritative; no front-end random value may alter wins.
2. Reel acceleration/deceleration, anticipation, symbol landing, winning lines, free-spin transitions and big wins must be deterministic from event playback.
3. Keep win labels and final amounts visible throughout fast play; offer full mute and respect motion reduction.
4. Render-test and screenshot 1024×576, 800×450, 400×225, 425×812. No clipped control, overlapping stake label, browser scroll or double-tap zoom.
5. Correctly recover a pending round through authenticate and settle active wins once; never end a zero-win inactive round.
6. Load replay without session calls, show the play amount and actual mode cost, and provide Play Again.
7. Social-mode text must use approved replacements everywhere, including in replay.
8. Validate currency display for USD, EUR, CAD, MXN, JPY, XSC and XGC and show exact sub-cent wins where needed.

## Math / release

This SDK fork does **not** contain an Engine-certified Lunar Vault math package. Its sample 20-line math and game events must match a newly generated math book before launch. Do not import the standalone 10-line prototype's outcome book into this repo as though it were compatible.

- RTP: **96.0–96.70% per mode**; minimum volatility standard deviation for 1.0× base modes: 0.6
- One `index.json`, one `lookUpTable_*.csv`, and one `.jsonl.zst` events file per mode.
- Verify every record, payout, transition and frame against the authoritative math; publish one matched frontend/math pair.
- Keep all assets local to the Engine-hosted static build.
- The official Studio tile editor must produce a 3:4 tile and a 16:9 cover.
- A human must sign off on copyright, jurisdiction, quality and game originality; Engine decides approval.

## Distribution decision

**Only on Stake:** 10% of actual GGR under Profit Share or 7.5% of expected GGR under Guaranteed. Eligible for wider Stake promotion if the game obtains its required ranking.

**Stake + Engine network:** 5% of actual GGR or 3.75% of expected GGR per operator. Operator acceptance is not guaranteed; distribution is fixed once live. This choice is separate from the team-wide payment model.

Sources: [Engine Web SDK](https://github.com/engineio/web-sdk), [publishing approval](https://studio.engine.io/docs/approval-guidelines), [math verification](https://studio.engine.io/docs/approval-guidelines/math-verification), [distribution](https://studio.engine.io/docs/distribution), [payments](https://studio.engine.io/docs/payments), [AI review](https://studio.engine.io/docs/ai-review).
