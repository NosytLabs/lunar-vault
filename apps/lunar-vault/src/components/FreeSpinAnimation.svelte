<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Container, Sprite, Graphics, type Sizes } from 'pixi-svelte';
	import { MainContainer, CanvasSizeRectangle } from 'components-layout';
	import { getContext } from '../game/context';
	import { stateBet } from 'state-shared';
	import { reducedMotion } from '../game/motion.svelte';
	type Props = { children: Snippet<[{ sizes: Sizes }]> };
	const props: Props = $props();
	const context = getContext();
	const sizes = { width: 600, height: 500 };
	const entrance = new Tween(0, { easing: cubicOut });
	onMount(() => {
		void entrance.set(1, { duration: reducedMotion.current ? 0 : stateBet.isTurbo ? 120 : 320 });
	});
</script>

<Sprite
	key="lunarFeatureBackdrop"
	{...context.stateLayoutDerived.normalBackgroundLayout({ scale: 1 })}
	anchor={0.5}
/>
<CanvasSizeRectangle backgroundColor={0x020712} backgroundAlpha={0.56} />
<MainContainer>
	<Container
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height * 0.46}
		alpha={entrance.current}
		scale={reducedMotion.current ? 1 : 0.95 + entrance.current * 0.05}
	>
		<Graphics
			eventMode="none"
			draw={(g) => {
				g.roundRect(-322, -246, 644, 496, 24)
					.fill({ color: 0x020b17, alpha: 0.78 })
					.stroke({ color: 0xa98950, width: 2, alpha: 0.78 });
				g.roundRect(-314, -238, 628, 480, 18).stroke({ color: 0xf2d599, width: 1, alpha: 0.24 });
				for (const direction of [-1, 1]) {
					g.moveTo(direction * 70, -135)
						.lineTo(direction * 262, -135)
						.stroke({ color: 0xd4b471, width: 1, alpha: 0.55 });
					g.moveTo(direction * 70, 168)
						.lineTo(direction * 262, 168)
						.stroke({ color: 0xd4b471, width: 1, alpha: 0.55 });
				}
			}}
		/>
		<Sprite key="lunarWinAura" anchor={0.5} y={-214} width={246} height={246} alpha={0.62} />
		<Sprite key="lunarS" anchor={0.5} y={-215} width={148} height={148} />
		{@render props.children({ sizes })}
	</Container>
</MainContainer>
