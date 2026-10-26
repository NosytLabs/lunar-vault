import { stateMeta, stateBet } from 'state-shared';
import config from './config';
export function initialiseMetadata() {
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
					title: value.buyBonus ? 'ECLIPSE CHAMBER' : 'LUNAR VAULT',
					button: 'CONTINUE',
					description: value.buyBonus
						? 'Enter the Eclipse Chamber. Development sample: 100× play amount.'
						: '',
					dialog:
						'Eclipse Chamber costs 100× the selected play amount. This development sample is not approved for live play.',
					tickerIdle: '',
					tickerSpin: '',
				},
			},
		]),
	);
	stateMeta.gameRuleMeta = { gameRules: [], payTable: [], splashScreen: [] };
	stateBet.activeBetModeKey = 'base';
}
