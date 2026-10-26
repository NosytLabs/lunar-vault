<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: Snippet;
		description: Snippet;
		price: Snippet;
		button: Snippet;
	};

	const props: Props = $props();
</script>

<div class="bonus-card-wrap">
	<div class="info">
		{@render props.title()}
		{@render props.description()}
		{@render props.price()}
	</div>
	{@render props.button()}
</div>

<style lang="scss">
	.bonus-card-wrap {
		padding: 20px;
		flex-direction: column;
		display: flex;
		justify-content: space-between;

		border-radius: 18px;
		border: 1px solid #bd995d;
		background: linear-gradient(145deg, #142b44, #071321);
		text-align: left;
		box-sizing: border-box;
		width: min(340px, calc(100vw - 48px));
		min-width: 0;
		gap: 18px;
	}

	.info {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
	}
</style>
