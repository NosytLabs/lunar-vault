import { stateBet } from 'state-shared';

import type { Reel, GetRawSymbolFromReel } from './types';
import { stateSlots } from './stateSlots.svelte';

export function createEnhanceBoardPreSpin<TReel extends Reel<any, any>>({
	board,
}: {
	board: TReel[];
}) {
	type TRawSymbol = GetRawSymbolFromReel<TReel>;

	const preSpin = async ({ paddingBoard }: { paddingBoard?: TRawSymbol[][] }) => {
		stateSlots.isPreSpinning = true;

		const isTurboBeforeAll = stateBet.isTurbo;

		await Promise.all(
			board.map((reel, reelIndex) => {
				// `paddingReel` is not part of the cascading reel's pre-spin
				// options, but the enhance board passes it anyway.
				return reel.preSpin({
					isTurboBeforeAll,
					preSpinPaddingReel: paddingBoard?.[reelIndex],
				} as Parameters<typeof reel.preSpin>[0]);
			}),
		);
	};

	return { preSpin };
}
