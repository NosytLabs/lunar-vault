import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const games = ['lunar-vault', 'salmon-run'];
const independentChecks = [
	'matchedMath',
	'engineStaging',
	'activeRoundRecovery',
	'replay',
	'jurisdiction',
	'assetRights',
	'studioMedia',
	'engineApproval',
];
const args = process.argv.slice(2);
if (args.includes('--help')) {
	console.log(
		'Usage: node tools/release-gate.mjs [--local] [--manifest PATH] [--evidence PATH]\n\n--local checks both builds, exact publication math, assets, packaged byte identities and version-bound local browser evidence.\nDefault additionally requires eight independently reviewed Engine/human gates for each game.\nDefault manifest: ../release-20261028/release-manifest.json\nDefault evidence: docs/release-evidence.json',
	);
	process.exit(0);
}
const option = (name, fallback) => {
	const index = args.indexOf(name);
	if (index < 0) return fallback;
	if (!args[index + 1] || args[index + 1].startsWith('--'))
		throw new Error(`${name} requires a path.`);
	return path.resolve(process.cwd(), args[index + 1]);
};
for (let index = 0; index < args.length; index++) {
	if (args[index] === '--local') continue;
	if (
		['--manifest', '--evidence'].includes(args[index]) &&
		args[index + 1] &&
		!args[index + 1].startsWith('--')
	) {
		index++;
		continue;
	}
	console.error(`Unknown or incomplete argument: ${args[index]}`);
	process.exit(2);
}
const local = args.includes('--local');
const manifestFile = option(
	'--manifest',
	path.join(root, '../release-20261028/release-manifest.json'),
);
const evidenceFile = option('--evidence', path.join(root, 'docs/release-evidence.json'));
const problems = [];
const read = (file, label) => {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8'));
	} catch (error) {
		problems.push(`${label} is missing or invalid: ${file} (${error.message}).`);
		return null;
	}
};
const sha = (file) => {
	const digest = crypto.createHash('sha256');
	const descriptor = fs.openSync(file, 'r');
	try {
		const buffer = Buffer.alloc(1024 * 1024);
		let bytes;
		while ((bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null)))
			digest.update(buffer.subarray(0, bytes));
		return digest.digest('hex');
	} finally {
		fs.closeSync(descriptor);
	}
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const nonempty = (value) => typeof value === 'string' && Boolean(value.trim());

