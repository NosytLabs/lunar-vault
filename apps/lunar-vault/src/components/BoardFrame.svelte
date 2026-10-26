<script lang="ts" module>
	export type EmitterEventBoardFrame = { type: 'boardFrameGlowShow' } | { type: 'boardFrameGlowHide' };
</script>
<script lang="ts">
	import { Sprite } from 'pixi-svelte';
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
	<Sprite key="lunarWinAura" anchor={0.5} x={board.x} y={board.y} width={board.width * 1.43} height={board.height * 1.83} alpha={0.5} zIndex={-2} />
{/if}
<Sprite key="lunarReelFrame" anchor={0.5} x={board.x} y={board.y} width={board.width * 1.31} height={board.height * 1.43} zIndex={2} />
