<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();
</script>

<div class="base-button-content">
	{@render props.children()}
</div>

<style lang="scss">
	.base-button-content {
		position: absolute;
		inset: 0;
		color: var(--ui-ink, #f5eddd);
		font-weight: 600;
		line-height: 1.2;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>
