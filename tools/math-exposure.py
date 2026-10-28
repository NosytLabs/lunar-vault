"""Derive submission-risk statistics from the exact published weighted CSVs.

This is local engineering evidence, not an Engine rating or certification.
Both base-relative and full-cost-relative statistics are supplied explicitly.
"""
from pathlib import Path
from fractions import Fraction
import csv
import hashlib
import json
import math

ROOT = Path(__file__).resolve().parents[1]
result = {
    'date': '2026-10-28',
    'source': 'https://studio.engine.io/docs/approval-guidelines/math-verification',
    'status': 'independently recomputed local statistics; Engine rating pending',
    'etlDefinition': 'Expected tail payout divided by full mode cost; RTP share is also supplied separately to avoid an ambiguous normalization.',
    'games': {},
}
csv_rows = []
for game in ['lunar-vault', 'salmon-run']:
    directory = ROOT / 'math' / game / 'publish_files'
    index = json.loads((directory / 'index.json').read_text())
    modes = {}
    for mode in index['modes']:
        cost = Fraction(str(mode['cost']))
        records = list(csv.reader((directory / mode['weights']).open()))
        rows = [(int(row[0]), int(row[1]), int(row[2])) for row in records]
        assert len({row[0] for row in rows}) == len(rows)
        assert all(weight > 0 and payout >= 0 for _, weight, payout in rows)
        weight_sum = sum(weight for _, weight, _ in rows)
        mean = Fraction(sum(weight * payout for _, weight, payout in rows), weight_sum * 100)
        second = Fraction(sum(weight * payout * payout for _, weight, payout in rows), weight_sum * 10000)
        std_base = math.sqrt(float(second - mean * mean))
        maximum = max(payout for _, _, payout in rows)
        maximum_probability = Fraction(sum(weight for _, weight, payout in rows if payout == maximum), weight_sum)
        positive_probability = Fraction(sum(weight for _, weight, payout in rows if payout > 0), weight_sum)
        remaining = Fraction(weight_sum, 1000)
        tail_sum = Fraction(0)
        for _, weight, payout in sorted(rows, key=lambda row: row[2], reverse=True):
            take = min(remaining, weight)
            tail_sum += take * payout / 100
            remaining -= take
            if not remaining:
                break
        cvar = tail_sum / Fraction(weight_sum, 1000)
        etl = {}
        for threshold in [40, 10000]:
            contribution = Fraction(sum(weight * payout for _, weight, payout in rows if payout > threshold * cost * 100), weight_sum * 100)
            etl[str(threshold)] = {
                'baseRelativeExpectedPayout': float(contribution),
                'fullCostRelativeExpectedPayout': float(contribution / cost),
                'fractionOfModeRtp': float(contribution / mean),
            }
        tails = {str(threshold): float(Fraction(sum(weight for _, weight, payout in rows if payout >= threshold * 100), weight_sum)) for threshold in [5000, 10000, 25000, 50000, 100000]}
        entry = {
            'mode': mode['name'], 'cost': float(cost),
            'positiveWeightBooks': len(rows), 'totalWeight': weight_sum,
            'rtpExactFraction': str(mean / cost), 'rtp': float(mean / cost),
            'anyAwardProbability': float(positive_probability),
            'maximumPerBase': maximum / 100,
            'maximumPerFullCost': float(Fraction(maximum, 100) / cost),
            'maximumProbabilityExact': str(maximum_probability),
            'maximumProbability': float(maximum_probability),
            'maximumOneIn': float(1 / maximum_probability),
            'largestBookProbability': max(weight for _, weight, _ in rows) / weight_sum,
            'standardDeviationPerBase': std_base,
            'standardDeviationPerFullCost': std_base / float(cost),
            'cvarWorstPointOnePercentPerBase': float(cvar),
            'cvarWorstPointOnePercentPerFullCost': float(cvar / cost),
            'expectedTailLiability': etl, 'tailProbabilities': tails,
            'weightsSha256': hashlib.sha256((directory / mode['weights']).read_bytes()).hexdigest(),
            'eventsBytes': (directory / mode['events']).stat().st_size,
        }
        modes[mode['name']] = entry
        csv_rows.append({key: entry[key] for key in ['mode','cost','positiveWeightBooks','rtp','maximumPerBase','maximumPerFullCost','maximumProbability','maximumOneIn','standardDeviationPerBase','standardDeviationPerFullCost','cvarWorstPointOnePercentPerBase','cvarWorstPointOnePercentPerFullCost']} | {'game': game})
    checks = {
        'cheapestModeCostEqualsOne': min(item['cost'] for item in modes.values()) == 1,
        'allBaseStandardDeviationsAtLeastPointSix': all(item['standardDeviationPerFullCost'] >= 0.6 for item in modes.values() if item['cost'] == 1),
        'allRtpInBand96To96Point7': all(0.96 <= item['rtp'] <= 0.967 for item in modes.values()),
        'allMaximaAtMostOneMillionBase': all(item['maximumPerBase'] <= 1000000 for item in modes.values()),
        'allCostsAtMostFiftyThousand': all(item['cost'] <= 50000 for item in modes.values()),
        'atMostTwentyModes': len(modes) <= 20,
        'eventFilesWithin4Point2GB': all(item['eventsBytes'] <= 4200000000 for item in modes.values()),
        'booksWithinTenMillionPerMode': all(item['positiveWeightBooks'] <= 10000000 for item in modes.values()),
        'oneDollarBaseFitsEvenSixFailureTwoStarCaps': max(item['maximumPerBase'] for item in modes.values()) <= 100000 and max(item['cost'] for item in modes.values()) <= 5000,
    }
    assert all(checks.values()), (game, checks)
    result['games'][game] = {'modes': modes, 'localCriticalChecks': checks, 'rating': 'Not assigned; verify Studio analysis and its bet-level template.'}
out = ROOT / 'docs' / 'quality'
(out / 'math-exposure-20261028.json').write_text(json.dumps(result, indent=2) + '\n')
with (out / 'math-exposure-20261028.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=['game'] + [key for key in csv_rows[0] if key != 'game'])
    writer.writeheader()
    writer.writerows(csv_rows)
print(json.dumps({game: {'criticalChecks': all(data['localCriticalChecks'].values()), 'modes': {name: {'maximumOneIn': round(mode['maximumOneIn'], 2), 'rtp': mode['rtp'], 'etlAbove40FullCost': mode['expectedTailLiability']['40']['fullCostRelativeExpectedPayout']} for name, mode in data['modes'].items()}} for game, data in result['games'].items()}, indent=2))
