<script lang="ts" module>
	export type EmitterEventBoardFrame =
		| { type: 'boardFrameGlowShow' }
		| { type: 'boardFrameGlowHide' };
</script>

<script lang="ts">
	import { Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';

	const context = getContext();
	let glowing = $state(false);
	const frame = $derived.by(() => {
		const { x, y, width, height } = context.stateGameDerived.boardLayout();
		return { x, y, width, height, left: x - width / 2, top: y - height / 2 };
	});

	context.eventEmitter.subscribeOnMount({
		boardFrameGlowShow: () => (glowing = true),
		boardFrameGlowHide: () => (glowing = false),
	});
</script>

<!-- A lightweight original Pixi frame; no sample SDK Spine art or off-center 1.01 scaling. -->
<Rectangle
	x={frame.left - 19}
	y={frame.top - 23}
	width={frame.width + 38}
	height={frame.height + 55}
	backgroundColor={glowing ? 0xffd989 : 0xb88d4a}
/>
<Rectangle
	x={frame.left - 13}
	y={frame.top - 17}
	width={frame.width + 26}
	height={frame.height + 43}
	backgroundColor={0x091327}
/>
<Rectangle
	x={frame.left - 8}
	y={frame.top - 11}
	width={frame.width + 16}
	height={frame.height + 23}
	backgroundColor={0x3b3152}
/>
<Rectangle
	x={frame.left - 3}
	y={frame.top - 4}
	width={frame.width + 6}
	height={frame.height + 8}
	backgroundColor={0x06101e}
/>
<Text
	text="✦  L U N A R   V A U L T  ✦"
	x={frame.x}
	y={frame.top + frame.height + 20}
	anchor={0.5}
	style={{ fontFamily: 'Georgia, serif', fontSize: 11, letterSpacing: 2, fill: 0xffe7af }}
/>
