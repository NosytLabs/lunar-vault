import {
	requestAuthenticate,
	requestBet,
	requestEndEvent,
	requestEndRound,
	requestReplay,
} from 'rgs-requests';
import math from '../../../math/salmon-run/config.json';
import { validateRoundCheckpoint } from 'utils-shared/roundValidation';
import {
	normalizeGameModes,
	canonicalModeName,
	type AuthenticatedGameMode,
} from 'utils-shared/gameModes';

export type { AuthenticatedGameMode };

export const symbolAsset = (name: string) =>
	`./assets/sprites/${name}-${name === 'salmon' || name === 'wild' ? 'v4' : 'v5'}.webp`;

export type SymbolName = (typeof math.symbols)[number];
export type Symbol = { name: SymbolName; value?: number };
export type Position = { reel: number; row: number };
export type BookEvent = { index: number; type: string; [key: string]: any };
export type Round = {
	amount: number;
	mode: string;
	active: boolean;
	event?: string;
	state: BookEvent[];
	payoutMultiplier: number;
};
export type Balance = { amount: number; currency: string };
export type Jurisdiction = {
	socialCasino?: boolean;
	disabledSpacebar?: boolean;
	disabledTurbo?: boolean;
	disabledSlamstop?: boolean;
	disabledBuyFeature?: boolean;
	minimumRoundDuration?: number;
	displayRTP?: boolean;
	displayNetPosition?: boolean;
	displaySessionTimer?: boolean;
};
export type Auth = {
	balance: Balance;
	config: {
		minBet: number;
		maxBet: number;
		stepBet: number;
		defaultBetLevel: number;
		betLevels: number[];
		jurisdiction: Jurisdiction;
		gameModes: unknown;
	};
	round?: Round;
};
const errorMessages: Record<string, string> = {
	ERR_VAL: 'The session or selected amount is unavailable. Relaunch the game.',
	ERR_IPB: 'Balance is too low for this play.',
	ERR_GLE: 'The session play limit has been reached.',
	ERR_ACT: 'Please wait a moment before trying again.',
	ERR_GEN: 'The game service is unavailable. Reload to recover the round.',
};
function checked<T>(data: any): T {
	if (!data || data.error)
		throw new Error(
			errorMessages[data?.error] ??
				'Connection interrupted. Reload to recover any unfinished round.',
		);
	return data as T;
}
async function response<T>(request: Promise<unknown>, replay = false): Promise<T> {
	let data: unknown;
	try {
		data = await request;
	} catch {
		throw new Error(
			replay
				? 'Replay could not be loaded. Check its launch link.'
				: 'Connection interrupted. Reload to recover any unfinished round.',
		);
	}
	return checked<T>(data);
}
function validateBalance(balance: Balance) {
	if (
		!balance ||
		!Number.isSafeInteger(balance.amount) ||
		balance.amount < 0 ||
		typeof balance.currency !== 'string' ||
		!balance.currency.trim()
	)
		throw new Error('The session returned an invalid balance. Reload to recover the round.');
	return balance;
}
export function validateRound(round: Round) {
	if (
		!round ||
		!Number.isSafeInteger(round.amount) ||
		round.amount <= 0 ||
		typeof round.active !== 'boolean' ||
		!Array.isArray(round.state) ||
		!round.state.length
	)
		throw new Error('The session returned an incomplete round.');
	if (typeof round.mode !== 'string' || !Object.hasOwn(math.modes, canonicalModeName(round.mode)))
		throw new Error('The returned round mode does not match this game version.');
	const final = round.state.at(-1);
	if (
		final?.type !== 'finalWin' ||
		!Number.isFinite(round.payoutMultiplier) ||
		round.payoutMultiplier < 0 ||
		!Number.isSafeInteger(final.amount) ||
		final.amount < 0 ||
		Math.abs(final.amount / 100 - round.payoutMultiplier) > 1e-8
	)
		throw new Error('Round values do not match this game version. Relaunch the matching version.');
	round.state.forEach((e, i) => {
		if (
			!e ||
			e.index !== i ||
			typeof e.type !== 'string' ||
			(e.type === 'finalWin' && i !== round.state.length - 1)
		)
			throw new Error('Round event order is invalid.');
	});
	if (round.active) validateRoundCheckpoint(round.event, round.state.length);
	return round;
}
export class EngineSession {
	params: URLSearchParams;
	host: string;
	sessionID: string;
	replay: boolean;
	social: boolean;
	currency: string;
	constructor(search: string) {
		this.params = new URLSearchParams(search);
		this.host = this.params.get('rgs_url') ?? '';
		this.sessionID = this.params.get('sessionID') ?? '';
		this.replay = this.params.get('replay') === 'true';
		this.social = this.params.get('social') === 'true';
		this.currency = this.params.get('currency') || 'USD';
		if (!this.host || (!this.replay && !this.sessionID))
			throw new Error(
				'A valid Engine launch session is required. Open the game from its launch link.',
			);
	}
	async authenticate() {
		const data = await response<Auth>(
			requestAuthenticate({ sessionID: this.sessionID, rgsUrl: this.host, language: 'en' }),
		);
		const c = data.config;
		validateBalance(data.balance);
		const duration =
			c?.jurisdiction?.minimumRoundDuration === undefined ? 0 : c.jurisdiction.minimumRoundDuration;
		if (!Number.isFinite(duration) || duration < 0)
			throw new Error('The session returned an invalid timing requirement.');
		if (duration > 0)
			throw new Error(
				'This session timing requirement is not supported by this game version. Relaunch from the game page.',
			);
		if (
			!data.balance ||
			!Number.isSafeInteger(data.balance.amount) ||
			!c ||
			!Number.isSafeInteger(c.minBet) ||
			c.minBet <= 0 ||
			!Number.isSafeInteger(c.maxBet) ||
			c.maxBet < c.minBet ||
			!Number.isSafeInteger(c.stepBet) ||
			c.stepBet <= 0 ||
			!Array.isArray(c.betLevels) ||
			!c.betLevels.length ||
			c.betLevels.some(
				(n) =>
					!Number.isSafeInteger(n) ||
					n < c.minBet ||
					n > c.maxBet ||
					(c.stepBet > 0 && n % c.stepBet !== 0),
			) ||
			!c.betLevels.includes(c.defaultBetLevel)
		)
			throw new Error('The session returned an invalid amount configuration.');
		const gameModes = normalizeGameModes(
			c.gameModes,
			Object.fromEntries(Object.entries(math.modes).map(([name, config]) => [name, config.cost])),
		);
		if (data.round?.active) validateRound(data.round);
		c.betLevels = [...new Set(c.betLevels)].sort((a, b) => a - b);
		this.currency = data.balance.currency;
		this.social ||= Boolean(c.jurisdiction?.socialCasino);
		return { ...data, config: { ...c, gameModes } };
	}
	async play(amount: number, mode: string) {
		if (this.replay) throw new Error('Replay cannot start a new play.');
		const result = await response<{ balance: Balance; round: Round }>(
			requestBet({
				sessionID: this.sessionID,
				rgsUrl: this.host,
				currency: this.currency,
				amount: amount / 1e6,
				mode,
			}),
		);
		validateBalance(result.balance);
		validateRound(result.round);
		if (result.round.amount !== amount || result.round.mode !== mode)
			throw new Error('The returned play amount does not match the request.');
		return result;
	}
	async loadReplay() {
		const p = this.params;
		const result = await response<any>(
			requestReplay({
				game: p.get('game') ?? '',
				version: p.get('version') ?? '',
				mode: p.get('mode') ?? 'base',
				event: p.get('event') ?? '',
				rgsUrl: this.host,
			}),
			true,
		);
		const requested = Number(p.get('amount'));
		const amount = Number.isSafeInteger(requested) && requested > 0 ? requested : 1e6;
		const mode = p.get('mode') ?? 'base';
		const known = math.modes[canonicalModeName(mode) as keyof typeof math.modes];
		if (!known || !Number.isFinite(result.costMultiplier) || result.costMultiplier !== known.cost)
			throw new Error('Replay mode values do not match this game version.');
		const cost = result.costMultiplier;
		return { round: validateRound({ ...result, amount, mode, active: false, event: '0' }), cost };
	}
	// Client cursor convention: the next event to present, recorded after completion.
	async record(nextIndex: number) {
		if (!this.replay)
			await response(
				requestEndEvent({ sessionID: this.sessionID, rgsUrl: this.host, eventIndex: nextIndex }),
			);
	}
	async settle() {
		if (this.replay) throw new Error('Replay cannot settle a wallet.');
		const data = await response<{ balance: Balance }>(
			requestEndRound({ sessionID: this.sessionID, rgsUrl: this.host }),
		);
		validateBalance(data.balance);
		return data;
	}
}
