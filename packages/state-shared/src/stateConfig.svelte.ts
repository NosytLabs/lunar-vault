export const stateConfig = $state({
	jurisdiction: {
		socialCasino: false,
		disabledFullscreen: false,
		disabledTurbo: false,
		disabledSuperTurbo: false,
		disabledAutoplay: false,
		disabledSlamstop: false,
		disabledSpacebar: false,
		disabledBuyFeature: false,
		displayNetPosition: false,
		displayRTP: false,
		displaySessionTimer: false,
		minimumRoundDuration: 0,
	},
	/**
	 * The bet the game opens on, taken from the authenticate response.
	 *
	 * Engine guideline [242]: minBet, maxBet, stepBet, defaultBetLevel and
	 * betLevels must all come from the authenticate response. A hardcoded
	 * default fails the review, so this stays null until the RGS supplies a
	 * value.
	 */
	defaultBetLevel: null as number | null,
	/**
	 * The bet levels from the authenticate response, already converted from
	 * the RGS's integer units to the game's decimal units.
	 */
	betAmountOptions: [1, 5, 25, 50, 75, 100, 200, 500, 800, 1000],
	betMenuOptions: [1, 5, 25, 50, 75, 100, 200, 500, 800, 1000],
});
