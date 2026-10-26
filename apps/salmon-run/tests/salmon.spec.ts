import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const fixtures = JSON.parse(
	fs.readFileSync(new URL('../../../math/salmon-run/fixtures.json', import.meta.url), 'utf8'),
);
const baseWin = fixtures['base:win'],
	baseLoss = fixtures['base:loss'],
	river = fixtures['river:feature'];
async function boot(
	page: Page,
	options: {
		book?: any;
		currency?: string;
		defaultAmount?: number;
		balance?: number;
		resume?: boolean;
		cursor?: number;
		replay?: boolean;
		mode?: string;
		restricted?: boolean;
		query?: string;
		gate?: Promise<void>;
		serverMax?: number;
		corruptActive?: boolean;
		expectError?: string;
	} = {},
) {
	const calls: { path: string; body: any }[] = [],
		errors: string[] = [],
		external: string[] = [];
	const currency = options.currency ?? 'USD',
		amount = options.defaultAmount ?? 100000;
	let balance = options.balance ?? 1000000000,
		active: any = null;
	const round = (book: any, mode: string) => ({
		roundID: 1,
		amount,
		mode,
		state: book.events,
		payoutMultiplier: book.payoutMultiplier / 100,
		payout: Math.round((amount * book.payoutMultiplier) / 100),
		active: book.payoutMultiplier > 0,
		event: String(options.cursor ?? 0),
	});
	if (options.resume) active = round(options.book ?? river, options.mode ?? 'river');
	if (options.corruptActive) active.payoutMultiplier += 1;
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(m.text());
	});
	page.on('request', (r) => {
		if (!r.url().startsWith('http://127.0.0.1:4174') && !r.url().startsWith('https://rgs.invalid/'))
			external.push(r.url());
	});
	await page.route('https://rgs.invalid/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		const body = route.request().postDataJSON();
		calls.push({ path, body });
		let data: any;
		if (path === '/wallet/authenticate')
			data = {
				balance: { amount: balance, currency },
				config: {
					minBet: 10000,
					maxBet: Math.max(amount * 2, 2000000),
					stepBet: 10000,
					defaultBetLevel: amount,
					betLevels: [
						...new Set([10000, 50000, amount, 500000, 1000000, Math.max(amount * 2, 2000000)]),
					].sort((a, b) => a - b),
					gameModes: {
						base: { costMultiplier: 1, maxBet: options.serverMax ?? Math.max(amount * 2, 2000000) },
						river: { costMultiplier: 20, maxBet: Math.max(amount, 1000000) },
					},
					jurisdiction: {
						socialCasino: currency.startsWith('X'),
						...(options.restricted
							? {
									disabledSpacebar: true,
									disabledTurbo: true,
									disabledSlamstop: true,
									disabledBuyFeature: true,
								}
							: {}),
					},
				},
				...(active ? { round: active } : {}),
			};
		else if (path === '/wallet/play') {
			await options.gate;
			expect(active).toBeNull();
			const mode = body.mode,
				cost = mode === 'river' ? 20 : 1;
			expect(body.amount).toBe(amount);
			balance -= body.amount * cost;
			const selected = options.book ?? (mode === 'river' ? river : baseLoss);
			const result = { ...round(selected, mode), amount: body.amount };
			active = result.active ? result : null;
			data = { balance: { amount: balance, currency }, round: result };
		} else if (path === '/bet/event') {
			expect(active).not.toBeNull();
			active.event = body.event;
			data = { event: body.event };
		} else if (path === '/wallet/end-round') {
			expect(active).not.toBeNull();
			balance += active.payout;
			active = null;
			data = { balance: { amount: balance, currency } };
		} else if (path.startsWith('/bet/replay/')) {
			const selected = options.book ?? baseWin;
			data = {
				state: selected.events,
				payoutMultiplier: selected.payoutMultiplier / 100,
				costMultiplier: options.mode === 'river' ? 20 : 1,
			};
		} else throw new Error('Unexpected endpoint ' + path);
		await route.fulfill({ json: data });
	});
	const query = options.replay
		? `replay=true&game=nosytlabs_salmon_run&version=development-2&mode=${options.mode ?? 'base'}&event=1&amount=${amount}`
		: 'sessionID=fixture';
	await page.goto(`/?rgs_url=rgs.invalid&${query}&currency=${currency}${options.query ?? ''}`);
	if (options.expectError) {
		await expect(page.getByRole('alert')).toContainText(options.expectError);
		return { calls, errors, external };
	}
	await expect(page.locator('.startup.error')).toHaveCount(0);
	await expect(
		page.getByRole('button', {
			name: options.replay ? 'Play replay' : options.resume ? 'Finish animation' : 'Spin',
			exact: true,
		}),
	).toBeVisible({ timeout: 15000 });
	return { calls, errors, external };
}
async function completeRun(page: Page) {
	const entry = page.getByRole('button', { name: 'Start River Run' });
	if (await entry.isVisible()) await entry.click();
	await expect(page.getByRole('button', { name: 'Return to the river' })).toBeVisible({
		timeout: 45000,
	});
	await page.getByRole('button', { name: 'Return to the river' }).click();
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled({
		timeout: 10000,
	});
}
for (const [width, height] of [
	[1280, 720],
	[1024, 576],
	[800, 450],
	[425, 812],
	[400, 225],
])
	test(`art, responsive reel geometry and 44px controls fit ${width}x${height}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height });
		const s = await boot(page);
		for (const selector of ['.board-frame', '.controls', '.river-track', 'h1']) {
			const b = await page.locator(selector).boundingBox();
			expect(b).not.toBeNull();
			expect(b!.x).toBeGreaterThanOrEqual(0);
			expect(b!.y).toBeGreaterThanOrEqual(0);
			expect(b!.x + b!.width).toBeLessThanOrEqual(width + 1);
			expect(b!.y + b!.height).toBeLessThanOrEqual(height + 1);
		}
		const frame = await page.locator('.board-frame').boundingBox();
		expect(frame!.width / frame!.height).toBeCloseTo(
			width <= 550 && height >= 500 ? 1.25 : 5 / 3,
			1,
		);
		for (const selector of [
			'.menu-button',
			'.sound-toggle',
			'.cast-button',
			'.run-preview',
			'select',
		]) {
			const b = await page.locator(selector).boundingBox();
			expect(b!.width).toBeGreaterThanOrEqual(44);
			expect(b!.height).toBeGreaterThanOrEqual(44);
			expect(b!.x + b!.width).toBeLessThanOrEqual(width + 1);
			expect(b!.y + b!.height).toBeLessThanOrEqual(height + 1);
		}
		expect(
			await page
				.locator('.reel-symbol img')
				.evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth === 512)),
		).toBe(true);
		expect(await page.evaluate(() => document.fonts.check('800 32px "River Display"'))).toBe(true);
		await page.screenshot({ path: info.outputPath(`salmon-v2-${width}x${height}.png`) });
		expect(s.errors).toEqual([]);
		expect(s.external).toEqual([]);
	});
test('real vertical strips travel multiple rows, stop in order and settle one wallet award', async ({
	page,
}, info) => {
	const s = await boot(page, { book: baseWin });
	await page.getByRole('button', { name: 'Spin', exact: true }).click();
	await page.waitForTimeout(350);
	const motion = await page.locator('.reel-strip').evaluateAll((nodes) =>
		nodes.map((n) => ({
			y: new DOMMatrix(getComputedStyle(n).transform).m42,
			height: n.getBoundingClientRect().height,
			parent: n.parentElement!.getBoundingClientRect().height,
		})),
	);
	for (const reel of motion) {
		expect(Math.abs(reel.y)).toBeGreaterThan(reel.height / 3);
		expect(Math.abs(reel.y)).toBeLessThan(reel.height * 11);
		expect(reel.height).toBeCloseTo(reel.parent, 0);
	}
	await page.screenshot({ path: info.outputPath('salmon-v2-reel-motion.png') });
	await page.waitForFunction(() => {
		const reels = [...document.querySelectorAll('.reel-column')];
		return (
			!reels[0].classList.contains('running') && reels.some((r) => r.classList.contains('running'))
		);
	});
	const moving = await page
		.locator('.reel-column')
		.evaluateAll((nodes) => nodes.map((n) => n.classList.contains('running')));
	const first = moving.indexOf(true);
	expect(moving.slice(first).every(Boolean)).toBe(true);
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled({
		timeout: 15000,
	});
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(1);
	expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});
test('a zero-result spin makes no progress or settlement request', async ({ page }) => {
	const s = await boot(page, { book: baseLoss });
	await page.getByRole('button', { name: 'Spin', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled();
	expect(
		s.calls.filter((c) => c.path === '/wallet/end-round' || c.path === '/bet/event'),
	).toHaveLength(0);
	expect(s.errors).toEqual([]);
});
test('River Run confirms twenty times the amount, plays actual event books and settles once', async ({
	page,
}, info) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const s = await boot(page);
	await page.getByRole('button', { name: 'RIVER RUN', exact: false }).click();
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await expect(page.getByRole('dialog')).toContainText('$2.00');
	await page.getByRole('button', { name: 'Confirm River Run' }).click();
	await expect(page.getByRole('button', { name: 'Start River Run' })).toBeVisible();
	await page.getByRole('button', { name: 'Start River Run' }).click();
	await expect(page.getByRole('button', { name: 'Return to the river' })).toBeVisible({
		timeout: 45000,
	});
	await page.screenshot({ path: info.outputPath('salmon-v2-feature-complete.png') });
	await page.getByRole('button', { name: 'Return to the river' }).click();
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled();
	const call = s.calls.find((c) => c.path === '/wallet/play')!;
	expect(call.body).toMatchObject({ mode: 'river', amount: 100000 });
	expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});
test('mid-feature recovery restores progress without another entry or debit', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const book = fixtures['base:retrigger'];
	const cursor = book.events.find((e: any) => e.type === 'freeSpinRetrigger').index + 1;
	const s = await boot(page, { book, resume: true, cursor, mode: 'base' });
	await expect(page.getByRole('button', { name: 'Start River Run' })).toHaveCount(0);
	await completeRun(page);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});
test('replay uses only its endpoint, displays cost and can play again at 400x225', async ({
	page,
}) => {
	await page.setViewportSize({ width: 400, height: 225 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const s = await boot(page, { replay: true, currency: 'XSC', query: '&social=true' });
	await expect(page.locator('.replay-details')).toContainText('TOTAL PLAY 0.10 SC');
	for (let i = 0; i < 2; i++) {
		await page.getByRole('button', { name: 'Play replay' }).click();
		await expect(page.getByRole('button', { name: 'Play replay' })).toBeEnabled({ timeout: 15000 });
	}
	expect(
		s.calls.filter((c) => c.path.startsWith('/wallet/') || c.path === '/bet/event'),
	).toHaveLength(0);
	expect(s.calls.filter((c) => c.path.startsWith('/bet/replay/'))).toHaveLength(1);
	expect(s.errors).toEqual([]);
});
test('restricted controls and modal input cannot send an extra play', async ({ page }) => {
	const s = await boot(page, { restricted: true });
	await page.keyboard.press('Space');
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await expect(page.locator('.run-preview')).toHaveCount(0);
	await page.getByRole('button', { name: 'Open field guide' }).click();
	await page.keyboard.press('Space');
	await expect(page.getByRole('checkbox', { name: 'Fast reels' })).toBeDisabled();
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	expect(s.errors).toEqual([]);
});
test('mute is available during motion and in feature prompts', async ({ page }) => {
	const s = await boot(page);
	await page.getByRole('button', { name: 'Spin', exact: true }).click();
	await page.locator('.sound-toggle').click();
	await expect(page.locator('.sound-toggle')).toHaveAttribute('aria-label', 'Enable sound');
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled();
	await page.getByRole('button', { name: 'RIVER RUN', exact: false }).click();
	await expect(page.locator('.dialog-sound')).toHaveAttribute('aria-label', 'Enable sound');
	await page.locator('.dialog-sound').click();
	await expect(page.locator('.dialog-sound')).toHaveAttribute('aria-label', 'Mute all sound');
	expect(s.errors).toEqual([]);
});
test('zero balance prevents pointer and keyboard play with an explanation', async ({ page }) => {
	const s = await boot(page, { balance: 0 });
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeDisabled();
	await expect(page.locator('.funds-message')).toBeVisible();
	await page.keyboard.press('Space');
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	expect(s.errors).toEqual([]);
});
for (const [currency, amount, text] of [
	['JPY', 10000000, '¥10'],
	['XSC', 100000, '0.10 SC'],
	['XGC', 100000, '0.10 GC'],
	['CAD', 100000, 'CA$0.10'],
	['MXN', 100000, 'MX$0.10'],
])
	test(`dynamic ${currency} amounts and readable native formatting`, async ({ page }) => {
		const s = await boot(page, {
			currency,
			defaultAmount: Number(amount),
			query: currency.startsWith('X') ? '&social=true' : '',
		});
		await expect(page.getByRole('combobox', { name: 'Play amount' })).toHaveValue(String(amount));
		await expect(page.locator('select option:checked')).toHaveText(String(text));
		await page.getByRole('button', { name: 'Spin', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled();
		expect(s.calls.find((c) => c.path === '/wallet/play')!.body.amount).toBe(amount);
		expect(s.errors).toEqual([]);
	});
test('social rules describe matching math without restricted wording', async ({ page }) => {
	const s = await boot(page, { currency: 'XSC', query: '&social=true' });
	await page.getByRole('button', { name: 'Open field guide' }).click();
	const text = await page.getByRole('dialog').innerText();
	expect(text).toContain('96.50%');
	expect(text).toContain('155.6×');
	expect(text).toContain('Remote Game Server');
	expect(text).not.toMatch(
		/\b(bet|bets|buy|cash|credit|currency|fund|gamble|money|paid|pay|pays|purchase|stake|wager|withdraw)\b/i,
	);
	expect(s.errors).toEqual([]);
});

test('invalid RGS reports failure without a fallback destination', async ({ page }) => {
	const requests: string[] = [];
	page.on('request', (r) => {
		if (!r.url().startsWith('http://127.0.0.1:4174')) requests.push(r.url());
	});
	await page.route('https://example.com/**', (route) =>
		route.fulfill({ status: 400, json: { error: 'ERR_VAL', message: 'invalid request' } }),
	);
	await page.goto('/?rgs_url=example.com&sessionID=invalid');
	await expect(page.getByRole('alert')).toContainText('session or selected amount');
	expect(requests).toEqual(['https://example.com/wallet/authenticate']);
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toHaveCount(0);
});
test('missing replay data has a readable error and no wallet traffic', async ({ page }) => {
	const requests: string[] = [];
	page.on('request', (r) => {
		if (r.url().startsWith('https://rgs.invalid/')) requests.push(r.url());
	});
	await page.route('https://rgs.invalid/**', (route) => route.fulfill({ status: 404, body: '' }));
	await page.goto('/?rgs_url=rgs.invalid&replay=true&game=unknown&version=1&mode=base&event=1');
	await expect(page.getByRole('alert')).toContainText('Replay could not be loaded');
	expect(requests.every((url) => url.includes('/bet/replay/'))).toBe(true);
});

test('base mode limit blocks pointer and keyboard play before a request', async ({ page }) => {
	const s = await boot(page, { defaultAmount: 500000, serverMax: 100000 });
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeDisabled();
	await expect(page.locator('.funds-message')).toContainText('session limit');
	await page.keyboard.press('Space');
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await page.getByRole('combobox', { name: 'Play amount' }).selectOption('10000');
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled();
	expect(s.errors).toEqual([]);
});
test('a mismatched recovered book fails before playback or settlement', async ({ page }) => {
	const s = await boot(page, {
		resume: true,
		corruptActive: true,
		expectError: 'Round values do not match',
	});
	expect(s.calls.map((c) => c.path)).toEqual(['/wallet/authenticate']);
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toHaveCount(0);
	expect(s.errors).toEqual([]);
});

test('reels move while waiting for the server without choosing an outcome', async ({ page }) => {
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	const s = await boot(page, { gate });
	await page.getByRole('button', { name: 'Spin', exact: true }).click();
	await page.waitForTimeout(250);
	expect(await page.locator('.reel-column.running').count()).toBe(5);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(1);
	const y = await page
		.locator('.reel-strip')
		.first()
		.evaluate((n) => new DOMMatrix(getComputedStyle(n).transform).m42);
	expect(Math.abs(y)).toBeGreaterThan(10);
	await page.getByRole('button', { name: 'Finish animation' }).click();
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(1);
	release();
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled();
	expect(s.errors).toEqual([]);
});

test('River Run shows value collection, advances to 3x and settles the complete book', async ({
	page,
}, info) => {
	const book = fixtures['river:retrigger'];
	const s = await boot(page, { book });
	await page.getByRole('button', { name: 'RIVER RUN', exact: false }).click();
	await page.getByRole('button', { name: 'Confirm River Run' }).click();
	await page.getByRole('button', { name: 'Start River Run' }).click();
	await expect(page.locator('.collection-layer')).toBeVisible({ timeout: 20000 });
	const first = book.events.find((e: any) => e.type === 'collectFish');
	expect(await page.locator('.catch-token').count()).toBe(first.positions.length);
	await page.waitForTimeout(180);
	await page.screenshot({ path: info.outputPath('salmon-v3-collection.png') });
	await expect(page.locator('.stage-track .active')).toContainText('3×', { timeout: 45000 });
	await expect(page.getByRole('button', { name: 'Return to the river' })).toBeVisible({
		timeout: 45000,
	});
	await expect(page.getByTestId('run-total')).toContainText('8 SILVER FISH');
	await page.getByRole('button', { name: 'Return to the river' }).click();
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled();
	expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});
