import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../apps/lunar-vault/src/game/config.ts';
import base from '../apps/lunar-vault/src/stories/data/base_books.ts';
import bonus from '../apps/lunar-vault/src/stories/data/bonus_books.ts';

const root = path.resolve(import.meta.dirname, '..');
const handlers = fs.readFileSync(
	path.join(root, 'apps/lunar-vault/src/game/bookEventHandlerMap.ts'),
	'utf8',
);
const supported = new Set([...handlers.matchAll(/^\t(\w+): async/gm)].map((m) => m[1]));
const cents = (x) => Math.round(x * 100);
const pay = (name, count) =>
	config.symbols[name]?.paytable?.find((row) => String(count) in row)?.[String(count)] ?? 0;

// Mirrors Engine math-sdk Lines.get_lines: choose the base award before multipliers.
// Offline audit only. Runtime presentation never uses this to award money.
export function evaluateLine(symbols) {
	let wildCount = 0;
	while (symbols[wildCount]?.name === 'W') wildCount++;
	const name = symbols[wildCount]?.name;
	let count = wildCount;
	if (name) {
		while (symbols[count] && [name, 'W'].includes(symbols[count].name)) count++;
	}
	const wildBase = pay('W', wildCount);
	const regularBase = name ? pay(name, count) : 0;
	const useWild = wildBase > regularBase;
	const base = useWild ? wildBase : regularBase;
	const positions = symbols.slice(0, useWild ? wildCount : count);
	const multiplier = Math.max(
		1,
		positions.reduce(
			(sum, symbol) => sum + ((symbol.multiplier ?? 1) > 1 ? symbol.multiplier : 0),
			0,
		),
	);
	return cents(base) * multiplier;
}

function lineAwards(board) {
	return Object.entries(config.paylines).flatMap(([line, rows]) => {
		const symbols = rows.map((row, reel) => board[reel][row + 1]);
		const best = evaluateLine(symbols);
		return best ? [{ line: Number(line), amount: best }] : [];
	});
}

