<script lang="ts">
	import { Sprite } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { REEL_PADDING, SYMBOL_SIZE } from '../game/constants';
	type Props = { reel: Reel; oncomplete: () => void };
	const props: Props = $props();
	const context = getContext();
	let pulse = $state(0.45);
	const x = $derived(context.stateGameDerived.boardLayout().x -
		context.stateGameDerived.boardLayout().width / 2 +
		(props.reel.reelIndex + REEL_PADDING) * SYMBOL_SIZE);
	const y = $derived(context.stateGameDerived.boardLayout().y);
	$effect(() => {
		let frame = 0;
		const start = performance.now();
		const paint = (now: number) => {
			pulse = 0.36 + 0.28 * (1 + Math.sin((now - start) / 210));
			frame = requestAnimationFrame(paint);
		};
		frame = requestAnimationFrame(paint);
		return () => cancelAnimationFrame(frame);
	});
	$effect(() => {
		if (props.reel.reelState.motion !== 'stopped') return;
		// Animate glow exit without depending on the SDK sample Spine animation.
		const timeout = window.setTimeout(() => props.oncomplete(), 175);
		return () => window.clearTimeout(timeout);
	});
</script>
<Sprite key="lunarWinAura" anchor={0.5} {x} {y}
	width={SYMBOL_SIZE * 1.28} height={SYMBOL_SIZE * 3.3} alpha={pulse} />
