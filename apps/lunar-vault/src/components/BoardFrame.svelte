<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Sprite, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	let glow = $state(false);
	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => (glow = true),
		boardFrameGlowHide: () => (glow = false),
	});
</script>

{#if glow}
	<Sprite
		key="lunarWinAura"
		anchor={0.5}
		x={board.x}
		y={board.y}
		width={board.width * 1.43}
		height={board.height * 1.83}
		alpha={0.5}
		zIndex={-2}
	/>
{/if}
<Sprite
	key="lunarReelFrame"
	anchor={0.5}
	x={board.x}
	y={board.y}
	width={board.width + 80}
	height={board.height + 80}
	zIndex={2}
/>

<Text
	anchor={0.5}
	x={board.x}
	y={board.y - board.height / 2 - 66}
	text="LUNAR VAULT"
	style={{
		fontFamily: 'Lunar Display',
		fontSize: 49,
		fontWeight: 'bold',
		letterSpacing: 2,
		fill: 0xf4dfb0,
		dropShadow: { color: 0x000000, blur: 6, distance: 2 },
	}}
/>
