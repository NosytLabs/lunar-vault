<script lang="ts" module>
	import type { WinLevelData } from '../game/winLevelMap';

	export type EmitterEventWin =
		| { type: 'winShow' }
		| { type: 'winHide' }
		| { type: 'winUpdate'; amount: number; winLevelData: WinLevelData };
</script>

<script lang="ts">
	import { Container } from 'pixi-svelte';
	import { FadeContainer, WinCountUpProvider } from 'components-pixi';
	import { waitForResolve, waitForTimeout } from 'utils-shared/wait';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { CanvasSizeRectangle, MainContainer } from 'components-layout';
	import { OnMount } from 'components-shared';

	import WinCoins from './WinCoins.svelte';
	import WinAnimation from './WinAnimation.svelte';
	import PressToContinue from './PressToContinue.svelte';
	import { SYMBOL_SIZE } from '../game/constants';
	import { ResponsiveText } from 'components-pixi';
	import { getContext } from '../game/context';
	import { stateBet } from 'state-shared';
	import { reducedMotion } from '../game/motion.svelte';

	const context = getContext();

	let show = $state(false);
	let amount = $state(0);
	let winLevelData = $state<WinLevelData>();
	let oncomplete = $state(() => {});
	let onCountUpComplete = $state(() => {});

	context.eventEmitter.subscribeOnMount({
		winShow: () => (show = true),
		winHide: () => (show = false),
		winUpdate: async (emitterEvent) => {
			amount = emitterEvent.amount;
			winLevelData = emitterEvent.winLevelData;
			await waitForResolve((resolve) => (oncomplete = resolve));
		},
	});
</script>

<FadeContainer {show} duration={reducedMotion.current ? 0 : 120}>
	{#if winLevelData}
		{@const isBigWin = winLevelData.type === 'big'}
		{@const duration = reducedMotion.current
			? 120
			: stateBet.isTurbo
				? Math.min(450, winLevelData.presentDuration)
				: winLevelData.presentDuration}
		<WinCountUpProvider {amount} {duration} oncomplete={() => onCountUpComplete()}>
			{#snippet children({ countUpAmount, startCountUp, finishCountUp, countUpCompleted })}
				{#if isBigWin}
					<CanvasSizeRectangle backgroundColor={0x000000} backgroundAlpha={0.5} />
				{/if}

				<OnMount
					onmount={async () => {
						const complete = oncomplete;
						await startCountUp();
						await waitForTimeout(reducedMotion.current || stateBet.isTurbo ? 70 : 180);
						complete();
					}}
				/>

				<MainContainer>
					<Container
						x={context.stateGameDerived.boardLayout().x}
						y={context.stateGameDerived.boardLayout().y}
					>
						{#if winLevelData?.animation}
							<WinAnimation animationMap={winLevelData.animation}>
								<ResponsiveText
									anchor={0.5}
									maxWidth={context.stateGameDerived.boardLayout().width * 0.95}
									text={bookEventAmountToCurrencyString(countUpAmount)}
									style={{
										fontFamily: 'Lunar Display',
										fill: 0xffe6ae,
										fontSize: SYMBOL_SIZE * 0.95,
										align: 'center',
										fontWeight: 'bold',
										letterSpacing: 0,
									}}
								/>
							</WinAnimation>
						{:else}
							<ResponsiveText
								anchor={0.5}
								maxWidth={context.stateLayoutDerived.canvasSizes().width /
									context.stateLayoutDerived.mainLayout().scale}
								text={bookEventAmountToCurrencyString(countUpAmount)}
								style={{
									fontFamily: 'Lunar Display',
									fill: 0xffe6ae,
									fontSize: SYMBOL_SIZE,
									align: 'center',
									fontWeight: 'bold',
									letterSpacing: 0,
								}}
							/>
						{/if}
					</Container>
				</MainContainer>

				<WinCoins
					emit={isBigWin && !countUpCompleted && !reducedMotion.current && !stateBet.isTurbo}
					levelAlias={winLevelData?.alias}
				/>

				{#if isBigWin}<PressToContinue
						onpress={() => (countUpCompleted ? oncomplete() : finishCountUp())}
					/>{/if}
			{/snippet}
		</WinCountUpProvider>
	{/if}
</FadeContainer>
