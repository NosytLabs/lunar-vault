<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';

	type Props = {
		animationMap: {
			intro:
				| 'big_win_intro'
				| 'epic_win_intro'
				| 'max_win_intro'
				| 'mega_win_intro'
				| 'super_win_intro';
			idle: 'big_win_idle' | 'epic_win_idle' | 'max_win_idle' | 'mega_win_idle' | 'super_win_idle';
			outro: 'big_win_exit' | 'epic_win_exit' | 'max_win_exit' | 'mega_win_exit' | 'super_win_exit';
		};
		children: Snippet;
	};

	const props: Props = $props();
	const title = $derived(
		props.animationMap.intro.startsWith('max') ? 'MAX WIN' :
		props.animationMap.intro.startsWith('epic') ? 'EPIC WIN' :
		props.animationMap.intro.startsWith('mega') ? 'MEGA WIN' :
		props.animationMap.intro.startsWith('super') ? 'SUPER WIN' : 'BIG WIN',
	);
</script>

<!-- Present the server-confirmed amount; this panel NEVER computes an outcome. -->
<Container>
	<Rectangle x={-357} y={-202} width={714} height={404} backgroundColor={0xc5a265} />
	<Rectangle x={-351} y={-196} width={702} height={392} backgroundColor={0x08102a} />
	<Sprite key="lunar_lobby_wide" anchor={0.5} width={690} height={385} alpha={0.4} />
	<Text
		text={title}
		anchor={0.5}
		y={-112}
		style={{ fontFamily: 'Georgia, serif', fontSize: 57, fontWeight: 'bold', letterSpacing: 3, fill: 0xffe2a3 }}
	/>
	{@render props.children()}
</Container>
