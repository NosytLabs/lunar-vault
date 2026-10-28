# Lunar Vault development math — development-1

This original, reproducible **finite weighted event-book distribution** supplies matching math for Lunar Vault. It is development engineering evidence, not independent certification or Engine approval. The prior 600 SDK story examples remain illustrations and do not define these odds.

## Reproduce

From the repository root, using Python 3.12+ with `zstandard` installed, or Python 3.14+ with standard-library `compression.zstd`:

```sh
node tools/python-runner.mjs math/lunar-vault/generate.py --books 100000 --spins 20000000
node tools/python-runner.mjs math/lunar-vault/verify.py
node tools/python-runner.mjs -m unittest discover -s math/lunar-vault -p test_math.py
```

Generation overwrites publication files, fixtures and reports. Candidate seeds are 20261028/20261029; independent simulation seeds are 718200/718201. Decoded event JSON and CSV are deterministic on the documented Python implementation. Zstandard binary bytes can change across runtimes; verify decoded contents and refresh file hashes after regenerating.

## Rules and units

The model preserves the existing frontend's five reels, three visible rows, twenty paylines, symbol identities and paytable. One padding symbol above/below the visible rows gives a 5×5 event board. Line positions use padded rows 1–3. Wins start at reel zero and continue left to right. Wilds substitute for ordinary symbols; Scatters do not pay lines. Each line first chooses the highest **unmultiplied** paytable award, including a shorter initial all-Wild run. A tied base award favors the regular symbol combination. Only Wild multipliers greater than one on the chosen combination are added; if none qualify, the line multiplier is one. Multipliers on symbols beyond the selected combination cannot increase the win. Global multiplier is one.

Three/four/five or more visible Scatters award 8/12/15 free spins. The purchased bonus costs 100 times the selected base amount and enters twelve free spins without a fabricated triggering board. A feature reveal with at least three visible Scatters adds four spins, capped at thirty total. Completed-spin counters never reset. This cap and retrigger increment are explicit new development-model parameters because the inherited illustration set did not define a bounded distribution. Wilds carry values from 1, 2, 3, 5 and 10 in both modes. Feature boards use the separate proposal weights in `config.json`; the **published CSV weights**, rather than these proposal frequencies, define final probabilities.

All event awards, `payoutMultiplier`, and CSV payouts are **integer hundredths of the selected base bet**, including purchased-mode rounds. The API multiplier is that value divided by 100; it is not divided by mode cost again. `baseGameWins` and `freeGameWins` are descriptive base-bet multiples and sum to `payoutMultiplier / 100`. Monetary runtime settlement uses the server's wallet result. No client-side evaluator awards money.

## Exact calibration and independent verification

For payout `p` in hundredths and mode cost `c`, split the finite candidate pool using `d = 2p − 193c`. Let A be the sum of positive d and B the absolute sum of negative d. Positive books receive weight B/gcd(A,B); negative books receive A/gcd(A,B). Exact-target books receive the lower weight. Thus the weighted sum of d is zero, and exact RTP is 193/200 = 96.5% for **each mode**. All books have positive integer weights and remain eligible for every independent draw. The implementation rejects a pool that does not bracket the target and rejects total weights outside uint64 range.

`verify.py` never imports the generator or line evaluator. Its separate candidate enumeration reconstructs all awards. A strict lifecycle parser consumes every reveal, win, total, trigger, counter, retrigger and feature end in order. It checks symbol flags and multiplier values, all position and line metadata, component and final totals, integer monetary fields, headerless uint64 CSV rows, row/ID/payout alignment, configured costs, exact rational RTP, actual maximum, volatility, hit/feature probabilities and publication hashes. Mutation regressions prove rejection of broken counters, missing feature ends, forged multiplier metadata, payout scaling, floating monetary fields and changed publication costs.

`report.json` records weighted and simulated statistics, confidence intervals, seeds, tail exposure and hashes. `verification.json` records the exhaustive independent result. `fixtures.json` contains representative complete books taken directly from the publication pool. Maximum wins are the largest **positive-weight book payouts**, not hypothetical unconstrained paytable combinations. The finite pool is the complete published distribution; unreached larger combinations have zero probability in this development version.

## Measured development distribution

| Statistic | Base | Bonus |
|---|---:|---:|
| Cost / selected base amount | 1× | 100× |
| Distinct positive-weight books | 100,000 | 100,000 |
| Exact weighted RTP | 96.50% | 96.50% |
| 20M-draw simulated RTP | 96.4881055% | 96.5179909% |
| Simulation 95% interval | 96.2998556–96.6763554% | 96.4853309–96.5506508% |
| Standard deviation / cost | 4.297855 | 0.744813 |
| Any-award probability | 40.4576241% | 99.9462458% |
| Feature-entry probability | 1.21341963% | 100% |
| Actual maximum / base amount | 287.4× | 654× |
| Actual maximum / mode cost | 287.4× | 6.54× |
| Worst 0.1% mean exposure / base amount | 87.763240× | 572.560391× |
| Largest single-book probability | 0.00284950% | 0.03582386% |

Both simulations lie within five standard errors of the exact target. All tail probabilities at 5,000× and higher are zero for this finite distribution. The 20M simulations are checks of the published weighted pool; they do not infer RTP from unweighted illustration books. The base standard deviation exceeds the documented 0.6 minimum guideline. That individual criterion does not establish acceptance.

## Release boundary

Commercial volatility/tail design, independent mathematical review and certification, Engine operator-risk and bet-level template analysis, Studio math acceptance, live integration/replay validation and final platform approval remain outside this engineering result. A 96.5% exact weighted mean and a passing local verifier do not establish approval. Do not advertise a 5,000× sample maximum or certification unless a future verified distribution and approval support it.

Official format and review references: [publication files](https://studio.engine.io/docs/math/math-file-format), [math verification](https://studio.engine.io/docs/approval-guidelines/math-verification), [RGS](https://studio.engine.io/docs/rgs), [replay](https://studio.engine.io/docs/approval-guidelines/game-replay-requirements).
