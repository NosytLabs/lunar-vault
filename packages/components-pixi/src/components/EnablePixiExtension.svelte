<script lang="ts">
	import { getContextApp } from 'pixi-svelte';

	const context = getContextApp();

	// The global is declared by the SDK's own global augmentation; this is
	// the one place it is assigned.
	(globalThis as { __PIXI_APP__?: unknown }).__PIXI_APP__ =
		context.stateApp.pixiApplication;
</script>
