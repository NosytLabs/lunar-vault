<script lang="ts" module>
	export type EmitterEventFreeSpinIntro =
		| { type: 'freeSpinIntroShow' }
		| { type: 'freeSpinIntroHide' }
		| { type: 'freeSpinIntroUpdate'; totalFreeSpins: number };
</script>

<script lang="ts">
	import { CanvasSizeRectangle } from 'components-layout';
	import { FadeContainer } from 'components-pixi';
	import { waitForResolve } from 'utils-shared/wait';
	import { Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import PressToContinue from './PressToContinue.svelte';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';

	const context = getContext();
	let show = $state(false);
	let freeSpins = $state(0);
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async ({ totalFreeSpins }) => {
			freeSpins = totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x030715} backgroundAlpha={0.78} />
	<FreeSpinAnimation>
		{#snippet children({ sizes })}
			<Text
				text="ECLIPSE CHAMBER"
				anchor={0.5}
				y={-85}
				style={{ fontFamily: 'Georgia, serif', fontSize: 41, letterSpacing: 3, fontWeight: 'bold', fill: 0xffe2a1 }}
			/>
			<Text
				text={`${freeSpins} FREE SPINS`}
				anchor={0.5}
				y={20}
				style={{ fontFamily: 'Arial, sans-serif', fontSize: 56, fontWeight: 'bold', fill: 0xfff2d3 }}
			/>
			<Text
				text="THE VAULT IS OPEN"
				anchor={0.5}
				y={115}
				style={{ fontFamily: 'Arial, sans-serif', fontSize: 18, letterSpacing: 3, fill: 0xdedaf4 }}
			/>
		{/snippet}
	</FreeSpinAnimation>
	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
