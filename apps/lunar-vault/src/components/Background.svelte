<script lang="ts">
	import { Rectangle, Sprite } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { SECOND } from 'constants-shared/time';

	import { getContext } from '../game/context';

	const context = getContext();
	// The backgrounds are static sprites authored at the game's
	// background ratio (2039/1000). The layout helper returns only
	// one dimension (width on wide canvases, height on narrow ones),
	// so derive the other from the ratio to keep the sprite's aspect
	// exact. scale: 1 — the spine this replaces used 0.5 because its
	// skeleton was authored at 2x; a plain texture has no such
	// factor.
	const BACKGROUND_RATIO = 2039 / 1000;
	const backgroundLayout = $derived(
		context.stateLayoutDerived.normalBackgroundLayout({ scale: 1 }),
	);
	const backgroundProps = $derived.by(() => {
		const layout = backgroundLayout;
		const width = 'width' in layout ? layout.width : layout.height * BACKGROUND_RATIO;
		const height = 'height' in layout ? layout.height : width / BACKGROUND_RATIO;
		return { x: layout.x, y: layout.y, width, height, anchor: 0.5 };
	});
	const showBaseBackground = $derived(context.stateGame.gameType === 'basegame');
	const showFeatureBackground = $derived(context.stateGame.gameType === 'freegame');
</script>

<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} zIndex={-3} />

<FadeContainer show={showBaseBackground} duration={SECOND} zIndex={-2}>
	<Sprite key="backgroundBase" {...backgroundProps} />
</FadeContainer>

<FadeContainer show={showFeatureBackground} duration={SECOND} zIndex={-1}>
	<Sprite key="backgroundFeature" {...backgroundProps} />
</FadeContainer>
