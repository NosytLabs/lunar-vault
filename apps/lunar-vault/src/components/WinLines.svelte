<script lang="ts" module>
	import type { Position } from '../game/types';
	export type EmitterEventWinLines =
		| { type: 'winLineShow'; positions: Position[]; line: number; amount: number }
		| { type: 'winLineHide' };
</script>

<script lang="ts">
	import { stateBet } from 'state-shared';
	import { reducedMotion } from '../game/motion.svelte';
	import { Graphics, Text, Rectangle } from 'pixi-svelte';
	import BoardContainer from './BoardContainer.svelte';
	import { getContext } from '../game/context';
	import { getSymbolX } from '../game/utils';
	import { SYMBOL_SIZE } from '../game/constants';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';
	const context = getContext();
	let trace = $state(1);
	$effect(() => {
		if (!line || reducedMotion.current || stateBet.isTurbo) {
			trace = 1;
			return;
		}
		trace = 0;
		const start = performance.now();
		let frame = 0;
		const animate = (now: number) => {
			trace = Math.min(1, (now - start) / 230);
			if (trace < 1) frame = requestAnimationFrame(animate);
		};
		frame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(frame);
	});
	let line = $state<Extract<EmitterEventWinLines, { type: 'winLineShow' }>>();
	context.eventEmitter.subscribeOnMount({
		winLineShow: (event) => (line = event),
		winLineHide: () => (line = undefined),
	});
</script>

{#if line}
	<BoardContainer>
		<Graphics
			eventMode="none"
			draw={(g) => {
				if (!line?.positions.length) return;
				const points = line.positions.map((p) => ({
					x: getSymbolX(p.reel),
					y: (p.row - 0.5) * SYMBOL_SIZE,
				}));
				const progress = trace * Math.max(1, points.length - 1);
				const drawn = points.slice(0, Math.floor(progress) + 1);
				const next = points[Math.floor(progress) + 1],
					previous = points[Math.floor(progress)];
				if (next && previous)
					drawn.push({
						x: previous.x + (next.x - previous.x) * (progress % 1),
						y: previous.y + (next.y - previous.y) * (progress % 1),
					});
				for (const [width, color, alpha] of [
					[9, 0x061527, 0.8],
					[4, 0xe3b669, 0.85],
					[1.5, 0xfff4d2, 0.95],
				]) {
					drawn.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
					g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
				}
				for (const [index, p] of points.entries())
					if (index <= progress) g.circle(p.x, p.y, 5).fill(0xffe6a4);
			}}
		/>
		<Rectangle
			x={300}
			y={-23}
			anchor={0.5}
			width={280}
			height={40}
			borderRadius={10}
			backgroundColor={0x081827}
			backgroundAlpha={0.96}
			borderColor={0xdab475}
			borderWidth={1}
		/>
		<Text
			x={300}
			y={-23}
			anchor={0.5}
			text={`LINE ${line.line}  ·  ${bookEventAmountToCurrencyString(line.amount)}`}
			style={{
				fontFamily: 'Lunar Sans',
				fontWeight: '700',
				fontSize: 25,
				letterSpacing: 1,
				fill: 0xffe3a2,
			}}
		/>
	</BoardContainer>
{/if}
