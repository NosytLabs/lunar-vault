<script lang="ts">
	import { zIndex } from 'constants-shared/zIndex';
	import { Popup } from 'components-shared';
	import { stateModal, stateSound } from 'state-shared';

	import BaseTitle from './BaseTitle.svelte';
	import BaseContent from './BaseContent.svelte';
	import BaseScrollable from './BaseScrollable.svelte';
	import ModalSettingsSound from './ModalSettingsSound.svelte';
	import { i18nDerived } from '../i18n/i18nDerived';
</script>

{#if stateModal.modal?.name === 'settings'}
	<Popup label="Sound settings" zIndex={zIndex.modal} onclose={() => (stateModal.modal = null)}>
		<BaseContent maxWidth="100%">
			<BaseTitle>{i18nDerived.settings()}</BaseTitle>
			<BaseScrollable type="column">
				<div class="wrap">
					<ModalSettingsSound
						label={i18nDerived.masterVolume()}
						bind:value={stateSound.volumeValueMaster}
					>
						{i18nDerived.masterVolume()}
					</ModalSettingsSound>

					<ModalSettingsSound
						label={i18nDerived.musicVolume()}
						bind:value={stateSound.volumeValueMusic}
					>
						{i18nDerived.musicVolume()}
					</ModalSettingsSound>

					<ModalSettingsSound
						label={i18nDerived.soundEffectVolume()}
						bind:value={stateSound.volumeValueSoundEffect}
					>
						{i18nDerived.soundEffectVolume()}
					</ModalSettingsSound>
				</div>
			</BaseScrollable>
		</BaseContent>
	</Popup>
{/if}

<style lang="scss">
	.wrap {
		display: flex;
		flex-direction: column;
		gap: 1rem;

		@media (min-width: 480px) {
			min-width: 360px;
		}

		@media (min-width: 800px) {
			min-width: 480px;
		}
	}
</style>
