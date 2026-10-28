<script lang="ts">
	import { Popup, Button } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal, stateUrlDerived } from 'state-shared';
	import BaseContent from './BaseContent.svelte';
	import BaseTitle from './BaseTitle.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import BaseIcon from './BaseIcon.svelte';
	import BaseButtonContent from './BaseButtonContent.svelte';
	import { gameErrorMessage } from 'utils-shared/gameErrorMessage';
	const message = $derived(
		stateUrlDerived.replay()
			? 'This replay is unavailable or contains an invalid round. Open a valid replay link and reload.'
			: stateModal.modal?.name === 'error'
				? gameErrorMessage(stateModal.modal.error)
				: '',
	);
</script>

{#if stateModal.modal?.name === 'error'}
	<Popup label="Unable to continue" zIndex={zIndex.modal} persistent onclose={() => {}}
		><BaseContent maxWidth="480px"
			><BaseTitle>Unable to continue</BaseTitle>
			<BaseScrollable type="column"><p role="alert">{message}</p></BaseScrollable>
			<Button onclick={() => location.reload()}
				><BaseIcon width="100%" height="44px" /><BaseButtonContent>Reload game</BaseButtonContent
				></Button
			></BaseContent
		></Popup
	>
{/if}

<style>
	p {
		font:
			400 15px/1.6 'Lunar Body',
			Arial,
			sans-serif;
		color: #e4eaf2;
		text-align: center;
		margin: 0;
		padding: 4px;
	}
</style>
