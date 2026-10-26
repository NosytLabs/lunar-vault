import {
	requestAuthenticate,
	requestBet,
	requestEndEvent,
	requestEndRound,
	requestReplay,
} from 'rgs-requests';
import math from '../../../math/salmon-run/config.json';

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
		gameModes?: Record<string, { costMultiplier: number; maxBet: number }>;
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
	const final = round.state.at(-1);
	if (
		final?.type !== 'finalWin' ||
		!Number.isSafeInteger(final.amount) ||
		final.amount < 0 ||
		Math.abs(final.amount / 100 - round.payoutMultiplier) > 1e-8
	)
		throw new Error('Round values do not match this game version. Relaunch the matching version.');
	round.state.forEach((e, i) => {
		if (e.index !== i) throw new Error('Round event order is invalid.');
	});
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
		if (
			!data.balance ||
			!Number.isSafeInteger(data.balance.amount) ||
			!c ||
			!c.betLevels?.length ||
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
		for (const [name, serverMode] of Object.entries(c.gameModes ?? {})) {
			const known = (math.modes as any)[name];
			if (
				known &&
				(serverMode.costMultiplier !== known.cost ||
					!Number.isSafeInteger(serverMode.maxBet) ||
					serverMode.maxBet < c.minBet)
			)
				throw new Error('The session math does not match this game version.');
		}
		if (data.round?.active) validateRound(data.round);
		c.betLevels = [...new Set(c.betLevels)].sort((a, b) => a - b);
		this.currency = data.balance.currency;
		this.social ||= Boolean(c.jurisdiction?.socialCasino);
		return data;
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
		const cost =
			Number.isFinite(result.costMultiplier) && result.costMultiplier >= 1
				? result.costMultiplier
				: ((math.modes as any)[mode]?.cost ?? 1);
		return { round: validateRound({ ...result, amount, mode, active: false, event: '0' }), cost };
	}
	async record(nextIndex: number) {
		if (!this.replay)
			await response(
				requestEndEvent({ sessionID: this.sessionID, rgsUrl: this.host, eventIndex: nextIndex }),
			);
	}
	async settle() {
		if (this.replay) throw new Error('Replay cannot settle a wallet.');
		return response<{ balance: Balance }>(
			requestEndRound({ sessionID: this.sessionID, rgsUrl: this.host }),
		);
	}
}
