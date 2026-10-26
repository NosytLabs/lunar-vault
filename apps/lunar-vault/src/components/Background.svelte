<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';
	import { getContext } from '../game/context';
	const context = getContext();
	const bg = $derived(context.stateLayoutDerived.normalBackgroundLayout({ scale: 0.5 }));
	const showBase = $derived(context.stateGame.gameType === 'basegame');
	const showFeature = $derived(context.stateGame.gameType === 'freegame');
</script>
<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x03091b} zIndex={-4} />
<FadeContainer show={showBase} duration={SECOND} zIndex={-3}>
	<Sprite key="lunarBackdrop" {...bg} anchor={0.5} />
</FadeContainer>
<FadeContainer show={showFeature} duration={SECOND} zIndex={-2}>
	<Sprite key="lunarFeatureBackdrop" {...bg} anchor={0.5} />
</FadeContainer>
