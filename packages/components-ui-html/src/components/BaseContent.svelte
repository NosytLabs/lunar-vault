<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		maxWidth: string;
		children: Snippet;
	};

	const props: Props = $props();
</script>

<div class="ui-popup-standard-content-wrap" style="--maxWidth: {props.maxWidth}; --zIndex: {100}">
	{@render props.children()}
</div>

<style lang="scss">
	.ui-popup-standard-content-wrap {
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		z-index: var(--zIndex);
		width: min(var(--maxWidth), 800px);
		max-width: 100%;
		max-height: 100%;
		min-height: 0;
		gap: 16px;
		padding: 24px;
		box-sizing: border-box;
		border: 1px solid #b99d6266;
		border-radius: 16px;
		background: linear-gradient(145deg, #14283d, #0a1729 68%);
		box-shadow:
			0 18px 60px #0008,
			inset 0 1px #f0d59b1a;
		overflow: hidden;
		> :global(*) {
			flex-shrink: 0;
		}
		> :global(.content) {
			flex-shrink: 1;
		}
	}
	@media (max-width: 500px) {
		.ui-popup-standard-content-wrap {
			padding: 16px;
			gap: 12px;
		}
	}
	@media (max-height: 400px) {
		.ui-popup-standard-content-wrap {
			padding: 8px 12px;
			gap: 6px;
			border-radius: 10px;
		}
	}
</style>
