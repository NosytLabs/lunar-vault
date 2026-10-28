<script lang="ts">
	import { stateBet } from 'state-shared';
	import { reducedMotion } from '../game/motion.svelte';
	import { Sprite } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { REEL_PADDING, SYMBOL_SIZE } from '../game/constants';
	type Props = { reel: Reel; oncomplete: () => void };
	const props: Props = $props();
	const context = getContext();
	let pulse = $state(0.26);
	const x = $derived(
		context.stateGameDerived.boardLayout().x -
			context.stateGameDerived.boardLayout().width / 2 +
			(props.reel.reelIndex + REEL_PADDING) * SYMBOL_SIZE,
	);
	const y = $derived(context.stateGameDerived.boardLayout().y);
	$effect(() => {
		if (reducedMotion.current || stateBet.isTurbo) {
			pulse = 0.26;
			return;
		}
		let frame = 0;
		const start = performance.now();
		const paint = (now: number) => {
			pulse = 0.22 + 0.1 * (1 + Math.sin((now - start) / 330));
			frame = requestAnimationFrame(paint);
		};
		frame = requestAnimationFrame(paint);
		return () => cancelAnimationFrame(frame);
	});
	$effect(() => {
		if (props.reel.reelState.motion !== 'stopped') return;
		// Animate glow exit without depending on the SDK sample Spine animation.
		const timeout = window.setTimeout(
			() => props.oncomplete(),
			reducedMotion.current ? 1 : stateBet.isTurbo ? 60 : 140,
		);
		return () => window.clearTimeout(timeout);
	});
</script>

<Sprite
	key="lunarWinAura"
	anchor={0.5}
	{x}
	{y}
	width={SYMBOL_SIZE * 1.28}
	height={SYMBOL_SIZE * 3.3}
	alpha={pulse}
/>
