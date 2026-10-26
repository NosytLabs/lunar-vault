<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import math from '../../../math/salmon-run/config.json';
	import type { Symbol, Position } from './engine';
	const {
		initial,
		positions = [],
		onstop = () => {},
	}: { initial: Symbol[][]; positions?: Position[]; onstop?: (reel: number) => void } = $props();
	let strips = $state<Symbol[][]>(initial.map((reel) => reel.slice(1, 4)));
	let moving = $state([false, false, false, false, false]);
	let elements: HTMLDivElement[] = [];
	let animations: Animation[] = [];
	let disposed = false;
	export function settle(board: Symbol[][]) {
		strips = board.map((reel) => reel.slice(1, 4));
	}
	export function accelerate() {
		for (const a of animations) a.playbackRate = 5;
	}
	export async function spin(board: Symbol[][], reduced = false, turbo = false) {
		if (reduced) {
			settle(board);
			await new Promise((r) => setTimeout(r, 260));
			return;
		}
		// These deterministic filler icons are visual travel only. The target is
		// exclusively the board supplied by the RGS; no outcome is selected here.
		strips = strips.map((old, reel) => [
			...old,
			...Array.from({ length: 18 + reel * 2 }, (_, i) => ({
				name: math.symbols[(i * 3 + reel) % math.symbols.length],
			})),
			...board[reel].slice(1, 4),
		]);
		moving = [true, true, true, true, true];
		await tick();
		await Promise.all(
			strips.map(async (strip, reel) => {
				const target = (-(strip.length - 3) * 100) / 3;
				const animation = elements[reel].animate(
					[
						{ transform: 'translateY(0)' },
						{ transform: `translateY(${target - 1.5}%)`, offset: 0.92 },
						{ transform: `translateY(${target}%)` },
					],
					{
						duration: (turbo ? 650 : 1100) + reel * (turbo ? 70 : 115),
						easing: 'cubic-bezier(.12,.36,.22,1)',
						fill: 'forwards',
					},
				);
				animations.push(animation);
				try {
					await animation.finished;
				} catch {
					return;
				}
				if (disposed) return;
				strips[reel] = board[reel].slice(1, 4);
				await tick();
				animation.cancel();
				moving[reel] = false;
				onstop(reel);
			}),
		);
		animations = [];
	}
	onDestroy(() => {
		disposed = true;
		for (const animation of animations) animation.cancel();
	});
</script>

<div class="reel-window" aria-label="Five reels with three visible rows" role="img">
	{#each strips as strip, reel}
		<div class="reel-column" class:running={moving[reel]}>
			<div class="reel-strip" bind:this={elements[reel]}>
				{#each strip as symbol, row}
					<div
						class="reel-symbol"
						class:winning={!moving[reel] &&
							positions.some((p) => p.reel === reel && p.row === row + 1)}
					>
						<img src={`./assets/sprites/${symbol.name}.webp`} alt="" draggable="false" />
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
		.running img {
			filter: none;
		}
	}
</style>
