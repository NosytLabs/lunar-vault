<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { stateBetDerived, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import UiLabel from './UiLabel.svelte';
	import { getContext } from '../context';
	import { i18nDerived, translate } from '../i18n/i18nDerived';

	type Props = {
		stacked?: boolean;
	};

	const props: Props = $props();
	const context = getContext();

	// Engine guideline [174]: for a mode costing more than 1x, the bet label
	// has to show the multiplier and the real cost, not just the base bet.
	//
	// The label comes from the game metadata, which is player-facing text and
	// therefore has to pass through the social-mode translation layer. The
	// metadata label wins when it is set; otherwise the localised "BET" is used.
	const mode = $derived(stateBetDerived.activeBetMode());
	const multiplier = $derived(mode?.type === 'default' ? 1 : (mode?.costMultiplier ?? 1));
	const label = $derived(
		translate(
			multiplier > 1
				? `${mode?.text.betAmountLabel || mode?.text.title || i18nDerived.bet()} · ${multiplier}x`
				: mode?.text.betAmountLabel || i18nDerived.bet(),
		),
	);
	const value = $derived(numberToCurrencyString(stateBetDerived.betCost()));
	const disabled = $derived(!context.stateXstateDerived.isIdle());

	const onpress = () => {
		if (disabled) return;
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'betAmountMenu' };
	};
</script>

<Container eventMode="static" cursor={disabled ? 'not-allowed' : 'pointer'} onpointerup={onpress}>
	<UiLabel tiled {label} {value} stacked={props.stacked} />
</Container>
