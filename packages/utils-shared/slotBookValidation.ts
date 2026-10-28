import type { RoundEvent } from './roundValidation.ts';
export function validateSlotBook(
	value: unknown,
	symbols: readonly string[],
	reels = 5,
	rows = 5,
): asserts value is RoundEvent[] {
	const fail = () => {
		throw new Error('The round contains invalid presentation events. Reload to recover the round.');
	};
	const integer = (v: unknown): v is number =>
		typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
	const positions = (v: unknown) =>
		Array.isArray(v) &&
		v.every((p) => p && integer(p.reel) && p.reel < reels && integer(p.row) && p.row < rows);
	if (!Array.isArray(value) || !value.length) fail();
	const events = value as RoundEvent[];
	if (
		!['reveal', 'freeSpinTrigger'].includes(events[0]?.type) ||
		events.at(-1)?.type !== 'finalWin'
	)
		fail();
	let total = 0;
	for (const [index, event] of events.entries()) {
		if (
			!event ||
			event.index !== index ||
			(event.type === 'finalWin' && index !== events.length - 1)
		)
			fail();
		switch (event.type) {
			case 'reveal': {
				const board = event.board;
				if (
					!Array.isArray(board) ||
					board.length !== reels ||
					board.some(
						(reel) =>
							!Array.isArray(reel) ||
							reel.length !== rows ||
							reel.some(
								(symbol) =>
									!symbol ||
									!symbols.includes(symbol.name) ||
									(symbol.multiplier !== undefined &&
										(!integer(symbol.multiplier) || symbol.multiplier < 1)),
							),
					)
				)
					fail();
				if (
					!['basegame', 'freegame'].includes(String(event.gameType)) ||
					!Array.isArray(event.paddingPositions) ||
					event.paddingPositions.length !== reels ||
					!event.paddingPositions.every(integer) ||
					!Array.isArray(event.anticipation) ||
					event.anticipation.length !== reels ||
					!event.anticipation.every(integer)
				)
					fail();
				break;
			}
			case 'winInfo': {
				if (!integer(event.totalWin) || !Array.isArray(event.wins)) fail();
				let sum = 0;
				for (const win of event.wins as any[]) {
					if (
						!win ||
						!symbols.includes(win.symbol) ||
						!integer(win.kind) ||
						win.kind < 3 ||
						win.kind > reels ||
						!integer(win.win) ||
						!positions(win.positions) ||
						!win.meta ||
						!integer(win.meta.lineIndex) ||
						!['multiplier', 'winWithoutMult', 'globalMult', 'lineMultiplier'].every(
							(key) =>
								typeof win.meta[key] === 'number' &&
								Number.isFinite(win.meta[key]) &&
								win.meta[key] >= 0,
						)
					)
						fail();
					sum += win.win;
				}
				if (sum !== event.totalWin) fail();
				break;
			}
			case 'setTotalWin':
				if (!integer(event.amount) || event.amount < total) fail();
				total = event.amount as number;
				break;
			case 'finalWin':
				if (!integer(event.amount) || event.amount !== total) fail();
				break;
			case 'setWin':
			case 'freeSpinEnd':
				if (!integer(event.amount) || !integer(event.winLevel)) fail();
				break;
			case 'freeSpinTrigger':
			case 'freeSpinRetrigger':
				if (!integer(event.totalFs) || event.totalFs < 1 || !positions(event.positions)) fail();
				break;
			case 'updateFreeSpin':
				if (
					!integer(event.amount) ||
					!integer(event.total) ||
					event.amount > event.total ||
					event.total < 1
				)
					fail();
				break;
			default:
				fail();
		}
	}
}
