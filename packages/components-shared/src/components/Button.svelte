<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = Omit<HTMLButtonAttributes, 'children'> & {
		debug?: boolean;
		disabled?: boolean;
		onclick: () => any;
		children: Snippet;
		'data-test'?: string;
	};

	const { debug, disabled = false, onclick, children, type = 'button', ...rest }: Props = $props();
</script>

<button class="button" class:debug class:disabled {type} {disabled} {onclick} {...rest}>
	{@render children()}
</button>

<style lang="scss">
	.button {
		width: 100%;
		position: relative;
		font-family: inherit;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		background-color: transparent;
		border-color: transparent;
		padding: 0;
		border-radius: 8px;
		color: var(--ui-ink, #f5eddd);
		line-height: 1.2;
	}
	.button:focus-visible {
		outline: 3px solid #fff0bd;
		outline-offset: 3px;
	}
	.button:not(:disabled):hover {
		filter: brightness(1.16);
	}
	.button:not(:disabled):active {
		filter: brightness(0.92);
	}

	.button.debug {
		border-color: white;
		border-width: 2px;
	}

	.button.disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
</style>
