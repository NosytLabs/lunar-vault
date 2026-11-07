<script lang="ts">
	import { Popup } from 'components-shared';
	import { zIndex } from 'constants-shared/zIndex';
	import { stateModal } from 'state-shared';

	import BaseContent from './BaseContent.svelte';
	import { translate } from '../i18n/i18nDerived';
</script>

{#if stateModal.modal?.name === 'error'}
	<Popup zIndex={zIndex.modal} persistent onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			{@const error = stateModal.modal?.error}
			<span>Sorry, something went wrong.</span>
			<div class="scrollY error-text">
				{#if error}
					{#if error?.error && error?.message}
						<!-- Engine guideline [77]: the RGS's own error text is
						     player-facing, so it has to pass through the social
						     wording layer like every other string. -->
						<span>{translate(String(error.error))}</span>
						<p>{translate(String(error.message))}</p>
					{:else if typeof error === 'string'}
						<p>{translate(error)}</p>
					{:else if error?.message}
						<p>{translate(String(error.message))}</p>
					{:else}
						<p>{translate(String(error))}</p>
					{/if}
				{:else}
					<span>unknown error</span>
				{/if}
			</div>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.error-text {
		max-height: 100px;
		max-width: 480px;
		border-radius: 8px;
		border: 1px solid red;
		white-space: normal;
		padding: 1rem;
	}
</style>
