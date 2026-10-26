<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Rectangle, Sprite, type Sizes } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { getContext } from '../game/context';

	type Props = { children: Snippet<[{ sizes: Sizes }]> };
	const props: Props = $props();
	const context = getContext();
	const sizes: Sizes = { width: 640, height: 420 };
</script>

<MainContainer>
	<Container
		x={context.stateGameDerived.boardLayout().x}
		y={context.stateGameDerived.boardLayout().y}
	>
		<Rectangle x={-343} y={-223} width={686} height={446} backgroundColor={0xd3a55f} />
		<Rectangle x={-337} y={-217} width={674} height={434} backgroundColor={0x070d26} />
		<Sprite key="lunar_lobby_wide" anchor={0.5} width={662} height={374} alpha={0.42} />
		{@render props.children({ sizes })}
	</Container>
</MainContainer>
