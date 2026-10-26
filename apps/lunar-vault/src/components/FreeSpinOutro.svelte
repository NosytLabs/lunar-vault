<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { getContext } from '../game/context';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';

	const context = getContext();
	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => (show = true),
		freeSpinOutroHide: () => (show = false),
		freeSpinOutroCountUp: async ({ amount: eventAmount, winLevelData: level }) => {
			amount = eventAmount;
			winLevelData = level;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show}>
	{#if winLevelData}
		<WinCountUpProvider
			{amount}
			duration={winLevelData.presentDuration}
			oncomplete={() => {}}
		>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />
				<CanvasSizeRectangle backgroundColor={0x030715} backgroundAlpha={0.8} />
				<FreeSpinAnimation>
					{#snippet children({ sizes })}
						<Text
							text="ECLIPSE CHAMBER"
							anchor={0.5}
							y={-94}
							style={{ fontFamily: 'Georgia, serif', fontSize: 40, letterSpacing: 2, fontWeight: 'bold', fill: 0xffd78e }}
						/>
						<Text
							text={bookEventAmountToCurrencyString(countUpAmount)}
							anchor={0.5}
							y={22}
							style={{ fontFamily: 'Georgia, serif', fontSize: 60, fontWeight: 'bold', fill: 0xfff0c6 }}
						/>
						<Text
							text="TOTAL WIN"
							anchor={0.5}
							y={118}
							style={{ fontFamily: 'Arial, sans-serif', fontSize: 20, letterSpacing: 4, fill: 0xdedaf4 }}
						/>
					{/snippet}
				</FreeSpinAnimation>
				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
