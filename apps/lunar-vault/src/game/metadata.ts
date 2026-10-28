import { stateMeta, stateBet } from 'state-shared';
import config from './config';
import { validateSlotBook } from 'utils-shared/slotBookValidation';
import { SYMBOL_INFO_MAP } from './constants';
export const MODE_DISPLAY_NAMES: Record<string, string> = {
	base: 'LUNAR VAULT',
	bonus: 'ECLIPSE CHAMBER',
};
export function initialiseMetadata() {
	stateMeta.validateBookEvents = (events) => validateSlotBook(events, Object.keys(SYMBOL_INFO_MAP));
	stateMeta.betModeMeta = Object.fromEntries(
		Object.entries(config.betModes).map(([mode, value]) => [
			mode,
			{
				mode,
				costMultiplier: value.cost,
				type: value.buyBonus ? ('buy' as const) : ('default' as const),
				parent: '',
				children: '',
				assets: {
					icon: './assets/nosyt/orbital-seal.svg',
					dialogImage: '',
					dialogVolatility: '',
					volatility: '',
					button: '',
				},
				text: {
					title: MODE_DISPLAY_NAMES[mode.toLowerCase()] ?? MODE_DISPLAY_NAMES.base,
					button: 'CONTINUE',
					description: value.buyBonus
						? 'Enter the Eclipse Chamber. 12 free spins: 100× play amount.'
						: '',
					dialog:
						'Enter 12 Eclipse Chamber free spins for 100× the selected play amount. Confirm the total shown below to continue.',
					tickerIdle: '',
					tickerSpin: '',
				},
			},
		]),
	);
	stateMeta.gameRuleMeta = { gameRules: [], payTable: [], splashScreen: [] };
	stateBet.activeBetModeKey = 'base';
}
