<script lang="ts" module>
	import { Rectangle, type RectangleProps } from 'pixi-svelte';
	export type Props = RectangleProps & { key?: string };
</script>

<script lang="ts">
	const { key, ...props }: Props = $props();
</script>

<Rectangle
	borderRadius={key === 'bet' ? 100 : 28}
	backgroundColor={key === 'bet' ? 0x9c743b : 0x0c1c30}
	backgroundAlpha={0.96}
	borderColor={0xb99c64}
	borderWidth={3}
	{...props}
/>
