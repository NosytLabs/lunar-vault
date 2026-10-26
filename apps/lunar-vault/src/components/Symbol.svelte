<script lang="ts">
	import SymbolSprite from './SymbolSprite.svelte';
	import { getSymbolInfo } from '../game/utils';
	import type { SymbolState, RawSymbol } from '../game/types';
	import { Text } from 'pixi-svelte';

	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		rawSymbol: RawSymbol;
		oncomplete?: () => void;
		loop?: boolean;
	};

	const props: Props = $props();
	const symbolInfo = $derived(getSymbolInfo({ rawSymbol: props.rawSymbol, state: props.state }));
</script>

<SymbolSprite
	state={props.state}
	{symbolInfo}
	x={props.x}
	y={props.y}
	oncomplete={props.oncomplete}
/>

{#if props.rawSymbol.name === 'W' || props.rawSymbol.name === 'S'}
	<Text
		anchor={0.5}
		x={props.x}
		y={(props.y ?? 0) + 43}
		text={props.rawSymbol.name === 'W' ? 'WILD' : 'ECLIPSE'}
		style={{
			fontFamily: 'Lunar Sans',
			fontWeight: '700',
			fontSize: 14,
			letterSpacing: 2,
			fill: 0xffe6ad,
			stroke: { color: 0x061224, width: 3 },
		}}
	/>
{/if}
{#if (props.rawSymbol.multiplier ?? 1) > 1}
	<Text
		anchor={0.5}
		x={props.x}
		y={props.y}
		text={`${props.rawSymbol.multiplier}X`}
		style={{
			fontFamily: 'Lunar Display',
			fill: 0xffe4a1,
			stroke: { color: 0x071022, width: 5 },
			fontSize: 50,
		}}
	/>
{/if}
