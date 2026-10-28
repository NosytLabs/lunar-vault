<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
	};

	const props: Props = $props();
</script>

<h2 class="ui-modal-title-wrap" data-modal-title tabindex="-1">
	{@render props.children()}
</h2>

<style lang="scss">
	.ui-modal-title-wrap {
		text-align: center;
		margin: 0;
		color: var(--ui-gold, #d8bb80);
		font:
			700 26px/1.2 'Lunar Display',
			Georgia,
			serif;
		outline: none;
	}
	@media (max-height: 400px) {
		.ui-modal-title-wrap {
			font-size: 18px;
		}
	}
</style>
