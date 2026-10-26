<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { baseBooks, riverBooks, opening, labels, stages } from './books';
	let board = $state([...opening]);
	let points = $state(1000);
	let castSize = $state(1);
	let runSize = 1;
	let lastAward = $state(0);
	let runAward = $state(0);
	let catches = $state(0);
	let castIndex = $state(0);
	let baseIndex = 0;
	let inRun = $state(false);
	let phase = $state<'idle' | 'spinning' | 'award'>('idle');
	let positions = $state<number[]>([]);
	let message = $state('Cast into the wild. Follow the silver.');
	let modal = $state<'rules' | 'entry' | 'complete' | null>(null);
	let dialog: HTMLDialogElement;
	let osReduced = $state(false);
	let lessMotion = $state(false);
	let disposed = false;
	let fast = false;
	let timer: ReturnType<typeof setTimeout>;
	let finishDelay: (() => void) | undefined;
	const busy = $derived(phase !== 'idle');
	const reduced = $derived(osReduced || lessMotion);
	const stage = $derived(Math.min(2, Math.floor(catches / 3)));
	const wait = (ms: number) =>
		new Promise<void>((resolve) => {
			finishDelay = () => {
				clearTimeout(timer);
				finishDelay = undefined;
				resolve();
			};
			timer = setTimeout(finishDelay, fast ? 0 : ms);
		});
	$effect(() => {
		if (modal && dialog && !dialog.open) dialog.showModal();
		else if (!modal && dialog?.open) dialog.close();
	});
	onMount(() => {
		const media = matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => {
			osReduced = media.matches;
		};
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});
	onDestroy(() => {
		disposed = true;
		finishDelay?.();
	});
	function startRun() {
		modal = null;
		inRun = true;
		runSize = castSize;
		castIndex = 0;
		catches = 0;
		runAward = 0;
		lastAward = 0;
		positions = [];
		message = 'Six casts. A river full of silver.';
	}
	async function cast() {
		if (modal) return;
		if (busy) {
			fast = true;
			finishDelay?.();
			return;
		}
		if (!inRun && points < castSize) {
			message = 'Refill demo points from the field guide.';
			return;
		}
		const feature = inRun;
		const book = feature ? riverBooks[castIndex] : baseBooks[baseIndex++ % baseBooks.length];
		const size = feature ? runSize : castSize;
		if (!feature) {
			points -= size;
			catches = 0;
			runAward = 0;
			castIndex = 0;
		}
		lastAward = 0;
		positions = [];
		fast = false;
		phase = 'spinning';
		message = feature ? `CAST ${castIndex + 1} OF 6 · THE RIVER RUN` : 'A line across the water…';
		await wait(reduced ? 180 : 850);
		if (disposed) return;
		board = [...book.board];
		positions = [...book.positions];
		lastAward = book.award * size;
		points += lastAward;
		message = book.message;
		phase = 'award';
		if (feature) {
			catches += riverBooks[castIndex].fish;
			runAward += lastAward;
			castIndex++;
		}
		await wait(reduced ? 160 : 650);
		if (disposed) return;
		phase = 'idle';
		if (feature && castIndex === riverBooks.length) {
			inRun = false;
			modal = 'complete';
		} else if (!feature && 'feature' in book && book.feature) modal = 'entry';
	}
	function keydown(event: KeyboardEvent) {
		if (
			event.code !== 'Space' ||
			event.repeat ||
			modal ||
			(event.target instanceof HTMLElement && event.target.closest('button,input,dialog'))
		)
			return;
		event.preventDefault();
		void cast();
	}
</script>

