<script lang="ts">
	import config from '../game/config';
	import report from '../../../../math/lunar-vault/report.json';
	const { paytable = false }: { paytable?: boolean } = $props();
	const names: Record<string, string> = {
		H1: 'Astral Crown',
		H2: 'Ringed World',
		H3: 'North Star',
		H4: 'Celestial Lens',
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

<section class="information" aria-label={paytable ? 'Symbol table' : 'Game information'}>
	<p class="eyebrow">NOSYTLABS GAMES</p>
	<h1>{paytable ? 'Celestial symbols' : 'Inside the Lunar Vault'}</h1>
	<p class="notice">
		The theoretical return is {(report.modes.base.weightedRtp * 100).toFixed(2)}% in both modes,
		calculated over many plays. An individual session may return more or less.
	</p>
	{#if paytable}
		<p>
			Values multiply the selected base play amount. Match three or more symbols from left to right
			on one of the twenty lines. Each line awards its highest base-table combination before Wild
			multipliers are applied.
		</p>
		<table>
			<thead><tr><th>Symbol</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>
				{#each Object.entries(config.symbols).filter(([, value]) => 'paytable' in value) as [key, symbol]}
					<tr
						><th
							><img
								src={`./assets/nosyt/sprites/${key === 'W' || key === 'S' ? key.toLowerCase() + '-v4' : key.toLowerCase() + '-v5'}.webp`}
								alt=""
							/>{names[key] ?? key}</th
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
			3 Eclipse symbols award 8 free spins, 4 award 12, and 5 or more award 15. Three or more
			Eclipse symbols during the feature add 4 spins, up to 30 total, without resetting completed
			spins. The optional feature mode opens 12 spins for 100× the selected play amount and requires
			confirmation. Availability depends on the session.
		</p>
		<p>
			Base mode costs 1× per play and has a maximum of {report.modes.base.maximumWinX}×. Eclipse
			Chamber costs 100× and has a maximum of {report.modes.bonus.maximumWinX}×. Both maxima
			multiply the selected base play amount. Eclipse Chamber’s maximum is
			{(report.modes.bonus.maximumWinX / config.betModes.bonus.cost).toFixed(2)}× its full feature
			amount. Expected return is measured over many plays.
		</p>
		<h2>Controls</h2>
		<p>
			Spin starts a round. Stop speeds up the animation where permitted; it never changes a result.
			Use +/− or select the current amount to choose an available session level. Turbo shortens
			eligible reel animations. Menu opens Info, the symbol table and Settings. The speaker button
			toggles all audio; Settings contains separate music and effects levels. Fullscreen changes the
			view when available. Press Space on the playfield to spin. Hold Space for 400 ms to start
			repeated plays with turbo animations where permitted. Release Space to stop future repeated
			plays and restore normal animation speed; the current round completes. Space follows session
			restrictions and is ignored while a dialog or an interactive control has focus.
		</p>
		<p>
			Autoplay opens settings for the number of rounds and limits; confirm before it starts. Cancel
			it to stop future rounds while the current round completes. Select Eclipse Chamber and confirm
			the displayed 100× amount to enter its feature. Play again repeats a replay without a new
			play.
		</p>
		<p>
			Keep a connection while playing. If the session is interrupted, reload to recover the
			unfinished round.
		</p>
		<h2>Game operation</h2>
		<p>
			A malfunction cancels wins and plays. A stable internet connection is required. Reload after
			disconnection to complete any unfinished round. Expected return is measured over many plays.
			The display is illustrative and does not represent a physical device. The Remote Game Server
			settles all awards; browser animations do not determine them. TM and © 2026 Engine.
		</p>
	{/if}
</section>

<style>
	.information {
		max-width: 720px;
		width: 100%;
		padding: 8px 12px;
		text-align: left;
		color: #e4edf7;
		font:
			15px/1.6 'Lunar Body',
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
		line-height: 1.2;
		text-align: center;
		outline: none;
	}
	h2 {
		font-size: 21px;
		margin: 22px 0 8px;
	}
	.eyebrow {
		margin: 0 0 6px;
		text-align: center;
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
			width: 100%;
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
	@media (max-height: 400px) {
		.information {
			padding: 2px 6px;
			font-size: 13px;
			line-height: 1.45;
		}
		h1 {
			font-size: 20px;
			margin: 4px 0 10px;
		}
		.eyebrow {
			font-size: 9px;
			letter-spacing: 1px;
		}
		.notice {
			margin: 8px 0;
			padding: 8px;
		}
	}
</style>
