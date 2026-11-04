#!/usr/bin/env node
/**
 * Verify the REAL socialText implementation, not a copy of it.
 *
 * The checker used to mirror socialText.ts by hand, which meant the two
 * could drift. This imports the actual source, strips the TypeScript-only
 * syntax and runs the real function, so the assertions below test the code
 * the game actually uses.
 */

import { readFileSync } from 'node:fs';

const source = readFileSync(
	new URL('../packages/state-shared/src/socialText.ts', import.meta.url),
	'utf8',
);

// The module has no imports; strip the TypeScript-only annotations so the
// body can be evaluated as plain JavaScript.
const body = source
	.replace(/^import[^\n]*$/gm, '')
	.replace(/^export type[^\n]*$/gm, '')
	// Variable-level annotations: "const SOCIAL_PHRASES: [string, string][] =".
	.replace(/^(\s*const\s+[A-Za-z_$][\w$]*)\s*:\s*[^=]+=/gm, '$1 =')
	// Parameter and return type annotations: "(value: string): string =>".
	.replace(/([A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$<>[\]|.,\s]*(?=\s*[,)=])/g, '$1')
	.replace(/:\s*[A-Za-z_$][\w$<>[\]|.,\s]*(?=\s*=>)/g, '')
	.replace(/:\s*[A-Za-z_$][\w$<>[\]|.,\s]*(?=\s*\{)/g, '')
	.replace(/:\s*[A-Za-z_$][\w$<>[\]|.,\s]*(?=\s*;)/g, '')
	.replace(/\s+as\s+[A-Za-z][A-Za-z0-9_]*/g, '')
	.replace(/\s+as\s+const/g, '')
	.replace(/export const /g, 'const ')
	.replace(/export function /g, 'function ')
	.replace(/^export\s*\{[^}]*\};?$/gm, '');

// eslint-disable-next-line no-new-func
const socialText = new Function(`${body}; return socialText;`)();

let failures = 0;
const check = (label, actual, expected) => {
	if (actual === expected) {
		console.log(`  PASS  ${label}`);
	} else {
		failures++;
		console.log(`  FAIL  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
	}
};

console.log('[225] The real socialText implementation rewrites restricted words\n');

check('PAYTABLE is rewritten', socialText('PAYTABLE', true), 'WIN TABLE');
check('paytable is rewritten', socialText('paytable', true), 'win table');
check('payout is rewritten', socialText('payout', true), 'win');
check('payouts are rewritten', socialText('payouts', true), 'wins');
check('BET is rewritten', socialText('BET', true), 'PLAY');
check('BUY BONUS is rewritten', socialText('BUY BONUS', true), 'GET BONUS');
check('AUTO SPIN is rewritten', socialText('AUTO SPIN', true), 'AUTO PLAY');
check('FREE SPINS is preserved', socialText('FREE SPINS', true), 'FREE SPINS');
check('WIN is preserved', socialText('WIN', true), 'WIN');
check('BALANCE is preserved', socialText('BALANCE', true), 'BALANCE');
check('social mode off changes nothing', socialText('BET', false), 'BET');

console.log('');
if (failures) {
	console.log(`${failures} real-implementation check(s) failed.`);
	process.exit(1);
}
console.log('All real-implementation social wording checks passed.');
