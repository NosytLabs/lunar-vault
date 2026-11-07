<script lang="ts">
	import { OptionsGrid } from 'components-shared';
	import { getContextLayout } from 'utils-layout';
	import { stateBet, stateConfig } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import BaseIcon from './BaseIcon.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';

	const { stateLayoutDerived } = getContextLayout();
	const count = $derived(stateLayoutDerived.layoutType() === 'landscape' ? 15 : 18);
	const options = $derived(
		[
			...stateConfig.betMenuOptions.slice(0, count - 1),
			...stateConfig.betMenuOptions.slice(-1),
		].filter((value, index, array) => array.indexOf(value) === index),
	); //always includes last, and without duplicate

	const isMaxValue = (value: number) => value === options[options.length - 1];
	// Engine guideline [219]: the balance, the bet, the win and any modal
	// amounts all follow the currency. This used to render a bare
	// toFixed(2) with a K/M compaction, so a JPY level showed as "100.00"
	// and a large level as "1.00K" - neither of which is a currency amount.
	const formatValue = (value: number) => numberToCurrencyString(Math.abs(value));
</script>

<OptionsGrid
	value={stateBet.betAmount}
	{options}
	onchange={(value) => (stateBet.betAmount = value)}
>
	{#snippet option({ option })}
		<BaseIcon
			width="100%"
			height="2rem"
			border={option === stateBet.betAmount ? '2px white solid' : '2px black solid'}
		/>
		<BaseButtonContent>
			<span style="font-size: 1rem;"
				>{isMaxValue(option) ? i18nDerived.max() : formatValue(option)}</span
			>
		</BaseButtonContent>
	{/snippet}
</OptionsGrid>
