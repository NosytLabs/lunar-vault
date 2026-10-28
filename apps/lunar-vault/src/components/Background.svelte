<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { reducedMotion } from '../game/motion.svelte';
	import { stateBet } from 'state-shared';
	import { getContext } from '../game/context';
	const context = getContext();
	const bg = $derived(context.stateLayoutDerived.normalBackgroundLayout({ scale: 1 }));
	const showBase = true;
	const showFeature = $derived(context.stateGame.gameType === 'freegame');
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x03091b} zIndex={-4} />
<FadeContainer
	show={showBase}
	duration={reducedMotion.current ? 0 : stateBet.isTurbo ? 120 : 500}
	zIndex={-3}
>
	<Sprite key="lunarBackdrop" {...bg} anchor={0.5} />
</FadeContainer>
<FadeContainer
	show={showFeature}
	duration={reducedMotion.current ? 0 : stateBet.isTurbo ? 120 : 500}
	zIndex={-2}
>
	<Sprite key="lunarFeatureBackdrop" {...bg} anchor={0.5} />
	<Rectangle
		{...context.stateLayoutDerived.canvasSizes()}
		backgroundColor={0x090a22}
		backgroundAlpha={0.3}
	/>
</FadeContainer>
