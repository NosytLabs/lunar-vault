<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Sprite, Text, Graphics } from 'pixi-svelte';
	import { getContext } from '../game/context';
	const context = getContext();
	const board = $derived(context.stateGameDerived.boardLayout());
	let glow = $state(false);
	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => (glow = true),
		boardFrameGlowHide: () => (glow = false),
	});
</script>

<Graphics
	eventMode="none"
	zIndex={-1}
	draw={(g) => {
		const left = board.x - board.width / 2,
			top = board.y - board.height / 2;
		g.roundRect(left - 44, top - 42, board.width + 88, board.height + 94, 17).fill({
			color: 0x00040c,
			alpha: 0.62,
		});
		g.roundRect(left - 36, top - 36, board.width + 72, board.height + 72, 12)
			.fill(0x192431)
			.stroke({ color: 0x624e34, width: 4 });
		g.roundRect(left - 18, top - 18, board.width + 36, board.height + 36, 8)
			.fill(0x04101d)
			.stroke({ color: glow ? 0xecd294 : 0xc49a59, width: 2 });
		g.rect(left - 10, top - 10, board.width + 20, 16).fill({ color: 0x00030b, alpha: 0.75 });
		g.moveTo(left - 31, top - 31)
			.lineTo(left + board.width + 31, top - 31)
			.stroke({ color: 0xffe5ac, width: 2, alpha: 0.55 });
		g.moveTo(left - 31, top + board.height + 31)
			.lineTo(left + board.width + 31, top + board.height + 31)
			.stroke({ color: 0x030713, width: 5 });
		for (const x of [left - 30, left + board.width + 30])
			for (const y of [top - 30, top + board.height + 30]) {
				g.circle(x, y, 5).fill(0x281f18).stroke({ color: 0xc7a767, width: 1 });
				g.circle(x - 1, y - 1, 1.5).fill(0xf4dba4);
			}
	}}
/>
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
