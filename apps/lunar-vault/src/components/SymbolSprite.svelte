<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';
	type Props = { x?: number; y?: number; state: SymbolState; symbolInfo: ReturnType<typeof getSymbolInfo>; oncomplete?: () => void; };
	const props: Props = $props();
	const winning = $derived(props.state === 'win');
	$effect(() => {
		const state = props.state;
		if (state !== 'land' && state !== 'win') return;
		// Asynchronous completion is required by event playback; visual effects never determine payout.
		const timer = window.setTimeout(() => props.oncomplete?.(), state === 'win' ? 450 : 75);
		return () => window.clearTimeout(timer);
	});
</script>
{#if winning}
	<Sprite key="lunarWinAura" x={props.x} y={props.y} anchor={0.5} width={SYMBOL_SIZE * 1.28} height={SYMBOL_SIZE * 1.28} alpha={0.85} />
{/if}
<Sprite x={props.x} y={props.y} anchor={0.5} key={props.symbolInfo.assetKey} width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * (winning ? 1.05 : 1)} height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * (winning ? 1.05 : 1)} />
