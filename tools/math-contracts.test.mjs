import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import config from '../apps/lunar-vault/src/game/config.ts';
import { auditRound } from './audit-books.mjs';
const root = path.resolve(import.meta.dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const math = read('math/lunar-vault/config.json');

test('Lunar frontend displays the exact published lines and paytable', () => {
	assert.deepEqual(Object.values(config.paylines), math.lines);
	assert.deepEqual(Object.keys(config.symbols).sort(), [...math.symbols].sort());
	for (const [name, table] of Object.entries(math.paytable)) {
		const frontend = Object.assign({}, ...config.symbols[name].paytable);
		for (const [count, hundredths] of Object.entries(table)) {
			assert.equal(Math.round(frontend[count] * 100), hundredths, `${name}/${count}`);
		}
	}
});

test('Lunar mode RTP, cost and actual maximum match the verified publication', () => {
	const report = read('math/lunar-vault/report.json');
	const verified = read('math/lunar-vault/verification.json');
	assert.equal(config.rtp, math.targetRtp);
	assert.deepEqual(Object.keys(config.betModes).sort(), Object.keys(math.modes).sort());
	for (const [mode, options] of Object.entries(math.modes)) {
		assert.equal(config.betModes[mode].cost, options.cost, mode);
		assert.equal(config.betModes[mode].rtp, math.targetRtp, mode);
		assert.equal(config.betModes[mode].max_win, report.modes[mode].maximumWinX, mode);
		assert.equal(report.modes[mode].maximumWinX, verified[mode].maximumWinX, mode);
		assert.equal(verified[mode].rtpFraction, '193/200', mode);
		assert.equal(verified[mode].verifiedBooks, report.modes[mode].books, mode);
		assert.equal(verified[mode].errors, 0, mode);
	}
});

test('both publication CSV files independently establish exact per-cost RTP and maxima', () => {
	for (const game of ['lunar-vault', 'salmon-run']) {
		const config = read(`math/${game}/config.json`);
		const index = read(`math/${game}/publish_files/index.json`);
		const report = read(`math/${game}/report.json`);
		assert.equal(index.modes.length, Object.keys(config.modes).length);
		for (const mode of index.modes) {
			assert.equal(mode.cost, config.modes[mode.name].cost);
			let totalWeight = 0n,
				weightedPayout = 0n,
				maximum = 0n;
			const rows = fs
				.readFileSync(path.join(root, `math/${game}/publish_files`, mode.weights), 'utf8')
				.trimEnd()
				.split('\n');
			for (const [position, row] of rows.entries()) {
				assert.match(row, /^\d+,\d+,\d+$/);
				const [id, weight, payout] = row.split(',').map(BigInt);
				assert.equal(id, BigInt(position));
				assert(weight > 0n && weight < 2n ** 64n);
				assert(payout >= 0n && payout < 2n ** 64n);
				totalWeight += weight;
				weightedPayout += weight * payout;
				if (payout > maximum) maximum = payout;
			}
			assert(totalWeight > 0n && totalWeight < 2n ** 64n);
			assert.equal(weightedPayout * 200n, totalWeight * 100n * BigInt(mode.cost) * 193n);
			assert.equal(Number(maximum) / 100, report.modes[mode.name].maximumWinX);
			assert.equal(rows.length, report.modes[mode.name].books);
		}
	}
});

test('published Lunar fixtures agree with the independent JavaScript sample evaluator', () => {
	const fixtures = read('math/lunar-vault/fixtures.json');
	for (const [key, published] of Object.entries(fixtures)) {
		const book = structuredClone(published);
		// The SDK illustration audit takes an X multiple; Engine publication uses integer hundredths.
		book.payoutMultiplier /= 100;
		const errors = auditRound(book, key.split(':')[0]).filter(
			(issue) => issue.severity === 'error',
		);
		assert.deepEqual(errors, [], key);
	}
});
