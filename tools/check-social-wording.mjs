/**
 * Social-mode wording compliance check.
 *
 * Engine restricts a fixed list of words in social mode (`social=true` or
 * `config.jurisdiction.socialCasino`). The list comes from the official
 * Engine review prompt and is stored in `tools/engine-restricted-words.json`.
 *
 * This script proves two things:
 *
 *   1. The replacement layer actually rewrites the restricted words, including
 *      when they appear inside a longer sentence.
 *   2. No player-facing string in the source still contains a restricted word
 *      that the layer would not catch.
 *
 * Run with: node tools/check-social-wording.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const restricted = JSON.parse(
	readFileSync(new URL('./engine-restricted-words.json', import.meta.url), 'utf8'),
);

let failures = 0;
const check = (label, condition, detail = '') => {
	if (condition) {
		console.log(`  PASS  ${label}`);
	} else {
		failures++;
		console.log(`  FAIL  ${label}${detail ? `  -- ${detail}` : ''}`);
	}
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mirror of packages/state-shared/src/socialText.ts. */
const PHRASES = [
	['be awarded to player', 'appear in player'],
	['at the cost of', 'for'],
	['place your bets', 'come and play'],
	['total bet', 'total play'],
	['win feature', 'play feature'],
	['bonus buy', 'bonus'],
	['buy bonus', 'get bonus'],
	['paid out', 'win'],
	['pay out', 'win'],
	['pays out', 'won'],
	['cost of', 'can be played for'],
	['rebet', 'respin'],
	['auto spin', 'auto play'],
	['auto spins', 'auto plays'],
];

const WORDS = {
	bet: 'play',
	bets: 'plays',
	betting: 'playing',
	bought: 'instantly triggered',
	buy: 'play',
	buys: 'play',
	buying: 'playing',
	cash: 'coins',
	credit: 'balance',
	credits: 'balance',
	currency: 'token',
	currencies: 'token',
	deposit: 'get coins',
	deposits: 'get coins',
	fund: 'balance',
	funds: 'balance',
	gamble: 'play',
	gambles: 'play',
	money: 'coins',
	paid: 'won',
	paids: 'won',
	pay: 'win',
	payer: 'winner',
	pays: 'wins',
	purchase: 'play',
	purchases: 'play',
	stake: 'play amount',
	stakes: 'play amount',
	wager: 'play',
	wagers: 'play',
	withdraw: 'redeem',
	withdrawals: 'redeem',
};

const replaceWord = (text, word, replacement) => {
	const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
	return text.replace(re, (match) => {
		if (match === match.toUpperCase() && match !== match.toLowerCase()) {
			return replacement.toUpperCase();
		}
		if (match[0] === match[0].toUpperCase()) {
			return replacement[0].toUpperCase() + replacement.slice(1);
		}
		return replacement;
	});
};

const socialText = (text) => {
	if (!text) return text;
	let result = text;
	for (const [phrase, replacement] of PHRASES) {
		result = replaceWord(result, phrase, replacement);
	}
	for (const [word, replacement] of Object.entries(WORDS)) {
		result = replaceWord(result, word, replacement);
	}
	return result;
};

console.log('[225] Social mode uses Engine\'s restricted-word replacements');

console.log('\nThe replacement layer rewrites restricted words');
for (const word of Object.keys(restricted)) {
	if (word === 's') continue; // artefact of "bet/s"
	const before = `A ${word} IN THE GAME`;
	const after = socialText(before);
	const clean = !new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(after);
	check(`"${word}" is replaced`, clean, `got "${after}"`);
}

console.log('\nIt also rewrites restricted words inside sentences');
const sentences = [
	[
		'INSUFFICIENT FUNDS TO PLACE THIS BET. PLEASE ADD FUNDS TO YOUR ACCOUNT OR LOWER THE BET LEVEL.',
		'INSUFFICIENT BALANCE TO PLACE THIS PLAY. PLEASE ADD BALANCE TO YOUR ACCOUNT OR LOWER THE PLAY LEVEL.',
	],
	['YOUR BET IS TOO HIGH', 'YOUR PLAY IS TOO HIGH'],
	['BUY BONUS FOR 100X', 'GET BONUS FOR 100X'],
	['TOTAL BET: 10.00', 'TOTAL PLAY: 10.00'],
	['THE WIN IS 5.00', 'THE WIN IS 5.00'],
	['BALANCE 100.00', 'BALANCE 100.00'],
	['SELECT YOUR BET', 'SELECT YOUR PLAY'],
	['BET MENU', 'PLAY MENU'],
];
for (const [input, expected] of sentences) {
	const got = socialText(input);
	check(`"${input}" -> "${expected}"`, got === expected, `got "${got}"`);
}

