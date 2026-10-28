import test from 'node:test';
import assert from 'node:assert/strict';
import {
	formatCurrencyAmount,
	formatCurrencyCountUp,
} from '../../packages/utils-shared/formatCurrency.ts';

test('animated ordinary awards do not grow six artificial decimal places', () => {
	assert.equal(formatCurrencyCountUp(1.117365, 1.43, 'USD'), '$1.11');
	assert.equal(formatCurrencyCountUp(817.865432, 1200, 'JPY'), '¥817');
	assert.equal(formatCurrencyCountUp(1.117365, 1.43, 'XSC'), '1.11 SC');
	assert.equal(formatCurrencyCountUp(1.117365, 1.43, 'XGC'), '1.11 GC');
});

test('exact final sub-cent and fractional-native awards are retained', () => {
	for (const [value, currency, expected] of [
		[0.001, 'USD', '$0.001'],
		[0.9045, 'USD', '$0.9045'],
		[1.234567, 'EUR', '€1.234567'],
		[0.01, 'JPY', '¥0.01'],
		[0.123, 'KWD', 'KD0.123'],
	]) {
		assert.equal(formatCurrencyCountUp(value, value, currency), expected);
		assert.equal(formatCurrencyAmount(value, currency), expected);
	}
});

test('intermediate display never overshoots the award or becomes negative', () => {
	assert.equal(formatCurrencyCountUp(9, 1.43, 'USD'), '$1.43');
	assert.equal(formatCurrencyCountUp(-1, 1.43, 'USD'), '$0.00');
	assert.equal(formatCurrencyCountUp(0.0019999, 0.002, 'USD'), '$0.001');
	assert.equal(formatCurrencyCountUp(0, 0, 'USD'), '$0.00');
});

test('invalid animation values stay visibly invalid', () => {
	assert.equal(formatCurrencyCountUp(NaN, 1, 'USD'), '—');
	assert.equal(formatCurrencyCountUp(1, Infinity, 'USD'), '—');
});
