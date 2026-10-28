import type { BaseBet } from 'utils-bet';
import { stateMeta } from './stateMeta.svelte';
import { stateConfig } from './stateConfig.svelte';

export type Currency = string;
export type BetToResume = BaseBet | null;
export type BetModeKey = string;

export const stateBet = $state({
	currency: 'USD' as Currency,
	balanceAmount: 0,
	sessionStartingBalanceAmount: 0,
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
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.trim().toUpperCase()] ??
	stateMeta.betModeMeta?.[stateBet.activeBetModeKey.trim().toLowerCase()] ??
	null;
const isContinuousBet = () => stateBet.autoSpinsCounter > 1 || stateBet.isSpaceHold;
const timeScale = () => (stateBet.isTurbo ? 2 : 1);
const authenticatedMode = (mode = stateBet.activeBetModeKey) =>
	stateConfig.betModeLimits[mode.trim().toLowerCase()];
const isModeConfigured = (mode: string) => Boolean(authenticatedMode(mode));
const modeCostMultiplier = (mode = stateBet.activeBetModeKey) =>
	authenticatedMode(mode)?.costMultiplier ??
	(stateConfig.walletReady
		? 0
		: (stateMeta.betModeMeta?.[mode.toUpperCase()]?.costMultiplier ??
			stateMeta.betModeMeta?.[mode.toLowerCase()]?.costMultiplier ??
			1));
const requestMode = () =>
	authenticatedMode()?.mode ?? (stateConfig.walletReady ? '' : stateBet.activeBetModeKey);

const betCostMultiplier = () =>
	stateBetDerived.activeBetMode()?.type === 'activate' ? modeCostMultiplier() : 1;
const betCost = () => stateBet.betAmount * betCostMultiplier();
const isModeAmountAvailable = (mode: string, amount = stateBet.betAmount) => {
	const configured = authenticatedMode(mode);
	const maximum = configured?.maxBet;
	return (
		amount > 0 &&
		stateConfig.betAmountOptions.includes(amount) &&
		(Object.keys(stateConfig.betModeLimits).length === 0 || Boolean(configured)) &&
		(maximum === undefined || Math.round(amount * 1e6) <= maximum)
	);
};
const isBetCostAvailable = () =>
	betCost() > 0 &&
	betCost() <= stateBet.balanceAmount &&
	isModeAmountAvailable(activeBetMode()?.type === 'buy' ? 'base' : stateBet.activeBetModeKey);
const canRequestBet = () =>
	stateConfig.walletReady &&
	Boolean(activeBetMode()) &&
	isModeAmountAvailable(stateBet.activeBetModeKey) &&
	stateBet.betAmount * modeCostMultiplier() <= stateBet.balanceAmount;
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
	modeCostMultiplier,
	isModeConfigured,
	requestMode,
	hasAutoBetCounter,
};
