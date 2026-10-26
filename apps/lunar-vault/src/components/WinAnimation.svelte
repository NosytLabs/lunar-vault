<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Sprite, Text } from 'pixi-svelte';
	import { getContext } from '../game/context';
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
	const context = getContext();
</script>

<!-- Win count-up is driven by the RGS book events, not decorative effects. -->
<Sprite
	key="lunarWinAura"
	anchor={0.5}
	width={context.stateGameDerived.boardLayout().width * 1.35}
	height={context.stateGameDerived.boardLayout().width * 1.35}
	alpha={0.86}
/>
{@render props.children()}

<Text
	y={-110}
	anchor={0.5}
	text={props.animationMap.intro.replace('_win_intro', '').toUpperCase() + ' WIN'}
	style={{ fontFamily: 'Georgia, serif', fontSize: 40, letterSpacing: 5, fill: 0xffe7ad }}
/>
