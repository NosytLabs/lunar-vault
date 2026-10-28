import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGameModes, canonicalModeName } from '../../packages/utils-shared/gameModes.ts';
const costs = { base: 1, bonus: 100 };
const config = [
	{ mode: 'BASE', costMultiplier: 1, maxBet: 1000000 },
	{ mode: 'BONUS', costMultiplier: 100, maxBet: 50000 },
];
test('documented wallet array preserves exact server mode and lower feature maximum', () => {
	const modes = normalizeGameModes(config, costs);
	assert.equal(modes[canonicalModeName('base')].mode, 'BASE');
	assert.equal(modes.bonus.maxBet, 50000);
	assert.equal(modes.bonus.costMultiplier, 100);
	assert.equal(modes[0], undefined);
});
test('invalid or incomplete advertised modes fail closed instead of using local limits', () => {
	for (const invalid of [
		undefined,
		{},
		{ base: config[0], bonus: config[1] },
		[],
		config.slice(0, 1),
		[config[0], { ...config[1], costMultiplier: 20 }],
		[config[0], { ...config[1], maxBet: NaN }],
		[config[0], { ...config[1], maxBet: 0 }],
		[config[0], { ...config[1], mode: 'base' }],
		[...config, { mode: 'unknown', costMultiplier: 1, maxBet: 10 }],
	])
		assert.throws(() => normalizeGameModes(invalid, costs), /mode configuration/);
});
