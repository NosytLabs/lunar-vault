<script lang="ts">
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { getContext } from '../game/context';
	import TransitionAnimation from './TransitionAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	type Props = { onloaded: () => void };
	const props: Props = $props();
	const context = getContext();
	let loadingType = $state<'start' | 'transition'>('start');
	const progress = $derived(
		Math.max(0, Math.min(1, (context.stateApp.loadingProgress || 0) / 100)),
	);
</script>

<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Container
			x={context.stateLayoutDerived.mainLayout().width / 2}
			y={context.stateLayoutDerived.mainLayout().height / 2}
		>
			<Sprite key="lunarOrbitalSeal" anchor={0.5} width={470} height={470} alpha={0.5} />
			<Text
				anchor={0.5}
				text="LUNAR VAULT"
				style={{
					fontFamily: 'Lunar Display',
					fontSize: 68,
					fontWeight: '700',
					fill: 0xffe3a5,
					letterSpacing: 4,
					dropShadow: { color: 0x020a15, blur: 5, distance: 3 },
				}}
			/>
			<Text
				y={110}
				anchor={0.5}
				text="ENTER THE OBSERVATORY"
				style={{ fontFamily: 'Lunar Sans', fontSize: 18, letterSpacing: 4, fill: 0xc2d9ef }}
			/>
			{#if !context.stateApp.loaded}
				<Rectangle
					x={-175}
					y={147}
					width={350}
					height={12}
					borderRadius={6}
					backgroundColor={0x1a2642}
					borderColor={0x987044}
					borderWidth={2}
				/>
				<Rectangle
					x={-173}
					y={149}
					width={346 * progress}
					height={8}
					borderRadius={4}
					backgroundColor={0xeac37d}
				/>
				<Text
					y={190}
					anchor={0.5}
					text="PREPARING THE OBSERVATORY"
					style={{
						fontFamily: 'Lunar Sans',
						fontSize: 19,
						fill: 0xf5e0ae,
						letterSpacing: 2.5,
					}}
				/>
			{/if}
		</Container>
	</MainContainer>
</FadeContainer>
<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue onpress={() => (loadingType = 'transition')} />
</FadeContainer>
<FadeContainer show={loadingType === 'transition'}>
	<TransitionAnimation oncomplete={props.onloaded} />
</FadeContainer>
