<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';
	import { getContext } from '../game/context';

	const context = getContext();
	const baseGame = $derived(context.stateGame.gameType === 'basegame');
	const freeGame = $derived(context.stateGame.gameType === 'freegame');

	// Cover the full viewport without distorting the 16:9 original illustration.
	// This calculation also works for landscape popouts and tall mobile layouts.
	const backdrop = $derived.by(() => {
		const { width, height } = context.stateLayoutDerived.canvasSizes();
		const scale = Math.max(width / 1600, height / 900);
		return {
			x: width / 2,
			y: height / 2,
			width: 1600 * scale,
			height: 900 * scale,
		};
	});
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x070b1b} zIndex={-3} />
<FadeContainer show={baseGame} duration={SECOND} zIndex={-2}>
	<Sprite key="lunar_observatory" anchor={0.5} {...backdrop} />
</FadeContainer>
<FadeContainer show={freeGame} duration={SECOND} zIndex={-1}>
	<Sprite key="lunar_observatory_feature" anchor={0.5} {...backdrop} />
</FadeContainer>
