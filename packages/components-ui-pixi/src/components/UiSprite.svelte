<script lang="ts" module>
	import { Rectangle, Sprite, type RectangleProps } from 'pixi-svelte';
	export type Props = RectangleProps & { key?: string };
</script>

<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	const { key, ...props }: Props = $props();
	const contrast = new MediaQuery('(prefers-contrast: more)');
</script>

{#if key === 'bet'}
	<Sprite
		key="lunarSpinButton"
		width={props.width}
		height={props.height}
		x={props.x}
		y={props.y}
		anchor={props.anchor}
		alpha={props.alpha}
		tint={props.backgroundColor === 0x414d55 ? 0x777777 : 0xffffff}
	/>
{:else}
	<Rectangle
		borderRadius={key === 'bet' ? 100 : 28}
		backgroundColor={key === 'bet' ? 0x9c743b : 0x0c1c30}
		backgroundAlpha={0.96}
		borderColor={contrast.current ? 0xffe7ad : 0xb99c64}
		borderWidth={contrast.current ? 5 : 3}
		{...props}
	/>
{/if}
