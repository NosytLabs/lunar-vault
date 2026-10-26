<script lang="ts">
	import { getContextLayout } from 'utils-layout';
	import { Text } from 'pixi-svelte';
	import { WHITE } from 'constants-shared/colors';

	import UiSprite from './UiSprite.svelte';
	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = {
		label: string;
		value: string;
		tiled?: boolean;
		stacked?: boolean;
	};

	const props: Props = $props();
	const layout = getContextLayout();
	const compact = $derived(
		layout.stateLayoutDerived.canvasSizes().width < 600 && !layout.stateLayoutDerived.isStacked(),
	);

	const labelStyle = $derived({
		fontFamily: 'Lunar Sans',
		fontWeight: '700',
		fontSize: UI_BASE_FONT_SIZE * (compact ? 1.1 : 0.6),
		fill: 0xc3b18d,
	} as const);

	const valueStyle = $derived({
		fontFamily: 'Lunar Sans',
		fontWeight: '700',
		fontSize: UI_BASE_FONT_SIZE * (compact ? 1.3 : 1.13),
		fill: WHITE,
	} as const);
</script>

{#if props.stacked}
	{#if props.tiled}
		<UiSprite
			y={-20}
			anchor={{ x: 0.5, y: 0 }}
			key="base_ticker"
			width={UI_BASE_FONT_SIZE * 3 * (326 / 73)}
			height={UI_BASE_FONT_SIZE * 3}
			borderRadius={20}
		/>
	{/if}
	<Text anchor={{ x: 0.5, y: 0 }} text={props.label} style={labelStyle} />
	<Text
		anchor={{ x: 0.5, y: 0 }}
		text={props.value}
		style={valueStyle}
		y={UI_BASE_FONT_SIZE * (compact ? 1.15 : 1)}
	/>
{:else}
	{#if props.tiled}
		<UiSprite
			x={-90}
			anchor={{ x: 0, y: 0.5 }}
			key="base_ticker"
			width={UI_BASE_FONT_SIZE * 3 * (326 / 73)}
			height={UI_BASE_FONT_SIZE * 3}
			borderRadius={20}
		/>
	{/if}
	<Text anchor={{ x: 0, y: 0.5 }} text={props.label} style={labelStyle} />
	<Text
		anchor={{ x: 1, y: 0.5 }}
		text={props.value}
		style={valueStyle}
		x={UI_BASE_FONT_SIZE * 10}
	/>
{/if}
