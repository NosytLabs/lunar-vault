<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';
	import { Text, REM } from 'pixi-svelte';
	import { getContext } from '../context';

	type Props = { name: string };
	const props: Props = $props();
	const context = getContext();
	const compact = $derived(context.stateLayoutDerived.canvasSizes().width < 520);
	const reactiveDate = new SvelteDate();
	const clock = $derived(
		reactiveDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: false }),
	);
	const textProps = $derived({
		style: {
			fontFamily: 'Arial, sans-serif',
			fontSize: compact ? REM * 1.15 : REM * 1.5,
			fontWeight: '700',
			lineHeight: REM * 1.8,
			fill: 0xffebc4,
		},
	});
	let clockSizes = $state({ width: 0, height: 0 });
	$effect(() => {
		const interval = window.setInterval(() => reactiveDate.setTime(Date.now()), 30_000);
		return () => window.clearInterval(interval);
	});
</script>

{#if !compact}
	<Text text={clock} onresize={(value) => (clockSizes = value)} {...textProps} />
{/if}
<Text text={props.name} x={compact ? 0 : clockSizes.width + 9} {...textProps} />
