<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate, requestReplay } from 'rgs-requests';
	import {
		stateUrlDerived,
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateUi,
		stateMeta,
	} from 'state-shared';
	import { API_AMOUNT_MULTIPLIER, MOST_USED_BET_INDEXES } from 'constants-shared/bet';

	type Props = { children: Snippet };

	const props: Props = $props();

	let authenticated = $state(false);

	const authenticate = async () => {
		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;

			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				stateBet.currency = authenticateData.balance.currency;
				stateBet.balanceAmount = authenticateData.balance.amount / API_AMOUNT_MULTIPLIER;
			}

			// config
			if (authenticateData?.config) {
				// Example of authenticateData.config
				// {
				// 	"gameID": "37_test-lines",
				// 	"minBet": 100000,
				// 	"maxBet": 1000000000,
				// 	"stepBet": 10000,
				// 	"defaultBetLevel": 1000000,
				// 	"betLevels": [100000, 200000, ..., 1000000000],
				// 	"betModes": {},
				// 	"jurisdiction": {
				// 			"socialCasino": false,
				// 			"disabledFullscreen": false,
				// 			"disabledTurbo": false,
				// 			"disabledSuperTurbo": false,
				// 			"disabledAutoplay": false,
				// 			"disabledSlamstop": false,
				// 			"disabledSpacebar": false,
				// 			"disabledBuyFeature": false,
				// 			"displayNetPosition": false,
				// 			"displayRTP": false,
				// 			"displaySessionTimer": false,
				// 			"minimumRoundDuration": 0
				// 	}
				// }
				stateConfig.jurisdiction = {
					...stateConfig.jurisdiction,
					...authenticateData.config.jurisdiction,
				};
				const { minBet = 0, maxBet = 0, stepBet = 0 } = authenticateData.config;
				stateConfig.betLimits = { min: minBet, max: maxBet, step: stepBet };
				const serverLevels = authenticateData.config.betLevels || [];
				if (
					!serverLevels.length ||
					serverLevels.some(
						(level) =>
							!Number.isSafeInteger(level) ||
							level < minBet ||
							level > maxBet ||
							(stepBet > 0 && level % stepBet !== 0),
					)
				)
					throw new Error('The session returned an invalid play-amount configuration.');
				stateConfig.betAmountOptions = serverLevels.map((level) => level / API_AMOUNT_MULTIPLIER);
				const defaultAmount =
					(authenticateData.config.defaultBetLevel ?? 0) / API_AMOUNT_MULTIPLIER;
				const levels = stateConfig.betAmountOptions;
				if (!levels.includes(defaultAmount))
					throw new Error('The session default amount is unavailable.');
				stateBet.betAmount = defaultAmount;
				stateBet.wageredBetAmount = stateBet.betAmount;
				const modes =
					(
						authenticateData.config as {
							gameModes?: Record<string, { costMultiplier: number; maxBet: number }>;
						}
					).gameModes ?? {};
				stateConfig.betModeLimits = Object.fromEntries(
					Object.entries(modes).map(([key, value]) => [key.toLowerCase(), value]),
				);
				for (const [key, value] of Object.entries(stateConfig.betModeLimits)) {
					const known = stateMeta.betModeMeta[key] ?? stateMeta.betModeMeta[key.toUpperCase()];
					if (
						known &&
						(known.costMultiplier !== value.costMultiplier ||
							!Number.isSafeInteger(value.maxBet) ||
							value.maxBet < minBet)
					)
						throw new Error('The session mode does not match this game version.');
				}
				stateConfig.betMenuOptions = stateConfig.betAmountOptions.filter((_, index) =>
					MOST_USED_BET_INDEXES.includes(index),
				);
			}

			// round
			if (authenticateData?.round?.active) {
				// Example of authenticateData.round
				// {
				// 	"betID": 62277967,
				// 	"amount": 1000000,
				// 	"payout": 33400000,
				// 	"payoutMultiplier": 33.4,
				// 	"active": true,
				// 	"state": [...],
				// 	"mode": "BONUS",
				// 	"event": null
				// }

				if (authenticateData.round?.state) {
					// @ts-ignore
					stateBet.betToResume = authenticateData.round;
				}

				if (authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? authenticateData.round.amount / API_AMOUNT_MULTIPLIER
							: 0;
					stateBet.betAmount = betAmountValue;
					stateBet.wageredBetAmount = betAmountValue;
				}

				if (authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				}
			}
		} catch (error) {
			stateModal.modal = { name: 'error', error };
		}
	};

	const handleReplay = async () => {
		stateBet.currency = stateUrlDerived.currency();
		stateBet.betAmount = stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER || 0;
		stateBet.wageredBetAmount = stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER || 0;
		stateBet.activeBetModeKey = stateUrlDerived.mode();

		const data = await requestReplay({
			rgsUrl: stateUrlDerived.rgsUrl(),
			game: stateUrlDerived.game(),
			mode: stateUrlDerived.mode(),
			version: stateUrlDerived.version(),
			event: stateUrlDerived.event(),
		});

		if (data) {
			const multiplier = (data as { costMultiplier?: number }).costMultiplier;
			stateBet.replayCostMultiplier =
				Number.isFinite(multiplier) && multiplier! >= 1
					? multiplier!
					: (stateBetDerived.activeBetMode()?.costMultiplier ?? 1);
			// @ts-ignore
			stateBet.betToResume = {
				...data,
				event: '0',
				active: true,
				mode: stateUrlDerived.mode(),
			};
		}
	};

	onMount(async () => {
		if (stateUrlDerived.replay()) {
			stateUi.config.mode = 'replay';
			try {
				await handleReplay();
			} catch (error) {
				stateModal.modal = { name: 'error', error };
			}
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		}

		authenticated = true;
	});
</script>

{#if authenticated}
	{@render props.children()}
{/if}
