import { locales } from 'config-lingui';
import { page } from '$app/state';
import { stateConfig } from './stateConfig.svelte';

export type Language = (typeof locales)[number];

export type Key =
	// keys for play
	| 'sessionID'
	| 'rgs_url'
	| 'lang'
	| 'currency'
	| 'device'
	| 'social'
	| 'demo'
	// keys for replay
	| 'replay'
	| 'amount'
	| 'game'
	| 'mode'
	| 'version'
	| 'event';

const getUrlSearchParam = (key: Key) => page.url.searchParams.get(key) as string;

// params for play
const lang = () => {
	const requested = getUrlSearchParam('lang') === 'br' ? 'pt' : getUrlSearchParam('lang');
	return locales.includes(requested as Language) ? (requested as Language) : 'en';
};
const sessionID = () => getUrlSearchParam('sessionID') || '';
const rgsUrl = () => getUrlSearchParam('rgs_url') || '';
const social = () =>
	getUrlSearchParam('social') === 'true' || stateConfig.jurisdiction.socialCasino;

// params for replay
const replay = () => getUrlSearchParam('replay') === 'true';
const amount = () => {
	const raw = getUrlSearchParam('amount');
	if (raw === null) return 1000000;
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value <= 0)
		throw new Error('This replay play amount is invalid.');
	return value;
};
const game = () => getUrlSearchParam('game') || '';
const version = () => getUrlSearchParam('version') || '';
const mode = () => getUrlSearchParam('mode') || '';
const event = () => getUrlSearchParam('event') || '';

export const stateUrlDerived = {
	// states for play
	lang,
	sessionID,
	rgsUrl,
	social,
	// states for replay
	replay,
	currency: () => getUrlSearchParam('currency') || 'USD',
	amount,
	game,
	mode,
	version,
	event,
};
