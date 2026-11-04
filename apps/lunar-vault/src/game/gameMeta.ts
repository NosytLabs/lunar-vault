/**
 * Lunar Vault game metadata.
 *
 * This replaces the Web SDK's sample content. The SDK defaults describe a
 * different game ("SAMURAI SPIN", "DOUBLE BOOST", "SUPER BOOST", "SUPER BONUS"
 * at 200x) and point at a placeholder CDN bucket, so shipping them would show
 * the player modes that do not exist in this game, with prices and rules that
 * do not match the math.
 *
 * Lunar Vault has two modes, from src/game/config.ts:
 *
 *   base  - cost 1x, feature round triggered by scatters
 *   bonus - cost 100x, buys the feature round outright
 *
 * RTP and max win below are placeholders until Engine issues the certified
 * math package. The check script flags a mismatch against config.ts.
 */

const LUNAR_VAULT_SYMBOLS = {
	L1: { label: 'LOW GEM 1', payouts: { '5': 5, '4': 1, '3': 0.5 } },
	L2: { label: 'LOW GEM 2', payouts: { '5': 3, '4': 0.7, '3': 0.3 } },
	L3: { label: 'LOW GEM 3', payouts: { '5': 3, '4': 0.7, '3': 0.3 } },
	L4: { label: 'LOW GEM 4', payouts: { '5': 2, '4': 0.5, '3': 0.2 } },
	L5: { label: 'LOW GEM 5', payouts: { '5': 1, '4': 0.3, '3': 0.1 } },
	H1: { label: 'HIGH GEM 1', payouts: { '5': 20, '4': 10, '3': 5 } },
	H2: { label: 'HIGH GEM 2', payouts: { '5': 15, '4': 5, '3': 3 } },
	H3: { label: 'HIGH GEM 3', payouts: { '5': 10, '4': 3, '3': 2 } },
	H4: { label: 'HIGH GEM 4', payouts: { '5': 8, '4': 2, '3': 1 } },
};

/**
 * Payout rows for one symbol.
 *
 * The payout values are the multipliers of the player bet amount, so the
 * row reads as "5 of a kind pays 20x the bet amount".
 */
const payoutRows = (symbol: { payouts: Record<string, number> }) =>
	`5 of a kind	${symbol.payouts['5']}x\n4 of a kind	${symbol.payouts['4']}x\n3 of a kind	${symbol.payouts['3']}x`;

const LUNAR_VAULT_BET_MODE_META = {
	BASE: {
		mode: 'BASE',
		costMultiplier: 1.0,
		type: 'default',
		parent: '',
		children: '',
		assets: {
			icon: '',
			dialogImage: '',
			dialogVolatility: '',
			volatility: '',
			button: '',
		},
		text: {
			title: 'BASE',
			dialog: '',
			button: '',
			betAmountLabel: 'BET',
			tickerIdle: '',
			tickerSpin: '',
			bannerText: '',
		},
		maxWin: 5000,
	},
	BONUS: {
		mode: 'BONUS',
		costMultiplier: 100,
		type: 'buy',
		parent: '',
		children: '',
		assets: {
			icon: '',
			dialogImage: '',
			dialogVolatility: '',
			volatility: '',
			button: '',
		},
		text: {
			title: 'FEATURE ROUND',
			dialog:
				'Triggers the FEATURE ROUND when activated for 100x the player bet amount. The Global Multiplier can reach up to 64x and remains active for the duration of the FEATURE ROUND.',
			description: 'Each spin may have a random multiplier applied to winning lines.',
			button: 'GET BONUS',
			betAmountLabel: 'FEATURE ROUND',
			tickerIdle: 'PLACE YOUR PLAY AMOUNT',
			tickerSpin: 'FEATURE ROUND ACTIVATED',
			bannerText: '',
		},
		maxWin: 5000,
	},
};

