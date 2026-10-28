<script lang="ts" module>
	export type EmitterEventFeatureBanner = { type: 'featureExtended'; added: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	import { waitForTimeout } from 'utils-shared/wait';
	import { stateBet } from 'state-shared';
	import { reducedMotion } from '../game/motion.svelte';
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	let added = $state(0),
		show = $state(false);
	context.eventEmitter.subscribeOnMount({
		featureExtended: async (event) => {
			added = event.added;
			show = true;
			await waitForTimeout(reducedMotion.current || stateBet.isTurbo ? 240 : 650);
			show = false;
		},
	});
</script>

{#if show}
	<MainContainer>
		<Rectangle
			x={board.x}
			y={board.y}
			anchor={0.5}
			width={500}
			height={112}
			borderRadius={16}
			backgroundColor={0x07192c}
			backgroundAlpha={0.95}
			borderColor={0xe2c084}
			borderWidth={2}
		/>
		<Text
			x={board.x}
			y={board.y - 25}
			anchor={0.5}
			text="ORBIT EXTENDED"
			style={{
				fontFamily: 'Lunar Display',
				fontWeight: '700',
				fontSize: 31,
				letterSpacing: 2,
				fill: 0xf5d7a0,
			}}
		/>
		<Text
			x={board.x}
			y={board.y + 25}
			anchor={0.5}
			text={`+${added} FREE SPINS`}
			style={{
				fontFamily: 'Lunar Sans',
				fontWeight: '700',
				fontSize: 39,
				letterSpacing: 2,
				fill: 0xd6efff,
			}}
		/>
	</MainContainer>
{/if}
