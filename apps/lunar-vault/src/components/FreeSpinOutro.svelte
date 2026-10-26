<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';
	export type EmitterEventFreeSpinOutro =
		| { type: 'freeSpinOutroShow' }
		| { type: 'freeSpinOutroHide' }
		| { type: 'freeSpinOutroCountUp'; amount: number; winLevelData: WinLevelData };
</script>
<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider, ResponsiveBitmapText } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { waitForResolve } from 'utils-shared/wait';
	import { CanvasSizeRectangle } from 'components-layout';
	import { OnMount } from 'components-shared';
	import { getContext } from '../game/context';
	import FreeSpinAnimation from './FreeSpinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import WinCoins from './WinCoins.svelte';
	const context = getContext();
	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	context.eventEmitter.subscribeOnMount({
		freeSpinOutroShow: () => (show = true),
		freeSpinOutroHide: () => (show = false),
		freeSpinOutroCountUp: async (event) => {
			amount = event.amount;
			winLevelData = event.winLevelData;
			await waitForResolve(resolve => (oncomplete = resolve));
		},
	});
</script>
<FadeContainer {show}>
	{#if winLevelData}
		<WinCountUpProvider {amount} duration={winLevelData.presentDuration}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				<OnMount onmount={() => startCountUp()} />
				<CanvasSizeRectangle backgroundColor={0x02091c} backgroundAlpha={0.76} />
				<FreeSpinAnimation>
					{#snippet children({ sizes })}
						<Text anchor={0.5} y={-sizes.height * 0.26} text="ECLIPSE CHAMBER" style={{ fontFamily: 'Georgia, serif', fontSize: 43, fontWeight: 'bold', fill: 0xf8e2b2, letterSpacing: 3 }} />
						<ResponsiveBitmapText anchor={0.5} text={bookEventAmountToCurrencyString(countUpAmount)} maxWidth={sizes.width * 0.92} style={{ fontFamily: 'gold', fontSize: sizes.width * 0.12, fontWeight: 'bold' }} />
						<Text anchor={0.5} y={sizes.height * 0.23} text="TOTAL WIN" style={{ fontFamily: 'Georgia, serif', fontSize: 44, fontWeight: 'bold', fill: 0xf7d49a, letterSpacing: 4 }} />
					{/snippet}
				</FreeSpinAnimation>
				<WinCoins emit={!countUpCompleted} levelAlias={winLevelData.alias} />
				<PressToContinue onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())} />
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
