import { setContextEventEmitter, getContextEventEmitter } from 'utils-event-emitter';
import { setContextXstate, getContextXstate } from 'utils-xstate';
import { setContextLayout, getContextLayout } from 'utils-layout';
import { setContextApp, getContextApp } from 'pixi-svelte';
import { stateMeta } from 'state-shared';

import { eventEmitter, type EmitterEvent } from './eventEmitter';
import { stateXstate, stateXstateDerived } from './stateXstate';
import { stateLayout, stateLayoutDerived } from './stateLayout';
import { stateApp } from './stateApp';
import { LUNAR_VAULT_BET_MODE_META, LUNAR_VAULT_GAME_RULE_META } from './gameMeta';

import { stateGame, stateGameDerived } from './stateGame.svelte';
import { i18nDerived } from '../i18n/i18nDerived';

// The Web SDK ships sample metadata for a different game ("SAMURAI SPIN",
// "SUPER BONUS" at 200x, placeholder CDN art). Lunar Vault declares its own
// modes in src/game/config.ts, so the SDK defaults have to be replaced or the
// player is shown modes that do not exist, priced wrongly, with rules that
// contradict the math.
stateMeta.betModeMeta = LUNAR_VAULT_BET_MODE_META as typeof stateMeta.betModeMeta;
stateMeta.gameRuleMeta = LUNAR_VAULT_GAME_RULE_META as typeof stateMeta.gameRuleMeta;

export const setContext = () => {
	setContextEventEmitter<EmitterEvent>({ eventEmitter });
	setContextXstate({ stateXstate, stateXstateDerived });
	setContextLayout({ stateLayout, stateLayoutDerived });
	setContextApp({ stateApp });
};

export const getContext = () => ({
	...getContextEventEmitter<EmitterEvent>(),
	...getContextLayout(),
	...getContextXstate(),
	...getContextApp(),
	stateGame,
	stateGameDerived,
	i18nDerived,
});