export function auditRound(book, mode) {
	const issues = [];
	const add = (event, code, detail, severity = 'error') =>
		issues.push({ mode, book: book.id, event: event?.index, code, detail, severity });
	let board,
		total = 0,
		spinTotal = 0,
		freeTotal = 0,
		freeCurrent = -1;
	for (const [index, event] of book.events.entries()) {
		if (event.index !== index)
			add(event, 'event-index', 'Event indices must be contiguous from zero.');
		if (!supported.has(event.type)) add(event, 'unhandled-event', event.type);
		if (event.type === 'reveal') {
			board = event.board;
			spinTotal = 0;
			if (board.length !== 5 || board.some((reel) => reel.length !== 5))
				add(event, 'board-shape', 'Expected five padded reels with three visible rows.');
			for (const symbol of board.flat())
				if (!(symbol.name in config.symbols)) add(event, 'unknown-symbol', symbol.name);
			const next = book.events
				.slice(index + 1)
				.find((e) => ['reveal', 'winInfo', 'finalWin'].includes(e.type));
			const expected = lineAwards(board);
			const reported =
				next?.type === 'winInfo'
					? next.wins.map((w) => ({ line: w.meta.lineIndex, amount: w.win }))
					: [];
			if (
				JSON.stringify(expected.sort((a, b) => a.line - b.line)) !==
				JSON.stringify(reported.sort((a, b) => a.line - b.line))
			)
				add(event, 'evaluated-lines', { expected, reported });
		}
		if (event.type === 'winInfo') {
			spinTotal = event.wins.reduce((sum, win) => sum + win.win, 0);
			total += spinTotal;
			if (spinTotal !== event.totalWin)
				add(event, 'win-sum', { sum: spinTotal, reported: event.totalWin });
			for (const win of event.wins) {
				const line = config.paylines[win.meta.lineIndex];
				const expectedBase = cents(pay(win.symbol, win.kind));
				if (
					expectedBase !== win.meta.winWithoutMult ||
					win.win !== expectedBase * win.meta.multiplier
				)
					add(event, 'paytable-multiplier', { win, expectedBase });
				if (
					win.positions.length !== win.kind ||
					win.positions.some((p, i) => p.reel !== i || p.row !== line?.[i] + 1)
				)
					add(event, 'line-positions', win.positions);
				if (win.positions.some((p) => ![win.symbol, 'W'].includes(board?.[p.reel]?.[p.row]?.name)))
					add(event, 'symbol-positions', win.positions);
			}
		}
		if (event.type === 'setWin' && event.amount !== spinTotal)
			add(event, 'spin-total', { expected: spinTotal, reported: event.amount });
		if (event.type === 'setTotalWin' && event.amount !== total)
			add(event, 'cumulative-total', { expected: total, reported: event.amount });
		if (['freeSpinTrigger', 'freeSpinRetrigger'].includes(event.type)) {
			freeTotal = event.totalFs;
			if (event.type === 'freeSpinTrigger') freeCurrent = -1;
			for (const p of event.positions) {
				if (p.row < 1 || p.row > 3) add(event, 'offscreen-feature-symbol', p, 'warning');
				if (board?.[p.reel]?.[p.row]?.name !== 'S')
					add(event, 'feature-symbol-mismatch', p, 'warning');
			}
		}
		if (event.type === 'updateFreeSpin') {
			if (
				event.amount !== freeCurrent + 1 ||
				event.total !== freeTotal ||
				event.amount >= event.total
			)
				add(event, 'free-spin-accounting', {
					previous: freeCurrent,
					announcedTotal: freeTotal,
					event,
				});
			freeCurrent = event.amount;
		}
		if (event.type === 'freeSpinEnd' && event.amount !== cents(book.freeGameWins))
			add(event, 'feature-total', { expected: cents(book.freeGameWins), reported: event.amount });
	}
	const final = book.events.at(-1);
	if (final.type !== 'finalWin' || final.amount !== total || total !== cents(book.payoutMultiplier))
		add(final, 'terminal-total', { total, final: final.amount, payoutX: book.payoutMultiplier });
	if (cents(book.baseGameWins + book.freeGameWins) !== total)
		add(final, 'component-total', { total });
	return issues;
}

export function auditProvidedBooks() {
	const findings = [];
	const modes = Object.entries({ base, bonus }).map(([mode, books]) => {
		findings.push(...books.flatMap((book) => auditRound(book, mode)));
		const values = books.map((book) => book.payoutMultiplier);
		return {
			mode,
			books: books.length,
			cost: config.betModes[mode].cost,
			unweightedMeanPayoutX: values.reduce((a, b) => a + b, 0) / books.length,
			unweightedNonzeroFraction: values.filter((x) => x > 0).length / books.length,
			largestSuppliedPayoutX: Math.max(...values),
			featureBooks: books.filter((b) => b.events.some((e) => e.type === 'freeSpinTrigger')).length,
			retriggerBooks: books.filter((b) => b.events.some((e) => e.type === 'freeSpinRetrigger'))
				.length,
		};
	});
	const report = {
		scope: '600 SDK illustration books; unweighted and not a published distribution',
		theoreticalRtp: null,
		simulatedRtp: null,
		confidenceInterval: null,
		reason:
			'No authoritative reel-probability model, lookup weights or publish index exists. Re-sampling these examples cannot estimate production RTP.',
		modes,
		errors: findings.filter((f) => f.severity === 'error').length,
		warnings: findings.filter((f) => f.severity === 'warning').length,
		byCode: Object.fromEntries(
			[...new Set(findings.map((f) => f.code))].map((code) => [
				code,
				findings.filter((f) => f.code === code).length,
			]),
		),
		findings,
	};
	return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const report = auditProvidedBooks();
	const outputIndex = process.argv.indexOf('--output');
	if (outputIndex >= 0)
		fs.writeFileSync(process.argv[outputIndex + 1], JSON.stringify(report, null, 2) + '\n');
	console.log(JSON.stringify({ ...report, findings: report.findings.slice(0, 8) }, null, 2));
	if (report.errors) process.exitCode = 1;
}
