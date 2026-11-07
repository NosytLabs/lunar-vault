<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	import { requestAuthenticate, requestReplay } from 'rgs-requests';
	import { stateUrlDerived, stateBet, stateConfig, stateModal, stateUi } from 'state-shared';
	import type { BetToResume } from 'state-shared';
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
				stateConfig.jurisdiction = authenticateData?.config?.jurisdiction;
				stateConfig.betAmountOptions = (authenticateData.config?.betLevels || []).map(
					(level) => level / API_AMOUNT_MULTIPLIER,
				);
				stateConfig.betMenuOptions = stateConfig.betAmountOptions.filter((_, index) =>
					MOST_USED_BET_INDEXES.includes(index),
				);

				// Engine guideline [242]: the opening bet must come from the
				// authenticate response, not from a hardcoded default.
				const defaultBetLevel = authenticateData.config?.defaultBetLevel;
				if (defaultBetLevel !== undefined && defaultBetLevel !== null) {
					stateConfig.defaultBetLevel = defaultBetLevel / API_AMOUNT_MULTIPLIER;
				}
			}

			// round
			if (authenticateData?.round) {
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

				if(authenticateData.round?.state) {
					// The RGS types the round's book events as `unknown[]`, while
					// the game knows their concrete shape. The cast is the
					// boundary between the two.
					stateBet.betToResume = authenticateData.round as unknown as BetToResume;
				}

				// Engine guideline [187]: only an ACTIVE round's amount
				// becomes the stake. A closed round carries an amount too,
				// and applying it here would leave the game opening on the
				// previous round's stake instead of the RGS's default.
				if (authenticateData.round?.active && authenticateData.round?.amount) {
					const betAmountValue =
						authenticateData.round.amount > 0
							? authenticateData.round.amount / API_AMOUNT_MULTIPLIER
							: 0;
					stateBet.betAmount = betAmountValue;
					stateBet.wageredBetAmount = betAmountValue;
				}

				if (authenticateData.round?.mode) {
					stateBet.activeBetModeKey = authenticateData.round.mode;
				};
			}

			// Engine guideline [242]: with no active round the game opens on
			// the RGS's defaultBetLevel. Guideline [187]: an active round's
			// amount wins over it, and the stake stays that amount after the
			// round finishes.
			//
			// The RGS sends the last round's details even when that round is
			// finished, and a finished round still carries an amount. Only
			// `active: true` means there is a round to resume, so that is
			// the flag that decides whether the round's stake wins over the
			// default. Treating "has an amount" as "is active" left the game
			// opening on a closed round's stale stake.
			const hasActiveRound = Boolean(authenticateData?.round?.active);
			if (!hasActiveRound && stateConfig.defaultBetLevel !== null) {
				stateBet.betAmount = stateConfig.defaultBetLevel;
				stateBet.wageredBetAmount = stateConfig.defaultBetLevel;
			}
		} catch (error) {
			console.error(error);
			stateModal.modal = { name: 'error', error };
		}
	};

	const handleReplay = async () => {
		stateBet.betAmount = (stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER) || 0;
		stateBet.wageredBetAmount = (stateUrlDerived.amount() / API_AMOUNT_MULTIPLIER) || 0;
		stateBet.activeBetModeKey = stateUrlDerived.mode();

		// Engine guideline [172]: the optional URL parameters must be applied.
		// A replay never authenticates, so the currency parameter is the only
		// source for the display currency - without it every amount renders in
		// the default USD, which is also wrong for the social currencies.
		const replayCurrency = stateUrlDerived.currency();
		if (replayCurrency) {
			stateBet.currency = replayCurrency;
		}

		const data = await requestReplay({
			rgsUrl: stateUrlDerived.rgsUrl(),
			game: stateUrlDerived.game(),
			mode: stateUrlDerived.mode(),
			version: stateUrlDerived.version(),
			event: stateUrlDerived.event(),
		});

		// An RGS can answer a replay with a 200 and an error payload. That
		// is a failed replay too, and it must not be played back as a round.
		if (data?.error) {
			throw Object.assign(new Error(String(data.error)), { data });
		}

		if(data) {
			// The replay payload's book events are typed as `unknown[]` by the
			// RGS client, while the game knows their concrete shape. The cast
			// is the boundary between the two.
			stateBet.betToResume = {
				...data,
				event: '0',
				active: true,
				mode: stateUrlDerived.mode(),
			} as unknown as BetToResume;
			// Keep a copy so "Play Again" can replay the same event locally.
			stateBet.replayBet = stateBet.betToResume;
		}
	};

	onMount(async () => {
		if(stateUrlDerived.replay()) {
			stateUi.config.mode = 'replay';
			// Engine guideline [171]: a failed replay must surface an error.
			// Without this the rejection escapes onMount, the children never
			// render and the player gets a blank screen with no explanation.
			//
			// The error modal lives inside the children, so the children have
			// to render even when the replay failed. Otherwise the modal is
			// never mounted and the player still gets a blank screen.
			try {
				await handleReplay();
			} catch (error) {
				console.error(error);
				// Keep the RGS's own error payload when there is one - it is
				// player-facing text and the error modal shows it.
				const data = (error as { data?: unknown })?.data;
				stateModal.modal = {
					name: 'error',
					error: data ?? error,
				};
			}
		} else {
			stateUi.config.mode = 'default';
			await authenticate();
		};

		authenticated = true;
	});
</script>

{#if authenticated}
	{@render props.children()}
{/if}
