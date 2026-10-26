<script lang="ts">
	import config from '../game/config';
	const { paytable = false }: { paytable?: boolean } = $props();
	const names: Record<string, string> = {
		H1: 'Astral Crown',
		H2: 'Ringed World',
		H3: 'North Star',
		H4: 'Eclipse Eye',
		H5: 'Astral Hourglass',
		L1: 'Sapphire Star',
		L2: 'Crescent Moon',
		L3: 'Azure Compass',
		L4: 'Ruby Comet',
		L5: 'Jade Prism',
		W: 'Wild',
		S: 'Eclipse',
	};
	const payout = (symbol: { paytable?: Partial<Record<string, number>>[] }, count: number) =>
		symbol.paytable?.find((row) => String(count) in row)?.[String(count)] ?? '—';
</script>

<section class="information" aria-label={paytable ? 'Sample symbol table' : 'Game information'}>
	<p class="eyebrow">NOSYTLABS GAMES · DEVELOPMENT PREVIEW</p>
	<h1>{paytable ? 'Celestial symbols' : 'Inside the Lunar Vault'}</h1>
	<p class="notice">
		Sample rules and rewards. Lunar Vault has no matching certified math package or Engine approval.
		The inherited 97% RTP and 5,000× maximum are unverified sample metadata, not a certified return
		or promise.
	</p>
	{#if paytable}
		<p>
			Values multiply the selected base play amount. Match three or more symbols from left to right
			on one of the twenty lines. Each line pays its highest base-table combination before Wild
			multipliers are applied.
		</p>
		<table>
			<thead><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>
				{#each Object.entries(config.symbols).filter(([, value]) => 'paytable' in value) as [key, symbol]}
					<tr
						><th
							><img src={`./assets/nosyt/${key.toLowerCase()}.svg`} alt="" />{names[key] ?? key}</th
						><td>{payout(symbol, 3)}×</td><td>{payout(symbol, 4)}×</td><td>{payout(symbol, 5)}×</td
						></tr
					>
				{/each}
			</tbody>
		</table>
	{:else}
		<h2>Twenty paths through the stars</h2>
		<p>
			Five reels, three visible rows and twenty lines. Match three, four or five symbols from left
			to right on a line. Wilds substitute for ordinary symbols. Each line selects its highest
			base-table award before multipliers are applied. Multipliers above 1× on winning Wilds are
			added together: a 2× and a 5× Wild apply 7× to that line’s award.
		</p>
		<div class="paylines" aria-label="Twenty paylines">
			{#each Object.entries(config.paylines) as [number, rows]}
				<figure>
					<svg
						viewBox="0 0 110 64"
						role="img"
						aria-label={`Line ${number}: rows ${rows.map((row) => row + 1).join(', ')}`}
					>
						{#each [0, 1, 2] as row}{#each [0, 1, 2, 3, 4] as col}<circle
									cx={7 + col * 24}
									cy={8 + row * 24}
									r="3"
									fill="#41576a"
								/>{/each}{/each}
						<polyline
							points={rows.map((row, col) => `${7 + col * 24},${8 + row * 24}`).join(' ')}
							fill="none"
							stroke="#e4bf7c"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<figcaption>{number}</figcaption>
				</figure>
			{/each}
		</div>
		<h2>Eclipse Chamber</h2>
		<p>
			The sample awards 8, 12 or 15 free spins for 3, 4 or 5 Eclipse symbols. An extension increases
			the announced total without resetting completed spins. The optional feature mode costs 100×
			the selected play amount and requires confirmation. Availability depends on the session.
		</p>
		<h2>Controls</h2>
		<p>
			Spin starts a round. Stop speeds up the animation where permitted; it never changes a result.
			Menu contains sound, settings and symbol values. Space follows session restrictions and is
			ignored while a dialog is open. Autoplay can be cancelled without interrupting the current
			round.
		</p>
		<p>
			Keep a connection while playing. If the session is interrupted, reload to recover the
			unfinished round.
		</p>
	{/if}
</section>

<style>
	.information {
		max-width: 720px;
		width: min(720px, 82vw);
		padding: 24px;
		color: #e4edf7;
		font:
			15px/1.6 'Lunar Sans',
			Arial,
			sans-serif;
	}
	h1,
	h2 {
		font-family: 'Lunar Display', Georgia, serif;
		color: #f3d9a3;
	}
	h1 {
		font-size: 32px;
		margin: 8px 0 20px;
	}
	h2 {
		font-size: 21px;
		margin: 22px 0 8px;
	}
	.eyebrow {
		font-size: 11px;
		letter-spacing: 2px;
		color: #c5a56e;
	}
	.notice {
		padding: 14px;
		border: 1px solid #8b7049;
		border-radius: 10px;
		background: #182536;
	}
	.paylines {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 8px;
		margin: 18px 0;
	}
	.paylines figure {
		margin: 0;
		padding: 7px;
		background: #0b1929;
		border: 1px solid #516074;
		border-radius: 8px;
	}
	.paylines svg {
		width: 100%;
		display: block;
	}
	.paylines figcaption {
		font:
			700 14px 'Lunar Sans',
			sans-serif;
		color: #e6cb9b;
		text-align: center;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		padding: 9px 6px;
		border-bottom: 1px solid #364256;
	}
	td {
		white-space: nowrap;
	}
	th img {
		width: 42px;
		height: 42px;
		vertical-align: middle;
		margin-right: 10px;
	}
	thead {
		color: #ddc391;
	}
	@media (max-width: 500px) {
		.paylines {
			grid-template-columns: repeat(4, 1fr);
			gap: 5px;
		}
		.information {
			padding: 12px;
			font-size: 13px;
			width: 82vw;
		}
		h1 {
			font-size: 25px;
		}
		th img {
			width: 30px;
			height: 30px;
			margin-right: 5px;
		}
		th,
		td {
			padding: 8px 3px;
		}
	}
</style>