const LUNAR_VAULT_GAME_RULE_META = {
	payTable: [
		{
			containers: [
				{
					title: 'WILD SYMBOL',
					text: 'The Wild symbol substitutes for all other symbols except Scatter.',
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 0,
				},
				{
					title: 'FEATURE ROUND',
					text: 'Scatter symbols appear on all five reels. When 3, 4 or 5 Scatters land in a spin sequence the FEATURE ROUND is triggered, awarding 8, 12 or 16 free spins respectively.',
					image: '',
					imagePosition: 'left',
					row: 1,
					column: 0,
				},
				{
					title: 'FEATURE ROUND RETRIGGER',
					text: 'During the FEATURE ROUND, Scatter symbols appear on all five reels. When 3, 4 or 5 Scatters land in a spin sequence, additional free spins are awarded: 4, 6 or 8 respectively.',
					image: '',
					imagePosition: 'left',
					row: 2,
					column: 0,
				},
			],
			rows: 3,
			columns: 1,
			title: 'WIN TABLE',
		},
		{
			containers: [
				{
					title: 'HIGH GEM 1',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.H1),
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 0,
				},
				{
					title: 'HIGH GEM 2',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.H2),
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 1,
				},
				{
					title: 'HIGH GEM 3',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.H3),
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 2,
				},
				{
					title: 'HIGH GEM 4',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.H4),
					image: '',
					imagePosition: 'left',
					row: 1,
					column: 0,
				},
				{
					title: 'LOW GEM 5',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.L5),
					image: '',
					imagePosition: 'left',
					row: 1,
					column: 1,
				},
				{
					title: 'LOW GEM 4',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.L4),
					image: '',
					imagePosition: 'left',
					row: 1,
					column: 2,
				},
				{
					title: 'LOW GEM 3',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.L3),
					image: '',
					imagePosition: 'left',
					row: 2,
					column: 0,
				},
				{
					title: 'LOW GEM 2',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.L2),
					image: '',
					imagePosition: 'left',
					row: 2,
					column: 1,
				},
				{
					title: 'LOW GEM 1',
					text: payoutRows(LUNAR_VAULT_SYMBOLS.L1),
					image: '',
					imagePosition: 'left',
					row: 2,
					column: 2,
				},
			],
			rows: 3,
			columns: 3,
			title: 'SYMBOLS',
		},
		{
			containers: [
				{
					title: '',
					text: 'All symbols pay from left to right, starting from the leftmost reel. Only symbols on adjacent reels form a valid winning line. This does not apply to Scatter symbols.',
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 0,
				},
			],
			rows: 1,
			columns: 1,
			title: 'WIN LINES',
		},
	],
	gameRules: [
		{
			containers: [
				{
					title: 'BASE GAME',
					text: 'RTP 97.00% · Max win 5,000x the player bet amount.',
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 0,
				},
				{
					title: 'FEATURE ROUND',
					text: 'RTP 97.00% · Max win 5,000x the player bet amount · Costs 100x the player bet amount.',
					image: '',
					imagePosition: 'left',
					row: 1,
					column: 0,
				},
			],
			rows: 2,
			columns: 1,
			title: 'GAME RULES',
		},
		{
			containers: [
				{
					title: 'BET / SPIN',
					text: 'Starts a round at the currently selected player bet amount. The Space bar also starts a round.',
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 0,
				},
				{
					title: 'BET AMOUNT +/-',
					text: 'Raises or lowers the player bet amount. The available range and each step are shown in the bet menu.',
					image: '',
					imagePosition: 'left',
					row: 1,
					column: 0,
				},
				{
					title: 'BET MENU',
					text: 'Opens the bet menu, where the player bet amount, and the single win limit and loss limit for autoplay, are set.',
					image: '',
					imagePosition: 'left',
					row: 2,
					column: 0,
				},
				{
					title: 'AUTO PLAY',
					text: 'Plays a number of rounds automatically. A confirmation step is always shown before autoplay starts, and the stop button halts it.',
					image: '',
					imagePosition: 'left',
					row: 3,
					column: 0,
				},
				{
					title: 'TURBO',
					text: 'Removes the animation delay between rounds so results appear faster. It does not change the outcome or the RTP.',
					image: '',
					imagePosition: 'left',
					row: 4,
					column: 0,
				},
				{
					title: 'GET BONUS',
					text: 'Instantly triggers the FEATURE ROUND for 100x the player play amount. A confirmation step is always shown before the trigger.',
					image: '',
					imagePosition: 'left',
					row: 5,
					column: 0,
				},
				{
					title: 'WIN TABLE',
					text: 'Opens the paytable, showing every symbol payout, how wins form, and the rules of each mode.',
					image: '',
					imagePosition: 'left',
					row: 6,
					column: 0,
				},
				{
					title: 'INFO',
					text: 'Opens the game rules, including the RTP, the max win, the interaction guide and the disclaimer.',
					image: '',
					imagePosition: 'left',
					row: 7,
					column: 0,
				},
				{
					title: 'SETTINGS',
					text: 'Opens the sound settings, where the master, music and sound effect volumes are adjusted. Setting the master volume to zero mutes all audio.',
					image: '',
					imagePosition: 'left',
					row: 8,
					column: 0,
				},
				{
					title: 'SOUND',
					text: 'Toggles all audio on or off. Sound effects, music and ambient sounds are muted together.',
					image: '',
					imagePosition: 'left',
					row: 9,
					column: 0,
				},
				{
					title: 'MENU',
					text: 'Opens the side menu, giving access to the paytable, the game rules, the settings and the sound switch.',
					image: '',
					imagePosition: 'left',
					row: 10,
					column: 0,
				},
				{
					title: 'EXIT',
					text: 'Closes the side menu.',
					image: '',
					imagePosition: 'left',
					row: 11,
					column: 0,
				},
			],
			rows: 12,
			columns: 1,
			title: 'CONTROLS',
		},
		{
			containers: [
				{
					title: 'DISCLAIMER',
					text:
						'Malfunction voids all wins and plays. A consistent internet connection is required. In the event of a disconnection, reload the game to finish any uncompleted rounds. The expected return is calculated over many plays. The game display is not representative of any physical device and is for illustrative purposes only. Winnings are settled according to the amount received from the Remote Game Server and not from events within the web browser. TM and © 2026 Engine.',
					image: '',
					imagePosition: 'left',
					row: 0,
					column: 0,
				},
			],
			rows: 1,
			columns: 1,
			title: 'DISCLAIMER',
		},
	],
	splashScreen: [],
};

export { LUNAR_VAULT_BET_MODE_META, LUNAR_VAULT_GAME_RULE_META, LUNAR_VAULT_SYMBOLS };
