/**
 * Engine front-end compliance check.
 *
 * Static checks for the Engine approval guidelines that can be proven by
 * reading the source:
 *
 *   [213] Title is unique and avoids restricted terms.
 *   [223] Double-tap zoom is disabled on mobile.
 *   [227] Main frame doesn't scroll.
 *   [275] No Stake Engine loader.
 *   [25]  RTP and max win are stated (also in check-game-rules.mjs).
 *   [77]  All text uses social wording (also in check-social-wording.mjs).
 *
 * Run with: node tools/check-engine-compliance.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const exists = (p) => existsSync(new URL(p, import.meta.url));

/** Strip comments so a checker never matches its own explanatory prose. */
const stripComments = (source) =>
	source
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/(^|[^:])\/\/[^\n]*/g, '$1')
		.replace(/\/\*[\s\S]*?\*\//g, '');

const appHtml = stripComments(read('../apps/lunar-vault/src/app.html'));
const layout = stripComments(read('../apps/lunar-vault/src/routes/+layout.svelte'));
const globalScss = stripComments(read('../packages/components-ui-html/src/components/global.scss'));
const loaderExample = stripComments(read('../packages/components-shared/src/components/LoaderExample.svelte'));
const amount = stripComments(read('../packages/utils-shared/amount.ts'));

let failures = 0;
const check = (label, condition, detail = '') => {
	if (condition) {
		console.log(`  PASS  ${label}`);
	} else {
		failures++;
		console.log(`  FAIL  ${label}${detail ? `  -- ${detail}` : ''}`);
	}
};

console.log('[213] Title is unique and avoids restricted terms');
check('a <title> is set', /<title>[^<]+<\/title>/.test(layout), 'no <title> in +layout.svelte');
const title = layout.match(/<title>([^<]+)<\/title>/)?.[1] ?? '';
console.log(`  (title: "${title}")`);
for (const banned of [
	'megaways',
	'xways',
	'enhanced',
	'boost',
	'rtp',
	'gates of',
	'bonanza',
	'olympus',
	'rush',
	'kraken',
	'waylanders',
]) {
	check(`title avoids "${banned}"`, !title.toLowerCase().includes(banned), `title contains "${banned}"`);
}
check('the Stake Engine logo text is gone', !/stakeengine|stake engine/i.test(layout));

console.log('\n[275] No Stake Engine loader');
check(
	'the app does not render LoaderStakeEngine',
	!/<LoaderStakeEngine/.test(layout),
	'+layout.svelte still renders <LoaderStakeEngine>',
);
check(
	'the Stake Engine loader asset is removed',
	!exists('../apps/lunar-vault/static/stake-engine-loader.gif'),
	'stake-engine-loader.gif is still in static/',
);
check(
	'no loader shows placeholder text',
	!/Add Your Loader/i.test(loaderExample),
	'LoaderExample still renders "Add Your Loader"',
);

console.log('\n[223] Double-tap zoom is disabled on mobile');
const viewport = appHtml.match(/name="viewport"\s+content="([^"]+)"/)?.[1] ?? '';
console.log(`  (viewport: ${viewport})`);
check('user-scalable=no', /user-scalable\s*=\s*no/i.test(viewport), 'no user-scalable=no');
check('maximum-scale=1', /maximum-scale\s*=\s*1/i.test(viewport), 'no maximum-scale=1');
check('initial-scale=1', /initial-scale\s*=\s*1/i.test(viewport), 'no initial-scale=1');
check('touch-action: manipulation on body', /touch-action:\s*manipulation/.test(globalScss), 'no touch-action: manipulation');

console.log('\n[227] Main frame does not scroll');
check('html/body overflow hidden', /overflow:\s*hidden/.test(globalScss), 'no overflow: hidden');
check('html/body height 100%', /height:\s*100%/.test(globalScss), 'no height: 100%');
check('overscroll-behavior: none', /overscroll-behavior:\s*none/.test(globalScss), 'no overscroll-behavior: none');

console.log('\n[219]/[78] Currency display');
check('social currencies render as a suffix', /NO_LOCALISATION_CURRENCY_MAP/.test(amount), 'no social currency map');
check('social currency suffix order is value then code', /\$\{numberToFloat\(value\)[\s\S]{0,120}NO_LOCALISATION_CURRENCY_MAP\[currency\]/.test(amount), 'suffix order wrong');
check('ISO currencies are not hardcoded to 2 decimals', !/maximumFractionDigits:\s*2/.test(amount), 'maximumFractionDigits: 2 is hardcoded');
check('no fixed "$" fallback', !/style:\s*'currency'[\s\S]{0,80}currency:\s*'USD'/.test(amount), 'fixed $ fallback');

console.log(`\n${failures === 0 ? 'All engine compliance checks passed.' : `${failures} engine compliance check(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
