<script lang="ts" module>
	import { stateBet, stateBetDerived, stateConfig, stateModal } from 'state-shared';
</script>

<script lang="ts">
	import OnHotkey from './OnHotkey.svelte';

	const spaceHoldOn = () => {
		stateBet.autoSpinsCounter = 0;
		stateBet.isSpaceHold = true;
		stateBetDerived.updateIsTurbo(true, { persistent: true });
	};

	const spaceHoldOff = () => {
		stateBet.isSpaceHold = false;
		stateBetDerived.updateIsTurbo(false, { persistent: true });
	};
</script>

<OnHotkey
	disabled={Boolean(stateModal.modal) ||
		stateConfig.jurisdiction.disabledSpacebar ||
		stateConfig.jurisdiction.disabledTurbo ||
		stateConfig.jurisdiction.disabledAutoplay}
	hotkey="Space"
	onhold={spaceHoldOn}
	onholdend={spaceHoldOff}
/>
