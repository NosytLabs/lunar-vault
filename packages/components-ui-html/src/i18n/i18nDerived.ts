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
	bet: () => translate('BET'),
	max: () => translate('MAX'),
	betMenu: () => translate('BET MENU'),
	selectYourBet: () => translate('SELECT YOUR BET'),
	confirm: () => translate('CONFIRM'),
	masterVolume: () => translate('MASTER VOLUME'),
	musicVolume: () => translate('MUSIC VOLUME'),
	soundEffectVolume: () => translate('SOUND EFFECT VOLUME'),
	autoSpins: () => translate('AUTO SPINS'),
	numberOfRounds: () => translate('NUMBER OF ROUNDS'),
	advanced: () => translate('ADVANCED'),
	singleWinLimit: () => translate('SINGLE WIN LIMIT'),
	lossLimit: () => translate('LOSS LIMIT'),
	startAutoplay: () => translate('START AUTOPLAY'),
	notification: () => translate('NOTIFICATION'),
	autoSpinsStopInfo: () => translate('AUTO PLAY HAS STOPPED DUE TO'),
	insufficientFunds: () => translate('INSUFFICIENT FUNDS TO PLACE THIS BET. PLEASE ADD FUNDS TO YOUR ACCOUNT OR LOWER THE BET LEVEL.'),
	lossLimitReached: () => translate('LOSS LIMIT REACHED'),
	singleWinLimitReached: () => translate('SINGLE WIN LIMIT REACHED'),
	settings: () => translate('SETTINGS'),
	playAgain: () => translate('PLAY AGAIN'),
};
