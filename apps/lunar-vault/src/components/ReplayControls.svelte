<script lang="ts">
	import { stateBet, stateUi, stateModal, stateSound } from 'state-shared';
	import { getContext } from '../game/context';
	import { bookEventAmountToCurrencyString, numberToCurrencyString } from 'utils-shared/amount';
	import { MODE_DISPLAY_NAMES } from '../game/metadata';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
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
	<div class="replay-bar">
		<button
			class="info"
			onclick={() => (stateModal.modal = { name: 'gameRules' })}
			aria-label="Game information">i</button
		>
		<div class="replay-cost" class:feature-active={stateUi.freeSpinCounterShow}>
			{#if stateUi.freeSpinCounterShow}<FreeSpinCounter compact />{:else}
				<span
					>REPLAY · {MODE_DISPLAY_NAMES[stateBet.activeBetModeKey.toLowerCase()] ??
						MODE_DISPLAY_NAMES.base}</span
				>{/if}<b>PLAY AMOUNT {numberToCurrencyString(stateBet.betAmount)}</b><span
				>{stateBet.replayCostMultiplier}× · TOTAL PLAY {numberToCurrencyString(
					stateBet.betAmount * stateBet.replayCostMultiplier,
				)}</span
			>
		</div>
		<div class="replay-win">
			<span>WIN</span><b>{bookEventAmountToCurrencyString(stateBet.winBookEventAmount)}</b>
		</div>
		<button class="replay" {disabled} onclick={playAgain}>Play again</button>
	</div>
	<button
		class="replay-mute"
		aria-label={stateSound.volumeValueMaster ? 'Mute all sound' : 'Enable sound'}
		onclick={() => (stateSound.volumeValueMaster = stateSound.volumeValueMaster ? 0 : 50)}
		>{stateSound.volumeValueMaster ? 'MUTE' : 'SOUND'}</button
	>
{/if}

<style>
	.replay-bar {
		position: fixed;
		bottom: 12px;
		left: 50%;
		transform: translateX(-50%);
		width: min(720px, 96vw);
		padding: 10px;
		display: flex;
		align-items: center;
		gap: 16px;
		border: 1px solid #b7a16c66;
		border-radius: 10px;
		background: #091725ed;
		color: #f4e1b7;
		font:
			600 12px 'Lunar Sans',
			sans-serif;
		box-sizing: border-box;
		z-index: 20;
	}
	.replay-cost {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
		min-width: 0;
	}
	.replay-cost.feature-active {
		gap: 2px;
	}
	.replay-cost :global(.feature-progress) {
		padding: 0;
	}
	.replay-cost b {
		font-size: 14px;
		font-weight: 600;
	}
	.replay-cost span {
		font-size: 10px;
	}
	.replay-win {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.replay-win span {
		font-size: 9px;
		letter-spacing: 1px;
		color: #b9c9d0;
	}
	.replay-win b {
		font-size: 22px;
		font-weight: 600;
		white-space: nowrap;
	}
	.info,
	.replay-mute {
		min-width: 44px;
		min-height: 44px;
		padding: 5px;
		border: 1px solid #b7a16c66;
		border-radius: 6px;
		background: #10243a;
		color: inherit;
		font:
			600 13px 'Lunar Sans',
			sans-serif;
		cursor: pointer;
	}
	.info {
		font-size: 22px;
	}
	.replay {
		min-height: 44px;
		padding: 10px 18px;
		border: 1px solid #e8cd8b;
		border-radius: 6px;
		background: #ceaa62;
		color: #102238;
		font:
			600 14px 'Lunar Sans',
			sans-serif;
		cursor: pointer;
	}
	.replay:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.replay-mute {
		position: fixed;
		right: 10px;
		top: 10px;
		z-index: 21;
		color: #efd8aa;
	}
	.replay-bar button:focus-visible,
	.replay-mute:focus-visible {
		outline: 3px solid #fff0bd;
		outline-offset: 2px;
	}
	@media (max-height: 300px) {
		.replay-bar {
			bottom: 4px;
			padding: 3px;
			gap: 7px;
		}
		.replay-cost b,
		.replay-cost span {
			font-size: 8px;
		}
		.replay-win b {
			font-size: 15px;
		}
		.replay {
			font-size: 11px;
			padding: 6px 10px;
		}
		.replay-mute {
			top: 4px;
			right: 4px;
			font-size: 9px;
		}
	}
</style>
