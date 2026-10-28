<script lang="ts">
	import type { Snippet } from 'svelte';

	type Element = null | HTMLDivElement;

	type Props = {
		type: 'column' | 'row';
		noScroll?: boolean;
		children: Snippet<[{ element: Element }]>;
	};

	let element = $state(null as Element);

	const props: Props = $props();
</script>

<div
	bind:this={element}
	class="content {props.type}"
	class:scrollX={!props.noScroll && props.type === 'row'}
	class:scrollY={!props.noScroll && props.type === 'column'}
	role="region"
	aria-label="Dialog content"
	tabindex={props.noScroll ? -1 : 0}
>
	{@render props.children({ element })}
</div>

<style lang="scss">
	.content {
		position: relative;
		text-align: center;
		display: flex;
		gap: 1rem;
		min-height: 0;
		min-width: 0;
		width: 100%;
		max-width: 100%;
		flex-shrink: 1;
		overscroll-behavior: contain;
		scrollbar-color: #9a845a #071321;
		scrollbar-width: thin;

		> :global(*) {
			flex-shrink: 0;
			max-width: 100%;
			box-sizing: border-box;
		}

		&.column {
			flex-direction: column;
			align-items: center;
			max-height: 100%;
		}

		&.row {
			flex-direction: row;
			justify-content: center;
			max-width: 100%;
		}
	}
	.content:focus-visible {
		outline: 2px solid #f4d89c;
		outline-offset: -2px;
	}
</style>
