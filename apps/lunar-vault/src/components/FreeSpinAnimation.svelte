<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Sprite, type Sizes } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { getContext } from '../game/context';
	import { SYMBOL_SIZE, BOARD_DIMENSIONS } from '../game/constants';
	type Props = { children: Snippet<[{ sizes: Sizes }]> };
	const props: Props = $props();
	const context = getContext();
	const sizes = { width: SYMBOL_SIZE * BOARD_DIMENSIONS.x, height: SYMBOL_SIZE * BOARD_DIMENSIONS.x };
</script>
<MainContainer>
	<Container x={context.stateGameDerived.boardLayout().x} y={context.stateGameDerived.boardLayout().y}>
		<Sprite key="lunarWinAura" anchor={0.5} width={sizes.width * 1.35} height={sizes.height * 1.35} alpha={0.9} />
		{@render props.children({ sizes })}
	</Container>
</MainContainer>
