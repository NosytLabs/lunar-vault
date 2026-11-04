<script lang="ts">
	/**
	 * Renders the game's paytable / game-rules containers.
	 *
	 * The SDK shipped placeholders ("ADD YOUR PAY TABLE", "ADD YOUR GAME RULES")
	 * and pointed the containers at a remote CDN asset from a different game.
	 * Engine's approval guidelines require every symbol payout, every mode's
	 * RTP and max win, and how wins form to be visible to the player, so the
	 * content comes from the game's own metadata.
	 */
	import { stateMeta, type GameRuleContainer } from 'state-shared';

	import { translate } from '../i18n/i18nDerived';

	type Props = {
		kind: 'payTable' | 'gameRules';
	};

	const props: Props = $props();

	const data = $derived(
		stateMeta.gameRuleMeta[props.kind as keyof typeof stateMeta.gameRuleMeta] as {
			title: string;
			rows: number;
			columns: number;
			containers: GameRuleContainer[];
		}[],
	);
</script>

{#each data as section, sectionIndex (section.title + sectionIndex)}
	<div class="section">
		{#if section.title}
			<h3 class="section-title">{translate(section.title)}</h3>
		{/if}
		<div
			class="grid"
			style:grid-template-columns={`repeat(${section.columns}, minmax(0, 1fr))`}
		>
			{#each section.containers as container (`${container.row}-${container.column}`)}
				<div
					class="container"
					style:grid-row={container.row + 1}
					style:grid-column={container.column + 1}
				>
					{#if container.title}
						<div class="container-title">{translate(container.title)}</div>
					{/if}
					{#if container.text}
						<div class="container-text">{translate(container.text)}</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/each}

<style lang="scss">
	.section {
		margin-bottom: 1.25rem;
	}

	.section-title {
		font-size: 1rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		color: #ffdfaa;
	}

	.grid {
		display: grid;
		gap: 0.5rem 1rem;
	}

	.container {
		min-width: 0;
	}

	.container-title {
		font-weight: 700;
		font-size: 0.85rem;
		margin-bottom: 0.15rem;
	}

	.container-text {
		font-size: 0.8rem;
		line-height: 1.35;
		white-space: pre-line;
	}
</style>
