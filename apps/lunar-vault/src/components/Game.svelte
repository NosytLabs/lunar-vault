<script lang="ts">
	import { onMount } from 'svelte';

	import { EnablePixiExtension } from 'components-pixi';
	import { EnableHotkey } from 'components-shared';
	import { MainContainer } from 'components-layout';
	import { App } from 'pixi-svelte';
	import { stateModal, stateBet, stateBetDerived } from 'state-shared';

	import { GameVersion, Modals } from 'components-ui-html';

	import { getContext } from '../game/context';
	import EnableSound from './EnableSound.svelte';
	import EnableGameActor from './EnableGameActor.svelte';
	import ResumeBet from './ResumeBet.svelte';
	import Sound from './Sound.svelte';
	import Background from './Background.svelte';
	import LoadingScreen from './LoadingScreen.svelte';
	import BoardFrame from './BoardFrame.svelte';
	import Board from './Board.svelte';
	import Anticipations from './Anticipations.svelte';
	import Win from './Win.svelte';
	import FreeSpinIntro from './FreeSpinIntro.svelte';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import FreeSpinOutro from './FreeSpinOutro.svelte';
	import Transition from './Transition.svelte';
	import ReplayControls from './ReplayControls.svelte';
	import GameInformation from './GameInformation.svelte';
	import WinLines from './WinLines.svelte';
	import FeatureBanner from './FeatureBanner.svelte';
	import { loadGameFonts } from '../game/fonts';
	import MiniControls from './MiniControls.svelte';
	import { stateUi } from 'state-shared';

	const context = getContext();

	let fontsReady = $state(false);
	let fontError = $state(false);
	async function prepare() {
		fontError = false;
		try {
			await loadGameFonts();
		} catch {
			fontError = true;
			return;
		}
		context.stateLayout.showLoadingScreen = true;
		fontsReady = true;
	}
	onMount(prepare);

	context.eventEmitter.subscribeOnMount({
		buyBonusConfirm: () => {
			stateModal.modal = { name: 'buyBonusConfirm' };
		},
	});
</script>

{#if fontsReady}
	<App>
		<EnableSound />
		<EnableHotkey />
		<EnableGameActor />
		<EnablePixiExtension />

		<Background />

		{#if context.stateLayout.showLoadingScreen}
			<LoadingScreen onloaded={() => (context.stateLayout.showLoadingScreen = false)} />
		{:else}
			<ResumeBet />
			<!--
			The reason why <Sound /> is rendered after clicking the loading screen:
			"Autoplay with sound is allowed if: The user has interacted with the domain (click, tap, etc.)."
			Ref: https://developer.chrome.com/blog/autoplay
		-->
			<Sound />

			<MainContainer>
				<BoardFrame />
			</MainContainer>

			<MainContainer>
				<Board />
				<Anticipations />
				<WinLines />
			</MainContainer>

			<Win />
			<FreeSpinIntro />
			<FreeSpinCounter />
			<FreeSpinOutro />
			<Transition />
			<FeatureBanner />
		{/if}
	</App>
	{#if stateUi.config.mode === 'default' && !context.stateLayout.showLoadingScreen}<MiniControls
		/>{/if}
	{#if !context.stateLayout.showLoadingScreen && stateUi.config.mode === 'default' && stateBetDerived.betCost() > stateBet.balanceAmount}
		<p class="balance-help" role="status">Insufficient balance. Choose a lower play amount.</p>
	{/if}
{:else}
	<div class="font-loading">
		LUNAR VAULT<span
			>{fontError ? 'Unable to load the observatory.' : 'Preparing the observatory'}</span
		>{#if fontError}<button onclick={prepare}>Retry</button>{/if}
	</div>
{/if}

{#if context.stateApp.loadingError}
	<div class="font-loading" role="alert">
		LUNAR VAULT<span>Game assets could not be loaded.</span><button
			onclick={() => location.reload()}>Reload game</button
		>
	</div>
{/if}
<ReplayControls />

<Modals>
	{#snippet gameRules()}<GameInformation />{/snippet}
	{#snippet payTable()}<GameInformation paytable />{/snippet}
	{#snippet version()}
		<GameVersion version="0.3.0 · Development preview" />
	{/snippet}
</Modals>

<style>
	.balance-help {
		position: fixed;
		bottom: 18%;
		left: 50%;
		transform: translateX(-50%);
		margin: 0;
		padding: 8px 14px;
		border: 1px solid #b39765;
		border-radius: 8px;
		background: #0a1c30ed;
		color: #ffdfaa;
		font:
			600 14px 'Lunar Sans',
			sans-serif;
		text-align: center;
	}
	.font-loading {
		position: fixed;
		inset: 0;
		display: grid;
		place-content: center;
		gap: 12px;
		text-align: center;
		background: #071321;
		color: #f3d99f;
		font:
			700 28px Georgia,
			serif;
		letter-spacing: 3px;
	}
	.font-loading span {
		font:
			14px Arial,
			sans-serif;
		letter-spacing: 1px;
		color: #bed3e6;
	}
</style>
