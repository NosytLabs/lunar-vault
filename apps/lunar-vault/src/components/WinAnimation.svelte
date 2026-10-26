<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { onMount } from 'svelte';
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { reducedMotion } from '../game/motion.svelte';
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
	const entrance = new Tween(0, { easing: cubicOut });
	onMount(() => {
		entrance.set(1, { duration: reducedMotion.current ? 1 : 340 });
	});
</script>

<!-- Win count-up is driven by the RGS book events, not decorative effects. -->
<Container
	alpha={entrance.current}
	scale={reducedMotion.current ? 1 : 0.88 + 0.12 * entrance.current}
>
	<Sprite
		key="lunarWinAura"
		anchor={0.5}
		width={context.stateGameDerived.boardLayout().width * 1.35}
		height={context.stateGameDerived.boardLayout().width * 1.35}
		alpha={0.86}
		rotation={reducedMotion.current ? 0 : (1 - entrance.current) * 0.16}
	/>
	{@render props.children()}

	<Text
		y={-110}
		anchor={0.5}
		text={props.animationMap.intro.replace('_win_intro', '').toUpperCase() + ' WIN'}
		style={{ fontFamily: 'Lunar Display', fontSize: 40, letterSpacing: 5, fill: 0xffe7ad }}
	/>
</Container>
