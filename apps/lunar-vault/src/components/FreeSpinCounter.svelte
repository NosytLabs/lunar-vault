<script lang="ts" module>
	export type EmitterEventFreeSpinCounter =
		| { type: 'freeSpinCounterShow' }
		| { type: 'freeSpinCounterHide' }
		| { type: 'freeSpinCounterUpdate'; current?: number; total?: number };
</script>
<script lang="ts">
	import { MainContainer } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	let show = $state(false);
	let current = $state(0);
	let total = $state(0);
	context.eventEmitter.subscribeOnMount({
		freeSpinCounterShow: () => (show = true),
		freeSpinCounterHide: () => (show = false),
		freeSpinCounterUpdate: ({ current: next, total: maximum }) => {
			if (next !== undefined) current = next;
			if (maximum !== undefined) total = maximum;
		},
	});
</script>
<!-- Centered above the board instead of the SDK's offscreen left rail.
     Fits mobile-landscape/popout aspect ratios as MainContainer scales it. -->
<MainContainer>
	<FadeContainer {show} x={board.x} y={board.y - board.height / 2 - 52}>
		<Rectangle anchor={0.5} width={294} height={62} borderRadius={12}
			backgroundColor={0x071225} backgroundAlpha={0.95} borderColor={0xdec07b} borderWidth={4} />
		<Text y={-12} anchor={0.5} text="ECLIPSE CHAMBER"
			style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 'bold', fill: 0xfce1a1, letterSpacing: 2 }} />
		<Text y={15} anchor={0.5} text={`FREE SPIN ${current} / ${total}`}
			style={{ fontFamily: 'Arial, sans-serif', fontSize: 22, fontWeight: 'bold', fill: 0xcbe8ff, letterSpacing: 1.3 }} />
	</FadeContainer>
</MainContainer>
