<script lang="ts">
	import { onMount } from 'svelte';
	import { Rectangle } from 'pixi-svelte';
	import { getContext } from '../game/context';

	type Props = { oncomplete: () => void };
	const props: Props = $props();
	const context = getContext();

	// The transition is presentation-only and must never block an Engine event.
	onMount(() => {
		const timer = window.setTimeout(() => props.oncomplete(), 280);
		return () => window.clearTimeout(timer);
	});
</script>

<Rectangle
	{...context.stateLayoutDerived.canvasSizes()}
	backgroundColor={0x070b1b}
	backgroundAlpha={0.82}
/>
