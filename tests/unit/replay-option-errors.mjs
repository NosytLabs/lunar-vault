import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrencyAmount } from '../../packages/utils-shared/formatCurrency.ts';
test('unrecognized authenticated currency codes remain readable without inherited metadata or relabeling', () => {
	for (const code of ['constructor', 'toString', '__proto__', 'ZZZ']) {
		assert.doesNotThrow(() => formatCurrencyAmount(1, code));
		assert.equal(formatCurrencyAmount(1, code), `1.00 ${code}`);
	}
});

import { replayAmount, replayCurrency } from '../../packages/utils-shared/replayOptions.ts';
import { gameErrorMessage } from '../../packages/utils-shared/gameErrorMessage.ts';
import {
	validateReplayRound,
	validateWalletRound,
} from '../../packages/utils-shared/roundValidation.ts';
import fs from 'node:fs';
const loss = JSON.parse(
	fs.readFileSync(new URL('../../math/lunar-vault/fixtures.json', import.meta.url)),
)['base:loss'];
const recorded = { state: loss.events, payoutMultiplier: loss.payoutMultiplier / 100 };
test('invalid optional replay amounts default while valid micro-unit amounts are preserved', () => {
	for (const raw of [null, '', 'abc', '0', '-1', 'NaN', 'Infinity', '1.5', '9007199254740992'])
		assert.equal(replayAmount(raw), 1000000);
	for (const [raw, expected] of [
		['1', 1],
		['5000000', 5000000],
		['9007199254740991', 9007199254740991],
	])
		assert.equal(replayAmount(raw), expected);
});
test('optional replay currency rejects inherited and unknown names while supported currencies retain their symbols', () => {
	for (const raw of [null, '', 'constructor', 'toString', '__proto__', 'ZZZ'])
		assert.equal(replayCurrency(raw), 'USD');
	for (const [code, expected] of [
		['USD', '$1.00'],
		['EUR', '€1.00'],
		['CAD', 'CA$1.00'],
		['MXN', 'MX$1.00'],
		['JPY', '¥1'],
		['XSC', '1.00 SC'],
		['XGC', '1.00 GC'],
	]) {
		assert.equal(replayCurrency(code), code);
		assert.equal(formatCurrencyAmount(1, code), expected);
	}
});
test('only own whitelisted service codes select guidance; raw server detail cannot become visible', () => {
	assert.match(
		gameErrorMessage({ error: 'ERR_VAL', message: 'RAW SECRET' }),
		/Open a valid launch link/,
	);
	for (const code of ['constructor', 'toString', '__proto__', 'UNKNOWN', 42, null])
		assert.equal(
			gameErrorMessage({ error: code, message: 'RAW SECRET' }),
			'Connection interrupted. Reload to recover any unfinished round.',
		);
});
test('recorded replay cost is required and positive while historical authoritative costs are retained', () => {
	for (const cost of [undefined, null, 0, -1, NaN, Infinity, '1'])
		assert.throws(
			() => validateReplayRound({ ...recorded, costMultiplier: cost }),
			/invalid round/,
		);
	for (const cost of [0.5, 1, 42, 100])
		assert.equal(validateReplayRound({ ...recorded, costMultiplier: cost }).costMultiplier, cost);
});
test('unfinished wallet rounds do not require a replay-only cost field', () => {
	assert.equal(validateWalletRound({ ...recorded, amount: 1000000, payout: 0 }).state, loss.events);
});
