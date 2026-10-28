import _ from 'lodash';
import { stateBet, stateBetDerived, stateUrlDerived, stateMeta } from 'state-shared';
import { validateSlotBook } from 'utils-shared/slotBookValidation';
import { validateRoundCheckpoint } from 'utils-shared/roundValidation';
import { stateGame } from './stateGame.svelte';
import { createPlayBookUtils, recordBookEvent } from 'utils-book';
import { createGetEmptyPaddedBoard } from 'utils-slots';

import { SYMBOL_SIZE, REEL_PADDING, SYMBOL_INFO_MAP, BOARD_DIMENSIONS } from './constants';
import { eventEmitter } from './eventEmitter';
import type { Bet, BookEventOfType } from './typesBookEvent';
import { bookEventHandlerMap } from './bookEventHandlerMap';
import type { RawSymbol, SymbolState } from './types';

// general utils
export const { getEmptyBoard } = createGetEmptyPaddedBoard({ reelsDimensions: BOARD_DIMENSIONS });
export const { playBookEvent, playBookEvents } = createPlayBookUtils({ bookEventHandlerMap });
export const playBet = async (bet: Bet) => {
	if (bet.state[0]?.type !== 'createBonusSnapshot')
		validateSlotBook(bet.state, Object.keys(SYMBOL_INFO_MAP));
	const generation = ++stateGame.playbackGeneration;
	stateBet.winBookEventAmount = 0;
	stateGame.roundCostMultiplier = stateUrlDerived.replay()
		? stateBet.replayCostMultiplier
		: ((
				stateMeta.betModeMeta[bet.mode.trim().toLowerCase()] ??
				stateMeta.betModeMeta[bet.mode.trim().toUpperCase()]
			)?.costMultiplier ?? 1);
	stateGame.roundPayout = bet.state.findLast((event) => event.type === 'finalWin')?.amount ?? 0;
	for (const bookEvent of bet.state) {
		if (generation !== stateGame.playbackGeneration) return;
		await playBookEvent(bookEvent, { bookEvents: bet.state });
		if (generation !== stateGame.playbackGeneration) return;
		if (bet.active && bookEvent.type !== 'createBonusSnapshot')
			await recordBookEvent({ bookEvent });
	}
	eventEmitter.broadcast({ type: 'stopButtonEnable' });
};

// resume bet
const BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT = [
	'reveal',
	'freeSpinTrigger',
	'freeSpinRetrigger',
	'freeSpinEnd',
	'updateFreeSpin',
	'setTotalWin',
];

export const convertTorResumableBet = (betToResume: Bet) => {
	validateSlotBook(betToResume.state, Object.keys(SYMBOL_INFO_MAP));
	const resumingIndex = validateRoundCheckpoint(betToResume.event, betToResume.state.length);
	const bookEventsBeforeResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex < resumingIndex,
	);
	const bookEventsAfterResume = betToResume.state.filter(
		(_, eventIndex) => eventIndex >= resumingIndex,
	);

	const bookEventToCreateSnapshot: BookEventOfType<'createBonusSnapshot'> = {
		index: 0,
		type: 'createBonusSnapshot',
		bookEvents: bookEventsBeforeResume.filter((bookEvent) =>
			BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT.includes(bookEvent.type),
		),
	};

	const stateToResume = [bookEventToCreateSnapshot, ...bookEventsAfterResume];

	return { ...betToResume, state: stateToResume };
};

// other utils
export const getSymbolX = (reelIndex: number) => SYMBOL_SIZE * (reelIndex + REEL_PADDING);
export const getSymbolY = (symbolIndexOfBoard: number) => (symbolIndexOfBoard + 0.5) * SYMBOL_SIZE;

export const getSymbolInfo = ({
	rawSymbol,
	state,
}: {
	rawSymbol: RawSymbol;
	state: SymbolState;
}) => {
	return SYMBOL_INFO_MAP[rawSymbol.name][state];
};
