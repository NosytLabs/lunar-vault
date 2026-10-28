<script lang="ts">
	import { stateBet, stateBetDerived, stateModal, type BetModeData } from 'state-shared';
	import { Button } from 'components-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import BaseIcon from './BaseIcon.svelte';
	import BonusCard from './BonusCard.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { stateBonus } from '../stateBonus.svelte';
	import type { EmitterEventModal } from '../types';

	type Props = {
		list: BetModeData[];
	};

	const props: Props = $props();
	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();
</script>

{#each props.list as betModeData}
	{#if betModeData.type !== 'default'}
		<BonusCard>
			{#snippet title()}
				{#if betModeData.assets.icon}
					<img class="feature-icon" src={betModeData.assets.icon} alt="" />
				{/if}
				<div class="title">
					{betModeData.text.title}
				</div>
			{/snippet}

			{#snippet description()}
				{#if betModeData?.text?.description}
					<div class="description">
						{betModeData.text.description}
					</div>
				{/if}
			{/snippet}

			{#snippet price()}
				{#if !stateBetDerived.isModeAmountAvailable(betModeData.mode)}<small
						>Choose a lower play amount for this feature.</small
					>{/if}
				<div class="price">
					{`${numberToCurrencyString(stateBet.betAmount * stateBetDerived.modeCostMultiplier(betModeData.mode))}`}
				</div>
			{/snippet}

			{#snippet button()}
				<Button
					onclick={() => {
						stateBonus.selectedBetModeKey = betModeData.mode;
						eventEmitter.broadcast({ type: 'buyBonusConfirm' });
						eventEmitter.broadcast({ type: 'soundPressGeneral' });
					}}
					disabled={stateBet.betAmount <= 0 ||
						!stateBetDerived.isModeAmountAvailable(betModeData.mode) ||
						stateBet.balanceAmount <
							stateBet.betAmount * stateBetDerived.modeCostMultiplier(betModeData.mode)}
				>
					<BaseIcon width="100%" height="44px" border="1px solid #dfbf82;" />
					<BaseButtonContent>
						<span style="font-size: 1rem;">{betModeData.text.button}</span>
					</BaseButtonContent>
				</Button>
			{/snippet}
		</BonusCard>
	{/if}
{/each}

<style lang="scss">
	.feature-icon {
		width: 92px;
		height: 92px;
		align-self: center;
	}
	.title {
		font:
			bold 22px/1.2 Georgia,
			serif;
		color: #f6dca9;
		text-align: center;
	}

	.description {
		font-size: 14px;
		line-height: 1.5;
		text-align: center;
		white-space: pre-line;
		display: inline-flex;
		align-items: center;
	}

	.description:empty {
		display: none;
	}

	.price {
		font-size: 22px;
		line-height: 1.4;
		text-align: center;
		white-space: nowrap;
	}
</style>
