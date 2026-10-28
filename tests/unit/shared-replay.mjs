import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import books from '../../apps/lunar-vault/src/stories/data/base_books.ts';
import bonus from '../../apps/lunar-vault/src/stories/data/bonus_books.ts';
import {
	validateReplayRound,
	validateRoundCheckpoint,
} from '../../packages/utils-shared/roundValidation.ts';
import { validateSlotBook } from '../../packages/utils-shared/slotBookValidation.ts';
const symbols = ['H1', 'H2', 'H3', 'H4', 'L1', 'L2', 'L3', 'L4', 'L5', 'W', 'S'];
const wrap = (book, amount = 100000) => ({
	state: book.events,
	amount,
	payoutMultiplier: book.payoutMultiplier,
	payout: Math.round(amount * book.payoutMultiplier),
	costMultiplier: 1,
});
test('real SDK loss win and feature fixtures validate before playback', () => {
	for (const book of [...books, ...bonus]) {
		const round = wrap(book);
		validateReplayRound(round);
		validateSlotBook(round.state, symbols);
	}
});
test('JSON service errors missing state invalid awards and mismatched multipliers fail before playback', () => {
	const good = wrap(books[0]);
	for (const bad of [
		{ error: 'ERR_VAL' },
		{},
		null,
		{ ...good, state: [] },
		{ ...good, payoutMultiplier: NaN },
		{ ...good, payoutMultiplier: 1 },
		{ ...good, costMultiplier: 0 },
		{ ...good, amount: -1 },
		{ ...good, payout: 1 },
		{ ...good, state: good.state.map((event, index) => ({ ...event, index: index + 1 })) },
	])
		assert.throws(() => validateReplayRound(bad), /invalid round/);
});
test('unknown event payloads invalid symbols and broken final totals fail before handlers access them', () => {
	for (const mutate of [
		(state) => (state[0].board[0][0].name = 'UNKNOWN'),
		(state) => (state[0].board = null),
		(state) => {
			state.splice(1, 0, { index: 1, type: 'unknown' });
			state.forEach((event, index) => (event.index = index));
		},
		(state) => (state.at(-1).amount = 1),
	]) {
		const state = structuredClone(books[0].events);
		mutate(state);
		assert.throws(() => validateSlotBook(state, symbols), /invalid presentation events/);
	}
});
test('recovery checkpoints accept next-event completion but never skip beyond the book', () => {
	assert.equal(validateRoundCheckpoint(null, 3), 0);
	assert.equal(validateRoundCheckpoint('3', 3), 3);
	for (const bad of ['-1', '1.5', '4', 'NaN', ''])
		assert.throws(() => validateRoundCheckpoint(bad, 3), /checkpoint/);
});
