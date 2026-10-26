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
</script>

<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Container
			x={context.stateLayoutDerived.mainLayout().width * 0.5}
			y={context.stateLayoutDerived.mainLayout().height * 0.46}
		>
			<Sprite key="lunar_lobby_wide" width={790} height={444} anchor={0.5} alpha={0.94} />
			<Rectangle x={-395} y={72} width={790} height={154} backgroundColor={0x050d26} backgroundAlpha={0.82} />
			<Text
				text="LUNAR VAULT"
				anchor={0.5}
				y={128}
				style={{ fontFamily: 'Georgia, serif', fontSize: 70, fontWeight: 'bold', letterSpacing: 5, fill: 0xffe5a4 }}
			/>
			<Text
				text={context.stateApp.loaded ? 'THE OBSERVATORY IS OPEN' : 'ALIGNING THE CONSTELLATIONS…'}
				anchor={0.5}
				y={196}
				style={{ fontFamily: 'Arial, sans-serif', fontSize: 18, letterSpacing: 2, fill: 0xd9daf1 }}
			/>
		</Container>
	</MainContainer>
</FadeContainer>

{#if loadingType === 'start' && context.stateApp.loaded}
	<PressToContinue onpress={() => (loadingType = 'transition')} />
{/if}

{#if loadingType === 'transition'}
	<TransitionAnimation oncomplete={props.onloaded} />
{/if}
