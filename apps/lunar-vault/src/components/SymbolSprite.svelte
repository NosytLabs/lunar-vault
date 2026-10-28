<script lang="ts">
	import { stateBet } from 'state-shared';
	import { reducedMotion } from '../game/motion.svelte';
	import { Sprite, Graphics } from 'pixi-svelte';
	import { getSymbolInfo } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import type { SymbolState } from '../game/types';
	type Props = {
		x?: number;
		y?: number;
		state: SymbolState;
		symbolInfo: ReturnType<typeof getSymbolInfo>;
		oncomplete?: () => void;
	};
	const props: Props = $props();
	let phase = $state(0);
	const winning = $derived(props.state === 'win');
	const landing = $derived(props.state === 'land');
	const exploding = $derived(props.state === 'explosion');
	const pulse = $derived(
		reducedMotion.current
			? 1
			: winning
				? 1 + 0.065 * Math.sin(Math.PI * phase)
				: landing
					? 0.93 + 0.07 * phase
					: 1,
	);
	const landingWave = $derived(
		landing && !reducedMotion.current ? Math.sin(phase * Math.PI * 2) * (1 - phase) : 0,
	);
	$effect(() => {
		const state = props.state;
		if (state !== 'land' && state !== 'win' && state !== 'explosion') {
			phase = 0;
			return;
		}
		const duration = reducedMotion.current
			? 1
			: stateBet.isTurbo
				? state === 'win'
					? 170
					: 80
				: state === 'win'
					? 360
					: state === 'explosion'
						? 280
						: 140;
		const start = performance.now();
		let frame = 0,
			done = false;
		const finish = () => {
			if (done) return;
			done = true;
			phase = 1;
			props.oncomplete?.();
		};
		const timer = setTimeout(finish, duration + 40);
		const animate = (now: number) => {
			if (done) return;
			phase = Math.min(1, (now - start) / duration);
			if (phase >= 1) finish();
			else frame = requestAnimationFrame(animate);
		};
		frame = requestAnimationFrame(animate);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	});
</script>

{#if winning}
	<Graphics
		eventMode="none"
		draw={(g) => {
			const size = SYMBOL_SIZE * 0.88;
			g.roundRect((props.x ?? 0) - size / 2, (props.y ?? 0) - size / 2, size, size, 13)
				.fill({ color: 0xdba74d, alpha: 0.055 })
				.stroke({
					color: 0xffe5a7,
					width: 1.5,
					alpha: reducedMotion.current ? 0.85 : 0.35 + 0.35 * Math.sin(Math.PI * phase),
				});
		}}
	/>
	<Sprite
		key="lunarWinAura"
		x={props.x}
		y={props.y}
		anchor={0.5}
		width={SYMBOL_SIZE * (1.28 + phase * 0.18)}
		height={SYMBOL_SIZE * (1.28 + phase * 0.18)}
		alpha={Math.max(0, Math.sin(Math.PI * phase)) * 0.38}
	/>
{/if}
<Sprite
	x={props.x}
	y={(props.y ?? 0) - landingWave * 3}
	anchor={0.5}
	key={props.symbolInfo.assetKey}
	width={SYMBOL_SIZE * props.symbolInfo.sizeRatios.width * pulse * (1 + landingWave * 0.075)}
	height={SYMBOL_SIZE * props.symbolInfo.sizeRatios.height * pulse * (1 - landingWave * 0.09)}
	alpha={exploding ? 1 - phase : 1}
/>
