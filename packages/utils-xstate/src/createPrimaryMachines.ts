import { fromPromise } from 'xstate';
import { API_AMOUNT_MULTIPLIER } from 'constants-shared/bet';
import { stateBet, stateBetDerived, stateUrlDerived, stateModal } from 'state-shared';
import { requestBet, requestEndRound } from 'rgs-requests';
import { waitForTimeout } from 'utils-shared/wait';
import type { BaseBet } from './types';
const handleRequestBet = async ({ onError }: { onError: () => void }) => {
	try {
		if (!stateBetDerived.canRequestBet())
			throw new Error('The selected play amount is unavailable for this session.');
		const data = await requestBet({
			rgsUrl: stateUrlDerived.rgsUrl(),
			sessionID: stateUrlDerived.sessionID(),
			currency: stateBet.currency,
			mode: stateBetDerived.requestMode(),
			amount: stateBet.betAmount,
		});
		if (data?.error) throw data;
		if (data?.round?.state && data.round.state.length > 0) {
			stateBet.wageredBetAmount = stateBet.betAmount;
			return data;
		}
		throw { error: 'ERR_GEN', message: 'The session returned an incomplete round.' };
	} catch (error) {
		onError();
		stateBet.autoSpinsCounter = 0;
		stateModal.modal = { name: 'error', error };
		throw error;
	}
};
const handleRequestEndRound = async () => {
	if (stateUrlDerived.replay()) return;
	try {
		const data = await requestEndRound({
			sessionID: stateUrlDerived.sessionID(),
			rgsUrl: stateUrlDerived.rgsUrl(),
		});
		if (data?.error) throw data;
		if (data?.balance?.amount !== undefined) return data;
		throw { error: 'ERR_GEN', message: 'The balance could not be restored. Reload the game.' };
	} catch (error) {
		stateBet.autoSpinsCounter = 0;
		stateBet.isSpaceHold = false;
		stateModal.modal = { name: 'error', error };
		throw error;
	}
};
const handleUpdateBalance = ({ balanceAmountFromApi }: { balanceAmountFromApi: number }) => {
	stateBet.balanceAmount = balanceAmountFromApi / API_AMOUNT_MULTIPLIER;
};
type Options<TBet extends BaseBet> = {
	onResumeGameActive: (betToResume: TBet) => TBet;
	onResumeGameInactive: (betToResume: TBet) => void;
	onNewGameStart: () => Promise<void> | undefined;
	onNewGameError: () => any;
	onPlayGame: (bet: TBet) => Promise<void>;
	checkIsBonusGame: (bet: TBet) => boolean;
};
function createPrimaryMachines<TBet extends BaseBet>(options: Options<TBet>) {
	const { onResumeGameActive, onResumeGameInactive, onNewGameStart, onNewGameError, onPlayGame } =
		options;
	let presentationNotBefore = 0;
	const settleBet = async (bet: TBet) => {
		if (!bet.active || stateUrlDerived.replay()) return;
		const data = await handleRequestEndRound();
		if (data?.balance) handleUpdateBalance({ balanceAmountFromApi: data.balance.amount });
	};
	const newGame = fromPromise(async () => {
		presentationNotBefore = Date.now() + (stateBet.isTurbo ? 350 : 700);
		await onNewGameStart();
		const data = await handleRequestBet({ onError: onNewGameError });
		if (data) {
			if (data.balance) handleUpdateBalance({ balanceAmountFromApi: data.balance.amount });
			return { bet: data.round as TBet };
		}
		return { bet: null };
	});
	const resumeGame = fromPromise(async () => {
		presentationNotBefore = 0;
		const betToResume = stateBet.betToResume as TBet;
		if (betToResume && betToResume.active) {
			stateBet.betToResume = null;
			try {
				return { bet: onResumeGameActive(betToResume), rawBet: betToResume };
			} catch (error) {
				stateBet.autoSpinsCounter = 0;
				stateBet.isSpaceHold = false;
				stateModal.modal = { name: 'error', error };
				throw error;
			}
		}
		if (betToResume && betToResume.state && betToResume.state.length > 0)
			onResumeGameInactive(betToResume);
		throw new Error('inactive Bet');
	});
	const playGame = fromPromise<void, { bet: TBet | null }>(async ({ input }) => {
		try {
			if (input.bet) await onPlayGame(input.bet);
		} catch (error) {
			onNewGameError();
			stateBet.autoSpinsCounter = 0;
			stateBet.isSpaceHold = false;
			stateModal.modal = { name: 'error', error };
			throw error;
		}
	});
	const endGame = fromPromise<void, { bet: TBet | null; rawBet: TBet | null }>(
		async ({ input }) => {
			await waitForTimeout(Math.max(0, presentationNotBefore - Date.now()));
			const targetBet = input.rawBet || input.bet;
			if (targetBet) await settleBet(targetBet);
		},
	);
	return { newGame, playGame, endGame, resumeGame };
}
export { createPrimaryMachines };
