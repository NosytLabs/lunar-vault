import { socialText, stateI18nDerived, stateUrlDerived } from 'state-shared';

/**
 * Translate a player-facing string and apply the social-mode wording.
 *
 * Use this for text that comes from the game metadata or any other source
 * that is not one of the SDK's own message keys -- Engine requires the social
 * wording to be applied to *all* player-facing text, not only the built-in
 * translations.
 */
const translate = (text: string) => socialText(stateI18nDerived.translate(text), stateUrlDerived.social());

export { translate };

export const i18nDerived = {
	audio: () => translate('AUDIO'),
	balance: () => translate('BALANCE'),
	win: () => translate('WIN'),
	bet: () => translate('BET'),
	stop: () => translate('STOP'),
	buyBonus: () => translate('BUY BONUS'),
	disable: () => translate('DISABLE'),
	freeSpins: () => translate('FREE SPINS'),
	//
	decrease: () => translate('-'),
	increase: () => translate('+'),
	menu: () => translate('MENU'),
	turbo: () => translate('TURBO'),
	autoSpin: () => translate('AUTO SPIN'),
	payTable: () => translate('PAYTABLE'),
	info: () => translate('INFO'),
	settings: () => translate('SETTINGS'),
	soundOn: () => translate('SOUND ON'),
	soundOff: () => translate('SOUND OFF'),
	menuExit: () => translate('EXIT'),
};
