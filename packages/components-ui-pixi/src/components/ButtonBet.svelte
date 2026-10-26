<script lang="ts">
	import { Container, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import { stateBetDerived, stateConfig, stateModal } from 'state-shared';

	import UiSprite from './UiSprite.svelte';
	import ButtonBetProvider from './ButtonBetProvider.svelte';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';
	import { i18nDerived } from '../i18n/i18nDerived';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const sizes = { width: UI_BASE_SIZE, height: UI_BASE_SIZE };
</script>

<ButtonBetProvider>
	{#snippet children({ key, onpress })}
		{@const disabled = key.endsWith('disabled') || Boolean(stateModal.modal)}
		<OnHotkey
			hotkey="Space"
			disabled={disabled || stateConfig.jurisdiction.disabledSpacebar}
			{onpress}
		/>
		<Button {...props} {sizes} {onpress} {disabled}>
			{#snippet children({ center, hovered })}
				<Container {...center}>
					<UiSprite
						key="bet"
						width={sizes.width}
						height={sizes.height}
						anchor={0.5}
						{...disabled || ['spin_disabled', 'stop_disabled'].includes(key)
							? {
									backgroundColor: 0x414d55,
								}
							: {}}
					/>
					<Text
						anchor={0.5}
						text={['spin_default', 'spin_disabled'].includes(key) ? 'SPIN' : i18nDerived.stop()}
						style={{
							align: 'center',
							wordWrap: true,
							wordWrapWidth: 200,
							fontFamily: 'Lunar Sans',
							fontWeight: '600',
							fontSize: UI_BASE_FONT_SIZE * 0.9,
							fill: 0xffffff,
						}}
					/>
				</Container>
			{/snippet}
		</Button>
	{/snippet}
</ButtonBetProvider>
