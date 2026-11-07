<script lang="ts">
	/**
	 * Replay "Play Again" control.
	 *
	 * Engine's replay guidelines require that after a replayed event finishes,
	 * a control lets the player watch the same event again. A replay has no
	 * session, so this replays the same book events locally rather than
	 * placing a new bet.
	 */
	import { Container, Text } from 'pixi-svelte';
	import { Button, type ButtonProps } from 'components-pixi';
	import { stateBet } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import UiSprite from './UiSprite.svelte';
	import { getContext } from '../context';
	import { UI_BASE_FONT_SIZE, UI_BASE_SIZE } from '../constants';

	const props: Partial<Omit<ButtonProps, 'children'>> = $props();
	const context = getContext();

	const sizes = { width: UI_BASE_SIZE * 1.6, height: UI_BASE_SIZE * 0.8 };

	const onpress = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'replayPlayAgain' });
	};
</script>

<Container>
	<Button {...props} {sizes} {onpress}>
		{#snippet children({ center })}
			<Container {...center}>
				<UiSprite
					key="play-again"
					width={sizes.width}
					height={sizes.height}
					anchor={0.5}
				/>
				<Text
					anchor={0.5}
					text="PLAY AGAIN"
					style={{
						align: 'center',
						wordWrap: true,
						wordWrapWidth: 200,
						fontFamily: 'proxima-nova',
						fontWeight: '600',
						fontSize: UI_BASE_FONT_SIZE * 0.85,
						fill: 0xffffff,
					}}
				/>
			</Container>
		{/snippet}
	</Button>

	<Text
		y={sizes.height * 0.6}
		anchor={0.5}
		text={numberToCurrencyString(stateBet.betAmount)}
		style={{
			align: 'center',
			fontFamily: 'proxima-nova',
			fontWeight: '600',
			fontSize: UI_BASE_FONT_SIZE * 0.75,
			fill: 0xffdfaa,
		}}
	/>
</Container>
