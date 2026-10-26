<script lang="ts">
	import { stateModal, stateConfig } from 'state-shared';
	import { onMount, onDestroy } from 'svelte';

	import { getContextEventEmitter } from 'utils-event-emitter';

	import type { EmitterEventHotKey } from '../types';

	const context = getContextEventEmitter<EmitterEventHotKey>();
	const PREVENT_DEFAULT_KEYS = ['Space', 'ArrowUp', 'ArrowDown'];
	const EXCLUDED_TAGS = ['input', 'textarea', 'select', 'button', 'a'];

	const getValidElement = (e: KeyboardEvent) =>
		!(
			e.target instanceof HTMLElement &&
			(e.target.isContentEditable || EXCLUDED_TAGS.includes(e.target.tagName.toLowerCase()))
		) &&
		(!stateModal.modal || e.key === 'Escape') &&
		!(e.code === 'Space' && stateConfig.jurisdiction.disabledSpacebar);

	function handleKeydown(e: KeyboardEvent) {
		if (getValidElement(e) && !e.repeat) {
			const isSpace = e.key === ' ';
			const key = isSpace ? 'Space' : e.key;
			if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
			if (key) context.eventEmitter.broadcast({ type: 'hotKey', key, action: 'keyDown' });
		}
	}

	function handleKeyup(e: KeyboardEvent) {
		if (getValidElement(e)) {
			const isSpace = e.key === ' ';
			const key = isSpace ? 'Space' : e.key;
			if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
			if (key) context.eventEmitter.broadcast({ type: 'hotKey', key, action: 'keyUp' });
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('keyup', handleKeyup);
	});
</script>