// These are read-only local checks; they do not manufacture an approval record.
const validation = spawnSync(
	process.env.PYTHON ?? 'python3',
	[
		path.join(root, 'tools/package-release.py'),
		'--check',
		'--json',
		...(fs.existsSync(manifestFile) ? ['--verify-manifest', manifestFile] : []),
	],
	{ cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
);
let current;
if (validation.status !== 0)
	problems.push(
		`Current build/math/asset validation failed: ${(validation.stderr || validation.stdout || validation.error?.message || 'validator failed').trim()}`,
	);
else {
	try {
		current = JSON.parse(validation.stdout);
	} catch {
		problems.push('Local validator returned invalid JSON.');
	}
}
const manifest = read(manifestFile, 'Release manifest');
const evidence = read(evidenceFile, 'Release evidence');
if (manifest && manifest.schemaVersion !== 2)
	problems.push(
		'Release manifest must have schemaVersion 2; regenerate with tools/package-release.py.',
	);
if (evidence && evidence.schemaVersion !== 2)
	problems.push(
		'Release evidence must have schemaVersion 2 with separate games; see docs/release-schema-v2.md.',
	);
if (
	manifest &&
	current &&
	manifest.sharedSource?.directorySha256 !== current.sharedSource?.directorySha256
)
	problems.push('Shared source changed after packaging; rebuild, reverify and repackage.');

function checkReport(item, prefix, browser = false) {
	if (!nonempty(item?.report)) {
		problems.push(`${prefix}: report reference is missing.`);
		return;
	}
	if (/^https:\/\//.test(item.report)) {
		if (browser) problems.push(`${prefix}: local browser report must be a readable local file.`);
		return;
	}
	const file = path.resolve(root, item.report);
	try {
		if (!fs.statSync(file).isFile()) throw new Error('not a file');
		if (item.reportSha256 && (!validHash(item.reportSha256) || sha(file) !== item.reportSha256))
			problems.push(`${prefix}: report hash mismatch.`);
	} catch {
		problems.push(`${prefix}: report file is missing: ${item.report}.`);
	}
}
function checkEvidence(item, prefix, expected, independent = false) {
	if (item?.status !== 'verified') {
		problems.push(
			`${prefix}: missing ${independent ? 'independent, version-bound evidence' : 'version-bound local browser evidence'}.`,
		);
		return;
	}
	if (!nonempty(item.reviewer)) problems.push(`${prefix}: named reviewer is missing.`);
	if (independent && item?.independent !== true)
		problems.push(`${prefix}: independent review is not recorded.`);
	for (const key of ['frontendSha256', 'mathSha256'])
		if (!validHash(item?.[key]) || item[key] !== expected?.[key])
			problems.push(`${prefix}: ${key} does not match the packaged version.`);
	checkReport(item, prefix, !independent);
}
for (const game of games) {
	const packaged = manifest?.games?.[game];
	const fresh = current?.games?.[game];
	const record = evidence?.games?.[game];
	if (!packaged) {
		problems.push(`${game}: game is missing from the release manifest.`);
		continue;
	}
	if (fresh) {
		if (packaged.source?.directorySha256 !== fresh.source?.directorySha256)
			problems.push(`${game}: app source changed after packaging; rebuild and reverify.`);
		for (const kind of ['frontend', 'math', 'media'])
			if (
				!same(packaged[kind]?.files, fresh[kind]?.files) ||
				packaged[kind]?.directorySha256 !== fresh[kind]?.directorySha256
			)
				problems.push(`${game}: current ${kind} bytes differ from the packaged directory.`);
		if (!same(packaged.math?.reports, fresh.math?.reports))
			problems.push(`${game}: math config/report/verifier changed after packaging.`);
	}
	for (const kind of ['frontend', 'math', 'media']) {
		const archive = packaged[kind]?.archive;
		if (
			!archive ||
			!nonempty(archive.file) ||
			path.basename(archive.file) !== archive.file ||
			!validHash(archive.sha256)
		) {
			problems.push(`${game}: invalid ${kind} archive record.`);
			continue;
		}
		const file = path.join(path.dirname(manifestFile), archive.file);
		try {
			const stat = fs.lstatSync(file);
			if (
				!stat.isFile() ||
				stat.isSymbolicLink() ||
				stat.size !== archive.bytes ||
				sha(file) !== archive.sha256
			)
				problems.push(`${game}: ${kind} archive bytes/hash mismatch.`);
		} catch {
			problems.push(`${game}: ${kind} archive is missing.`);
		}
	}
	const expected = {
		frontendSha256: packaged.frontend?.archive?.sha256,
		mathSha256: packaged.math?.archive?.sha256,
	};
	for (const key of Object.keys(expected))
		if (
			!validHash(record?.[key]) ||
			record[key] !== expected[key] ||
			packaged[key] !== expected[key]
		)
			problems.push(`${game}: top-level ${key} is missing or differs from the package.`);
	const browser = record?.local?.browser;
	checkEvidence(browser, `${game}/local.browser`, expected);
	if (
		!Number.isSafeInteger(browser?.results?.passed) ||
		browser.results.passed < 1 ||
		browser.results.failed !== 0
	)
		problems.push(`${game}/local.browser: positive passed count and zero failures are required.`);
	for (const size of ['400x225', '800x450', '1024x576', '425x812'])
		if (!browser?.viewports?.includes(size))
			problems.push(`${game}/local.browser: missing after-play viewport evidence ${size}.`);
	if (browser?.touch !== true)
		problems.push(`${game}/local.browser: touch-enabled playback evidence is missing.`);
	if (!local)
		for (const key of independentChecks)
			checkEvidence(record?.checks?.[key], `${game}/${key}`, expected, true);
}
console.log(
	`${local ? 'Local release consistency' : 'Independent release evidence'}: ${problems.length ? 'BLOCKED' : 'RECORDS PRESENT'} (${games.join(', ')})`,
);
for (const problem of problems) console.log(` - ${problem}`);
console.log(
	local
		? 'A local pass checks packaged consistency and recorded browser evidence only. It does not clear Engine/human approval gates.'
		: 'Records do not certify math, establish asset rights or legal compliance, grant Engine/Stake approval, or authorize deployment. Verify external records with their issuers.',
);
if (problems.length) process.exitCode = 1;
