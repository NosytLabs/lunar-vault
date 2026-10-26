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
	let total = $state(0);
	let oncomplete = $state(() => {});
	context.eventEmitter.subscribeOnMount({
		freeSpinIntroShow: () => (show = true),
		freeSpinIntroHide: () => (show = false),
		freeSpinIntroUpdate: async ({ totalFreeSpins }) => {
			total = totalFreeSpins;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	<CanvasSizeRectangle backgroundColor={0x02091c} backgroundAlpha={0.75} />
	<FreeSpinAnimation>
		{#snippet children({ sizes })}
			<Text
				y={-sizes.height * 0.3}
				anchor={0.5}
				text="ECLIPSE CHAMBER"
				style={{
					fontFamily: 'Lunar Display',
					fontSize: 46,
					fontWeight: 'bold',
					fill: 0xf6dca6,
					letterSpacing: 3,
				}}
			/>
			<Text
				anchor={0.5}
				text={String(total)}
				style={{ fontFamily: 'Lunar Display', fontSize: 120, fontWeight: 'bold', fill: 0xffffff }}
			/>
			<Text
				y={sizes.height * 0.23}
				anchor={0.5}
				text="FREE SPINS"
				style={{
					fontFamily: 'Lunar Display',
					fontSize: 45,
					fontWeight: 'bold',
					fill: 0xf4d69b,
					letterSpacing: 4,
				}}
			/>
		{/snippet}
	</FreeSpinAnimation>
	<PressToContinue onpress={() => oncomplete()} />
</FadeContainer>
