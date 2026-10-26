<script lang="ts">
	import { ButtonBetProvider } from 'components-ui-pixi';
	import { OnHotkey } from 'components-shared';
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
	const context = getContext();
	let show = $state(true),
		menu = $state(false);
	const idle = $derived(context.stateXstateDerived.isIdle());
	const social = $derived(stateUrlDerived.social());
	const locked = $derived(Boolean(stateModal.modal));
	context.eventEmitter.subscribeOnMount({
		uiShow: () => (show = true),
		uiHide: () => {
			show = false;
			menu = false;
		},
	});
	function modal(
		name: 'gameRules' | 'payTable' | 'settings' | 'autoSpin' | 'buyBonus' | 'betAmountMenu',
	) {
		menu = false;
		stateModal.modal = { name };
	}
	function turbo() {
		stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true });
	}
</script>

{#if show}
	<div class="mini-controls" aria-label="Compact game controls">
		{#if menu}
			<div class="mini-menu" aria-label="Game menu">
				<button onclick={() => modal('gameRules')}>INFO</button>
				<button onclick={() => modal('payTable')}>{social ? 'SYMBOLS' : 'PAYTABLE'}</button>
				<button onclick={() => modal('settings')}>SETTINGS</button>
				<button
					disabled={!idle || stateConfig.jurisdiction.disabledAutoplay}
					onclick={() => modal('autoSpin')}>AUTO SPIN</button
				>
				<button
					aria-pressed={stateBet.isTurbo}
					disabled={!idle || stateConfig.jurisdiction.disabledTurbo}
					onclick={turbo}>TURBO</button
				>
				<button
					onclick={() => (stateSound.volumeValueMaster = stateSound.volumeValueMaster ? 0 : 50)}
					>{stateSound.volumeValueMaster ? 'MUTE' : 'SOUND ON'}</button
				>
				<button onclick={() => (menu = false)}>CLOSE</button>
			</div>
		{/if}
		<button disabled={locked} onclick={() => (menu = !menu)}>MENU</button>
		<button
			disabled={locked ||
				!idle ||
				stateConfig.jurisdiction.disabledBuyFeature ||
				stateBet.balanceAmount < stateBet.betAmount * 100}
			onclick={() => modal('buyBonus')}>{social ? 'PLAY' : 'BUY'}<br />BONUS</button
		>
		<button
			class="amounts"
			disabled={locked || !idle}
			onclick={() => modal('betAmountMenu')}
			aria-label="Change play amount"
		>
			<div><span>BALANCE</span><b>{numberToCurrencyString(stateBet.balanceAmount)}</b></div>
			<div>
				<span>WIN</span><b>{bookEventAmountToCurrencyString(stateBet.winBookEventAmount)}</b>
			</div>
			<div>
				<span>{social ? 'PLAY' : 'BET'}</span><b>{numberToCurrencyString(stateBet.betAmount)}</b>
			</div>
		</button>
		<ButtonBetProvider>
			{#snippet children({ key, onpress })}
				{@const disabled = key.endsWith('disabled') || locked || menu}
				<OnHotkey
					hotkey="Space"
					{onpress}
					disabled={disabled || stateConfig.jurisdiction.disabledSpacebar}
				/>
				<button class="spin" {disabled} onclick={onpress}
					>{key.startsWith('spin') ? 'SPIN' : 'STOP'}</button
				>
			{/snippet}
		</ButtonBetProvider>
	</div>
{/if}

<style>
	.mini-controls {
		position: fixed;
		bottom: 4px;
		left: 4px;
		right: 4px;
		display: grid;
		grid-template-columns: 44px 44px minmax(0, 1fr) 56px;
		gap: 5px;
		z-index: 20;
		color: #f9e0ae;
		font-family: 'Lunar Sans', sans-serif;
	}
	button {
		height: 44px;
		min-width: 44px;
		border: 1px solid #bda16c;
		border-radius: 10px;
		background: #0a1b2ef5;
		color: inherit;
		font:
			700 14px/1 'Lunar Sans',
			sans-serif;
		cursor: pointer;
		padding: 3px;
		box-sizing: border-box;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	button:focus-visible {
		outline: 2px solid #fff1bd;
		outline-offset: 1px;
	}
	.spin {
		border-radius: 50%;
		background: linear-gradient(#eac589, #946331);
		color: #fff9e7;
		font-size: 19px;
		text-shadow: 0 1px 2px #3d2513;
	}
	.amounts {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1fr;
		gap: 4px;
		text-align: center;
		padding: 3px 5px;
		cursor: pointer;
	}
	.amounts div {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		min-width: 0;
	}
	.amounts span {
		font-size: 10px;
		color: #dec89e;
	}
	.amounts b {
		font-size: 17px;
		color: #fff;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.mini-menu {
		position: absolute;
		bottom: 52px;
		left: 0;
		display: grid;
		grid-template-columns: repeat(3, minmax(96px, 1fr));
		gap: 5px;
		padding: 8px;
		border: 1px solid #bda16c;
		border-radius: 12px;
		background: #061323f5;
		width: min(350px, calc(100vw - 24px));
		box-shadow: 0 5px 30px #0009;
	}
	.mini-menu button {
		font-size: 17px;
	}
	.mini-menu button[aria-pressed='true'] {
		background: #76572b;
	}
	@media (prefers-contrast: more) {
		button {
			background: #000;
			border: 2px solid #fff;
			color: #fff;
		}
		.spin {
			background: #8a5c25;
		}
		.amounts span {
			color: #fff;
		}
	}
</style>
