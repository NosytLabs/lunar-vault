import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../node_modules/vite/dist/node/index.js';
import { createServer as createHttpServer } from 'node:http';
const server = await createServer({
	root: new URL('..', import.meta.url).pathname,
	server: { middlewareMode: true, hmr: { server: createHttpServer() } },
	appType: 'custom',
});
const originalFetch = globalThis.fetch;
after(async () => {
	globalThis.fetch = originalFetch;
	await server.close();
});
const { EngineSession } = await server.ssrLoadModule('/src/engine.ts');
const auth = (gameModes) => ({
	balance: { amount: 10000000, currency: 'USD' },
	config: {
		minBet: 10000,
		maxBet: 1000000,
		stepBet: 10000,
		defaultBetLevel: 100000,
		betLevels: [10000, 100000, 1000000],
		jurisdiction: {},
		gameModes,
	},
});
const modes = [
	{ mode: 'BASE', costMultiplier: 1, maxBet: 1000000 },
	{ mode: 'RIVER', costMultiplier: 20, maxBet: 50000 },
];
const respond = (data) => {
	globalThis.fetch = async () =>
		new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
};

test('documented mode array becomes validated canonical configuration retaining request spelling', async () => {
	respond(auth(modes));
	const data = await new EngineSession('?rgs_url=rgs.invalid&sessionID=fixture').authenticate();
	assert.deepEqual(data.config.gameModes.river, modes[1]);
});
test('mismatched documented mode cost fails before exposing a playable session', async () => {
	respond(auth([{ ...modes[0] }, { ...modes[1], costMultiplier: 2 }]));
	await assert.rejects(
		() => new EngineSession('?rgs_url=rgs.invalid&sessionID=fixture').authenticate(),
		/mode configuration/,
	);
});
test('a base-only playable subset does not grant a feature configuration', async () => {
	respond(auth([modes[0]]));
	const data = await new EngineSession('?rgs_url=rgs.invalid&sessionID=fixture').authenticate();
	assert.deepEqual(data.config.gameModes.base, modes[0]);
	assert.equal(Object.hasOwn(data.config.gameModes, 'river'), false);
});
test('a session without the required base mode fails visibly', async () => {
	respond(auth([modes[1]]));
	await assert.rejects(
		() => new EngineSession('?rgs_url=rgs.invalid&sessionID=fixture').authenticate(),
		/mode configuration/,
	);
});
test('invalid payout multipliers cannot pass round reconciliation as NaN', async () => {
	const { validateRound } = await server.ssrLoadModule('/src/engine.ts');
	assert.throws(
		() =>
			validateRound({
				amount: 100000,
				mode: 'base',
				active: true,
				state: [{ index: 0, type: 'finalWin', amount: 100 }],
				payoutMultiplier: Number.NaN,
			}),
		/Round values/,
	);
});
test('replay without authoritative cost fails without wallet traffic', async () => {
	respond({ state: [{ index: 0, type: 'finalWin', amount: 0 }], payoutMultiplier: 0 });
	await assert.rejects(
		() => new EngineSession('?rgs_url=rgs.invalid&replay=true&mode=river').loadReplay(),
		/Replay mode values/,
	);
});
test('positive undocumented jurisdiction pacing fails clearly before play', async () => {
	const data = auth(modes);
	data.config.jurisdiction.minimumRoundDuration = 2;
	respond(data);
	await assert.rejects(
		() => new EngineSession('?rgs_url=rgs.invalid&sessionID=fixture').authenticate(),
		/timing requirement/,
	);
});
test('malformed wallet balances are rejected before presentation', async () => {
	const data = auth(modes);
	data.balance.amount = -1;
	respond(data);
	await assert.rejects(
		() => new EngineSession('?rgs_url=rgs.invalid&sessionID=fixture').authenticate(),
		/balance/,
	);
});
test('invalid active checkpoints fail instead of skipping the supplied presentation', async () => {
	const fixtures = JSON.parse(
		await (
			await import('node:fs/promises')
		).readFile(new URL('../../../math/salmon-run/fixtures.json', import.meta.url), 'utf8'),
	);
	const book = fixtures['base:win'];
	const { validateRound } = await server.ssrLoadModule('/src/engine.ts');
	for (const event of ['-1', '1.5', String(book.events.length + 1), '']) {
		assert.throws(
			() =>
				validateRound({
					amount: 100000,
					mode: 'base',
					active: true,
					event,
					state: book.events,
					payoutMultiplier: book.payoutMultiplier / 100,
				}),
			/checkpoint/,
		);
	}
});
test('malformed indexed events return a readable validation error', async () => {
	const { validateRound } = await server.ssrLoadModule('/src/engine.ts');
	assert.throws(
		() =>
			validateRound({
				amount: 100000,
				mode: 'base',
				active: true,
				state: [null, { index: 1, type: 'finalWin', amount: 0 }],
				payoutMultiplier: 0,
			}),
		/Round event order is invalid/,
	);
});
test('a malformed amount array returns a readable configuration error', async () => {
	const data = auth(modes);
	data.config.betLevels = '100000';
	respond(data);
	await assert.rejects(
		() => new EngineSession('?rgs_url=rgs.invalid&sessionID=fixture').authenticate(),
		/invalid amount configuration/,
	);
});
