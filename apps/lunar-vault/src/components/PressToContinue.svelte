<script lang="ts">
	import { OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Rectangle, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';

	type Props = { onpress: () => void };
	const props: Props = $props();
	const context = getContext();
	const viewport = $derived(context.stateLayoutDerived.canvasSizes());
	const ribbonWidth = $derived(Math.min(viewport.width - 20, 520));
	const fontSize = $derived(Math.max(10, Math.min(21, viewport.width * 0.028)));
</script>

<!-- Screen-space, rather than scaled logical board-space, keeps popout text readable. -->
<Rectangle
	x={(viewport.width - ribbonWidth) / 2}
	y={viewport.height - 38}
	width={ribbonWidth}
	height={32}
	backgroundColor={0x080f29}
	backgroundAlpha={0.92}
	borderRadius={9}
	borderWidth={2}
	borderColor={0xb68b4e}
/>
<Text
	text="TAP OR PRESS SPACE TO CONTINUE"
	x={viewport.width / 2}
	y={viewport.height - 22}
	anchor={0.5}
	style={{
		fontFamily: 'Arial, sans-serif',
		fontSize,
		fontWeight: 'bold',
		fill: 0xffe2a7,
	}}
/>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
