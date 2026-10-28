<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import math from '../../../math/salmon-run/config.json';
	import { symbolAsset, type Symbol, type Position } from './engine';
	const {
		initial,
		positions = [],
		onstop = () => {},
	}: { initial: Symbol[][]; positions?: Position[]; onstop?: (reel: number) => void } = $props();
	let landed = initial.map((reel) => reel.slice(1, 4));
	let strips = $state<Symbol[][]>(landed);
	let moving = $state([false, false, false, false, false]);
	let landing = $state([false, false, false, false, false]);
	let elements: HTMLDivElement[] = [];
	let animations: Animation[] = [];
	let generation = 0;
	const pendingDelays = new Map<ReturnType<typeof setTimeout>, () => void>();
	const pause = (ms: number) =>
		new Promise<void>((resolve) => {
			const timer = setTimeout(() => {
				pendingDelays.delete(timer);
				resolve();
			}, ms);
			pendingDelays.set(timer, resolve);
		});
	let disposed = false,
		waiting = false,
		hurry = false;
	const filler = (reel: number, count: number): Symbol[] =>
		Array.from({ length: count }, (_, i) => ({
			name: math.symbols[(i * 3 + reel) % math.symbols.length],
		}));
	function clearAnimations() {
		for (const animation of animations) animation.cancel();
		animations = [];
	}
	export function cancel() {
		generation++;
		clearAnimations();
		for (const [timer, resolve] of pendingDelays) {
			clearTimeout(timer);
			resolve();
		}
		pendingDelays.clear();
		waiting = false;
		hurry = false;
		landing = [false, false, false, false, false];
		strips = landed;
		moving = [false, false, false, false, false];
		for (const el of elements) if (el) el.style.transform = '';
	}
	export function settle(board: Symbol[][]) {
		cancel();
		landed = board.map((reel) => reel.slice(1, 4));
		strips = landed;
	}
	export function accelerate() {
		hurry = true;
		for (const animation of animations) animation.playbackRate = 5;
	}
	export async function start(reduced = false) {
		if (disposed || reduced || waiting) return;
		cancel();
		const run = generation;
		strips = landed.map((old, reel) => [...old, ...filler(reel, 9), ...old]);
		moving = [true, true, true, true, true];
		waiting = true;
		await tick();
		if (disposed || run !== generation) return;
		animations = elements.map((element, reel) =>
			element.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-400%)' }], {
				duration: 900 + reel * 35,
				iterations: Infinity,
				easing: 'linear',
			}),
		);
	}
	export async function spin(board: Symbol[][], reduced = false, turbo = false) {
		if (disposed) return;
		if (reduced) {
			settle(board);
			await pause(turbo ? 120 : 260);
			return;
		}
		const run = ++generation;
		const from = elements.map((element) =>
			waiting
				? (new DOMMatrix(getComputedStyle(element).transform).m42 / element.clientHeight) * 100
				: 0,
		);
		for (let reel = 0; reel < elements.length; reel++)
			elements[reel].style.transform = `translateY(${from[reel]}%)`;
		clearAnimations();
		waiting = false;
		// Filler is visual travel only. Every landing symbol comes from the RGS board.
		strips = strips.map((old, reel) => [
			...old,
			...filler(reel, 15 + reel),
			...board[reel].slice(1, 4),
		]);
		moving = [true, true, true, true, true];
		await tick();
		if (disposed || run !== generation) return;
		await Promise.all(
			strips.map(async (strip, reel) => {
				const target = (-(strip.length - 3) * 100) / 3,
					distance = target - from[reel];
				const animation = elements[reel].animate(
					[
						{
							transform: `translateY(${from[reel]}%)`,
							offset: 0,
							easing: 'cubic-bezier(.42,0,.76,.58)',
						},
						{
							transform: `translateY(${from[reel] + distance * 0.14}%)`,
							offset: 0.18,
							easing: 'linear',
						},
						{
							transform: `translateY(${target + 100}%)`,
							offset: 0.65,
							easing: 'cubic-bezier(.12,.58,.25,1)',
						},
						{ transform: `translateY(${target - 1.1}%)`, offset: 0.94, easing: 'ease-out' },
						{ transform: `translateY(${target}%)`, offset: 1 },
					],
					{
						duration: (turbo ? 540 : 900) + reel * (turbo ? 70 : 125),
						fill: 'forwards',
						easing: 'linear',
					},
				);
				if (hurry) animation.playbackRate = 5;
				animations.push(animation);
				try {
					await animation.finished;
				} catch {
					return;
				}
				if (disposed || run !== generation) return;
				landed[reel] = board[reel].slice(1, 4);
				strips[reel] = landed[reel];
				await tick();
				if (disposed || run !== generation) return;
				elements[reel].style.transform = '';
				animation.cancel();
				moving[reel] = false;
				landing[reel] = true;
				onstop(reel);
				await pause(180);
				if (run === generation) landing[reel] = false;
			}),
		);
		if (run === generation) {
			animations = [];
			hurry = false;
		}
	}
	onDestroy(() => {
		disposed = true;
		cancel();
	});
