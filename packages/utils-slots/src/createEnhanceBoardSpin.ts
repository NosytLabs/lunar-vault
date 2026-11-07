import { stateBet } from 'state-shared';
import { waitForResolve } from 'utils-shared/wait';

import { stateSlots } from './stateSlots.svelte';
import type { Reel, GetRawSymbolFromReel } from './types';

export function createEnhanceBoardSpin<TReel extends Reel<any, any>>({
	board,
}: {
	board: TReel[];
}) {
	type TRawSymbol = GetRawSymbolFromReel<TReel>;

	type BaseRevealEvent = {
		index: number;
		type: 'reveal';
		board: TRawSymbol[][];
		anticipation: number[];
		paddingPositions?: number[];
	};

	async function spin<RevealEvent extends BaseRevealEvent>({
		revealEvent,
		paddingBoard,
	}: {
		revealEvent: RevealEvent;
		paddingBoard?: TRawSymbol[][];
	}) {
		if (stateSlots.isPreSpinning) {
			await Promise.all(
				board.map(async (reel) => {
					await waitForResolve((resolve) => (reel.reelState.readyToSpin = resolve));
				}),
			);
		}

		stateSlots.isPreSpinning = false;

		const globalSpinType = stateBet.isTurbo ? 'fast' : 'normal';
		const globalHasAnticipation = revealEvent.anticipation.some(Boolean);
		const firstAnticipatedReelIndex = revealEvent.anticipation.findIndex(Boolean);
		const getSpinType = ({
			noStop,
			isAnticipated,
		}: {
			noStop: boolean;
			isAnticipated: boolean;
		}) => {
			if (isAnticipated) return 'anticipated';
			if (noStop) return 'normal';
			return globalSpinType;
		};

		board.reduce((previousPaddingSize, reel, reelIndex) => {
			const noStop = globalHasAnticipation && reelIndex >= firstAnticipatedReelIndex;
			const isAnticipated = (revealEvent.anticipation?.[reelIndex] || 0) > 0;
			const spinType = getSpinType({ noStop, isAnticipated });
			const symbols = revealEvent.board[reelIndex] as TRawSymbol[];
			// The enhance board may have no padding for this reel. The
			// spinning reel's `prepareToSpin` expects a padding reel and a
			// padding position, so the empty values are supplied when the
			// board has none.
			const paddingReel = paddingBoard?.[reelIndex] ?? [];
			const paddingPosition = revealEvent?.paddingPositions?.[reelIndex] ?? 0;

			const paddingSize = reel.prepareToSpin({
				noStop,
				spinType,
				symbols,
				paddingReel,
				paddingPosition,
				previousPaddingSize,
				onSpinFinishing: () => {
					reel.onReelStopping();
					const nextReelIndex = reelIndex + 1;
					const isNextReelAnticipated = (revealEvent.anticipation?.[nextReelIndex] || 0) > 0;
					if (isNextReelAnticipated) board[nextReelIndex].reelState.anticipating = true;
				},
			});

			return paddingSize;
		}, 0);

		await Promise.all(
			board.map(async (reel) => {
				await reel.spin();
			}),
		);
	}

	return { spin };
}
