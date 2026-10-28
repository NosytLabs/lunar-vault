<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import Reels from './Reels.svelte';
	import {
		EngineSession,
		symbolAsset,
		type Round,
		type Symbol,
		type Position,
		type BookEvent,
		type Jurisdiction,
		type AuthenticatedGameMode,
	} from './engine';
	import { RiverAudio } from './audio';
	import { canonicalModeName } from 'utils-shared/gameModes';
	import { validateRoundCheckpoint } from 'utils-shared/roundValidation';
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
	let openingBalance = $state(0),
		openedAt = 0,
		elapsedSeconds = $state(0);
	let sessionTimer: ReturnType<typeof setInterval>;
	let serverModes = $state<Record<string, AuthenticatedGameMode>>({});
	let mode = $state('base'),
		replayCost = $state(1),
		roundCost = $state(1),
		roundPayout = $state(0),
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
		message = $state('20 lines · Match 3 or more from the left');
	let shownBoard: Symbol[][] = initial;
	let collection = $state<{
		fish: { position: Position; value: number }[];
		collector: Position;
		multiplier: number;
		award: number;
		landed: boolean;
	} | null>(null);
	let stageNotice = $state('');
	let modal = $state<'guide' | 'entry' | 'complete' | 'confirm' | null>(null),
		dialog: HTMLDialogElement;
	let modalResolve: (() => void) | undefined;
	let reels = $state<{
		settle: (board: Symbol[][]) => void;
		start: (reduced: boolean) => Promise<void>;
		cancel: () => void;
		spin: (board: Symbol[][], reduced: boolean, turbo: boolean) => Promise<void>;
		accelerate: () => void;
	}>();
	let lessMotion = $state(false),
		osReduced = $state(false),
		turbo = $state(false),
		muted = $state(false);
	let presentationNotBefore = 0;
	let pacingTimer: ReturnType<typeof setTimeout>;
	let resolvePacing: (() => void) | undefined;
	const finishPacing = () =>
		new Promise<void>((resolve) => {
			resolvePacing = () => {
				clearTimeout(pacingTimer);
				resolvePacing = undefined;
				resolve();
			};
			pacingTimer = setTimeout(
				resolvePacing,
				Math.max(0, presentationNotBefore - performance.now()),
			);
		});
	let disposed = false,
		delayTimer: ReturnType<typeof setTimeout>,
		resolveDelay: (() => void) | undefined;
	const audio = new RiverAudio();
	const busy = $derived(phase !== 'idle');
	const reduced = $derived(lessMotion || osReduced);
	const sessionClock = $derived(
		`${Math.floor(elapsedSeconds / 3600)
			.toString()
			.padStart(2, '0')}:${Math.floor((elapsedSeconds / 60) % 60)
			.toString()
			.padStart(2, '0')}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`,
	);
	const sessionVisible = $derived(
		!replay &&
			(jurisdiction.displayRTP ||
				jurisdiction.displayNetPosition ||
				jurisdiction.displaySessionTimer),
	);
	const positiveResult = $derived(roundPayout > roundCost * 100);
	const riverCost = $derived(
		serverModes.river?.costMultiplier ??
			(replay && canonicalModeName(mode) === 'river' ? replayCost : math.modes.river.cost),
	);
	const currencyValue = (micro: number) => formatCurrencyAmount(micro / 1e6, currency, 'en-US');
	const awardValue = (units: number) => currencyValue(Math.round((roundAmount * units) / 100));
	const fundsAvailable = $derived(balance >= amount && amount > 0);
	const baseAvailable = $derived(
		!!serverModes.base &&
			fundsAvailable &&
			levels.includes(amount) &&
			amount <= serverModes.base.maxBet,
	);
	const riverAvailable = $derived(
		!!serverModes.river &&
			levels.includes(amount) &&
			amount <= serverModes.river.maxBet &&
			balance >= amount * serverModes.river.costMultiplier,
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
		if (modal && dialog && !dialog.open) {
			dialog.showModal();
			dialog.querySelector('h2')?.focus({ preventScroll: true });
		} else if (!modal && dialog?.open) dialog.close();
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
			if (e.type === 'reveal') {
				shownBoard = e.board;
				reels!.settle(e.board);
			}
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
			message = inRun ? `River Run · Cast ${current} of ${total}` : 'Spinning…';
			shownBoard = e.board;
			await reels!.spin(e.board, reduced, turbo && !jurisdiction.disabledTurbo);
			phase = 'award';
		} else if (e.type === 'winInfo') {
			for (const award of e.wins) {
				const isCollection = award.meta.mechanic === 'collection';
				positions = isCollection
					? [...award.positions, ...award.meta.collectorPositions]
					: award.positions;
				line = isCollection ? 0 : award.meta.lineIndex;
				if (isCollection) {
					message = `Wild collect · ${award.meta.multiplier}×`;
					collection = {
						fish: award.positions.map((position: Position) => ({
							position,
							value: shownBoard[position.reel][position.row].value ?? 0,
						})),
						collector: award.meta.collectorPositions[0],
						multiplier: award.meta.multiplier,
						award: award.win,
						landed: reduced,
					};
					if (!reduced)
						await wait(
							(turbo && !jurisdiction.disabledTurbo ? 360 : 620) +
								Math.max(0, collection.fish.length - 1) *
									(turbo && !jurisdiction.disabledTurbo ? 30 : 65),
						);
					collection.landed = true;
					win += award.win;
					if (positiveResult) audio.collect();
					message = `Wild collection · ${collection.fish.length} fish · ${collection.multiplier}× stage`;
					await wait(reduced ? 300 : 420);
					collection = null;
				} else {
					win += award.win;
					message = `Line ${line} · ${awardValue(award.win)}`;
					if (positiveResult) audio.award();
					await wait(reduced ? 180 : 380);
				}
				if (disposed) return;
			}
			positions = [];
			line = 0;
		} else if (e.type === 'collectFish') {
			const advanced = e.stage > stage;
			collected = e.collected;
			stage = e.stage;
			if (advanced) {
				stageNotice = `${stages[stage]} · ${stage + 1}× collections`;
				await wait(reduced ? 200 : 650);
				stageNotice = '';
			}
		} else if (e.type === 'setTotalWin') {
			win = e.amount;
		} else if (e.type === 'freeSpinTrigger') {
			reels?.cancel();
			phase = 'award';
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
			message = 'River Run complete';
			await prompt('complete');
		} else if (e.type === 'finalWin') {
			win = e.amount;
			message =
				e.amount > 0
					? `${positiveResult ? 'Round win' : 'Round return'} · ${awardValue(e.amount)}`
					: 'No win · Spin again';
		} else throw new Error('This round needs a different game version.');
	}
	async function playback(round: Round, resume = false) {
		roundAmount = round.amount;
		const modeName = canonicalModeName(round.mode) as keyof typeof math.modes;
		const configuration = serverModes[modeName];
		// A previously started feature must finish even when it is no longer available for new plays.
		const cost =
			configuration?.costMultiplier ??
			(resume && round.active ? math.modes[modeName]?.cost : undefined);
		if (!replay && (!Number.isFinite(cost) || (cost ?? 0) <= 0))
			throw new Error('This round mode is unavailable in the session.');
		roundCost = replay ? replayCost : cost!;
		roundPayout = round.state.at(-1)?.amount ?? 0;
		mode = round.mode;
		win = 0;
		runAward = 0;
		collected = 0;
		stage = 0;
		current = 0;
		total = 0;
		inRun = false;
		positions = [];
		const cursor = resume ? validateRoundCheckpoint(round.event, round.state.length) : 0;
		if (cursor) snapshot(round.state.slice(0, cursor));
		for (const e of round.state.slice(cursor)) {
			if (disposed) return;
			await present(e);
			if (disposed) return;
			// Store the next unpresented event, so a reload restores completed work once.
			if (!replay && round.active) await client.record(e.index + 1);
		}
		await finishPacing();
		if (disposed) return;
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
			const assets = [...math.symbols.map(symbolAsset), './assets/headwaters-v4.webp'].map(
				(src) =>
					new Promise<void>((resolve, reject) => {
						const image = new Image();
						image.onload = () =>
							image
								.decode()
								.then(() => resolve())
								.catch(reject);
						image.onerror = () =>
							reject(new Error('Artwork could not be loaded. Reload the game.'));
						image.src = src;
					}),
			);
			const artwork = Promise.allSettled([...assets, document.fonts.ready]);
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
				openingBalance = balance;
				currency = data.balance.currency;
				social = client.social;
				jurisdiction = data.config.jurisdiction ?? {};
				levels = data.config.betLevels;
				amount = data.round?.active ? data.round.amount : data.config.defaultBetLevel;
				roundAmount = amount;
				serverModes = data.config.gameModes;
				if (data.round?.active) savedReplay = data.round;
			}
			const loaded = await artwork;
			const failed = loaded.find((result) => result.status === 'rejected');
			if (failed?.status === 'rejected') throw failed.reason;
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
		openedAt = performance.now();
		sessionTimer = setInterval(() => {
			elapsedSeconds = Math.floor((performance.now() - openedAt) / 1000);
		}, 1000);
		const media = matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => (osReduced = media.matches);
		update();
		media.addEventListener('change', update);
		void boot();
		return () => media.removeEventListener('change', update);
	});
	onDestroy(() => {
		disposed = true;
		clearInterval(sessionTimer);
		resolveDelay?.();
		resolvePacing?.();
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
			presentationNotBefore = 0;
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
		const configuration = serverModes[canonicalModeName(selected)];
		if (
			!configuration ||
			!levels.includes(amount) ||
			amount > configuration.maxBet ||
			balance < amount * configuration.costMultiplier
		) {
			message = 'Balance or session amount limit does not allow this play.';
			return;
		}
		// Presentation pacing only; this never converts the undocumented jurisdiction timing field.
		presentationNotBefore = performance.now() + (turbo && !jurisdiction.disabledTurbo ? 350 : 700);
		phase = 'request';
		message = 'Spinning…';
		await reels?.start(reduced);
		positions = [];
		win = 0;
		await audio.unlock().catch(() => {});
		try {
			const data = await client.play(amount, configuration.mode);
			balance = data.balance.amount;
			currency = data.balance.currency;
			await playback(data.round);
		} catch (e) {
			reels?.cancel();
			audio.cancel();
			error = (e as Error).message;
			phase = 'idle';
		}
	}
	function keydown(e: KeyboardEvent) {
		if (
			e.code !== 'Space' ||
			e.repeat ||
			e.defaultPrevented ||
			e.isComposing ||
			e.altKey ||
			e.ctrlKey ||
			e.metaKey ||
			modal ||
			jurisdiction.disabledSpacebar ||
			e
				.composedPath()
				.some(
					(target) =>
						target instanceof HTMLElement &&
						(target.isContentEditable ||
							target.closest(
								'button,input,select,textarea,dialog,a,[role=button],[role=combobox],[role=textbox],[contenteditable]:not([contenteditable=false])',
							)),
				)
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
<main class:reduced class:fast-reels={turbo && !jurisdiction.disabledTurbo} class:river-run={inRun}>
	<div class="feature-scene" class:visible={inRun || modal === 'complete'} aria-hidden="true"></div>
	<div class="scene-shade"></div>
	<header class="brand" class:has-session={sessionVisible}>
		<svg class="brand-mark" width="62" height="36" viewBox="0 0 70 40" aria-hidden="true"
			><path
				d="M7 20C19 3 40 3 53 14L65 7V33L53 26C40 37 19 37 7 20Z"
				fill="none"
				stroke="currentColor"
				stroke-width="2.3"
			/><path
				d="M10 20H49M28 6L35 15M29 34L35 25"
				stroke="currentColor"
				stroke-width="1.7"
				fill="none"
			/><circle cx="16" cy="17" r="1.7" fill="currentColor" /></svg
		>
		<h1>Salmon <em>Run</em></h1>
		{#if preview}<span class="demo-badge">DEMO</span>{/if}
		{#if sessionVisible}<div class="session-status" aria-label="Session information">
				{#if jurisdiction.displayRTP}<span>RTP <b>96.50%</b></span>{/if}
				{#if jurisdiction.displayNetPosition}<span
						>NET SINCE OPEN <b
							>{balance >= openingBalance ? '+' : '−'}{currencyValue(
								Math.abs(balance - openingBalance),
							)}</b
						></span
					>{/if}
				{#if jurisdiction.displaySessionTimer}<span>TIME OPEN <b>{sessionClock}</b></span>{/if}
			</div>{/if}
	</header>
	{#if ready}
		<section class="game" aria-label="Salmon Run playfield">
			<div
				class="river-track"
				class:feature-track={inRun}
				style={`--river-progress:${Math.min(1, collected / 6) * 100}%`}
				aria-label={inRun ? `River progress: ${collected} collected fish` : '20 winning lines'}
			>
				{#if inRun}
					<div class="run-counter">
						<b>RIVER RUN</b><strong>{current} / {total} <small>CASTS</small></strong>
					</div>
					<div class="stage-track">
						{#each stages as name, i}<span class:active={stage === i} class:passed={stage > i}
								><b>{i + 1}×</b><small>{name}</small></span
							>{/each}
					</div>
					<span class="fish-count"
						>{collected} FISH<small
							>{stage < 2 ? `${(stage + 1) * 3 - collected} TO ${stage + 2}×` : 'HEADWATERS'}</small
						></span
					>
				{:else}<span>20 LINES</span><span>{replay ? 'REPLAY' : 'WILDS COLLECT IN RIVER RUN'}</span
					>{/if}
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
							pathLength="1"
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
				{#if collection}<div class="collection-layer" aria-hidden="true">
						{#if !reduced}{#each collection.fish as fish, fishIndex}<span
									class="catch-token"
									style={`--catch-delay:${fishIndex * (turbo && !jurisdiction.disabledTurbo ? 30 : 65)}ms;--from-x:${fish.position.reel * 20 + 10}%;--from-y:${((fish.position.row - 1) * 100) / 3 + 100 / 6}%;--to-x:${collection.collector.reel * 20 + 10}%;--to-y:${((collection.collector.row - 1) * 100) / 3 + 100 / 6}%`}
									><img src={symbolAsset('salmon')} alt="" /><b>{fish.value}×</b></span
								>{/each}{/if}
						<div
							class="collector-ring"
							class:landed={collection.landed}
							style={`left:${collection.collector.reel * 20 + 10}%;top:${((collection.collector.row - 1) * 100) / 3 + 100 / 6}%`}
						></div>
						<div class="catch-receipt" class:landed={collection.landed}>
							<small
								>{collection.landed
									? `${collection.fish.length} FISH · ${collection.multiplier}× STAGE`
									: `COLLECTING ${collection.fish.length} FISH`}</small
							>{#if collection.landed}<strong>{awardValue(collection.award)}</strong>{/if}
						</div>
					</div>{/if}
				{#if stageNotice}<div class="stage-notice" role="status">{stageNotice}</div>{/if}
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
						<span>BALANCE</span><strong data-testid="balance">{currencyValue(balance)}</strong>
					</div>{/if}
				<div><span>WIN</span><strong data-testid="win">{awardValue(win)}</strong></div>
			</div>
			{#if replay}<div class="replay-details">
					<span>REPLAY · {canonicalModeName(mode) === 'river' ? 'RIVER RUN' : 'BASE'}</span><b
						>{currencyValue(amount)} · {replayCost}×</b
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
			{#if !replay && !jurisdiction.disabledBuyFeature && serverModes.river}<button
					class="run-preview"
					disabled={busy || !riverAvailable}
					onclick={() => (modal = 'confirm')}
					><span>FEATURE</span><b>RIVER RUN</b><small
						>{riverCost}× · {currencyValue(amount * riverCost)}</small
					></button
				>{/if}
		</footer>
		{#if !replay && !fundsAvailable}<p class="funds-message">
				Balance is too low. Choose a lower play amount.
			</p>{:else if !replay && !baseAvailable}<p class="funds-message">
				This amount exceeds the session limit. Choose a lower play amount.
			</p>{:else if !replay && !busy && !jurisdiction.disabledBuyFeature && serverModes.river && !riverAvailable}<p
				class="funds-message"
				role="status"
			>
				{balance < amount * riverCost
					? 'Balance is too low for River Run. Choose a lower play amount.'
					: 'This amount exceeds the River Run session limit. Choose a lower play amount.'}
			</p>{/if}
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
		aria-labelledby="dialog-title"
		class:feature-dialog={modal === 'entry' || modal === 'complete'}
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
			<h2 id="dialog-title" tabindex="-1">Follow the silver</h2>
			<p class="notice">
				The theoretical return is 96.50% in both modes, calculated over many plays. An individual
				session may return more or less.
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
							><th><img src={symbolAsset(name)} alt="" />{labels[name]}</th><td
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
			<h3>River Run</h3>
			<p>
				3 / 4 / 5 or more River arches award 6 / 8 / 10 free casts. Three or more arches during the
				run add 2 casts, up to 12 total. River Run opens a six-cast run directly for {riverCost}×
				the base play amount, after confirmation. Availability depends on the session.
			</p>
			<p>
				Fish in the run show 1×, 2×, 3×, 5×, 10× or 20× values. At least one Wild collects all
				visible fish once; extra Wilds do not repeat that collection. Line awards also apply. After
				collecting 3 fish, future collections use 2×; after 6 fish, 3×. A collection uses the stage
				multiplier active before it advances the river.
			</p>
			<p>
				Base mode: 1× per play, maximum {report.modes.base.maximumWinX}×. River Run: {riverCost}×
				per play, maximum {report.modes.river.maximumWinX}×. Both modes have a theoretical return of
				96.50%. Both maxima multiply the selected base play amount; River Run’s maximum is {(
					report.modes.river.maximumWinX / math.modes.river.cost
				).toFixed(2)}× its full feature amount.
			</p>
			<h3>Controls and sound</h3>
			<p>
				Spin starts a round. The amount selector and +/− choose a server-provided amount. River Run
				opens confirmation showing its total amount. Stop speeds presentation where permitted and
				never changes an outcome. Space follows Spin while the playfield is active; it leaves
				selectors, editable fields, buttons and dialogs to their own controls, and is unavailable in
				restricted sessions. Play repeats the same replay, with no new play. The speaker control
				mutes all sound at any time. The menu opens these rules, sound and speed options. Less
				motion replaces reel travel, collection flights and decorative transitions with a still
				presentation; your device’s reduced motion setting also enables it. Fast reels shortens reel
				travel and collection flights where permitted. These options change presentation speed only.
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
				><input type="checkbox" bind:checked={turbo} disabled={jurisdiction.disabledTurbo} /> Fast
				reels{jurisdiction.disabledTurbo ? ' (unavailable in this session)' : ''}</label
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
				src={symbolAsset('salmon')}
				alt="Silver salmon"
			/>
			<p class="eyebrow">RIVER RUN</p>
			<h2 id="dialog-title" tabindex="-1">Enter the river</h2>
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
		{:else if modal === 'entry'}<div class="feature-crest" aria-hidden="true">
				<img src={symbolAsset('wild')} alt="" /><span>RIVER RUN</span>
			</div>
			<img class="feature-fish" src={symbolAsset('salmon')} alt="Silver salmon" />
			<p class="eyebrow">RIVER RUN</p>
			<h2 id="dialog-title" tabindex="-1">Upstream awaits</h2>
			<p class="feature-number">{total}<span>FREE CASTS</span></p>
			<p>Wilds collect the silver.<br />Reach 3 fish for 2×, then 6 fish for 3× collections.</p>
			<button class="primary" onclick={dismiss}>Start River Run</button>
		{:else if modal === 'complete'}<div class="feature-crest complete-crest" aria-hidden="true">
				<img src={symbolAsset('wild')} alt="" /><span>{stages[stage]}</span>
			</div>
			<p class="eyebrow">RIVER RUN COMPLETE</p>
			<h2 id="dialog-title" tabindex="-1">River Run total</h2>
			<p class="feature-number" data-testid="run-total">
				{awardValue(runAward)}<span>{collected} SILVER FISH · {current} CASTS</span>
			</p>
			<button class="primary" onclick={dismiss}>Return to the river</button>{/if}
	</dialog>
</main>
