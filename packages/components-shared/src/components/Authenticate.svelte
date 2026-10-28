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
	import { normalizeGameModes } from 'utils-shared/gameModes';
	import {
		validateReplayRound,
		validateWalletRound,
		validateRoundCheckpoint,
	} from 'utils-shared/roundValidation';
	import { API_AMOUNT_MULTIPLIER, MOST_USED_BET_INDEXES } from 'constants-shared/bet';

	type Props = { children: Snippet };

	const props: Props = $props();

	let authenticated = $state(false);

	const authenticate = async () => {
		stateConfig.walletReady = false;
		try {
			const authenticateData = await requestAuthenticate({
				rgsUrl: stateUrlDerived.rgsUrl(),
				sessionID: stateUrlDerived.sessionID(),
				language: stateUrlDerived.lang(),
			});

			// error
			if (authenticateData?.error) throw authenticateData;

			if (!authenticateData?.config || !authenticateData.balance)
				throw new Error('The session returned an incomplete configuration.');
			if (
				!Number.isSafeInteger(authenticateData.balance.amount) ||
				authenticateData.balance.amount < 0 ||
				typeof authenticateData.balance.currency !== 'string' ||
				!authenticateData.balance.currency.trim()
			)
				throw new Error('The session returned an invalid balance.');
			const minimumRoundDuration = authenticateData.config.jurisdiction?.minimumRoundDuration ?? 0;
			if (!Number.isFinite(minimumRoundDuration) || minimumRoundDuration < 0)
				throw new Error('The session returned an invalid round-duration requirement.');
			if (minimumRoundDuration > 0)
				throw {
					error: 'ERR_DURATION',
					message:
						'This session requires a round-duration setting that this game version cannot safely interpret.',
				};
			// balance
			if (authenticateData?.balance) {
				// Example of authenticateData.balance
				// {
				// 		"amount": 10000000000000000,
				// 		"currency": "USD"
				// },
				stateBet.currency = authenticateData.balance.currency;
				stateBet.balanceAmount = authenticateData.balance.amount / API_AMOUNT_MULTIPLIER;
				stateBet.sessionStartingBalanceAmount = stateBet.balanceAmount;
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
				if (
					!Number.isSafeInteger(minBet) ||
					minBet <= 0 ||
					!Number.isSafeInteger(maxBet) ||
					maxBet < minBet ||
					!Number.isSafeInteger(stepBet) ||
					stepBet < 0
				)
					throw new Error('The session returned invalid play-amount limits.');
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
				stateConfig.betModeLimits = normalizeGameModes(
					authenticateData.config.gameModes,
					Object.fromEntries(
						Object.entries(stateMeta.betModeMeta).map(([key, mode]) => [key, mode.costMultiplier]),
					),
				);
				stateConfig.betMenuOptions = stateConfig.betAmountOptions.filter((_, index) =>
					MOST_USED_BET_INDEXES.includes(index),
				);
			}

			// round
			if (
				authenticateData.round?.active !== undefined &&
				typeof authenticateData.round.active !== 'boolean'
			)
				throw new Error('The session returned an invalid round status.');
			if (authenticateData?.round?.active) {
				const round = validateWalletRound(authenticateData.round);
				stateMeta.validateBookEvents?.(round.state);
				if (
					typeof round.amount !== 'number' ||
					!Number.isSafeInteger(round.amount) ||
					round.amount <= 0
				)
					throw new Error('The saved round play amount is invalid.');
				validateRoundCheckpoint(round.event, round.state.length);
				const knownRoundMode =
					typeof round.mode === 'string'
						? (stateMeta.betModeMeta[round.mode.trim().toLowerCase()] ??
							stateMeta.betModeMeta[round.mode.trim().toUpperCase()])
						: null;
				if (
					!knownRoundMode ||
					(round.costMultiplier !== undefined &&
						round.costMultiplier !== knownRoundMode.costMultiplier)
				)
					throw new Error('The saved round mode is unavailable in this game version.');
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
			stateConfig.sessionStartedAt = Date.now();
			stateConfig.walletReady = true;
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

		const replay = validateReplayRound(data);
		stateMeta.validateBookEvents?.(replay.state);
		if (!stateBetDerived.activeBetMode()) throw new Error('This replay mode is unavailable.');
		if (replay) {
			stateBet.replayCostMultiplier = replay.costMultiplier;
			// @ts-ignore
			stateBet.betToResume = {
				...replay,
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
