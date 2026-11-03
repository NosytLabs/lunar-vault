<script lang="ts">
	import type { Snippet } from 'svelte';

	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import GameRuleContent from './GameRuleContent.svelte';

	type Props = {
		children: Snippet;
	};

	const props = $props();
</script>

{#if stateModal.modal?.name === 'gameRules'}
	<Popup zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			<BaseScrollable type="column">
				<GameRuleContent kind="gameRules" />
				{@render props.children()}
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}
