/**
 * Game rules / paytable content check against Engine's approval guidelines.
 *
 * Engine requires, in the rules the player can open:
 *
 *   [24]  Every symbol's payout is shown.
 *   [25]  RTP and max win are stated.
 *   [26]  Win combinations are explained.
 *   [27]  Every mode has a description and cost.
 *   [29]  Free games and re-triggers are explained.
 *   [185] A general disclaimer is present.
 *   [235] Every control is explained.
 *
 * The game's metadata lives in apps/lunar-vault/src/game/gameMeta.ts. Rather
 * than evaluating TypeScript, this script parses the literal source with a
 * small scanner: it extracts every `title:` / `text:` string pair in order,
 * which is exactly the content the player sees in the rules modals.
 *
 * Run with: node tools/check-game-rules.mjs
 */
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const metaSource = read('../apps/lunar-vault/src/game/gameMeta.ts');
const configSource = read('../apps/lunar-vault/src/game/config.ts');

/** Extract every string literal assigned to `title:` or `text:` in order. */
const extractFields = (source, field) => {
	const out = [];
	const re = new RegExp(`${field}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 'g');
	let m;
	while ((m = re.exec(source)) !== null) {
		out.push(m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\'));
	}
	return out;
};

const ruleTitles = extractFields(metaSource, 'title');
const ruleTexts = extractFields(metaSource, 'text');

/**
 * The symbol payout rows are built by `payoutRows()`, so the literal payout
 * strings are not in the source. Resolve the function's template once and
 * substitute it for each symbol, so the checker sees the same content the
 * player does.
 */
const payoutTemplateMatch = metaSource.match(
	/`5 of a kind\	\$\{symbol\.payouts\['5'\]\}x\\n4 of a kind\	\$\{symbol\.payouts\['4'\]\}x\\n3 of a kind\	\$\{symbol\.payouts\['3'\]\}x`/,
);

const symbolPayouts = {};
for (const sym of ['L1', 'L2', 'L3', 'L4', 'L5', 'H1', 'H2', 'H3', 'H4']) {
	const symMatch = metaSource.match(
		new RegExp(`${sym}:\\s*\\{[^}]*?payouts:\\s*\\{\\s*'5':\\s*([\\d.]+),\\s*'4':\\s*([\\d.]+),\\s*'3':\\s*([\\d.]+)`),
	);
	if (symMatch && payoutTemplateMatch) {
		const [p5, p4, p3] = symMatch.slice(1, 4);
		symbolPayouts[sym] = `5 of a kind	${p5}x\n4 of a kind	${p4}x\n3 of a kind	${p3}x`;
	}
}

// Section titles come first in the source; the rest are container titles.
const sectionTitles = ruleTitles.filter((t) =>
	/^(GAME RULES|CONTROLS|DISCLAIMER|PAYTABLE|SYMBOLS|WIN LINES)$/.test(t),
);

const allText = [...ruleTitles, ...ruleTexts, ...Object.values(symbolPayouts)]
	.join('\n')
	.toLowerCase();

let failures = 0;
const check = (label, condition, detail = '') => {
	if (condition) {
		console.log(`  PASS  ${label}`);
	} else {
		failures++;
		console.log(`  FAIL  ${label}${detail ? `  -- ${detail}` : ''}`);
	}
};

console.log('[25] RTP and max win are stated');
check('RTP percentage appears', /rtp\s+\d{2}\.\d{2}%/.test(allText), 'no "RTP xx.xx%" found');
check('max win is stated', /max win/.test(allText), 'no max win statement');

console.log('\n[24] Every symbol payout is shown');
const payingSymbols = [...configSource.matchAll(/^\t\t([LH]\d):\s*\{$/gm)].map((m) => m[1]);
console.log(`  (paying symbols in config.ts: ${payingSymbols.length} -> ${payingSymbols.join(', ')})`);
check('paying symbols exist in config', payingSymbols.length >= 8, 'could not read config.ts symbols');
check('a SYMBOLS section exists', sectionTitles.includes('SYMBOLS'), 'no SYMBOLS section');
for (const label of ['HIGH GEM 1', 'HIGH GEM 4', 'LOW GEM 1', 'LOW GEM 5']) {
	check(`paytable lists ${label}`, allText.includes(label.toLowerCase()), `missing "${label}"`);
}
check(
	'paytable shows 5/4/3-of-a-kind rows',
	/5 of a kind[\s\S]*4 of a kind[\s\S]*3 of a kind/.test(allText),
	'no 5/4/3 of a kind rows',
);

console.log('\n[26] Win combinations are explained');
check('left-to-right pay explained', /left to right/.test(allText), 'no "left to right" wording');
check('adjacent reels explained', /adjacent reels/.test(allText), 'no "adjacent reels" wording');

console.log('\n[27] Every mode has a description and cost');
check('BASE mode described', /base game/.test(allText));
check('BONUS / FEATURE ROUND mode described', /feature round/.test(allText));
check('bonus cost stated (100x)', /100x/.test(allText), 'no 100x cost');

console.log('\n[29] Free games and re-triggers are explained');
check('free spins explained', /free spins?/.test(allText), 'no "free spins"');
check('retrigger explained', /retrigger/.test(allText), 'no "retrigger"');
check('scatter trigger explained', /scatter/.test(allText), 'no "scatter"');

console.log('\n[185] General disclaimer is present');
check('disclaimer section exists', sectionTitles.includes('DISCLAIMER'), 'no DISCLAIMER section');
const disclaimerText = ruleTexts.join(' ').toLowerCase();
for (const [label, needle] of [
	['malfunction voids wins', 'malfunction voids'],
	['connection required', 'internet connection is required'],
	['reload to finish rounds', 'reload the game'],
	['RTP over many plays', 'calculated over many plays'],
	['display illustrative only', 'illustrative purposes only'],
	['settled by the RGS', 'remote game server'],
]) {
	check(`disclaimer covers: ${label}`, disclaimerText.includes(needle), `missing "${needle}"`);
}

console.log('\n[235] Every control is explained');
check('CONTROLS section exists', sectionTitles.includes('CONTROLS'), 'no CONTROLS section');
for (const [label, needle] of [
	['bet / spin', 'bet / spin'],
	['bet amount +/-', 'bet amount +/-'],
	['bet menu', 'bet menu'],
	['autoplay', 'auto play'],
	['turbo', 'turbo'],
	['bonus buy', 'get bonus'],
	['paytable', 'win table'],
	['info / rules', 'info'],
	['settings', 'settings'],
	['sound', 'sound'],
	['menu', 'menu'],
	['exit', 'exit'],
]) {
	check(`control explained: ${label}`, allText.includes(needle), `missing "${needle}"`);
}

console.log(`\n${failures === 0 ? 'All game rules checks passed.' : `${failures} game rules check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
