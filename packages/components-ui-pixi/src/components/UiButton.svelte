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
			backgroundColor={buttonProps.disabled
				? 0x454956
				: variant === 'light'
					? 0xffd486
					: pressed ? 0x395071 : hovered ? 0x283c60 : 0x14233f}
			borderWidth={active ? 6 : 3}
			borderColor={active ? 0xffe1a3 : variant === 'light' ? 0xf8edce : 0xa77c4c}
		/>

		<Text
			{...center}
			anchor={0.5}
			text={i18nDerived[icon]()}
			style={{
				align: 'center',
				wordWrap: true,
				wordWrapWidth: 200,
				fontFamily: 'proxima-nova',
				fontWeight: '600',
				fontSize: UI_BASE_FONT_SIZE * 0.9,
				fill: buttonProps.disabled ? 0xc3c8d4 : variant === 'dark' ? 0xffe9bf : 0x12223a,
			}}
		/>

		{@render childrenFromParent?.()}
	{/snippet}
</Button>
