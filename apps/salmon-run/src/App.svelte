<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import Reels from './Reels.svelte';
	import {
		EngineSession,
		type Auth,
		type Round,
		type Symbol,
		type Position,
		type BookEvent,
		type Jurisdiction,
	} from './engine';
	import { RiverAudio } from './audio';
	import { formatCurrencyAmount } from 'utils-shared/formatCurrency';
	import math from '../../../math/salmon-run/config.json';
	import report from '../../../math/salmon-run/report.json';
	const labels: Record<string, string> = {
		salmon: 'Silver salmon',
		reel: 'Brass reel',
		fly: 'Copper fly',
		compass: 'River compass',
		canoe: 'Cedar canoe',
		leaf: 'Autumn leaf',
		wild: 'Wild collector',
		scatter: 'River arch',
	};
	const stages = ['SHALLOWS', 'RIVER BEND', 'HEADWATERS'];
	const initial: Symbol[][] = [
		'leaf salmon reel fly compass',
		'reel compass leaf salmon fly',
		'leaf fly canoe reel salmon',
		'canoe reel salmon compass leaf',
		'salmon canoe fly leaf reel',
	].map((reel) => reel.split(' ').map((name) => ({ name })));
	let client: EngineSession;
	let ready = $state(false),
		error = $state(''),
		currency = $state('USD'),
		social = $state(false),
		replay = $state(false),
		preview = $state(false);
	let balance = $state(0),
		levels = $state<number[]>([]),
		amount = $state(100000),
		roundAmount = $state(100000),
		jurisdiction = $state<Jurisdiction>({});
	let serverModes = $state<Record<string, { costMultiplier: number; maxBet: number }>>({});
	let mode = $state('base'),
		replayCost = $state(1),
		savedReplay: Round;
	let win = $state(0),
		runAward = $state(0),
		collected = $state(0),
		stage = $state(0),
		current = $state(0),
		total = $state(0),
		inRun = $state(false);
	let phase = $state<'idle' | 'request' | 'spinning' | 'award'>('idle');
	let positions = $state<Position[]>([]),
		line = $state(0),
		message = $state('The river is waiting.');
	let modal = $state<'guide' | 'entry' | 'complete' | 'confirm' | null>(null),
		dialog: HTMLDialogElement;
	let modalResolve: (() => void) | undefined;
	let reels = $state<{
		settle: (board: Symbol[][]) => void;
		spin: (board: Symbol[][], reduced: boolean, turbo: boolean) => Promise<void>;
		accelerate: () => void;
	}>();
	let lessMotion = $state(false),
		osReduced = $state(false),
		turbo = $state(false),
		muted = $state(false);
	let disposed = false,
		delayTimer: ReturnType<typeof setTimeout>,
		resolveDelay: (() => void) | undefined;
	const audio = new RiverAudio();
	const busy = $derived(phase !== 'idle');
	const reduced = $derived(lessMotion || osReduced);
	const riverCost = $derived(serverModes.river?.costMultiplier ?? math.modes.river.cost);
	const currencyValue = (micro: number) => formatCurrencyAmount(micro / 1e6, currency, 'en-US');
	const awardValue = (units: number) => currencyValue(Math.round((roundAmount * units) / 100));
	const fundsAvailable = $derived(balance >= amount && amount > 0);
	const baseAvailable = $derived(
		fundsAvailable && amount <= (serverModes.base?.maxBet ?? Infinity),
	);
	const wait = (ms: number) =>
		new Promise<void>((resolve) => {
			resolveDelay = () => {
				clearTimeout(delayTimer);
				resolveDelay = undefined;
				resolve();
			};
			delayTimer = setTimeout(resolveDelay, ms);
		});
	$effect(() => {
		if (modal && dialog && !dialog.open) dialog.showModal();
		else if (!modal && dialog?.open) dialog.close();
	});
	function dismiss() {
		modal = null;
		modalResolve?.();
		modalResolve = undefined;
	}
	async function prompt(kind: 'entry' | 'complete') {
		modal = kind;
		await new Promise<void>((resolve) => (modalResolve = resolve));
	}
	function snapshot(events: BookEvent[]) {
		for (const e of events) {
			if (e.type === 'reveal') reels!.settle(e.board);
			if (e.type === 'winInfo') win += e.totalWin;
			if (e.type === 'setTotalWin' || e.type === 'finalWin') win = e.amount;
			if (e.type === 'freeSpinTrigger') {
				total = e.totalFs;
				current = 0;
				inRun = true;
				collected = 0;
				stage = 0;
				runAward = 0;
			}
			if (e.type === 'updateFreeSpin') {
				current = e.amount + 1;
				total = e.total;
			}
			if (e.type === 'freeSpinRetrigger') total = e.totalFs;
			if (e.type === 'collectFish') {
				collected = e.collected;
				stage = e.stage;
			}
			if (e.type === 'freeSpinEnd') {
				runAward = e.amount;
				inRun = false;
			}
		}
	}
	async function present(e: BookEvent) {
		if (e.type === 'reveal') {
			if (
				!Array.isArray(e.board) ||
				e.board.length !== 5 ||
				e.board.some(
					(reel: Symbol[]) => reel.length !== 5 || reel.some((s) => !math.symbols.includes(s.name)),
				)
			)
				throw new Error('The returned board does not match this game.');
			positions = [];
			line = 0;
			phase = 'spinning';
			message = inRun ? `RIVER RUN · CAST ${current} OF ${total}` : 'A line across the water…';
			await reels!.spin(e.board, reduced, turbo && !jurisdiction.disabledTurbo);
			phase = 'award';
		} else if (e.type === 'winInfo') {
			for (const award of e.wins) {
				const collection = award.meta.mechanic === 'collection';
				positions = collection
					? [...award.positions, ...award.meta.collectorPositions]
					: award.positions;
				line = collection ? 0 : award.meta.lineIndex;
				win += award.win;
				message = collection
					? `SILVER COLLECT · ${award.meta.multiplier}× · ${awardValue(award.win)}`
					: `LINE ${line} · ${labels[award.symbol] ?? 'SYMBOLS'}`;
				if (collection) audio.collect();
				else audio.award();
				await wait(reduced ? (collection ? 300 : 180) : collection ? 900 : 460);
				if (disposed) return;
			}
			positions = [];
			line = 0;
		} else if (e.type === 'collectFish') {
			collected = e.collected;
			stage = e.stage;
		} else if (e.type === 'setTotalWin') {
			win = e.amount;
		} else if (e.type === 'freeSpinTrigger') {
			inRun = true;
			current = 0;
			total = e.totalFs;
			runAward = 0;
			collected = 0;
			stage = 0;
			positions = e.positions;
			await prompt('entry');
			positions = [];
		} else if (e.type === 'updateFreeSpin') {
			current = e.amount + 1;
			total = e.total;
		} else if (e.type === 'freeSpinRetrigger') {
			const added = e.totalFs - total;
			total = e.totalFs;
			message = `THE RIVER EXTENDS · +${added} CASTS`;
			await wait(reduced ? 300 : 850);
		} else if (e.type === 'freeSpinEnd') {
			runAward = e.amount;
			collected = e.collected;
			inRun = false;
			message = 'THE UPSTREAM RUN IS COMPLETE';
			await prompt('complete');
		} else if (e.type === 'finalWin') {
			win = e.amount;
			message =
				e.amount > 0 ? `ROUND WIN · ${awardValue(e.amount)}` : 'The current turns. Spin again.';
		} else throw new Error('This round needs a different game version.');
	}
	async function playback(round: Round, resume = false) {
		roundAmount = round.amount;
		mode = round.mode;
		win = 0;
		runAward = 0;
		collected = 0;
		stage = 0;
		current = 0;
		total = 0;
		inRun = false;
		positions = [];
		const stored = Number(round.event);
		const cursor =
			resume && Number.isInteger(stored) && stored > 0 ? Math.min(stored, round.state.length) : 0;
		if (cursor) snapshot(round.state.slice(0, cursor));
		for (const e of round.state.slice(cursor)) {
			if (disposed) return;
			await present(e);
			if (disposed) return;
			// Store the next unpresented event, so a reload restores completed work once.
			if (!replay && round.active) await client.record(e.index + 1);
		}
		if (!replay && round.active) {
			const settled = await client.settle();
			balance = settled.balance.amount;
			currency = settled.balance.currency;
		}
		mode = replay ? round.mode : 'base';
		phase = 'idle';
	}
	async function boot() {
		error = '';
		ready = false;
		try {
			client = new EngineSession(location.search);
			replay = client.replay;
			social = client.social;
			currency = client.currency;
			preview = client.params.get('localPreview') === 'true';
			const assets = math.symbols.map(
				(name) =>
					new Promise<void>((resolve, reject) => {
						const image = new Image();
						image.onload = () =>
							image
								.decode()
								.then(() => resolve())
								.catch(reject);
						image.onerror = () =>
							reject(new Error('Artwork could not be loaded. Reload the game.'));
						image.src = `./assets/sprites/${name}.webp`;
					}),
			);
			if (replay) {
				const data = await client.loadReplay();
				savedReplay = data.round;
				replayCost = data.cost;
				amount = data.round.amount;
				roundAmount = amount;
				mode = data.round.mode;
				message = 'REPLAY LOADED · PRESS PLAY';
			} else {
				const data = await client.authenticate();
				balance = data.balance.amount;
				currency = data.balance.currency;
				social = client.social;
				jurisdiction = data.config.jurisdiction ?? {};
				levels = data.config.betLevels;
				amount = data.round?.active ? data.round.amount : data.config.defaultBetLevel;
				roundAmount = amount;
				serverModes = data.config.gameModes ?? {};
				if (data.round?.active) savedReplay = data.round;
			}
			await Promise.all([...assets, document.fonts.ready]);
			if (disposed) return;
			ready = true;
			await tick();
			if (!replay && savedReplay?.active) {
				phase = 'spinning';
				await playback(savedReplay, true);
			}
		} catch (e) {
			error =
				e instanceof Error ? e.message : 'Connection interrupted. Reload to recover the round.';
			phase = 'idle';
		}
	}
	onMount(() => {
		const media = matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => (osReduced = media.matches);
		update();
		media.addEventListener('change', update);
		void boot();
		return () => media.removeEventListener('change', update);
	});
	onDestroy(() => {
		disposed = true;
		resolveDelay?.();
		modalResolve?.();
		audio.dispose();
	});
	async function spin(selected = 'base') {
		if (!ready || error || modal) return;
		if (busy) {
			if (!jurisdiction.disabledSlamstop) {
				reels?.accelerate();
				resolveDelay?.();
			}
			return;
		}
		if (replay) {
			phase = 'spinning';
			await audio.unlock().catch(() => {});
			try {
				await playback({ ...savedReplay, event: '0' });
			} catch (e) {
				error = (e as Error).message;
				phase = 'idle';
			}
			return;
		}
		if (selected === 'river' && jurisdiction.disabledBuyFeature) return;
		const cost = serverModes[selected]?.costMultiplier ?? (math.modes as any)[selected]?.cost;
		const maximum = serverModes[selected]?.maxBet ?? Infinity;
		if (!cost || !levels.includes(amount) || amount > maximum || balance < amount * cost) {
			message = 'Balance or session amount limit does not allow this play.';
			return;
		}
		phase = 'request';
		positions = [];
		win = 0;
		await audio.unlock().catch(() => {});
		try {
			const data = await client.play(amount, selected);
			balance = data.balance.amount;
			currency = data.balance.currency;
			await playback(data.round);
		} catch (e) {
			error = (e as Error).message;
			phase = 'idle';
		}
	}
	function keydown(e: KeyboardEvent) {
		if (
			e.code !== 'Space' ||
			e.repeat ||
			modal ||
			jurisdiction.disabledSpacebar ||
			(e.target instanceof HTMLElement && e.target.closest('button,input,dialog'))
		)
			return;
		e.preventDefault();
		void spin();
	}
	function step(direction: number) {
		if (busy || replay) return;
		const index = levels.indexOf(amount);
		amount = levels[Math.max(0, Math.min(levels.length - 1, index + direction))];
	}
