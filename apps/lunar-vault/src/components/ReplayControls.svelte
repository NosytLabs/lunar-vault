<script lang="ts">
	import { stateBet, stateUi, stateModal } from 'state-shared';
	import { getContext } from '../game/context';
	import { numberToCurrencyString } from 'utils-shared/amount';
	const context = getContext();
	// Preserve the server replay book before ResumeBet consumes the shared pointer.
	const replayBook = stateUi.config.mode === 'replay' ? stateBet.betToResume : null;
	const disabled = $derived(
		context.stateLayout.showLoadingScreen ||
			!context.stateXstateDerived.isIdle() ||
			Boolean(stateModal.modal),
	);
	function playAgain() {
		if (disabled || !replayBook) return;
		stateBet.betToResume = { ...replayBook, active: true, event: '0' };
		context.eventEmitter.broadcast({ type: 'resumeBet' });
	}
</script>

{#if replayBook && !context.stateLayout.showLoadingScreen}
	<div class="replay-cost">
		<span>REPLAY · {stateBet.activeBetModeKey.toUpperCase()}</span>
		<b>PLAY AMOUNT {numberToCurrencyString(stateBet.betAmount)}</b>
		<span
			>{stateBet.replayCostMultiplier}× · TOTAL PLAY {numberToCurrencyString(
				stateBet.betAmount * stateBet.replayCostMultiplier,
			)}</span
		>
	</div>
	<button class="replay" {disabled} onclick={playAgain}>Play again</button>
{/if}

<style>
	.replay-cost {
		position: fixed;
		top: 8px;
		left: 8px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 8px 10px;
		border: 1px solid #bba16b;
		border-radius: 8px;
		background: #0c1d30ee;
		color: #ecd5ae;
		font:
			600 11px 'Lunar Sans',
			sans-serif;
	}
	@media (max-height: 300px) {
		.replay-cost {
			font-size: 8px;
			padding: 4px;
			gap: 1px;
			top: 3px;
			left: 3px;
		}
	}
	.replay {
		min-height: 44px;
		position: fixed;
		bottom: max(12px, env(safe-area-inset-bottom));
		right: 12px;
		padding: 10px 24px;
		border: 1px solid #d7b77e;
		border-radius: 24px;
		background: #102138;
		color: #ffe4ad;
		font:
			600 14px Arial,
			sans-serif;
		cursor: pointer;
	}
	.replay:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.replay:focus-visible {
		outline: 2px solid white;
		outline-offset: 3px;
	}
	@media (orientation: portrait) {
		.replay {
			top: max(64px, env(safe-area-inset-top));
			bottom: auto;
		}
	}
</style>
