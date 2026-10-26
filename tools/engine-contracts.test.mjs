import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrencyAmount } from '../packages/utils-shared/formatCurrency.ts';
import { rgsEndpoint } from '../packages/rgs-fetcher/src/endpoint.ts';
test('fiat currencies use their native precision and unambiguous symbols', () => {
	for (const [code, expected] of Object.entries({
		USD: '$10.00',
		EUR: '€10.00',
		CAD: 'CA$10.00',
		MXN: 'MX$10.00',
		JPY: '¥10',
	}))
		assert.equal(formatCurrencyAmount(10, code), expected);
});
test('sub-cent and fractional awards retain all wallet precision', () => {
	assert.equal(formatCurrencyAmount(0.005, 'USD'), '$0.005');
	assert.equal(formatCurrencyAmount(1.005, 'USD'), '$1.005');
	assert.equal(formatCurrencyAmount(0.000001, 'EUR'), '€0.000001');
});
test('social amounts use suffixes and no dollar symbol', () => {
	assert.equal(formatCurrencyAmount(10, 'XSC'), '10.00 SC');
	assert.equal(formatCurrencyAmount(10, 'XGC'), '10.00 GC');
	assert.equal(formatCurrencyAmount(0.005, 'XSC'), '0.005 SC');
});
test('Engine-specific currency symbols, three decimals and IDR zero decimals are preserved', () => {
	for (const [code, expected] of Object.entries({
		IDR: 'Rp10',
		KWD: 'KD10.000',
		TND: '10.000 TND',
		CNY: 'CN¥10.00',
		SGD: 'SG$10.00',
		XOF: '10 CFA',
		XEC: '10.00 SC',
	}))
		assert.equal(formatCurrencyAmount(10, code), expected);
});
test('unknown currency codes remain visible rather than being relabelled as dollars', () => {
	assert.equal(formatCurrencyAmount(10, 'XYZ'), '10.00 XYZ');
});
test('RGS address supports bare hosts and explicit HTTPS without host fallback', () => {
	assert.equal(
		rgsEndpoint('rgs.example.com', '/wallet/play'),
		'https://rgs.example.com/wallet/play',
	);
	assert.equal(
		rgsEndpoint('https://rgs.example.com/', '/wallet/play'),
		'https://rgs.example.com/wallet/play',
	);
	assert.equal(
		rgsEndpoint('http://127.0.0.1:4174', '/wallet/play'),
		'http://127.0.0.1:4174/wallet/play',
	);
	assert.throws(() => rgsEndpoint('', '/wallet/play'));
	assert.throws(() => rgsEndpoint('http://example.com', '/wallet/play'));
});