</script>

<svelte:window onkeydown={keydown} />
<main class:reduced class:river-run={inRun}>
	<div class="scene-shade"></div>
	<header>
		<p class="studio">NOSYTLABS GAMES <span>DEVELOPMENT PREVIEW</span></p>
		<h1>Salmon <em>Run</em></h1>
		<p class="tagline">FOLLOW THE SILVER</p>
	</header>
	{#if ready}
		<section class="game" aria-label="Salmon Run playfield">
			<div class="river-track" aria-label={`River progress: ${collected} collected fish`}>
				{#each stages as name, i}<span class:reached={stage >= i && collected > 0}
						><b>{i + 1}</b>{name}</span
					>{/each}
				<strong>{inRun ? `${current}/${total} CASTS` : replay ? 'REPLAY' : '20 LINES'}</strong>
			</div>
			<div class="board-frame" aria-busy={busy}>
				<div class="corner tl"></div>
				<div class="corner tr"></div>
				<div class="corner bl"></div>
				<div class="corner br"></div>
				<Reels bind:this={reels} {initial} {positions} onstop={(reel) => audio.stop(reel)} />
				{#if line && positions.length}<svg
						class="win-path"
						viewBox="0 0 500 300"
						preserveAspectRatio="none"
						aria-label={`Winning line ${line}`}
						><polyline
							points={positions
								.map((p) => `${p.reel * 100 + 50},${(p.row - 1) * 100 + 50}`)
								.join(' ')}
							fill="none"
							stroke="#fff0b5"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>{#each positions as p}<circle
								cx={p.reel * 100 + 50}
								cy={(p.row - 1) * 100 + 50}
								r="4"
								fill="#ffe6a4"
							/>{/each}</svg
					>{/if}
				<div class="waterline"></div>
			</div>
			<div class="result" role="status" aria-live="polite">
				<span>{message}</span>{#if win > 0}<strong>{awardValue(win)}</strong>{/if}
			</div>
		</section>
		<footer class="controls">
			<button
				class="menu-button"
				aria-label="Open field guide"
				onclick={() => (modal = 'guide')}
				disabled={busy}
				><svg width="22" height="22" viewBox="0 0 24 24"
					><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" /></svg
				></button
			>
			<button
				class="sound-toggle"
				aria-label={muted ? 'Enable sound' : 'Mute all sound'}
				onclick={() => {
					muted = !muted;
					audio.setMuted(muted);
				}}
				><svg width="23" height="23" viewBox="0 0 24 24"
					><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />{#if muted}<path
							d="m16 9 5 6m0-6-5 6"
							stroke="currentColor"
							stroke-width="2"
						/>{:else}<path
							d="M16 7q6 5 0 10M15 10q2 2 0 4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						/>{/if}</svg
				></button
			>
			<div class="readouts">
				{#if !replay}<div>
						<span>BALANCE{preview ? ' · PREVIEW' : ''}</span><strong data-testid="balance"
							>{currencyValue(balance)}</strong
						>
					</div>{/if}
				<div><span>WIN</span><strong data-testid="win">{awardValue(win)}</strong></div>
			</div>
			{#if replay}<div class="replay-details">
					<span>REPLAY · {mode.toUpperCase()}</span><b>{currencyValue(amount)} · {replayCost}×</b
					><span>TOTAL PLAY {currencyValue(amount * replayCost)}</span>
				</div>
			{:else}<div class="amount-control">
					<button
						aria-label="Decrease amount"
						onclick={() => step(-1)}
						disabled={busy || levels.indexOf(amount) <= 0}>−</button
					><label
						><span>{social ? 'PLAY' : 'BET'}</span><select
							aria-label="Play amount"
							bind:value={amount}
							disabled={busy}
							>{#each levels as level}<option value={level}>{currencyValue(level)}</option
								>{/each}</select
						></label
					><button
						aria-label="Increase amount"
						onclick={() => step(1)}
						disabled={busy || levels.indexOf(amount) >= levels.length - 1}>+</button
					>
				</div>{/if}
			<button
				class="cast-button"
				onclick={() => spin()}
				disabled={!ready ||
					!!modal ||
					(!busy && !replay && !baseAvailable) ||
					(busy && jurisdiction.disabledSlamstop)}
				aria-label={busy ? 'Finish animation' : replay ? 'Play replay' : 'Spin'}
				><svg width="36" height="36" viewBox="0 0 40 40"
					>{#if busy}<path d="M12 12h16v16H12z" fill="currentColor" />{:else}<path
							d="M31 13a13 13 0 1 0 1 13M31 5v10H21"
							fill="none"
							stroke="currentColor"
							stroke-width="3.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>{/if}</svg
				><b>{busy ? 'STOP' : replay ? 'PLAY' : 'SPIN'}</b></button
			>
			{#if !replay && !jurisdiction.disabledBuyFeature}<button
					class="run-preview"
					disabled={busy ||
						balance < amount * riverCost ||
						amount > (serverModes.river?.maxBet ?? Infinity)}
					onclick={() => (modal = 'confirm')}
					><span>ENTER THE FEATURE</span><b>RIVER RUN</b><small
						>{riverCost}× · {currencyValue(amount * riverCost)}</small
					></button
				>{/if}
		</footer>
		{#if !replay && !fundsAvailable}<p class="funds-message">
				Balance is too low. Choose a lower play amount.
			</p>{:else if !replay && !baseAvailable}<p class="funds-message">
				This amount exceeds the session limit. Choose a lower play amount.
			</p>{/if}
		<p class="concept-note">
			{preview ? 'LOCAL MATH PREVIEW' : 'DEVELOPMENT BUILD'} · NO ENGINE APPROVAL
		</p>
	{:else if !error}<div class="startup" role="status">
			<span class="eyebrow">PREPARING THE RIVER</span>
			<p>Loading artwork and session</p>
		</div>{/if}
	{#if error}<div class="startup error" role="alert">
			<h2>Unable to continue</h2>
			<p>{error}</p>
			<button class="primary" onclick={() => location.reload()}>Reload game</button>
		</div>{/if}
	<dialog
		bind:this={dialog}
		oncancel={(e) => {
			e.preventDefault();
			if (modal === 'guide' || modal === 'confirm') dismiss();
		}}
	>
		{#if modal}<button
				class="dialog-sound"
				aria-label={muted ? 'Enable sound' : 'Mute all sound'}
				onclick={() => {
					muted = !muted;
					audio.setMuted(muted);
				}}
				><svg width="23" height="23" viewBox="0 0 24 24"
					><path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />{#if muted}<path
							d="m16 9 5 6m0-6-5 6"
							stroke="currentColor"
							stroke-width="2"
						/>{:else}<path
							d="M16 7q6 5 0 10M15 10q2 2 0 4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						/>{/if}</svg
				></button
			>{/if}
		{#if modal === 'guide'}
			<p class="eyebrow">THE FIELD GUIDE</p>
			<h2>Follow the silver</h2>
			<p class="notice">
				Development math version {math.version}. Computed RTP is 96.50% in each mode. This build has
				not been certified or approved by Engine.
			</p>
			<h3>Twenty river paths</h3>
			<p>
				Match 3–5 symbols from left to right on any of twenty lines. A Wild substitutes for ordinary
				symbols. Each line awards its highest base-table combination; the values below multiply the
				selected base play amount.
			</p>
			<table>
				<thead><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody
					>{#each Object.entries(math.paytable) as [name, values]}<tr
							><th><img src={`./assets/sprites/${name}.webp`} alt="" />{labels[name]}</th><td
								>{values['3'] / 100}×</td
							><td>{values['4'] / 100}×</td><td>{values['5'] / 100}×</td></tr
						>{/each}</tbody
				>
			</table>
			<div class="line-diagrams">
				{#each math.lines as rows, i}<figure>
						<svg viewBox="0 0 110 62" aria-label={`Line ${i + 1}`}
							><polyline
								points={rows.map((row, col) => `${7 + col * 24},${7 + row * 24}`).join(' ')}
								fill="none"
								stroke="#e5bf86"
								stroke-width="3"
							/></svg
						>
						<figcaption>{i + 1}</figcaption>
					</figure>{/each}
			</div>
			<h3>The Upstream Run</h3>
			<p>
				3 / 4 / 5 or more River arches award 6 / 8 / 10 free casts. Three or more arches during the
				run add 2 casts, up to 12 total. River mode opens a six-cast run directly for {riverCost}×
				the base play amount, after confirmation.
			</p>
			<p>
				Fish in the run show 1×, 2×, 3×, 5×, 10× or 20× values. At least one Wild collects all
				visible fish once; extra Wilds do not repeat that collection. Line awards also apply. After
				collecting 3 fish, future collections use 2×; after 6 fish, 3×. A collection uses the stage
				multiplier active before it advances the river.
			</p>
			<p>
				Base mode: 1× per play, maximum {report.modes.base.maximumWinX}×. River mode: {riverCost}×
				per play, maximum {report.modes.river.maximumWinX}×. Both development lookup distributions
				compute 96.50% RTP. These are finite weighted-book maxima, with independent local
				verification; certification and live acceptance remain open.
			</p>
			<h3>Controls and sound</h3>
			<p>
				Spin starts a round. +/− selects a server-provided amount. River Run opens confirmation
				showing its total amount. Stop speeds presentation where permitted and never changes an
				outcome. Space follows Spin, except in dialogs or restricted sessions. Play repeats the same
				replay, with no new play. The speaker control mutes all sound at any time. The menu opens
				these rules, sound and speed options.
			</p>
			<label class="motion-choice"
				><input type="checkbox" bind:checked={lessMotion} /> Less motion {osReduced
					? '(also enabled by your device)'
					: ''}</label
			>
			<label class="motion-choice"
				><input
					type="checkbox"
					checked={muted}
					onchange={(e) => {
						muted = e.currentTarget.checked;
						audio.setMuted(muted);
					}}
				/> Mute all sound</label
			>
			<label class="motion-choice"
				><input type="checkbox" bind:checked={turbo} disabled={jurisdiction.disabledTurbo} /> Fast reels</label
			>
			<h3>Game operation</h3>
			<p>
				A malfunction cancels wins and plays. A stable internet connection is required. Reload after
				disconnection to complete any unfinished round. Expected return is measured over many plays.
				The display is illustrative and does not represent a physical device. The Remote Game Server
				settles all awards; browser animations do not determine them. TM and © 2026 Engine.
			</p>
			<div class="dialog-actions">
				{#if preview}<button onclick={() => location.assign('/')}>New local preview</button
					>{/if}<button class="primary" onclick={dismiss}>Back to the river</button>
			</div>
		{:else if modal === 'confirm'}<img
				class="feature-fish"
				src="./assets/sprites/salmon.webp"
				alt="Silver salmon"
			/>
			<p class="eyebrow">THE UPSTREAM RUN</p>
			<h2>Enter the river</h2>
			<p>Six free casts. Collect silver fish with Wilds and travel to the Headwaters.</p>
			<p class="feature-number">
				{currencyValue(amount * riverCost)}<span>{riverCost}× THE BASE PLAY AMOUNT</span>
			</p>
			<div class="dialog-actions">
				<button onclick={dismiss}>Cancel</button><button
					class="primary"
					onclick={() => {
						dismiss();
						void spin('river');
					}}>Confirm River Run</button
				>
			</div>
		{:else if modal === 'entry'}<img
				class="feature-fish"
				src="./assets/sprites/salmon.webp"
				alt="Silver salmon"
			/>
			<p class="eyebrow">FOLLOW THE SILVER</p>
			<h2>The Upstream Run</h2>
			<p class="feature-number">{total}<span>FREE CASTS</span></p>
			<p>Wilds collect the silver.<br />Every catch takes you further upstream.</p>
			<button class="primary" onclick={dismiss}>Follow the river</button>
		{:else if modal === 'complete'}<p class="eyebrow">THE RIVER REMEMBERS</p>
			<h2>Your Upstream Run</h2>
			<p class="feature-number" data-testid="run-total">
				{awardValue(runAward)}<span>{collected} SILVER FISH · {current} CASTS</span>
			</p>
			<button class="primary" onclick={dismiss}>Return to the river</button>{/if}
	</dialog>
</main>
