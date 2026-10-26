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
	<Text text="TAP OR PRESS SPACE TO CONTINUE" anchor={{ x: 0.5, y: 1 }} x={context.stateLayoutDerived.mainLayout().width / 2} y={context.stateLayoutDerived.mainLayout().height * 0.97} style={{ fontFamily: 'Arial, sans-serif', fontSize: 26, fontWeight: 'bold', fill: 0xf3dbac, letterSpacing: 2.3 }} />
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