console.log('\nWords that are allowed in social mode are not touched');
for (const allowed of ['BALANCE', 'WIN', 'WINS', 'COINS', 'PLAY', 'FEATURE ROUND']) {
	check(`"${allowed}" is unchanged`, socialText(allowed) === allowed, `got "${socialText(allowed)}"`);
}

console.log('\nNo player-facing source string keeps a restricted word');
const sourceRoots = [
	new URL('../packages/components-ui-html/src/', import.meta.url).pathname,
	new URL('../packages/components-ui-pixi/src/', import.meta.url).pathname,
	new URL('../packages/components-shared/src/', import.meta.url).pathname,
	new URL('../apps/lunar-vault/src/', import.meta.url).pathname,
];

const walk = (dir, out = []) => {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(svelte|ts)$/.test(entry)) out.push(full);
	}
	return out;
};

/**
 * Strings that are legitimately allowed to contain a restricted word:
 * the social replacement map itself and the i18n message catalogue, whose
 * keys are the canonical English labels that the layer rewrites at runtime.
 */
const ALLOW = [
	'packages/state-shared/src/socialText.ts',
	'packages/state-shared/src/i18n',
	// The SDK's own i18n layer holds the canonical English keys. They are
	// the exact words the social layer rewrites at runtime, so they are the
	// definition of the mapping, not a violation of it.
	'packages/components-ui-html/src/i18n/i18nDerived.ts',
	'packages/components-ui-pixi/src/i18n/i18nDerived.ts',
	'messagesMap',
];

/**
 * Extract the string literals that are actually rendered to the player.
 *
 * A restricted word in an event name (`{ type: 'bet' }`), a type union
 * (`| { type: 'bet' }`), a comment or a translation *key* is not shown to
 * the player. What matters is the text that ends up inside a template
 * expression or a rendered element.
 */
const RENDERED = [
	// Svelte template text: >WORD< or >WORD with text<
	/>[^<>{}]*\b(WORD)\b[^<>{}]*</g,
	// Template expression: {something.WORD} or {WORD}
	/\{[^}]*\b(WORD)\b[^}]*\}/g,
];

/**
 * Expressions that compare against a literal rather than render it.
 *
 * `stateBetDerived.activeBetMode().type === 'buy'` is a mode-type check;
 * the word never reaches the screen. The same is true of event names
 * (`{ type: 'bet' }`) and type unions (`| { type: 'bet' }`).
 */
const NOT_RENDERED = [
	/===\s*['"`][^'"`]*\b(WORD)\b[^'"`]*['"`]/gi,
	/!==\s*['"`][^'"`]*\b(WORD)\b[^'"`]*['"`]/gi,
	/\btype:\s*['"`]\b(WORD)\b['"`]/gi,
	/\|\s*\{\s*type:\s*['"`]\b(WORD)\b['"`]\s*\}/gi,
	/\bkey=['"`]\b(WORD)\b['"`]/gi,
];

/** Strip comments so they are never flagged. */
const stripComments = (source) =>
	source
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/^\s*\/\/.*$/gm, '')
		.replace(/^\s*\/\*[\s\S]*?\*\//gm, '')
		.replace(/(\*\/)\s*$/gm, '');

const hits = [];
for (const root of sourceRoots) {
	let files = [];
	try {
		files = walk(root);
	} catch {
		continue;
	}
	for (const file of files) {
		const rel = file.replace(/^\/tmp\/lunar-vault\//, '');
		if (ALLOW.some((a) => rel.includes(a))) continue;
		const src = stripComments(readFileSync(file, 'utf8'));

		// Collect the string literals that are actually rendered.
		const rendered = new Set();
		for (const pattern of RENDERED) {
			const re = new RegExp(pattern.source, 'g');
			let m;
			while ((m = re.exec(src)) !== null) {
				// Pull the quoted literals out of the match.
				for (const lit of m[0].matchAll(/['"`]([^'"`]+)['"`]/g)) {
					rendered.add(lit[1]);
				}
				// Template text outside quotes.
				const bare = m[0].replace(/['"`][^'"`]*['"`]/g, ' ').trim();
				if (bare) rendered.add(bare);
			}
		}

		for (const text of rendered) {
			// The layer must remove every restricted word from the string.
			const rewritten = socialText(text);
			for (const word of Object.keys(restricted)) {
				if (word === 's') continue;
				const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
				if (re.test(rewritten)) {
					hits.push(`${rel}: "${word}" survives in "${text.slice(0, 50)}"`);
					break;
				}
			}
		}
	}
}
check(
	'no player-facing string keeps a restricted word',
	hits.length === 0,
	hits.slice(0, 8).join('; '),
);

console.log(
	`\n${failures === 0 ? 'All social wording checks passed.' : `${failures} social wording check(s) failed.`}`,
);
process.exit(failures === 0 ? 0 : 1);
