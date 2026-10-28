<script lang="ts">
	import { stateModal, stateConfig } from 'state-shared';
	import { onMount, onDestroy } from 'svelte';

	import { getContextEventEmitter } from 'utils-event-emitter';

	import type { EmitterEventHotKey } from '../types';

	const context = getContextEventEmitter<EmitterEventHotKey>();
	const PREVENT_DEFAULT_KEYS = ['Space', 'ArrowUp', 'ArrowDown'];
	const EXCLUDED_TAGS = ['input', 'textarea', 'select', 'button', 'a'];

	const getValidElement = (e: KeyboardEvent) =>
		e.key === 'Escape' ||
		(!(
			e.target instanceof HTMLElement &&
			(e.target.isContentEditable || EXCLUDED_TAGS.includes(e.target.tagName.toLowerCase()))
		) &&
			!stateModal.modal &&
			!(e.code === 'Space' && stateConfig.jurisdiction.disabledSpacebar));

	const activeKeys = new Set<string>();
	const keyOf = (e: KeyboardEvent) => (e.key === ' ' || e.code === 'Space' ? 'Space' : e.key);
	function releaseKey(key: string) {
		activeKeys.delete(key);
		context.eventEmitter.broadcast({ type: 'hotKey', key, action: 'keyUp' });
	}
	function handleKeydown(e: KeyboardEvent) {
		if (!getValidElement(e) || e.repeat) return;
		const key = keyOf(e);
		if (!key) return;
		if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
		activeKeys.add(key);
		context.eventEmitter.broadcast({ type: 'hotKey', key, action: 'keyDown' });
	}
	function handleKeyup(e: KeyboardEvent) {
		const key = keyOf(e);
		if (!key || (!activeKeys.has(key) && !getValidElement(e))) return;
		if (PREVENT_DEFAULT_KEYS.includes(key)) e.preventDefault();
		releaseKey(key);
	}
	function releaseActiveKeys() {
		for (const key of [...activeKeys]) releaseKey(key);
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);
		window.addEventListener('blur', releaseActiveKeys);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		window.removeEventListener('keyup', handleKeyup);
		window.removeEventListener('blur', releaseActiveKeys);
		releaseActiveKeys();
	});
</script>
