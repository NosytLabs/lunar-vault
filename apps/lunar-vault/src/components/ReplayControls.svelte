<script lang="ts">
	import { stateBet, stateUi, stateModal } from 'state-shared';
	import { getContext } from '../game/context';
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
	<button class="replay" {disabled} onclick={playAgain}>Play again</button>
{/if}

<style>
	.replay {
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
