import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const app = path.join(root, 'apps/lunar-vault');
const problems = [];
const config = fs.readFileSync(path.join(app, 'src/game/config.ts'), 'utf8');
const rates = [...config.matchAll(/\brtp:\s*([\d.]+)/g)].map((m) => Number(m[1]));
if (!rates.length || rates.some((rate) => rate < 0.96 || rate > 0.967))
	problems.push(
		'Sample RTP metadata is outside 96.0–96.7%. Editing the number cannot validate or certify math.',
	);
if (!fs.existsSync(path.join(root, 'math/publish_files/index.json')))
	problems.push(
		'No matching Engine math publish index. File presence alone would NOT establish certification.',
	);
const assets = fs.readFileSync(path.join(app, 'src/game/assets.ts'), 'utf8');
if (/assets\/(spines|sprites|fonts)\//.test(assets))
	problems.push('Inherited sample media is still registered.');
const audio = JSON.parse(
	fs.readFileSync(path.join(app, 'static/assets/audio/sounds.json'), 'utf8'),
);
if (audio.src?.length !== 1 || audio.src[0] !== './assets/audio/nosyt-sprite.wav')
	problems.push('Original sound sprite is not configured.');
// Human-reviewed evidence records, not self-issued certificates. Local tests cannot clear them.
const evidence = JSON.parse(fs.readFileSync(path.join(root, 'docs/release-evidence.json'), 'utf8'));
for (const key of [
	'matchedMath',
	'engineStaging',
	'activeRoundRecovery',
	'replay',
	'jurisdiction',
	'assetRights',
	'studioMedia',
	'engineApproval',
]) {
	const item = evidence.checks[key];
	if (
		item?.status !== 'verified' ||
		!item.report ||
		!item.reviewer ||
		!/^[a-f0-9]{64}$/.test(item.frontendSha256 ?? '') ||
		!/^[a-f0-9]{64}$/.test(item.mathSha256 ?? '')
	) {
		problems.push(`Missing independent, version-bound evidence: ${key}.`);
	}
}
console.log(
	`Lunar Vault submission evidence: ${problems.length ? 'BLOCKED' : 'RECORDS PRESENT — verify with Engine'}`,
);
for (const problem of problems) console.log(` - ${problem}`);
console.log(
	'This check does not certify math, establish legal compliance, grant approval, or authorize deployment.',
);
if (problems.length) process.exitCode = 1;
