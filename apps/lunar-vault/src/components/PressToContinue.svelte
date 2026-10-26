<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';
	import { getContext } from '../game/context';

	type Props = { onpress: () => void };
	const props: Props = $props();
	const context = getContext();
</script>

<MainContainer alignVertical="bottom">
	<Text
		text="TAP OR PRESS SPACE TO CONTINUE"
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height - 24}
		anchor={{ x: 0.5, y: 1 }}
		style={{ fontFamily: 'Arial, sans-serif', fontSize: 20, fontWeight: 'bold', letterSpacing: 2, fill: 0xffe2a7 }}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
