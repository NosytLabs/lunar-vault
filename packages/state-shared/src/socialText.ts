/**
 * Social-mode (Stake.US, `social=true`) wording.
 *
 * Engine restricts these words, matched as whole words, case-insensitive,
 * anywhere a player can see them: buttons, labels, rules, paytable, modals,
 * confirmations, errors, autoplay menus, mode names, loading screens and the
 * replay.
 *
 * The table below is Engine's, taken from the official review prompt. Terms
 * are matched as whole words and replaced inside longer strings too, so
 * "INSUFFICIENT FUNDS TO PLACE THIS BET" is rewritten rather than skipped.
 *
 *   Restricted                | Use instead
 *   ------------------------- | --------------------
 *   at the cost of            | for
 *   be awarded to player's... | appear in player's...
 *   money                     | coins
 *   bet / bets / bet/s       | play / plays
 *   betting                   | play / playing
 *   bonus buy                 | bonus / feature
 *   bought                    | instantly triggered
 *   buy                       | play
 *   buy bonus                 | get bonus
 *   cash                      | coins
 *   cost of                   | can be played for
 *   credit                    | balance
 *   currency                  | token
 *   deposit                   | get coins
 *   fund                      | balance
 *   gamble                    | play
 *   paid                      | won
 *   paid out                  | win
 *   pay                       | win
 *   pay out                   | win / won
 *   payer                     | winner
 *   pays                      | wins
 *   pays out                  | won
 *   place your bets           | come and play / join in the game
 *   purchase                  | play
 *   rebet                     | respin
 *   stake                     | play amount
 *   total bet                 | total play
 *   wager                     | play
 *   win feature               | play feature
 *   withdraw                  | redeem
 *
 * Longest phrases are applied first so "buy bonus" is not rewritten as
 * "play bonus" by the shorter "buy" rule.
 */

/** Multi-word phrases, applied before the single words. */
const SOCIAL_PHRASES: [string, string][] = [
	['be awarded to player', 'appear in player'],
	['be awarded to player’s', 'appear in player’s'],
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
	// The Engine table does not restrict 'spin', but Stake's social
	// house uses PLAY consistently, and the SDK's own social map did too.
	['auto spin', 'auto play'],
	['auto spins', 'auto plays'],
	// Engine's common-misses list forbids "paytable" outright, and the
	// whole-word "pay" rule cannot match it because it is one word.
	['paytable', 'win table'],
	['pay tables', 'win tables'],
	['payouts', 'wins'],
	['payout', 'win'],
];

/** Single words, matched as whole words only. */
const SOCIAL_WORDS: Record<string, string> = {
	bet: 'play',
	bets: 'plays',
	betting: 'playing',
	bought: 'instantly triggered',
	buy: 'play',
	cash: 'coins',
	credit: 'balance',
	currency: 'token',
	deposit: 'get coins',
	fund: 'balance',
	buying: 'playing',
	paids: 'won',
	buys: 'play',
	gambles: 'play',
	purchases: 'play',
	currencies: 'token',
	credits: 'balance',
	withdrawals: 'redeem',
	wagers: 'play',
	stakes: 'play amount',
	deposits: 'get coins',
	funds: 'balance',
	gamble: 'play',
	money: 'coins',
	paid: 'won',
	pay: 'win',
	payer: 'winner',
	pays: 'wins',
	purchase: 'play',
	stake: 'play amount',
	wager: 'play',
	withdraw: 'redeem',
};

/**
 * Escape a string for use inside a RegExp.
 */
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replace whole-word occurrences of a term, keeping the original casing of
 * the matched text where the replacement is the same word in a different
 * case (all caps for labels, sentence case for sentences).
 */
const replaceWord = (text: string, word: string, replacement: string): string => {
	const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
	return text.replace(re, (match) => {
		// Preserve the shape of the match: all caps stays all caps.
		if (match === match.toUpperCase() && match !== match.toLowerCase()) {
			return replacement.toUpperCase();
		}
		// Sentence case: capitalise the replacement the same way.
		if (match[0] === match[0].toUpperCase()) {
			return replacement[0].toUpperCase() + replacement.slice(1);
		}
		return replacement;
	});
};

/**
 * Rewrite a player-facing string into its social-mode wording.
 *
 * Returns the input unchanged when social mode is off.
 */
const socialText = (text: string, isSocial: boolean): string => {
	if (!isSocial || !text) return text;

	let result = text;
	for (const [phrase, replacement] of SOCIAL_PHRASES) {
		result = replaceWord(result, phrase, replacement);
	}
	for (const [word, replacement] of Object.entries(SOCIAL_WORDS)) {
		result = replaceWord(result, word, replacement);
	}
	return result;
};

/**
 * The full replacement map, for the compliance checker.
 */
const SOCIAL_REPLACEMENTS: Record<string, string> = Object.fromEntries([
	...SOCIAL_PHRASES.map(([k, v]) => [k.toUpperCase(), v.toUpperCase()]),
	...Object.entries(SOCIAL_WORDS).map(([k, v]) => [k.toUpperCase(), v.toUpperCase()]),
]);

export { SOCIAL_PHRASES, SOCIAL_REPLACEMENTS, SOCIAL_WORDS, socialText };