</script>

<div
	class="reel-window"
	class:has-award={positions.length > 0}
	aria-label="Five reels with three visible rows"
	role="img"
>
	{#each strips as strip, reel}
		<div class="reel-column" class:running={moving[reel]} class:landing={landing[reel]}>
			<div class="reel-strip" bind:this={elements[reel]}>
				{#each strip as symbol, row}
					<div
						class="reel-symbol"
						class:winning={!moving[reel] &&
							positions.some((p) => p.reel === reel && p.row === row + 1)}
					>
						<img src={symbolAsset(symbol.name)} alt="" draggable="false" />
						{#if symbol.name === 'wild' || symbol.name === 'scatter'}<span class="special-name"
								>{symbol.name === 'wild' ? 'WILD' : 'RIVER RUN'}</span
							>{/if}
						{#if symbol.value}<span class="fish-value">{symbol.value}×</span>{/if}
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.reel-window {
		position: absolute;
		inset: var(--reel-inset, 5px);
		display: flex;
		min-height: 0;
		overflow: hidden;
		gap: 3px;
		isolation: isolate;
	}
	.reel-column {
		width: 20%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
		border-right: 1px solid #87b4a32e;
		background: linear-gradient(90deg, #061f27bb, #174b4b80, #061f27bb);
	}
	.reel-column:last-child {
		border: 0;
	}
	.reel-strip {
		height: 100%;
		display: flex;
		flex-direction: column;
		will-change: transform;
	}
	.reel-symbol {
		height: 33.333333%;
		flex: 0 0 33.333333%;
		min-height: 0;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border-bottom: 1px solid #a1c6b51b;
	}
	.has-award .reel-column:not(.running) .reel-symbol:not(.winning) {
		opacity: 0.46;
	}
	.reel-symbol img {
		height: 94%;
		width: 94%;
		object-fit: contain;
		filter: drop-shadow(0 4px 4px #00151bcc);
		user-select: none;
	}
	.special-name {
		position: absolute;
		bottom: 3%;
		font:
			800 clamp(7px, 1.1vw, 14px) 'River Sans',
			sans-serif;
		letter-spacing: 1px;
		color: #fff0c2;
		text-shadow:
			0 2px 3px #001a25,
			0 -1px 3px #001a25;
		background: #08282bbd;
		padding: 1px 6px;
		border-radius: 3px;
	}
	.fish-value {
		position: absolute;
		bottom: 5%;
		right: 8%;
		font:
			800 clamp(11px, 2vw, 24px) 'River Sans',
			sans-serif;
		color: #ffefbe;
		line-height: 1;
		padding: 2px 5px;
		background: #0b262cd9;
		border: 1px solid #c6a56b;
		border-radius: 5px;
		text-shadow: 0 1px 2px #000;
	}
	.reel-symbol::after {
		content: '';
		position: absolute;
		inset: 3px;
		border-radius: 8px;
		border: 1px solid transparent;
		pointer-events: none;
	}
	.reel-column::after {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(#021a2950, transparent 18%, transparent 82%, #021a2950);
	}
	.reel-column {
		position: relative;
	}
	.landing::after {
		animation: reel-land 220ms ease-out both;
	}
	@keyframes reel-land {
		from {
			box-shadow: inset 0 0 24px #e9d49a55;
		}
		to {
			box-shadow: inset 0 0 0 transparent;
		}
	}
	.landing .reel-symbol img {
		animation: land 180ms ease-out both;
	}
	@keyframes land {
		0% {
			transform: translateY(2%) scale(1.04, 0.95);
		}
		60% {
			transform: translateY(-1%) scale(0.99, 1.025);
		}
		100% {
			transform: none;
		}
	}
	.winning::after {
		border-color: #ffe8ad;
		box-shadow:
			inset 0 0 16px #efbf5c36,
			0 0 10px #eac36d44;
		animation: award-rim 380ms ease-out both;
	}
	.winning img {
		transform: scale(1.045);
	}
	@keyframes award-rim {
		from {
			opacity: 0.25;
			scale: 0.94;
		}
		to {
			opacity: 1;
			scale: 1;
		}
	}
	.winning {
		box-shadow:
			inset 0 0 0 2px #f4d293,
			inset 0 0 24px #c5994455;
		background: #679a7255;
	}
	.running img {
		filter: blur(0.7px) drop-shadow(0 3px 4px #00151bcc);
	}
	@media (max-height: 300px) {
		.special-name {
			font-size: 5px;
			letter-spacing: 0.2px;
			padding: 0 2px;
		}
		.fish-value {
			font-size: 9px;
			padding: 1px 2px;
			border-radius: 2px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reel-strip {
			will-change: auto;
		}
		.reel-symbol img,
		.reel-symbol::after {
			animation: none !important;
			transform: none !important;
		}
		.running img {
			filter: none;
		}
	}
</style>
