<script lang="ts">
	import { type Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoaderExample, LoadI18n } from 'components-shared';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	let showYourLoader = $state(false);

	// Engine's approval guideline: the game must not show a Stake Engine
	// loader. The SDK's LoaderStakeEngine rendered the Stake Engine branding
	// before the game's own loader, so only the game's own loader is used.
	const loaderUrl = new URL('../../loader.gif', import.meta.url).href;

	setContext();
</script>

<svelte:head>
	<title>Lunar Vault</title>
	<meta name="description" content="Lunar Vault - a five reel, twenty payline slot game." />
</svelte:head>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

{#if showYourLoader}
	<LoaderExample src={loaderUrl} oncomplete={() => (showYourLoader = false)} />
	<!-- '/loader.gif' is served from the static folder of sveltekit -->
{/if}

{@render props.children()}
