<script lang="ts" module>
	export type EmitterEventGlobalMultiplier =
		| { type: 'globalMultiplierShow' }
		| { type: 'globalMultiplierHide' }
		| { type: 'globalMultiplierUpdate'; multiplier: number };
</script>

<script lang="ts">
	import { Container, Rectangle, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { waitForTimeout } from 'utils-shared/wait';
	import { getContext } from '../game/context';
	import BoardContainer from './BoardContainer.svelte';
	import { SYMBOL_SIZE } from '../game/constants';

	const context = getContext();
	let show = $state(false);
	let multiplier = $state(1);
	const position = $derived({
		x: context.stateGameDerived.boardLayout().width - SYMBOL_SIZE * 0.8,
		y: -SYMBOL_SIZE * 0.56,
	});

	context.eventEmitter.subscribeOnMount({
		globalMultiplierShow: () => (show = true),
		globalMultiplierHide: () => (show = false),
		globalMultiplierUpdate: async ({ multiplier: next }) => {
			if (next === multiplier) return;
			multiplier = next;
			await waitForTimeout(240);
		},
	});
</script>

<FadeContainer {show}>
	<BoardContainer>
		<Container {...position}>
			<Rectangle x={-57} y={-31} width={114} height={67} backgroundColor={0xd5aa63} />
			<Rectangle x={-52} y={-26} width={104} height={57} backgroundColor={0x14142c} />
			<Text
				text={`${multiplier}×`}
				anchor={0.5}
				style={{ fontFamily: 'Georgia, serif', fontSize: 37, fontWeight: 'bold', fill: 0xffe3a3 }}
			/>
		</Container>
	</BoardContainer>
</FadeContainer>
