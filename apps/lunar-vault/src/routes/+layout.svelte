<script lang="ts">
	import type { Snippet } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import Game from '../components/Game.svelte';
	import { setContext } from '../game/context';
	import messagesMap from '../i18n/messagesMap';
	type Props = { children: Snippet };
	const props: Props = $props();
	setContext();
</script>

<svelte:head
	><title>Lunar Vault · NosytLabs Games</title><meta
		name="description"
		content="Explore the Lunar Vault celestial slot development preview."
	/></svelte:head
>

<!-- The Engine-branded sample loader is forbidden in new submissions. -->
<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>
{@render props.children()}

<style>
	:global(html),
	:global(body) {
		width: 100%;
		height: 100%;
		overflow: hidden;
		overscroll-behavior: none;
	}
	:global(canvas) {
		display: block;
		touch-action: manipulation;
	}
</style>
