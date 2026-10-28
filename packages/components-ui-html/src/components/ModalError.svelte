<script lang="ts">
	import { Popup, Button } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal, stateUrlDerived } from 'state-shared';
	import BaseContent from './BaseContent.svelte';
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
	<Popup zIndex={zIndex.modal} persistent onclose={() => {}}
		><BaseContent maxWidth="480px"
			><h2>Unable to continue</h2>
			<p role="alert">{message}</p>
			<Button onclick={() => location.reload()}>Reload game</Button></BaseContent
		></Popup
	>
{/if}

<style>
	h2 {
		color: #f2d7a4;
		font:
			700 24px 'Lunar Display',
			Georgia,
			serif;
		text-align: center;
	}
	p {
		font:
			400 15px/1.6 'Lunar Body',
			Arial,
			sans-serif;
		color: #e4eaf2;
		text-align: center;
		padding: 12px;
	}
</style>
