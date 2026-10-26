import type { BaseBet } from 'utils-bet';
import { stateMeta } from './stateMeta.svelte';
import { stateConfig } from './stateConfig.svelte';

export type Currency = string;
export type BetToResume = BaseBet | null;
export type BetModeKey = string;

export const stateBet = $state({
	currency: 'USD' as Currency,
	balanceAmount: 0,
	betAmount: 1,
	wageredBetAmount: 1,
	betToResume: null as BetToResume,
	activeBetModeKey: 'BASE' as BetModeKey,
	winBookEventAmount: 0,
	replayCostMultiplier: 1,
	autoSpinsLoss: 0,
	autoSpinsCounter: 0,
	autoSpinsLossLimitAmount: Infinity,
	autoSpinsSingleWinLimitAmount: Infinity,
	isSpaceHold: false,
	isTurbo: false,
});

const correctBetAmount = (value: number) => {
	return stateConfig.betAmountOptions.includes(value) ? value : stateBet.betAmount;
};

const setBetAmount = (value: number) => {
	stateBet.betAmount = correctBetAmount(value);
};

const updateBetAmount = (update: (value: number) => number) => {
	stateBet.betAmount = correctBetAmount(update(stateBet.betAmount));
};

let isTurboLocked = false;

const updateIsTurbo = (value: boolean, options: { persistent: boolean }) => {
	const { persistent } = options;

	if (!persistent && isTurboLocked) return;
	if (persistent) isTurboLocked = value;

	stateBet.isTurbo = value;
};

const activeBetMode = () =>
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toUpperCase()] ??
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.toLowerCase()] ??
	null;
const isContinuousBet = () => stateBet.autoSpinsCounter > 1 || stateBet.isSpaceHold;
const timeScale = () => (stateBet.isTurbo ? 2 : 1);
const betCostMultiplier = () =>
	stateBetDerived.activeBetMode()?.type === 'activate'
		? stateBetDerived.activeBetMode().costMultiplier
		: 1;
const betCost = () => stateBet.betAmount * betCostMultiplier();
const isModeAmountAvailable = (mode: string, amount = stateBet.betAmount) => {
	const maximum = stateConfig.betModeLimits[mode.toLowerCase()]?.maxBet;
	return (
		amount > 0 &&
		stateConfig.betAmountOptions.includes(amount) &&
		(maximum === undefined || Math.round(amount * 1e6) <= maximum)
	);
};
const isBetCostAvailable = () =>
	betCost() > 0 &&
	betCost() <= stateBet.balanceAmount &&
	isModeAmountAvailable(activeBetMode()?.type === 'buy' ? 'base' : stateBet.activeBetModeKey);
const canRequestBet = () =>
	Boolean(activeBetMode()) &&
	isModeAmountAvailable(stateBet.activeBetModeKey) &&
	stateBet.betAmount * (activeBetMode()?.costMultiplier ?? 1) <= stateBet.balanceAmount;
const hasAutoBetCounter = () => stateBet.autoSpinsCounter !== 0;

export const stateBetDerived = {
	setBetAmount,
	updateBetAmount,
	updateIsTurbo,
	activeBetMode,
	isContinuousBet,
	timeScale,
	betCost,
	isBetCostAvailable,
	isModeAmountAvailable,
	canRequestBet,
	hasAutoBetCounter,
};