<svelte:window onkeydown={keydown} />
<main class:reduced class:river-run={inRun}>
	<div class="scene-shade"></div>
	<header>
		<p class="studio">NOSYTLABS GAMES <span>PLAYABLE CONCEPT</span></p>
		<h1>Salmon <em>Run</em></h1>
		<p class="tagline">FOLLOW THE SILVER</p>
	</header>
	<section class="game" aria-label="Salmon Run playfield">
		<div class="river-track" aria-label={`River progress: ${catches} of 6 salmon`}>
			{#each stages as name, i}<span class:reached={stage >= i && catches > 0}
					><b>{i + 1}</b>{name}</span
				>{/each}
			<strong>{inRun ? `${castIndex}/6 CASTS` : 'THE UPSTREAM RUN'}</strong>
		</div>
		<div class="board-frame" class:spinning={phase === 'spinning' && !reduced} aria-busy={busy}>
			<div class="corner tl"></div>
			<div class="corner tr"></div>
			<div class="corner bl"></div>
			<div class="corner br"></div>
			<div
				class="reels"
				role="img"
				aria-label={`Five reels, three rows. ${board.map((name) => labels[name]).join(', ')}`}
			>
				{#each board as symbol, i}
					<div
						class="cell"
						class:winning={positions.includes(i)}
						class:fish={symbol === 'salmon'}
						style={`--col:${i % 5}`}
					>
						<img src={`./assets/${symbol}.svg`} alt="" draggable="false" />
						{#if symbol === 'salmon'}<span class="symbol-label">SILVER</span>{/if}
					</div>
				{/each}
			</div>
			<div class="waterline"></div>
		</div>
		<div class="result" role="status" aria-live="polite">
			<span>{message}</span>{#if lastAward > 0}<strong>+{lastAward} <small>POINTS</small></strong
				>{/if}
		</div>
	</section>
	<footer class="controls">
		<button
			class="menu-button"
			aria-label="Open field guide"
			onclick={() => (modal = 'rules')}
			disabled={busy}>☰</button
		>
		<div class="readouts">
			<div>
				<span>DEMO POINTS</span><strong data-testid="points"
					>{points.toLocaleString('en-US')}</strong
				>
			</div>
			<div>
				<span>{inRun ? 'RUN TOTAL' : 'LAST AWARD'}</span><strong data-testid="award"
					>{inRun ? runAward : lastAward}</strong
				>
			</div>
		</div>
		<button
			class="cast-size"
			aria-label={`Cast size ${castSize} points. Change cast size`}
			disabled={busy || inRun}
			onclick={() => (castSize = castSize === 1 ? 2 : castSize === 2 ? 5 : 1)}
			><span>CAST SIZE</span><b>{castSize}</b><small>↕</small></button
		>
		<button
			class="cast-button"
			onclick={cast}
			disabled={!!modal}
			aria-label={busy ? 'Finish animation' : inRun ? 'Cast in river run' : 'Cast'}
			><span>{busy ? '■' : '↻'}</span><b>{busy ? 'STOP' : 'CAST'}</b></button
		>
		<button class="run-preview" disabled={busy || inRun} onclick={() => (modal = 'entry')}
			><span>EXPLORE THE FEATURE</span><b>RIVER RUN</b><small>FREE PREVIEW</small></button
		>
	</footer>
	<p class="concept-note">SCRIPTED ROUNDS · DEMO POINTS · NO CASH PLAY</p>
	<dialog
		bind:this={dialog}
		oncancel={(e) => {
			e.preventDefault();
			if (modal === 'rules' || modal === 'complete') modal = null;
		}}
	>
		{#if modal === 'rules'}
			<p class="eyebrow">THE FIELD GUIDE</p>
			<h2>A river worth exploring</h2>
			<p>
				Salmon Run is an original interactive concept. Every outcome is an authored example in a
				repeating sequence. Demo points have no value. There is no wagering service, random outcome
				generator or verified RTP.
			</p>
			<h3>Cast · collect · travel upstream</h3>
			<p>
				Base casts cycle through a quiet round, a five-reel award and a River Run trigger. Five
				silver salmon open a six-cast run. Fish collected during the run take you from the Shallows
				to the Headwaters. Each cast reveals a supplied award; reaching a new river stage does not
				multiply it.
			</p>
			<p>
				The free preview starts the same six-cast feature without deducting points. Cast size scales
				scripted awards and stays locked through a run. Stop only finishes presentation sooner.
				Space casts when no dialog or focused control is active.
			</p>
			<label class="motion-choice"
				><input type="checkbox" bind:checked={lessMotion} /> Less motion {osReduced
					? '(also enabled by your device)'
					: ''}</label
			>
			<div class="dialog-actions">
				<button
					onclick={() => {
						points = 1000;
					}}>Refill demo points</button
				><button class="primary" onclick={() => (modal = null)}>Back to the river</button>
			</div>
		{:else if modal === 'entry'}
			<img class="feature-fish" src="./assets/salmon.svg" alt="Silver salmon" />
			<p class="eyebrow">FOLLOW THE SILVER</p>
			<h2>The Upstream Run</h2>
			<p class="feature-number">6 <span>CASTS</span></p>
			<p>From quiet shallows to wild headwaters.<br />Collect the silver salmon along the way.</p>
			<p class="fine">Scripted concept feature · No points deducted</p>
			<button class="primary" onclick={startRun}>Enter the river</button>
		{:else if modal === 'complete'}
			<p class="eyebrow">HEADWATERS REACHED</p>
			<h2>A run to remember</h2>
			<p class="feature-number" data-testid="run-total">{runAward} <span>DEMO POINTS</span></p>
			<p>
				{catches} silver salmon · {castIndex} casts<br />Your illustrative award is already added.
			</p>
			<button class="primary" onclick={() => (modal = null)}>Back to the river</button>
		{/if}
	</dialog>
</main>
