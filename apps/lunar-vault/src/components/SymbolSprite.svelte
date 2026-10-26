<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';

	type Props = {
		x?: number;
		y?: number;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		state: SymbolState;
		oncomplete?: () => void;
	};

	const props: Props = $props();
	let pulse = $state(1);
	let opacity = $state(1);

	// An Engine book determines the stop and win; animation NEVER changes the result.
	// Complete each landing/winning event exactly once after its visual has ended.
	$effect(() => {
		const state = props.state;
		void props.symbolInfo.assetKey;
		if (state !== 'land' && state !== 'win') {
			pulse = 1;
			opacity = 1;
			return;
		}

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const duration = reducedMotion ? 0 : state === 'win' ? 510 : 190;
		const startedAt = performance.now();
		let frame = 0;
		let finished = false;

		const animate = (now: number) => {
			if (finished) return;
			const t = duration ? Math.min(1, (now - startedAt) / duration) : 1;
			const amplitude = state === 'win' ? 0.16 : 0.09;
			pulse = 1 + amplitude * Math.sin(Math.PI * t);
			opacity = state === 'win' ? 0.92 + 0.08 * Math.sin(Math.PI * t) : 1;
			if (t < 1) {
				frame = requestAnimationFrame(animate);
			} else {
				finished = true;
				pulse = 1;
				opacity = 1;
				props.oncomplete?.();
			}
		};
		frame = requestAnimationFrame(animate);
		return () => {
			finished = true;
			cancelAnimationFrame(frame);
		};
	});
</script>

<Sprite
	x={props.x}
	y={props.y}
	anchor={0.5}
	key={props.symbolInfo.assetKey}
	width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * pulse}
	height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * pulse}
	alpha={opacity}
/>
