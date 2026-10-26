# Salmon Run development math — development-2

This package defines a **finite weighted event-book distribution**. It is not a certified probability model or an Engine-approved game. Only Salmon Run uses it; Lunar Vault still has unmatched sample math.

## Reproduce and verify

Python 3.14+ supplies standard-library `compression.zstd`. The repository's Node helper selects a compatible Python executable (or `SALMON_PYTHON`). From the repository root:

```sh
node tools/python-runner.mjs math/salmon-run/generate.py --books 100000 --spins 20000000
node tools/python-runner.mjs math/salmon-run/verify.py
node tools/python-runner.mjs -m unittest discover -s math/salmon-run -p test_math.py
```

The first command replaces publication files/reports and takes several minutes. Candidate seed is 20261026; independent simulation seeds are 417400/417401. Zstandard encoding bytes can depend on the Python/zstd version, so compare decoded books and totals when moving runtimes and update hashes from regenerated output. `verify.py` never imports the generator/evaluator: it reconstructs awards independently and checks every event and lookup row.

## Distribution and calibration

`config.json` defines costs, paylines, paytable, proposal symbol weights, fish values and feature rules. `generate.py` proposes 100,000 complete outcomes per mode. Proposal-board frequencies **are not final gameplay odds**. The final distribution is the finite book set selected with integer CSV weights.

For payout `p` in hundredths and mode cost `c`, calibration splits books by the sign of `2p − 193c`. Let A be the sum of positive differences and B the absolute sum of negative differences. High books receive B/gcd(A,B), low books A/gcd(A,B); exact-target books receive the lower weight. All weights remain positive. The weighted difference sums to zero, giving exact RTP 193/200 without editing awards. This changes hit/feature/tail frequencies from the proposal model. The development model favours straightforward auditing; further commercial volatility tuning needs its own reviewed version.

`publish_files/index.json` references two Zstandard JSONL event streams and two integer CSV lookup tables. CSV columns are book ID, weight, payout in hundredths. Book/CSV position, ID, payout and event final totals agree. API round multipliers use the normalized ratio (book payout / 100); wallet amounts use integer millionths. Monetary amounts offered by the local preview are divisible by 10,000 wallet units, so this package's awards settle exactly there. Broad external fractional-amount policy remains an Engine integration check.

| Statistic | Base | River |
|---|---:|---:|
| Cost / selected base amount | 1× | 20× |
| Unique positive-weight books | 100,000 | 100,000 |
| Exact weighted RTP | 96.50% | 96.50% |
| 20M-draw simulated RTP | 96.5013445% | 96.4967989% |
| Simulation 95% interval | 96.4026132–96.6000758% | 96.4638148–96.5297830% |
| Standard deviation / cost | 2.258103 | 0.752679 |
| Any award probability | 53.689820% | 99.320933% |
| Feature entry probability | 1.754304% | 100% |
| Maximum / base amount | 101.5× | 155.6× |
| Largest single-book probability | 0.00199550% | 0.00512385% |
| Worst 0.1% mean exposure / base amount | 39.396750× | 113.357883× |

Both simulations fall within five standard errors of the exact target. Tails at 5,000× and above are zero because this finite pool's actual maxima are lower. No hypothetical larger maximum is advertised. The complete machine-readable statistics, seeds, hashes and tail values are in `report.json`; `verification.json` records the independent result. Sampling without replacement is not used: each server draw independently selects by the same weights.

## Independent audit coverage

`verify.py` recomputes all line candidates, leading Wild choices, position ordering, highest base award, line totals, fish values/collectors, pre-collection stage multiplier, collection ledger/progress order, feature entry/retrigger/counters/end, cumulative/final totals, integer weight limits, CSV alignment, exact rational RTP and publication hashes. Eight regression tests deliberately corrupt awards, scales, positions, counters, stages and event indices; one tests the leading-Wild edge. Golden browser fixtures are drawn directly from the generated books.

The community Stake skill event checker accepts six golden books with **0 errors / 14 warnings** (optional `setWin`, `enterBonus` and custom progression). All monetary awards now use standard `winInfo`; the custom event contains progress only. Its index checker returns **0 errors / 2 warnings** because it ignores official `events`/`weights` keys. Those warnings are not treated as proof of file correctness: our independent verifier checks the referenced files and every row. Official Engine documentation takes precedence over the community skill's older RTP range and event assumptions.

## Release boundary

This is local engineering evidence. Independent mathematical review/certification, the Engine exposure-report template and Studio math acceptance, live round recovery/replay, all jurisdictions/timing/currencies, legal/originality review, physical devices and final platform approval are not completed. No real-money launch, distribution, certification, approved game ID or registered version is asserted.

Official sources: [math verification](https://studio.engine.io/docs/approval-guidelines/math-verification), [publication format](https://studio.engine.io/docs/math/math-file-format), [RGS](https://studio.engine.io/docs/rgs), [replay](https://studio.engine.io/docs/approval-guidelines/game-replay-requirements).
