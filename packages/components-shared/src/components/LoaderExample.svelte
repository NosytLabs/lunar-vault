<script lang="ts">
	import LoaderBase from './LoaderBase.svelte';

	type Props = {
		src: string;
		oncomplete?: () => void;
	};

	const props: Props = $props();
</script>

<!--
	The SDK shipped this with an "Add Your Loader" placeholder over the
	animation. Engine's approval guidelines treat visible placeholder text as
	a failure, so the loader shows the game's own artwork only.
-->
<LoaderBase
	maxWidth={200}
	backgroundColor={'#000000'}
	timeout={2000}
	src={props.src}
	oncomplete={props.oncomplete}
/>
