<script lang="ts">
	import { onMount } from 'svelte';
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';
	import { reducedMotion } from '../game/motion.svelte';
	const props: { oncomplete: () => void } = $props();
	const context = getContext();
	let phase = $state(0);
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const size = $derived(Math.min(canvas.width, canvas.height) * 0.92);
	onMount(() => {
		const duration = reducedMotion.current ? 1 : stateBet.isTurbo ? 120 : 300;
		const start = performance.now();
		let frame = 0,
			done = false;
		const finish = () => {
			if (done) return;
			done = true;
			phase = 1;
			props.oncomplete();
		};
		const timer = setTimeout(finish, duration + 40);
		const tick = (now: number) => {
			if (done) return;
			phase = Math.min(1, (now - start) / duration);
			if (phase === 1) finish();
			else frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);
		};
	});
</script>

<Rectangle
	{...canvas}
	backgroundColor={0x020915}
	backgroundAlpha={reducedMotion.current ? 0 : Math.sin(phase * Math.PI) * 0.65}
	eventMode="none"
/>
{#if !reducedMotion.current}<Sprite
		key="lunarOrbitalSeal"
		anchor={0.5}
		x={canvas.width / 2}
		y={canvas.height / 2}
		width={size * (0.96 + phase * 0.04)}
		height={size * (0.96 + phase * 0.04)}
		rotation={phase * 0.08}
		alpha={Math.sin(phase * Math.PI) * 0.28}
	/>{/if}
