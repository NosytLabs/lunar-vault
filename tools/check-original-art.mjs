import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const app = path.join(root, 'apps/lunar-vault');
const get = (p) => fs.readFileSync(path.join(app, p), 'utf8');
const assets = get('src/game/assets.ts');
const symbolMap = get('src/game/constants.ts');
const colors = ['H1', 'H2', 'H3', 'H4', 'H5', 'L1', 'L2', 'L3', 'L4', 'L5', 'W', 'S'];
const extras = [
	'observatory',
	'observatory-feature',
	'reel-frame',
	'win-aura',
	'logo',
	'orbital-seal',
	'star-flare',
	'reel-frame-v2',
	'spin-orbit',
];
const failures = [];
for (const name of extras) {
	const file = path.join(app, 'static/assets/nosyt', name + '.svg');
	if (!fs.existsSync(file)) failures.push('Missing ' + file);
	else {
		const source = fs.readFileSync(file, 'utf8');
		if (!source.startsWith('<svg ') || !source.includes('</svg>'))
			failures.push('Malformed SVG skeleton: ' + file);
		if (source.includes('http://') && !source.includes('http://www.w3.org/2000/svg'))
			failures.push('Unexpected remote ref: ' + file);
	}
}
for (const symbol of colors) {
	const sprite = path.join(app, 'static/assets/nosyt/sprites', symbol.toLowerCase() + '.webp');
	if (!fs.existsSync(sprite) || fs.statSync(sprite).size < 1000)
		failures.push('Missing original raster sprite ' + symbol);
	if (!assets.includes('lunar' + symbol + ':')) failures.push('Asset manifest missing ' + symbol);
	if (
		!new RegExp(`${symbol}:\\s*\\{\\s*explosion,\\s*static: icon\\('lunar${symbol}'\\)`).test(
			symbolMap,
		)
	)
		failures.push('Symbol map lacks original art for ' + symbol);
}
const expectedPaths = [
	'src/components/Background.svelte',
	'src/components/LoadingScreen.svelte',
	'src/components/WinAnimation.svelte',
];
for (const p of expectedPaths)
	if (!get(p).includes('lunar')) failures.push('Sample artwork has not been replaced in ' + p);
if (get('src/routes/+layout.svelte').includes('<LoaderStakeEngine'))
	failures.push('Forbidden SDK-branded loader still mounted.');
if (get('src/components/Game.svelte').includes('ADD YOUR LOGO'))
	failures.push('Unbranded logo placeholder still visible.');
const audioManifest = JSON.parse(get('static/assets/audio/sounds.json'));
const localAudio = path.join(app, 'static/assets/audio/nosyt-sprite.wav');
if (audioManifest.src?.length !== 1 || audioManifest.src[0] !== './assets/audio/nosyt-sprite.wav') {
	failures.push('Game must use one locally generated original sound sprite.');
}
if (!fs.existsSync(localAudio) || fs.statSync(localAudio).size < 60_000) {
	failures.push('Original WAV is missing/too short; run python3 tools/generate-audio.py first.');
}
for (const old of ['sounds.ogg', 'sounds.mp3', 'sounds.m4a', 'sounds.ac3']) {
	if (fs.existsSync(path.join(app, 'static/assets/audio', old)))
		failures.push('Inherited sample audio found: ' + old);
}
const appShell = get('src/app.html');
if (appShell.includes('use.typekit.net'))
	failures.push('External Adobe Typekit stylesheet violates Engine static rules.');
if (!appShell.includes('user-scalable=no'))
	failures.push('Mobile viewport does not suppress double-tap zoom.');
if (!fs.existsSync(path.join(app, 'static/assets/nosyt/observatory-painted.webp')))
	failures.push('Missing painted observatory');
if (/assets\/(spines|sprites|fonts)\//.test(assets))
	failures.push('Legacy sample assets remain registered');
if (failures.length) {
	console.error(failures.join('\n'));
	process.exitCode = 1;
} else
	console.log(
		`Original art smoke check passed: ${extras.length} SVG ornaments, painted environment and 12 original raster symbols, original audio, bundled fonts, mobile viewport and no SDK splash.`,
	);
