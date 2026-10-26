import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditRound, auditProvidedBooks, evaluateLine } from './audit-books.mjs';
import books from '../apps/lunar-vault/src/stories/data/base_books.ts';
const copy = (id) => structuredClone(books.find((b) => b.id === id));
test('higher base wild award is chosen before symbol multipliers, and W1 does not add', () => {
	assert.equal(
		evaluateLine([
			{ name: 'W', multiplier: 1 },
			{ name: 'W', multiplier: 1 },
			{ name: 'W', multiplier: 1 },
			{ name: 'L5' },
			{ name: 'W', multiplier: 10 },
		]),
		500,
	);
});
test('supplied totals pass and do not produce a fabricated RTP estimate', () => {
	const report = auditProvidedBooks();
	assert.equal(report.errors, 0);
	assert.equal(report.theoreticalRtp, null);
	assert.equal(report.simulatedRtp, null);
	assert.equal(report.warnings, 15);
});
test('terminal unit mismatch is detected', () => {
	const book = copy(2);
	book.events.at(-1).amount *= 10000;
	assert(auditRound(book, 'base').some((f) => f.code === 'terminal-total'));
});
test('paytable/multiplier mismatch is detected independently of terminal totals', () => {
	const book = copy(2);
	book.events.find((e) => e.type === 'winInfo').wins[0].meta.multiplier = 100;
	assert(auditRound(book, 'base').some((f) => f.code === 'paytable-multiplier'));
});
test('a skipped event index is detected', () => {
	const book = copy(2);
	book.events[1].index = 99;
	assert(auditRound(book, 'base').some((f) => f.code === 'event-index'));
});
test('an unsupported event cannot silently pass the audit', () => {
	const book = copy(1);
	book.events[0].type = 'inventedFeature';
	assert(auditRound(book, 'base').some((f) => f.code === 'unhandled-event'));
});
test('incorrect win positions are detected', () => {
	const book = copy(2);
	book.events.find((e) => e.type === 'winInfo').wins[0].positions[0].row = 4;
	assert(auditRound(book, 'base').some((f) => f.code === 'line-positions'));
});
