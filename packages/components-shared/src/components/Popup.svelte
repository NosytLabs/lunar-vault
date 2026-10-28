<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { stateSound } from 'state-shared';

	type Props = {
		children: Snippet;
		zIndex: number;
		label?: string;
		persistent?: boolean;
		onclose: () => void;
	};

	const props: Props = $props();
	let dialog: HTMLDialogElement;
	const closeModal = () => (props.persistent ? undefined : props.onclose());

	function keepFocus(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const dialog = event.currentTarget as HTMLDialogElement;
		const controls = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
			),
		).filter(
			(element) =>
				element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true',
		);
		const first = controls[0];
		const last = controls.at(-1);
		if (!first || !last) {
			event.preventDefault();
			return;
		}
		if (
			event.shiftKey &&
			(document.activeElement === first ||
				!controls.includes(document.activeElement as HTMLElement))
		) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	onMount(() => {
		const active = document.activeElement;
		const previous =
			active instanceof HTMLElement &&
			active !== document.body &&
			active !== document.documentElement
				? active
				: null;
		const mountedDialog = dialog;
		const handleBackdrop = (event: MouseEvent) => {
			if (
				event.target === mountedDialog ||
				(event.target instanceof Element && event.target.classList.contains('top-layer'))
			)
				closeModal();
		};
		mountedDialog.addEventListener('keydown', keepFocus);
		mountedDialog.addEventListener('click', handleBackdrop);
		mountedDialog.showModal();
		const heading = mountedDialog.querySelector<HTMLElement>('[data-modal-title], h1, h2');
		if (heading) {
			heading.tabIndex = -1;
			heading.focus({ preventScroll: true });
		}
		return () => {
			mountedDialog.removeEventListener('keydown', keepFocus);
			mountedDialog.removeEventListener('click', handleBackdrop);
			if (mountedDialog.open) mountedDialog.close();
			requestAnimationFrame(() => {
				// A feature-selection dialog can be replaced by its confirmation in the same update.
				if (document.querySelector('dialog[open]')) return;
				const target =
					previous?.isConnected && !previous.matches(':disabled')
						? previous
						: document.querySelector<HTMLElement>('.menu-toggle:not(:disabled)');
				target?.focus({ preventScroll: true });
			});
		};
	});
</script>

<dialog
	bind:this={dialog}
	class="pop-up-wrap"
	aria-modal="true"
	aria-label={props.label ?? 'Game dialog'}
	style={`z-index: ${props.zIndex};`}
	oncancel={(event) => {
		event.preventDefault();
		closeModal();
	}}
>
	<div class="top-layer">
		<button
			class="modal-mute"
			type="button"
			aria-label={stateSound.volumeValueMaster ? 'Mute all sound' : 'Enable sound'}
			aria-pressed={stateSound.volumeValueMaster === 0}
			onclick={() => (stateSound.volumeValueMaster = stateSound.volumeValueMaster ? 0 : 50)}
			>{stateSound.volumeValueMaster ? 'MUTE' : 'SOUND'}</button
		>
		{#if !props.persistent}
			<button
				class="close-button"
				type="button"
				data-test="close-button"
				aria-label="Close dialog"
				onclick={closeModal}>×</button
			>
		{/if}
		{@render props.children()}
	</div>
</dialog>

<style lang="scss">
	.pop-up-wrap {
		--ui-ink: #f5eddd;
		--ui-muted: #bac8d4;
		--ui-gold: #d8bb80;
		--ui-panel: #0c1b2c;
		font-family: 'Lunar Sans', Arial, sans-serif;
		touch-action: manipulation;
		color: var(--ui-ink);
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		max-width: none;
		max-height: none;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		overflow: hidden;
	}
	.pop-up-wrap::backdrop {
		background: #030a16d9;
		backdrop-filter: blur(7px);
	}
	.top-layer {
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		padding: max(60px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
			max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.modal-mute,
	.close-button {
		position: absolute;
		top: max(8px, env(safe-area-inset-top));
		z-index: 101;
		min-width: 44px;
		min-height: 44px;
		padding: 8px;
		border: 1px solid #b8a16b99;
		border-radius: 8px;
		background: #0c1e30;
		color: #f5e5c4;
		font:
			600 11px 'Lunar Sans',
			Arial,
			sans-serif;
		cursor: pointer;
	}
	.modal-mute {
		left: max(8px, env(safe-area-inset-left));
		min-width: 62px;
	}
	.close-button {
		right: max(8px, env(safe-area-inset-right));
		font-size: 28px;
		line-height: 1;
	}
	.modal-mute:hover,
	.close-button:hover {
		background: #20354a;
		border-color: var(--ui-gold);
	}
	.modal-mute:focus-visible,
	.close-button:focus-visible {
		outline: 3px solid #fff0bd;
		outline-offset: 2px;
	}
	@media (max-height: 400px) {
		.top-layer {
			padding: 54px 8px 6px;
		}
		.modal-mute,
		.close-button {
			top: 4px;
		}
	}
</style>
