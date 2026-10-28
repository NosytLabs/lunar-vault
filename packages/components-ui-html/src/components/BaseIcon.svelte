<script lang="ts">
	type Props = { width: string; height: string; background?: string; border?: string };
	const {
		width,
		height,
		background = 'linear-gradient(180deg, #29415a, #12283d)',
		border = '1px solid #b9a06a99',
	}: Props = $props();
</script>

<div
	class="rectangle"
	aria-hidden="true"
	style="--width-value: {width}; --height-value: {height}; --background-value: {background}; --border-value: {border};"
></div>

<style lang="scss">
	.rectangle {
		width: var(--width-value);
		height: var(--height-value);
		box-sizing: border-box;
		background: var(--background-value);
		border: var(--border-value);
		border-radius: 8px;
		box-shadow: inset 0 1px #f3dfb01a;
	}
</style>
