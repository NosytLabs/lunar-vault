<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { stateUi } from 'state-shared';
	import { MODE_DISPLAY_NAMES } from '../game/metadata';
	const { compact = false }: { compact?: boolean } = $props();
</script>

<div class="feature-progress" class:compact role="status" aria-live="polite" aria-atomic="true">
	<span class="feature-name">{MODE_DISPLAY_NAMES.bonus}</span>
	<strong>FREE SPIN {stateUi.freeSpinCounterCurrent} / {stateUi.freeSpinCounterTotal}</strong>
	{#if !compact}<div class="orbit-track" aria-hidden="true">
			<i
				style={`width: ${Math.min(100, (stateUi.freeSpinCounterCurrent / Math.max(1, stateUi.freeSpinCounterTotal)) * 100)}%`}
			></i>
		</div>{/if}
</div>

<style>
	.feature-progress {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		padding: 3px 12px;
		color: #f3dfb3;
		font-family: 'Lunar Sans', sans-serif;
	}
	.feature-progress.compact {
		padding: 0;
		flex-direction: row;
		justify-content: flex-start;
		align-items: center;
		flex-wrap: wrap;
		gap: 2px 8px;
	}
	.compact .feature-name,
	.compact strong {
		font-size: 9px;
		letter-spacing: 0.3px;
	}
	.feature-name {
		font-size: 10px;
		letter-spacing: 1.5px;
		color: #c9cbd1;
	}
	strong {
		font-size: 20px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.orbit-track {
		height: 2px;
		background: #435365;
		overflow: hidden;
	}
	.orbit-track i {
		display: block;
		height: 100%;
		background: #e3c185;
	}
	@media (max-width: 600px) and (min-height: 360px) {
		.feature-progress {
			grid-column: 1/5;
			grid-row: 2;
			padding: 4px 10px;
			min-height: 44px;
		}
		.feature-progress.compact {
			min-height: 0;
		}
		strong {
			font-size: 19px;
		}
	}
	@media (max-height: 359px) {
		.feature-progress {
			gap: 3px;
			padding: 0 4px;
		}
		.feature-name {
			font-size: 7px;
			letter-spacing: 0.4px;
		}
		strong {
			font-size: 12px;
		}
		.compact .feature-name,
		.compact strong {
			font-size: 7px;
		}
	}
</style>
