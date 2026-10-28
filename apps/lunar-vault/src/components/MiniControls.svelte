<script lang="ts">
	import { tick } from 'svelte';
	import { ButtonBetProvider } from 'components-ui-pixi';
	import { OnHotkey, EnableSpaceHold } from 'components-shared';
	import {
		stateBet,
		stateBetDerived,
		stateConfig,
		stateModal,
		stateSound,
		stateUrlDerived,
		stateUi,
	} from 'state-shared';
	import { numberToCurrencyString, bookEventAmountToCurrencyString } from 'utils-shared/amount';
	import { getContext } from '../game/context';
	import FreeSpinCounter from './FreeSpinCounter.svelte';
	import report from '../../../../math/lunar-vault/report.json';
	const context = getContext();
	const { onlayout }: { onlayout?: (top: number) => void } = $props();
	let show = $state(true),
		menu = $state(false);
	let menuToggle = $state<HTMLButtonElement>();
	let menuPanel = $state<HTMLDivElement>();
	function measureControls(node: HTMLDivElement) {
		const update = () => {
			const rail = node.getBoundingClientRect();
			const session = node.querySelector('.session-readouts')?.getBoundingClientRect();
			// Short landscapes use the free space beside the reels for session details.
			onlayout?.(
				session && session.width > rail.width / 2 ? Math.min(rail.top, session.top) : rail.top,
			);
		};
		const observer = new ResizeObserver(update);
		observer.observe(node);
		const session = node.querySelector('.session-readouts');
		if (session) observer.observe(session);
		window.addEventListener('resize', update);
		update();
		return {
			destroy() {
				observer.disconnect();
				window.removeEventListener('resize', update);
			},
		};
	}
	async function toggleMenu() {
		menu = !menu;
		if (menu) {
			await tick();
			menuPanel?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
		}
	}
	function closeMenu() {
		menu = false;
		menuToggle?.focus();
	}
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menu) {
			event.preventDefault();
			closeMenu();
		}
	}
	const idle = $derived(context.stateXstateDerived.isIdle());
	const social = $derived(stateUrlDerived.social());
	const locked = $derived(Boolean(stateModal.modal));
	const autoActive = $derived(stateBetDerived.hasAutoBetCounter());
	let now = $state(Date.now());
	$effect(() => {
		if (!stateConfig.jurisdiction.displaySessionTimer || !stateConfig.sessionStartedAt) return;
		now = Date.now();
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});
	const sessionNet = $derived(stateBet.balanceAmount - stateBet.sessionStartingBalanceAmount);
	const elapsedSeconds = $derived(
		Math.max(0, Math.floor((now - stateConfig.sessionStartedAt) / 1000)),
	);
	const sessionTime = $derived(
		`${Math.floor(elapsedSeconds / 3600)
			.toString()
			.padStart(2, '0')}:${Math.floor((elapsedSeconds / 60) % 60)
			.toString()
			.padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`,
	);
	const hasSessionInfo = $derived(
		stateConfig.jurisdiction.displayRTP ||
			stateConfig.jurisdiction.displayNetPosition ||
			stateConfig.jurisdiction.displaySessionTimer,
	);
	const featureHelp = $derived(
		idle && !locked && !autoActive && !stateUi.freeSpinCounterShow
			? stateBetDerived.betCost() > stateBet.balanceAmount
				? 'Insufficient balance. Choose a lower play amount.'
				: stateConfig.jurisdiction.disabledBuyFeature
					? ''
					: !stateBetDerived.isModeConfigured('bonus')
						? 'Eclipse Chamber is unavailable in this session.'
						: !stateBetDerived.isModeAmountAvailable('bonus')
							? 'Eclipse Chamber exceeds the session limit. Choose a lower play amount.'
							: stateBet.balanceAmount <
								  stateBet.betAmount * stateBetDerived.modeCostMultiplier('bonus')
								? 'Not enough balance for Eclipse Chamber. Choose a lower play amount.'
								: ''
			: '',
	);
	const amountIndex = $derived(stateConfig.betAmountOptions.indexOf(stateBet.betAmount));
	function mute() {
		stateSound.volumeValueMaster = stateSound.volumeValueMaster ? 0 : 50;
	}
	function modal(
		name: 'gameRules' | 'payTable' | 'settings' | 'autoSpin' | 'buyBonus' | 'betAmountMenu',
	) {
		menu = false;
		stateModal.modal = { name };
	}
	function turbo() {
		stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true });
	}
	function auto() {
		if (autoActive) stateBet.autoSpinsCounter = 0;
		else modal('autoSpin');
	}
	function step(offset: number) {
		if (idle && !locked)
			stateBetDerived.setBetAmount(
				stateConfig.betAmountOptions[
					Math.max(0, Math.min(stateConfig.betAmountOptions.length - 1, amountIndex + offset))
				],
			);
	}
	context.eventEmitter.subscribeOnMount({
		uiShow: () => (show = true),
		uiHide: () => {
			show = false;
			menu = false;
		},
		stopButtonClick: () => {
			if (!stateConfig.jurisdiction.disabledTurbo)
				stateBetDerived.updateIsTurbo(true, { persistent: false });
		},
		stopButtonEnable: () => stateBetDerived.updateIsTurbo(false, { persistent: false }),
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !menu}<EnableSpaceHold />{/if}
{#if show}
	<div
		class="mini-controls"
		use:measureControls
		class:has-feature-help={featureHelp}
		aria-label="Game controls"
	>
		{#if menu}<div
				class="mini-menu"
				id="lunar-game-menu"
				bind:this={menuPanel}
				aria-label="Game menu"
			>
				<button onclick={() => modal('gameRules')}>INFO</button>
				<button onclick={() => modal('payTable')}>{social ? 'SYMBOLS' : 'PAYTABLE'}</button>
				<button onclick={() => modal('settings')}>SETTINGS</button>
				<button
					class="menu-secondary"
					disabled={(!idle && !autoActive) || stateConfig.jurisdiction.disabledAutoplay}
					onclick={auto}>{autoActive ? 'CANCEL AUTO' : 'AUTO SPIN'}</button
				>
				<button
					class="menu-secondary"
					aria-pressed={stateBet.isTurbo}
					disabled={!idle || stateConfig.jurisdiction.disabledTurbo}
					onclick={turbo}>TURBO</button
				>
				<button onclick={closeMenu}>CLOSE</button>
				{#if stateConfig.jurisdiction.disabledAutoplay || stateConfig.jurisdiction.disabledTurbo}
					<p class="menu-note">
						{stateConfig.jurisdiction.disabledAutoplay && stateConfig.jurisdiction.disabledTurbo
							? 'Auto spin and turbo are unavailable in this session.'
							: stateConfig.jurisdiction.disabledAutoplay
								? 'Auto spin is unavailable in this session.'
								: 'Turbo is unavailable in this session.'}
					</p>
				{/if}
			</div>{/if}
		<button
			class="menu-toggle"
			bind:this={menuToggle}
			disabled={locked}
			onclick={toggleMenu}
			aria-label="Menu"
			aria-expanded={menu}
			aria-controls="lunar-game-menu"
			><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24"
				><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" /></svg
			><span>MENU</span></button
		>
		<button
			class="mute"
			onclick={mute}
			aria-label={stateSound.volumeValueMaster ? 'Mute all sound' : 'Enable sound'}
			><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24"
				><path
					d="M3 9h4l5-4v14l-5-4H3z"
					fill="currentColor"
				/>{#if stateSound.volumeValueMaster}<path
						d="M16 7q6 5 0 10"
						stroke="currentColor"
						stroke-width="2"
						fill="none"
					/>{:else}<path d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="2" />{/if}</svg
			></button
		>
		<div class="readouts">
			<div><span>BALANCE</span><b>{numberToCurrencyString(stateBet.balanceAmount)}</b></div>
			<div>
				<span>WIN</span><b>{bookEventAmountToCurrencyString(stateBet.winBookEventAmount)}</b>
			</div>
		</div>
		{#if hasSessionInfo}
			<div class="session-readouts" aria-label="Session information">
				{#if stateConfig.jurisdiction.displayRTP}
					<div><span>RTP</span><b>{(report.modes.base.weightedRtp * 100).toFixed(2)}%</b></div>
				{/if}
				{#if stateConfig.jurisdiction.displayNetPosition}
					<div>
						<span>SESSION NET</span><b
							>{sessionNet > 0 ? '+' : ''}{numberToCurrencyString(sessionNet)}</b
						>
					</div>
				{/if}
				{#if stateConfig.jurisdiction.displaySessionTimer}
					<div><span>SESSION TIME</span><b>{sessionTime}</b></div>
				{/if}
			</div>
		{/if}
		{#if stateUi.freeSpinCounterShow}
			<FreeSpinCounter />
		{:else}
			<div class="amount-controls">
				<button
					class="step"
					disabled={locked || !idle || amountIndex <= 0}
					onclick={() => step(-1)}
					aria-label="Decrease amount">−</button
				>
				<button
					class="amounts"
					disabled={locked || !idle}
					onclick={() => modal('betAmountMenu')}
					aria-label="Change play amount"
					><span>{social ? 'PLAY' : 'BET'}</span><b>{numberToCurrencyString(stateBet.betAmount)}</b
					></button
				>
				<button
					class="step"
					disabled={locked || !idle || amountIndex >= stateConfig.betAmountOptions.length - 1}
					onclick={() => step(1)}
					aria-label="Increase amount">+</button
				>
			</div>
			<button
				class="secondary auto"
				disabled={locked ||
					(!idle && !autoActive) ||
					stateConfig.jurisdiction.disabledAutoplay ||
					!stateBetDerived.isBetCostAvailable()}
				onclick={auto}>{autoActive ? 'CANCEL AUTO' : 'AUTO SPIN'}</button
			>
			<button
				class="secondary turbo"
				aria-pressed={stateBet.isTurbo}
				disabled={locked || !idle || stateConfig.jurisdiction.disabledTurbo}
				onclick={turbo}>TURBO</button
			>
			<button
				class="feature"
				disabled={locked ||
					!idle ||
					stateConfig.jurisdiction.disabledBuyFeature ||
					!stateBetDerived.isModeAmountAvailable('bonus') ||
					stateBet.balanceAmount < stateBet.betAmount * 100}
				onclick={() => modal('buyBonus')}>{social ? 'PLAY' : 'BUY'} ECLIPSE CHAMBER</button
			>
		{/if}
		<ButtonBetProvider
			>{#snippet children({ key, onpress })}
				{@const disabled = key.endsWith('disabled') || locked || menu}
				<OnHotkey
					hotkey="Space"
					{onpress}
					disabled={disabled || stateConfig.jurisdiction.disabledSpacebar}
				/>
				<button class="spin" {disabled} onclick={onpress}
					><svg aria-hidden="true" width="29" height="29" viewBox="0 0 40 40"
						>{#if key.startsWith('spin')}<path
								d="M31 13a13 13 0 1 0 1 13M31 5v10H21"
								fill="none"
								stroke="currentColor"
								stroke-width="3.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>{:else}<path d="M12 12h16v16H12z" fill="currentColor" />{/if}</svg
					><span>{key.startsWith('spin') ? 'SPIN' : 'STOP'}</span></button
				>
			{/snippet}</ButtonBetProvider
		>
		{#if featureHelp}<p class="feature-help" role="status">{featureHelp}</p>{/if}
	</div>
{:else}
	<button
		class="floating-mute"
		onclick={mute}
		aria-label={stateSound.volumeValueMaster ? 'Mute all sound' : 'Enable sound'}
		>{stateSound.volumeValueMaster ? 'MUTE' : 'SOUND'}</button
	>
{/if}

<style>
	.mini-controls {
		position: fixed;
		bottom: max(14px, env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		width: min(1040px, 96vw);
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		z-index: 20;
		border: 1px solid #b5a07466;
		border-radius: 10px;
		background: #091725f2;
		color: #f4e4c5;
		font-family: 'Lunar Sans', sans-serif;
		box-sizing: border-box;
	}
	.mini-controls.has-feature-help {
		flex-wrap: wrap;
	}
	.feature-help {
		flex: 0 0 100%;
		margin: 0;
		color: #ffdfaa;
		font-size: 12px;
		line-height: 1.25;
		text-align: center;
	}
	button {
		min-height: 44px;
		min-width: 44px;
		border: 1px solid #ae986055;
		border-radius: 6px;
		background: #10243a;
		color: inherit;
		font:
			600 13px/1.1 'Lunar Sans',
			sans-serif;
		cursor: pointer;
		padding: 6px;
		box-sizing: border-box;
		touch-action: manipulation;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	button:hover:not(:disabled) {
		background: #213750;
		border-color: #cbb47c;
	}
	button:focus-visible {
		outline: 3px solid #f6e0b1;
		outline-offset: 2px;
	}
	.menu-toggle,
	.mute {
		border-color: transparent;
		background: transparent;
		display: grid;
		place-items: center;
		width: 44px;
		flex-shrink: 0;
	}
	.menu-toggle span {
		font-size: 8px;
		margin-top: 2px;
	}
	.readouts {
		display: flex;
		gap: 24px;
		flex: 1;
		min-width: 0;
		padding: 0 8px;
	}
	.session-readouts {
		position: absolute;
		bottom: calc(100% + 4px);
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		align-items: center;
		gap: 8px;
		min-height: 32px;
		padding: 4px 10px;
		box-sizing: border-box;
		border: 1px solid #b5a07466;
		border-radius: 7px;
		background: #091725f2;
		font-variant-numeric: tabular-nums;
	}
	.session-readouts div {
		display: flex;
		align-items: baseline;
		justify-content: center;
		flex-wrap: wrap;
		gap: 2px 5px;
		min-width: 0;
	}
	.session-readouts span {
		font-size: 10px;
		color: #b8c5cb;
		white-space: nowrap;
	}
	.session-readouts b {
		font-size: 12px;
		color: #f6f1e6;
		white-space: nowrap;
	}
	.mini-controls:has(.session-readouts) .mini-menu {
		bottom: calc(100% + 40px);
		max-height: calc(100dvh - 105px);
		overflow-y: auto;
		box-sizing: border-box;
	}
	@media (min-aspect-ratio: 13/10) and (max-height: 600px) {
		.session-readouts {
			right: auto;
			width: 100px;
			flex-direction: column;
			gap: 8px;
			padding: 8px 5px;
		}
		.session-readouts div {
			flex-direction: column;
			align-items: center;
			gap: 1px;
		}
		.mini-controls:has(.session-readouts) .mini-menu {
			bottom: calc(100% + 6px);
		}
	}
	.readouts div {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 0;
	}
	.readouts span,
	.amounts > span {
		font-size: 9px;
		letter-spacing: 1px;
		color: #b8c5cb;
	}
	.readouts b {
		font-size: 23px;
		font-weight: 600;
		color: #f6f1e6;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.readouts div:nth-child(2) b {
		color: #ebd09b;
	}
	.amount-controls {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.amounts {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 4px;
		min-width: 80px;
		background: #071624;
	}
	.amounts b {
		font-size: 17px;
		font-weight: 600;
		white-space: nowrap;
	}
	.step {
		font-size: 24px;
		border: 0;
		background: transparent;
	}
	.secondary {
		width: 48px;
		font-size: 11px;
		letter-spacing: 0.2px;
		background: transparent;
		border-color: transparent;
	}
	.secondary[aria-pressed='true'] {
		color: #f9d388;
		border-color: #b39b65;
	}
	.feature {
		font-size: 12px;
		width: 88px;
		letter-spacing: 0.3px;
		background: #253249;
		color: #eed8a7;
	}
	.spin {
		width: 70px;
		height: 70px;
		border: 2px solid #f2db9e;
		border-radius: 50%;
		background: #cfaa62;
		color: #102238;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 0 0 3px #091725,
			0 0 0 4px #bda16c77;
		flex-shrink: 0;
	}
	.spin:hover:not(:disabled) {
		background: #e8c785;
	}
	.spin span {
		font-size: 9px;
		letter-spacing: 1px;
		margin-top: 3px;
	}
	.mini-menu {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(85px, 1fr));
		gap: 6px;
		padding: 10px;
		border: 1px solid #b09a68;
		border-radius: 9px;
		background: #071321f5;
		width: min(370px, calc(100vw - 24px));
		box-shadow: 0 8px 35px #0009;
	}
	.mini-menu button {
		font-size: 13px;
	}
	.menu-note {
		grid-column: 1 / -1;
		margin: 0;
		color: #d4dce0;
		font-size: 12px;
		line-height: 1.3;
	}
	.menu-secondary {
		display: none;
	}
	.floating-mute {
		position: fixed;
		right: 12px;
		bottom: 12px;
		z-index: 25;
		background: #10243af0;
		font-size: 11px;
	}
	@media (max-width: 1000px) {
		.step {
			display: none;
		}
		.readouts {
			gap: 14px;
			padding: 0 5px;
		}
		.readouts b {
			font-size: 19px;
		}
		.mini-controls {
			gap: 6px;
		}
		.amounts {
			min-width: 74px;
		}
		.spin {
			width: 62px;
			height: 62px;
		}
		.feature {
			width: 72px;
			font-size: 11px;
		}
	}
	@media (max-width: 600px) and (min-height: 360px) {
		.mini-controls {
			display: grid;
			grid-template-columns: 44px 44px minmax(0, 1fr) 64px;
			padding: 8px;
			gap: 6px;
			bottom: 10px;
		}
		.feature-help {
			grid-column: 1 / -1;
			grid-row: 3;
		}
		.menu-toggle {
			grid-column: 1;
			grid-row: 1;
		}
		.mute {
			grid-column: 2;
			grid-row: 1;
		}
		.readouts {
			grid-column: 3;
			grid-row: 1;
			gap: 14px;
			padding: 0 3px;
			justify-content: space-around;
		}
		.readouts b {
			font-size: 18px;
		}
		.readouts span {
			font-size: 8px;
		}
		.spin {
			grid-column: 4;
			grid-row: 1;
			width: 58px;
			height: 58px;
		}
		.amount-controls {
			grid-column: 1/4;
			grid-row: 2;
			justify-content: center;
		}
		.step {
			display: block;
		}
		.amounts {
			min-width: 110px;
		}
		.feature {
			grid-column: 4;
			grid-row: 2;
			min-height: 44px;
			width: 58px;
			font-size: 10px;
		}
		.secondary {
			display: none;
		}
		.menu-secondary {
			display: block;
		}
	}
	@media (max-height: 359px) {
		.mini-controls {
			bottom: 4px;
			left: 4px;
			right: 4px;
			transform: none;
			width: auto;
			gap: 4px;
			padding: 2px;
		}
		.menu-toggle {
			width: 44px;
		}
		.menu-toggle svg {
			height: 18px;
		}
		.menu-toggle span {
			font-size: 9px;
		}
		.mute,
		.secondary,
		.step {
			display: none;
		}
		.readouts {
			gap: 8px;
			padding: 0 3px;
		}
		.readouts span {
			font-size: 9px;
			letter-spacing: 0;
		}
		.readouts b {
			font-size: 13px;
		}
		.session-readouts {
			width: 76px;
			gap: 4px;
			padding: 3px 5px;
		}
		.session-readouts span {
			font-size: 9px;
		}
		.session-readouts b {
			font-size: 11px;
		}
		.amounts {
			min-width: 60px;
			padding: 3px;
		}
		.amounts span {
			font-size: 9px;
			letter-spacing: 0;
		}
		.amounts b {
			font-size: 13px;
		}
		.feature {
			min-width: 44px;
			width: 44px;
			font-size: 9px;
			padding: 3px;
		}
		.spin {
			width: 48px;
			height: 44px;
			min-width: 48px;
			box-shadow: none;
			border-width: 1px;
		}
		.spin svg {
			width: 22px;
			height: 22px;
		}
		.spin span {
			font-size: 9px;
			margin-top: 0;
		}
		.mute {
			display: grid;
			position: fixed;
			top: 4px;
			right: 4px;
			background: #10243aeb;
			border: 1px solid #b09a6866;
		}
		.menu-secondary {
			display: block;
		}
		.floating-mute {
			right: 4px;
			bottom: 54px;
			font-size: 9px;
		}
	}
	@media (prefers-contrast: more) {
		.mini-controls,
		.mini-menu {
			background: #000;
			border-color: #fff;
		}
		button {
			border-color: #fff;
			color: #fff;
		}
		.spin {
			background: #765b2b;
		}
		.readouts span {
			color: #fff;
		}
	}
</style>
