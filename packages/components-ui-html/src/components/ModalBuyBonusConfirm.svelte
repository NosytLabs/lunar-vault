<script lang="ts">
	import { Button, Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import {
		stateBet,
		stateBetDerived,
		stateModal,
		stateUi,
		stateConfig,
		INFINITY_MARK,
	} from 'state-shared';
	import { getContextEventEmitter } from 'utils-event-emitter';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import BaseIcon from './BaseIcon.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import BaseButtonWrap from './BaseButtonWrap.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { stateBonus, stateBonusDerived } from '../stateBonus.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import type { EmitterEventModal } from '../types';

	const { eventEmitter } = getContextEventEmitter<EmitterEventModal>();
	const multiplier = $derived(stateBetDerived.modeCostMultiplier(stateBonus.selectedBetModeKey));
	const total = $derived(stateBet.betAmount * multiplier);

	const confirm = () => {
		if (stateConfig.jurisdiction.disabledBuyFeature) return;
		if (
			!stateBetDerived.isModeAmountAvailable(stateBonus.selectedBetModeKey) ||
			stateBet.betAmount * stateBetDerived.modeCostMultiplier(stateBonus.selectedBetModeKey) >
				stateBet.balanceAmount
		)
			return;
		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;

		if (stateBonusDerived.selectedBetModeData().type === 'buy') {
			eventEmitter.broadcast({ type: 'bet' });
		}

		if (stateBonusDerived.selectedBetModeData().type === 'activate') {
			stateUi.autoSpinsLossLimitText = INFINITY_MARK;
			stateUi.autoSpinsSingleWinLimitText = INFINITY_MARK;
		}
	};
</script>

{#if stateModal.modal?.name === 'buyBonusConfirm'}
	<Popup
		label={stateBonusDerived.selectedBetModeData().text.title}
		zIndex={zIndex.dialog}
		onclose={() => (stateModal.modal = { name: 'buyBonus' })}
	>
		<BaseContent maxWidth="500px">
			<BaseTitle>
				{stateBonusDerived.selectedBetModeData().text.title}
			</BaseTitle>
			<BaseScrollable type="column">
				{stateBonusDerived.selectedBetModeData().text.dialog}
			</BaseScrollable>
			{#if stateBetDerived.isModeConfigured(stateBonus.selectedBetModeKey)}
				<div class="feature-confirm-total">
					<span>{multiplier}× · PLAY AMOUNT {numberToCurrencyString(stateBet.betAmount)}</span
					><strong>TOTAL PLAY {numberToCurrencyString(total)}</strong>
				</div>
			{:else}<p role="status">This feature is unavailable in this session.</p>{/if}
			<BaseButtonWrap type="max-width">
				<Button
					data-test="confirm-button"
					disabled={stateConfig.jurisdiction.disabledBuyFeature ||
						!stateBetDerived.isModeAmountAvailable(stateBonus.selectedBetModeKey) ||
						total > stateBet.balanceAmount}
					onclick={() => {
						confirm();
						eventEmitter.broadcast({ type: 'soundPressGeneral' });
						stateModal.modal = null;
					}}
				>
					<BaseIcon width="100%" height="44px" />
					<BaseButtonContent>
						<span style="font-size: 1rem;">{i18nDerived.confirm()}</span>
					</BaseButtonContent>
				</Button>
			</BaseButtonWrap>
		</BaseContent>
	</Popup>
{/if}

<style>
	.feature-confirm-total {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		color: #f4d79b;
		text-align: center;
		flex-shrink: 0;
	}
	.feature-confirm-total span {
		font:
			500 12px 'Lunar Sans',
			Arial,
			sans-serif;
	}
	.feature-confirm-total strong {
		font:
			700 18px 'Lunar Sans',
			Arial,
			sans-serif;
	}
</style>
