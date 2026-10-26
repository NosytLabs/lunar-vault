<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Sprite } from 'pixi-svelte';
	import { MainContainer } from 'components-layout';
	import { getContext } from '../game/context';
	import type { WinLevelAlias } from '../game/winLevelMap';

	type Props = { emit?: boolean; levelAlias?: WinLevelAlias };
	const props: Props = $props();
	const context = getContext();
	const sparks = Array.from({ length: 13 }, (_, i) => i);
	let phase = $state(0);
	let reduceMotion = $state(false);
	onMount(() => {
		reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	});
	$effect(() => {
		if (!props.emit || reduceMotion) return;
		let frame = 0;
		let last = -1;
		const start = performance.now();
		const animate = (now: number) => {
			const step = Math.floor((now - start) / 33);
			if (step !== last) { last = step; phase = (now - start) / 1000; }
			frame = requestAnimationFrame(animate);
		};
		frame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frame);
	});
</script>

<!-- Original book-independent celestial particles replace SDK sample coins. -->
{#if props.emit}
	<MainContainer>
		<Container x={context.stateGameDerived.boardLayout().x} y={context.stateGameDerived.boardLayout().y}>
			{#each sparks as i}
				{@const angle = i * 2.399963 + phase * (i % 2 === 0 ? 0.85 : -0.62)}
				{@const radius = 80 + (i * 43) % 205 + (reduceMotion ? 0 : Math.sin(phase * 2 + i) * 15)}
				<Sprite key="lunarH3" anchor={0.5}
					x={Math.cos(angle) * radius}
					y={Math.sin(angle) * radius * 0.52}
					width={23 + (i % 4) * 6} height={23 + (i % 4) * 6}
					alpha={reduceMotion ? 0.36 : 0.25 + 0.32 * (1 + Math.sin(phase * 5 + i)) / 2} />
			{/each}
		</Container>
	</MainContainer>
{/if}
