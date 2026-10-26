<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';
	type Props = {
		x?: number; y?: number; state: SymbolState;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		oncomplete?: () => void;
	};
	const props: Props = $props();
	let phase = $state(0);
	const winning = $derived(props.state === 'win');
	const landing = $derived(props.state === 'land');
	const pulse = $derived(winning ? 1 + 0.115 * Math.sin(Math.PI * phase) : landing ? 0.93 + 0.07 * phase : 1);
	$effect(() => {
		const state = props.state;
		if (state !== 'land' && state !== 'win') {
			phase = 0;
			return;
		}
		const duration = state === 'win' ? 460 : 110;
		const start = performance.now();
		let frame = 0;
		let done = false;
		const animate = (now: number) => {
			phase = Math.min(1, (now - start) / duration);
			if (phase >= 1) {
				if (!done) {
					done = true;
					props.oncomplete?.();
				}
			} else {
				frame = requestAnimationFrame(animate);
			}
		};
		frame = requestAnimationFrame(animate);
		// Respect book-driven completion; restarting a symbol cancels stale callbacks.
		return () => cancelAnimationFrame(frame);
	});
</script>

{#if winning}
	<Sprite key="lunarWinAura" x={props.x} y={props.y} anchor={0.5}
		width={SYMBOL_SIZE * (1.28 + phase * 0.18)}
		height={SYMBOL_SIZE * (1.28 + phase * 0.18)}
		alpha={Math.max(0, Math.sin(Math.PI * phase)) * 0.91} />
{/if}
<Sprite x={props.x} y={props.y} anchor={0.5} key={props.symbolInfo.assetKey}
	width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * pulse}
	height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * pulse} />
