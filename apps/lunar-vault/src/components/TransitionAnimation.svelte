<script lang="ts">
	import { onMount } from 'svelte';
	import { Sprite } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { reducedMotion } from '../game/motion.svelte';
	const props: { oncomplete: () => void } = $props();
	const context = getContext();
	let phase = $state(0);
	onMount(() => {
		const start = performance.now();
		let frame = 0;
		const tick = (now: number) => {
			phase = Math.min(1, (now - start) / (reducedMotion.current ? 1 : 420));
			if (phase === 1) props.oncomplete();
			else frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

<Sprite
	key="lunarOrbitalSeal"
	anchor={0.5}
	x={context.stateLayoutDerived.canvasSizes().width / 2}
	y={context.stateLayoutDerived.canvasSizes().height / 2}
	width={context.stateLayoutDerived.canvasSizes().width * (0.3 + phase * 0.9)}
	height={context.stateLayoutDerived.canvasSizes().width * (0.3 + phase * 0.9)}
	rotation={phase * 0.4}
	alpha={reducedMotion.current ? 0 : Math.sin(phase * Math.PI) * 0.7}
/>
