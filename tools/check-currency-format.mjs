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
 * Engine guideline [273] additionally requires that a sub-cent amount is not
 * rounded away: 0.005 must not become 0.01, and 0.001 must not become 0.00.
 *
 * This script has no dependencies and no build step. It extracts the real
 * formatter from packages/utils-shared/amount.ts so the assertions test the
 * code the game actually uses, not a hand-written copy that can drift.
 * Run it with: node tools/check-currency-format.mjs
 */
import { readFileSync } from 'node:fs';

const source = readFileSync(
	new URL('../packages/utils-shared/amount.ts', import.meta.url),
	'utf8',
);

/**
 * Extract a function body from the real source by brace matching, and strip
 * the TypeScript-only annotations so it can be evaluated as JavaScript.
 *
 * The type stripping has to be context aware: inside an object literal
 * `minimumFractionDigits: currencyDecimals` is a property assignment, not a
 * type annotation. Only a parameter list and a return position are stripped.
 */
const stripTypes = (code) => {
	// Return type: "): number =>" / "): string {".
	let out = code.replace(/(\))\s*:\s*[A-Za-z_$][\w$<>[\]|.,\s]*?(?=\s*=>|\s*\{)/g, '$1');

	// Parameter types, only inside the parameter list of a function.
	out = out.replace(/\(([^()]*)\)/g, (match, params) => {
		const cleaned = params.replace(
			/([A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$]*(?:<[^<>]*>)?(?:\[\])?(?=\s*[,=]|\s*$)/g,
			'$1',
		);
		return `(${cleaned})`;
	});

	return out;
};

const extract = (name) => {
	const start = source.indexOf(`const ${name}`);
	if (start === -1) throw new Error(`${name} not found in amount.ts`);
	let depth = 0;
	let seenBody = false;
	for (let i = source.indexOf('{', start); i < source.length; i++) {
		if (source[i] === '{') {
			depth++;
			seenBody = true;
		} else if (source[i] === '}') {
			depth--;
			if (seenBody && depth === 0) {
				return stripTypes(source.slice(start, i + 1));
			}
		}
	}
	throw new Error(`unterminated ${name}`);
};

const decimalsForValue = extract('decimalsForValue');
const numberToCurrencyString = extract('numberToCurrencyString');

const NO_LOCALISATION_CURRENCY_MAP = { XGC: 'GC', XSC: 'SC' };
const CURRENCY_DECIMALS_MAP = { XGC: 2, XSC: 2 };

const getCurrencyDecimals = (currency) => {
	if (currency in CURRENCY_DECIMALS_MAP) return CURRENCY_DECIMALS_MAP[currency];
	// ISO currencies: use the Intl default for the currency.
	return new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions()
		.maximumFractionDigits;
};

// Build a callable from the real source.
const factory = new Function(
	'stateBet',
	'stateI18n',
	'NO_LOCALISATION_CURRENCY_MAP',
	'getCurrencyDecimals',
	'numberToFloat',
	`${decimalsForValue}
	${numberToCurrencyString}
	return numberToCurrencyString;`,
);

const makeFormatter = (currency) =>
	factory(
		{ currency },
		{
			i18n: {
				number: (value, options) => new Intl.NumberFormat('en-US', options).format(value),
			},
		},
		NO_LOCALISATION_CURRENCY_MAP,
		getCurrencyDecimals,
		(value) => Number.parseFloat(`${value}`),
	);

let failures = 0;
const check = (label, actual, expected) => {
	const ok = actual === expected;
	if (!ok) failures++;
	console.log(
		`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `   (expected ${expected}, got ${actual})`}`,
	);
};

console.log('Engine currency table');
for (const [currency, value, expected] of [
	['USD', 10, '$10.00'],
	['EUR', 10, '€10.00'],
	['CAD', 10, 'CA$10.00'],
	['MXN', 10, 'MX$10.00'],
	['JPY', 10, '¥10'],
	['XSC', 10, '10.00 SC'],
	['XGC', 10, '10.00 GC'],
]) {
	check(
		`${currency.padEnd(4)} ${value} -> ${expected}`,
		makeFormatter(currency)(value),
		expected,
	);
}

console.log('\nSocial currencies must never carry a "$"');
for (const currency of ['XSC', 'XGC']) {
	const actual = makeFormatter(currency)(10);
	const ok = !actual.includes('$');
	if (!ok) failures++;
	console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${currency.padEnd(4)} ${actual} contains no "$"`);
}

console.log('\nZero-decimal currency must not gain decimals');
check('JPY 1234 -> ¥1,234', makeFormatter('JPY')(1234), '¥1,234');
check('JPY 10 -> ¥10', makeFormatter('JPY')(10), '¥10');

console.log('\n[273] A sub-cent amount must not be rounded away');
check('USD 0.005 keeps its precision', makeFormatter('USD')(0.005), '$0.005');
check('USD 0.001 keeps its precision', makeFormatter('USD')(0.001), '$0.001');
check('USD 0.01 is unchanged', makeFormatter('USD')(0.01), '$0.01');
check('JPY 0.5 keeps its precision', makeFormatter('JPY')(0.5), '¥0.5');
check('XSC 0.005 keeps its precision', makeFormatter('XSC')(0.005), '0.005 SC');

console.log('\nOrdinary amounts keep the currency default');
check('USD 0.1 -> $0.10', makeFormatter('USD')(0.1), '$0.10');
check('USD 1 -> $1.00', makeFormatter('USD')(1), '$1.00');
check('EUR 1234.5 -> €1,234.50', makeFormatter('EUR')(1234.5), '€1,234.50');

console.log('');
if (failures) {
	console.log(`${failures} currency check(s) failed.`);
	process.exit(1);
}
console.log('All currency format checks passed.');
