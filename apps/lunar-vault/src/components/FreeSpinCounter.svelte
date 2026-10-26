<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>

<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';

	const context = getContext();
	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	const position = $derived.by(() => {
		const b = context.stateGameDerived.boardLayout();
		return { x: b.x - b.width / 2 - 178, y: b.y - b.height / 2 + 32 };
	});

	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: ({ current: next, total: count }) => {
			if (next !== undefined) current = next;
			if (count !== undefined) total = count;
		},
	});
</script>

<FadeContainer {show}>
	<MainContainer>
		<Container {...position}>
			<Rectangle x={0} y={0} width={162} height={123} backgroundColor={0xc49c5d} />
			<Rectangle x={5} y={5} width={152} height={113} backgroundColor={0x11162f} />
			<Text
				text="FREE SPINS"
				x={81}
				y={35}
				anchor={0.5}
				style={{ fontFamily: 'Arial, sans-serif', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, fill: 0xffdca3 }}
			/>
			<Text
				text={`${current} / ${total}`}
				x={81}
				y={83}
				anchor={0.5}
				style={{ fontFamily: 'Georgia, serif', fontSize: 38, fontWeight: 'bold', fill: 0xfff3d1 }}
			/>
		</Container>
	</MainContainer>
</FadeContainer>
