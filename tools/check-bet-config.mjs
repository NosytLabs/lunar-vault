#!/usr/bin/env node
/**
 * Engine guideline [242] and [187] — bet configuration from the RGS.
 *
 * The opening bet, the bet levels and the active round's amount must all
 * come from the authenticate response. A hardcoded default fails the review.
 *
 * Checks:
 *   1. defaultBetLevel is read from the authenticate response.
 *   2. It is stored in stateConfig.
 *   3. It is applied to the bet amount when there is no active round.
 *   4. An active round's amount wins over the default (guideline [187]).
 *   5. The mock RGS returns a defaultBetLevel that is NOT 1, so a
 *      hardcoded default is observable in QA.
 *   6. No hardcoded betAmount default remains in stateBet.
 */

import { readFileSync } from 'node:fs';

let failures = 0;
const check = (name, ok, detail = '') => {
	if (ok) {
		console.log(`  PASS  ${name}`);
	} else {
		failures++;
		console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
	}
};

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

console.log('Engine bet-configuration checks [242] [187]\n');

const auth = read('packages/components-shared/src/components/Authenticate.svelte');
const config = read('packages/state-shared/src/stateConfig.svelte.ts');
const stateBet = read('packages/state-shared/src/stateBet.svelte.ts');
const mock = read('tools/mock-rgs.py');
const schema = read('packages/rgs-fetcher/src/schema.ts');

check('defaultBetLevel is in the RGS schema', schema.includes('defaultBetLevel'));
check(
	'Authenticate reads defaultBetLevel from the authenticate response',
	/defaultBetLevel/.test(auth),
	'no defaultBetLevel reference in Authenticate.svelte',
);
check(
	'stateConfig holds defaultBetLevel',
	config.includes('defaultBetLevel'),
	'not declared in stateConfig.svelte.ts',
);
check(
	'the default is applied to the bet amount',
	/stateBet\.betAmount\s*=\s*stateConfig\.defaultBetLevel/.test(auth),
	'stateBet.betAmount is never set from stateConfig.defaultBetLevel',
);
check(
	'an active round suppresses the default (guideline [187])',
	/hasActiveRound/.test(auth) && /if\s*\(\s*!hasActiveRound/.test(auth),
	'the default is applied even when a round is active',
);
check(
	'the active round amount is restored from the authenticate response',
	/authenticateData\.round\.amount/.test(auth),
	'the active round amount is never read',
);
check(
	'no hardcoded betAmount default in stateBet',
	!/betAmount:\s*1\b/.test(stateBet),
	'stateBet still initialises betAmount to a literal 1',
);
check(
	'the mock RGS returns a defaultBetLevel',
	/"defaultBetLevel"/.test(mock),
	'the mock RGS does not exercise the default',
);

const mockDefault = mock.match(/"defaultBetLevel":\s*([0-9]+)\s*\*\s*API_AMOUNT_MULTIPLIER/);
check(
	'the mock default is not 1, so a hardcoded default would be visible',
	Boolean(mockDefault) && mockDefault[1] !== '1',
	mockDefault ? `mock default is ${mockDefault[1]}` : 'could not parse the mock default',
);

console.log('');
if (failures) {
	console.log(`${failures} bet-configuration check(s) failed.`);
	process.exit(1);
}
console.log('All bet-configuration checks passed.');
