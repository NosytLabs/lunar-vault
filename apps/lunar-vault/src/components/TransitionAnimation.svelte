<script lang="ts">
	import { onMount } from 'svelte';
	import { Sprite } from 'pixi-svelte';
	import { getContext } from '../game/context';
	type Props = { oncomplete: () => void };
	const props: Props = $props();
	const context = getContext();
	onMount(() => {
		const timeout = window.setTimeout(props.oncomplete, 360);
		return () => window.clearTimeout(timeout);
	});
</script>
<Sprite key="lunarWinAura" anchor={0.5} x={context.stateLayoutDerived.canvasSizes().width / 2} y={context.stateLayoutDerived.canvasSizes().height / 2} width={context.stateLayoutDerived.canvasSizes().width * 1.08} height={context.stateLayoutDerived.canvasSizes().height * 1.48} alpha={0.45} />
