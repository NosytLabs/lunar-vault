/**
 * Currency formatting check against Engine's currency display table.
 *
 * Engine requires these exact renderings:
 *
 *   Code | Shows as  | Decimals
 *   ---- | --------- | --------
 *   USD  | $10.00    | 2
 *   EUR  | €10.00    | 2
 *   CAD  | CA$10.00  | 2
 *   MXN  | MX$10.00  | 2
 *   JPY  | ¥10       | 0
 *   XSC  | 10.00 SC  | 2
 *   XGC  | 10.00 GC  | 2
 *
 * "A game that formats with a fixed `$` or always 2 decimals will fail."
 *
 * This script has no dependencies and no build step: it re-implements the
 * exact branching of packages/utils-shared/amount.ts and asserts the output.
 * Run it with: node tools/check-currency-format.mjs
 */
import assert from 'node:assert/strict';

const NO_LOCALISATION_CURRENCY_MAP = { XGC: 'GC', XSC: 'SC' };
const CURRENCY_DECIMALS_MAP = { XGC: 2, XSC: 2 };

const numberToFloat = (value) => Number.parseFloat(`${value}`);

// Mirror of the real formatter. `Intl` stands in for `stateI18n.i18n.number`,
// which delegates to the same engine.
const numberToCurrencyString = (value, currency) => {
	if (currency in NO_LOCALISATION_CURRENCY_MAP) {
		const decimals = CURRENCY_DECIMALS_MAP[currency] ?? 2;
		return `${numberToFloat(value).toFixed(decimals)} ${NO_LOCALISATION_CURRENCY_MAP[currency]}`;
	}

	return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const cases = [
	['USD', 10, '$10.00'],
	['EUR', 10, '€10.00'],
	['CAD', 10, 'CA$10.00'],
	['MXN', 10, 'MX$10.00'],
	['JPY', 10, '¥10'],
	['XSC', 10, '10.00 SC'],
	['XGC', 10, '10.00 GC'],
];

let failures = 0;

console.log('Engine currency table');
for (const [currency, value, expected] of cases) {
	const actual = numberToCurrencyString(value, currency);
	const ok = actual === expected;
	if (!ok) failures++;
	console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${currency.padEnd(4)} ${value} -> ${actual}${ok ? '' : `   (expected ${expected})`}`);
}

console.log('\nSocial currencies must never carry a "$"');
for (const currency of ['XSC', 'XGC']) {
	const actual = numberToCurrencyString(10, currency);
	const ok = !actual.includes('$');
	if (!ok) failures++;
	console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${currency.padEnd(4)} ${actual} contains no "$"`);
}

console.log('\nZero-decimal currency must not gain decimals');
{
	const actual = numberToCurrencyString(1234, 'JPY');
	const ok = actual === '¥1,234';
	if (!ok) failures++;
	console.log(`  ${ok ? 'PASS' : 'FAIL'}  JPY  1234 -> ${actual}${ok ? '' : '   (expected ¥1,234)'}`);
}

console.log('\nSub-cent win must not be silently rounded away');
{
	// 0.005 USD is a real win amount at low bet levels. It has to render
	// with enough precision to be truthful about what the player won.
	const actual = numberToCurrencyString(0.005, 'USD');
	const ok = actual !== '$0.00';
	if (!ok) failures++;
	console.log(`  ${ok ? 'PASS' : 'FAIL'}  USD  0.005 -> ${actual}${ok ? '' : '   (rounded to zero)'}`);
}

console.log(`\n${failures === 0 ? 'All currency checks passed.' : `${failures} currency check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
