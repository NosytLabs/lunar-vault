<script lang="ts">
	import { Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';

	import UiSprite from './UiSprite.svelte';
	import type { ButtonIcon } from '../types';
	import type { Snippet } from 'svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
	import { UI_BASE_FONT_SIZE } from '../constants';

	type Props = Omit<ButtonProps, 'children'> & {
		icon: ButtonIcon;
		sizes: { width: number; height: number };
		active?: boolean;
		children?: Snippet;
		variant?: 'dark' | 'light';
	};

	const {
		icon,
		active,
		variant = 'dark',
		children: childrenFromParent,
		...buttonProps
	}: Props = $props();
</script>

<Button {...buttonProps}>
	{#snippet children({ center, hovered, pressed })}
		<UiSprite
			{...center}
			anchor={0.5}
			width={buttonProps.sizes.width}
			height={buttonProps.sizes.height}
			backgroundColor={variant === 'dark'
				? pressed
					? 0x294863
					: hovered
						? 0x1b344b
						: 0x0c1c30
				: 0xe6d5b4}
			{...buttonProps.disabled
				? {
						backgroundColor: 0x263342,
					}
				: {}}
			{...active
				? {
						borderWidth: 5,
						borderColor: variant === 'dark' ? 0xf5e5c4 : 0x0c1c30,
					}
				: {}}
		/>

		<Text
			{...center}
			anchor={0.5}
			text={i18nDerived[icon]()}
			style={{
				align: 'center',
				wordWrap: true,
				wordWrapWidth: 115,
				fontFamily: 'Lunar Sans',
				fontWeight: '700',
				fontSize: UI_BASE_FONT_SIZE * 0.86,
				fill: variant === 'dark' ? 0xf5e5c4 : 0x0c1c30,
			}}
		/>

		{@render childrenFromParent?.()}
	{/snippet}
</Button>
