<script lang="ts">
	import { Rectangle } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import type { Reel } from '../game/stateGame.svelte';
	import { REEL_PADDING, SYMBOL_SIZE } from '../game/constants';

	type Props = { reel: Reel; oncomplete: () => void };
	const props: Props = $props();
	const context = getContext();
	let finished = false;
	const placement = $derived.by(() => {
		const b = context.stateGameDerived.boardLayout();
		return {
			x: b.x - b.width / 2 + (props.reel.reelIndex + REEL_PADDING) * SYMBOL_SIZE - SYMBOL_SIZE * 0.44,
			y: b.y - b.height / 2,
			width: SYMBOL_SIZE * 0.88,
			height: b.height,
		};
	});

	$effect(() => {
		if (props.reel.reelState.motion !== 'stopped' || finished) return;
		const timer = window.setTimeout(() => {
			if (finished) return;
			finished = true;
			props.oncomplete();
		}, 130);
		return () => window.clearTimeout(timer);
	});
</script>

<!-- Gold anticipation highlight independent of the round's actual outcome. -->
<Rectangle {...placement} backgroundColor={0xffc778} backgroundAlpha={0.23} />
