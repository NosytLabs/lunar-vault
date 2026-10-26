<script lang="ts">
	import { onDestroy, type Snippet } from 'svelte';
	import * as PIXI from 'pixi.js';

	import { getContextApp } from '../context.svelte';
	import { getProcessed } from '../assetLoad';
	import type { LoadedAssets, RawAsset } from '../types';

	type Props = { children: Snippet };

	const props: Props = $props();
	const context = getContextApp();

	let preLoaded = $state(false);

	const assetNameList = $derived(
		context.stateApp.assets
			? Object.keys(context.stateApp.assets).filter(
					(key) => Boolean(context.stateApp.assets?.[key].preload) === false,
				)
			: [],
	);

	const preAssetNameList = $derived(
		context.stateApp.assets
			? Object.keys(context.stateApp.assets).filter(
					(key) => context.stateApp.assets?.[key].preload === true,
				)
			: [],
	);

	let counter = 0;

	const onProgress = (value: number) => {
		if (preLoaded && value === 1) {
			counter = counter + 1;
			const ratio = counter / assetNameList.length;
			context.stateApp.loadingProgress = ratio * 100;
		}
	};

	let disposed = false;
	onDestroy(() => {
		disposed = true;
	});
	async function loadOne(key: string) {
		const { type, src } = context.stateApp.assets![key];
		const loadSrc =
			type === 'spine' ? Object.values(src).filter((item) => typeof item === 'string') : src;
		for (let attempt = 0; attempt < 3; attempt++) {
			try {
				const rawAsset = await PIXI.Assets.load<RawAsset>(loadSrc, onProgress);
				return getProcessed({ key, rawAsset, type, src });
			} catch {
				if (attempt === 2 || disposed) throw new Error('Game assets could not be loaded.');
				await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
			}
		}
	}
	async function loadAssets(names: string[]) {
		const result: LoadedAssets = {};
		// Bound fetch/decode pressure, especially on phones and small static servers.
		for (let i = 0; i < names.length; i += 4) {
			const batch = await Promise.all(names.slice(i, i + 4).map(loadOne));
			for (const item of batch) Object.assign(result, item);
		}
		return result;
	}
	let preStarted = false;
	$effect(() => {
		if (preStarted) return;
		preStarted = true;
		(async () => {
			try {
				const loaded = await loadAssets(preAssetNameList);
				if (disposed) return;
				context.stateApp.loadedAssets = loaded;
				preLoaded = true;
			} catch {
				if (!disposed) context.stateApp.loadingError = 'Game assets could not be loaded.';
			}
		})();
	});
	let postStarted = false;
	$effect(() => {
		if (!preLoaded || postStarted) return;
		postStarted = true;
		(async () => {
			try {
				const loaded = await loadAssets(assetNameList);
				if (disposed) return;
				context.stateApp.loadedAssets = { ...context.stateApp.loadedAssets, ...loaded };
				context.stateApp.loaded = true;
			} catch {
				if (!disposed) context.stateApp.loadingError = 'Game assets could not be loaded.';
			}
		})();
	});
</script>

{#if preLoaded}
	{@render props.children()}
{/if}
