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
			Displayed values are sample multipliers of the base play amount. Five reels, three visible
			rows, twenty configured lines. Outcomes and awards come from the server’s event book.
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
			Line wins are presented on the five-reel board. Wilds carry any multiplier supplied by the
			event book. Eclipse symbols mark the feature; the server supplies the awarded free spins and
			their results.
		</p>
		<h2>Eclipse Chamber</h2>
		<p>
			The configured base mode costs 1×. The optional feature mode costs 100× the selected play
			amount. Feature availability and permitted controls depend on the session configuration. No
			additional boost or super modes are implemented.
		</p>
		<h2>Controls</h2>
		<p>
			Use the central control to start a round. Stop speeds up presentation where permitted; it
			never changes the result. Open Menu for sound, settings and the sample symbol table. Space
			follows session restrictions and is ignored while a dialog is open.
		</p>
		<p>
			Server-reported results determine awards. Interrupted sessions and replays require a matching
			Engine deployment; local fixture tests do not establish certification.
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
			15px/1.6 Arial,
			sans-serif;
	}
	h1,
	h2 {
		font-family: Georgia, serif;
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
