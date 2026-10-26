import { test, expect, type Page } from '@playwright/test';
import books from '../apps/lunar-vault/src/stories/data/base_books';
import bonusBooks from '../apps/lunar-vault/src/stories/data/bonus_books';

// Local HTTP fixtures exercise the real production frontend and SDK state machine.
// They do NOT validate an Engine deployment, certify math, or prove jurisdiction compliance.
const loss = books.find((b) => b.payoutMultiplier === 0)!;
const win = books.find(
	(b) => b.payoutMultiplier > 0 && b.events.filter((e) => e.type === 'reveal').length === 1,
)!;
type Fixture = typeof loss;

async function renderedText(page: Page) {
	return page.evaluate(() => {
		const result: {
			text: string;
			x: number;
			y: number;
			width: number;
			height: number;
			disabled: boolean;
		}[] = [];
		const walk = (n: any, visible: boolean, disabled = false) => {
			visible = visible && n.visible !== false && n.alpha > 0.02;
			disabled = disabled || n.cursor === 'not-allowed' || n.eventMode === 'none';
			if (!visible) return;
			if (typeof n.text === 'string' && n.text) {
				const b = n.getBounds();
				result.push({ text: n.text, x: b.x, y: b.y, width: b.width, height: b.height, disabled });
			}
			n.children?.forEach((c: any) => walk(c, visible, disabled));
		};
		const app = (window as any).__testPixi;
		if (app?.stage) walk(app.stage, true);
		for (const element of document.querySelectorAll(
			'.mini-controls button,.mini-controls span,.mini-controls b',
		)) {
			const box = element.getBoundingClientRect();
			if (box.width && box.height)
				result.push({
					text: element.textContent!.replace(/\s+/g, ' ').trim(),
					x: box.x,
					y: box.y,
					width: box.width,
					height: box.height,
					disabled: Boolean((element.closest('button') as HTMLButtonElement)?.disabled),
				});
		}
		return result;
	});
}

async function textNode(page: Page, text: string) {
	await expect
		.poll(async () => (await renderedText(page)).some((n) => n.text === text), { timeout: 15000 })
		.toBe(true);
	return (await renderedText(page)).find((n) => n.text === text)!;
}
async function clickText(page: Page, text: string) {
	const n = await textNode(page, text);
	await page.mouse.click(n.x + n.width / 2, n.y + n.height / 2);
}

async function session(
	page: Page,
	options: {
		book?: Fixture;
		jurisdiction?: Record<string, boolean>;
		currency?: string;
		query?: string;
		resume?: boolean;
		replay?: boolean;
		playGate?: Promise<void>;
		resumeIndex?: number;
		defaultBetMicro?: number;
		balanceMicro?: number;
		rgsAddress?: string;
		resumeAmountMicro?: number;
		replayMode?: string;
		replayCost?: number;
		expectAssetFailure?: boolean;
		bonusMaximum?: number;
	} = {},
) {
	const calls: { path: string; body: any }[] = [];
	const errors: string[] = [];
	const external: string[] = [];
	const book = options.book ?? loss;
	const defaultBet = options.defaultBetMicro ?? 100000;
	const round = {
		betID: 1,
		amount: options.resumeAmountMicro ?? defaultBet,
		mode: 'base',
		payout: Math.round(book.payoutMultiplier * 100000),
		payoutMultiplier: book.payoutMultiplier,
		active: book.payoutMultiplier > 0,
		state: book.events,
		event: String(options.resumeIndex ?? 0),
	};
	page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('request', (req) => {
		if (
			!req.url().startsWith('http://127.0.0.1:4173') &&
			!req.url().startsWith('https://rgs.invalid/')
		)
			external.push(req.url());
	});
	page.on('response', (res) => {
		if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`);
	});
	await page.addInitScript(() => {
		(window as any).__PIXI_APP_INIT__ = (app: any) => ((window as any).__testPixi = app);
	});
	await page.route('https://rgs.invalid/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		calls.push({ path, body: request.postDataJSON() });
		let data: any;
		if (path === '/wallet/authenticate')
			data = {
				balance: { amount: options.balanceMicro ?? 100000000, currency: options.currency ?? 'USD' },
				config: {
					minBet: 10000,
					maxBet: Math.max(1000000, defaultBet * 2),
					stepBet: 10000,
					defaultBetLevel: defaultBet,
					gameModes: {
						base: { costMultiplier: 1, maxBet: Math.max(1000000, defaultBet * 2) },
						bonus: {
							costMultiplier: 100,
							maxBet: options.bonusMaximum ?? Math.max(1000000, defaultBet * 2),
						},
					},
					betLevels: [
						...new Set([
							10000,
							defaultBet,
							...(options.resumeAmountMicro ? [options.resumeAmountMicro] : []),
							Math.max(1000000, defaultBet * 2),
						]),
					].sort((a, b) => a - b),
					jurisdiction: options.jurisdiction ?? {},
				},
				...(options.resume ? { round: { ...round, active: true } } : {}),
			};
		else if (path === '/wallet/play') {
			await options.playGate;
			const body = request.postDataJSON();
			data = {
				balance: {
					amount: 100000000 - body.amount * (body.mode === 'bonus' ? 100 : 1),
					currency: options.currency ?? 'USD',
				},
				round: { ...round, mode: body.mode, amount: body.amount },
			};
		} else if (path === '/wallet/end-round')
			data = { balance: { amount: 99900000 + round.payout, currency: options.currency ?? 'USD' } };
		else if (path.startsWith('/bet/replay/'))
			data = { ...round, costMultiplier: options.replayCost ?? 1 };
		else if (path === '/bet/event') data = { event: '0' };
		else throw new Error(`Unexpected RGS fixture route: ${path}`);
		await route.fulfill({ json: data });
	});
	const query = options.replay
		? `replay=true&game=lunar_vault&version=fixture&mode=${options.replayMode ?? 'base'}&event=1&amount=100000`
		: 'sessionID=local-fixture';
	await page.goto(
		`/?rgs_url=${encodeURIComponent(options.rgsAddress ?? 'rgs.invalid')}&${query}&currency=${options.currency ?? 'USD'}${options.query ?? ''}`,
	);
	if (options.expectAssetFailure) {
		await expect(page.getByRole('alert')).toContainText('Game assets could not be loaded');
		return { calls, errors, external };
	}
	await expect
		.poll(async () => (await renderedText(page)).some((n) => n.text.startsWith('TAP')), {
			timeout: 20000,
		})
		.toBe(true);
	await page.mouse.click(20, page.viewportSize()!.height - 30);
	await textNode(page, 'LUNAR VAULT');
	// Wait for presentation transition and the resumed/no-resume actor to settle.
	await page.waitForTimeout(800);
	return { calls, errors, external };
}

for (const [width, height] of [
	[1280, 720],
	[1024, 576],
	[800, 450],
	[400, 225],
	[425, 812],
	[768, 1024],
	[800, 800],
]) {
	test(`production canvas and controls fit ${width}x${height}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height });
		const s = await session(page);
		expect(
			await page.evaluate(
				() =>
					document.fonts.check('700 20px "Lunar Display"') &&
					document.fonts.check('700 20px "Lunar Sans"'),
			),
		).toBe(true);
		const labels = await renderedText(page);
		for (const text of ['LUNAR VAULT', 'SPIN', 'MENU', 'BALANCE', 'WIN']) {
			const n = labels.find((n) => n.text === text)!;
			expect(n, text).toBeTruthy();
			expect(n.x, text).toBeGreaterThanOrEqual(-1);
			expect(n.y, text).toBeGreaterThanOrEqual(-1);
			expect(n.x + n.width, text).toBeLessThanOrEqual(width + 1);
			expect(n.y + n.height, text).toBeLessThanOrEqual(height + 1);
		}
		expect(
			await page.evaluate(
				() =>
					document.documentElement.scrollWidth <= innerWidth &&
					document.documentElement.scrollHeight <= innerHeight,
			),
		).toBe(true);
		await page.screenshot({ path: info.outputPath(`viewport-${width}x${height}.png`) });
		for (const button of await page
			.locator('.mini-controls > button:visible,.mini-controls .spin:visible')
			.all()) {
			const box = await button.boundingBox();
			expect(box!.width).toBeGreaterThanOrEqual(44);
			expect(box!.height).toBeGreaterThanOrEqual(44);
		}
		await clickText(page, 'SPIN');
		await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
		await textNode(page, 'SPIN');
		expect(s.calls.find((c) => c.path === '/wallet/play')!.body).toMatchObject({
			amount: 100000,
			mode: 'base',
			currency: 'USD',
		});
		expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(0);
		expect(s.errors).toEqual([]);
		expect(s.external).toEqual([]);
	});
}

test('win settles once, dialogs render once and block space', async ({ page }, info) => {
	// Software-rendered CI spends considerably longer on the two full-frame screenshots.
	test.setTimeout(90000);
	await page.setViewportSize({ width: 1280, height: 720 });
	const s = await session(page, { book: win });
	const spin = await textNode(page, 'SPIN');
	await page.mouse.move(10, 10);
	await page.mouse.down();
	await page.mouse.move(spin.x + spin.width / 2, spin.y + spin.height / 2);
	await page.mouse.up();
	await page.waitForTimeout(200);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await clickText(page, 'SPIN');
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/end-round').length).toBe(1);
	await textNode(page, 'SPIN');
	await clickText(page, 'MENU');
	await clickText(page, 'INFO');
	await expect(page.getByRole('heading', { name: 'Inside the Lunar Vault' })).toHaveCount(1);
	await expect(page.getByRole('heading', { name: 'Inside the Lunar Vault' })).toBeInViewport();
	await page.keyboard.press('Space');
	await page.waitForTimeout(500);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(1);
	await page.screenshot({ path: info.outputPath('rules.png') });
	await page.keyboard.press('Escape');
	await expect(page.getByRole('heading', { name: 'Inside the Lunar Vault' })).toHaveCount(0);
	await clickText(page, 'MENU');
	await clickText(page, 'PAYTABLE');
	await expect(page.getByRole('heading', { name: 'Celestial symbols' })).toHaveCount(1);
	await expect(page.getByRole('heading', { name: 'Celestial symbols' })).toBeInViewport();
	await expect(page.getByRole('table')).toHaveCount(1);
	await page.screenshot({ path: info.outputPath('paytable.png') });
	await page.getByRole('row').last().scrollIntoViewIfNeeded();
	await expect(page.getByRole('row').last()).toBeInViewport();
	expect(s.errors).toEqual([]);
});

test('restricted session disables controls and space; feature menu only lists the implemented mode', async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	const s = await session(page, {
		jurisdiction: {
			disabledSpacebar: true,
			disabledTurbo: true,
			disabledAutoplay: true,
			disabledBuyFeature: true,
			disabledSlamstop: true,
		},
	});
	for (const text of ['TURBO', 'AUTO SPIN', 'BUY BONUS'])
		expect((await textNode(page, text)).disabled, text).toBe(true);
	await page.keyboard.press('Space');
	await page.waitForTimeout(500);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await clickText(page, 'BUY BONUS');
	await expect(page.locator('.bonus-card-wrap')).toHaveCount(0);
	await clickText(page, 'SPIN');
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	expect(s.errors).toEqual([]);
});

test('autoplay can be cancelled when slam-stop is forbidden', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	// Hold the first server response so cancellation cannot race a fast completed round.
	let releasePlay = () => {};
	const playGate = new Promise<void>((resolve) => (releasePlay = resolve));
	const s = await session(page, { jurisdiction: { disabledSlamstop: true }, playGate });
	await clickText(page, 'AUTO SPIN');
	await page.getByText('START AUTOPLAY', { exact: true }).click();
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	const stop = await textNode(page, 'STOP');
	expect(stop.disabled).toBe(false);
	await clickText(page, 'STOP');
	await expect.poll(async () => (await textNode(page, 'STOP')).disabled).toBe(true);
	releasePlay();
	await textNode(page, 'SPIN');
	await page.waitForTimeout(700);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});

test('feature menu contains one local mode and social wording', async ({ page }, info) => {
	await page.setViewportSize({ width: 425, height: 812 });
	const s = await session(page, { query: '&social=true', currency: 'XSC' });
	await clickText(page, 'PLAY BONUS');
	await expect(page.locator('.bonus-card-wrap')).toHaveCount(1);
	await expect(page.locator('.bonus-card-wrap')).toContainText('ECLIPSE CHAMBER');
	await expect(page.locator('.bonus-card-wrap')).toBeInViewport({ ratio: 1 });
	expect(
		await page
			.locator('.bonus-card-wrap .description')
			.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
	).toBeGreaterThanOrEqual(14);
	await expect(page.locator('body')).not.toContainText('SAMURAI');
	await page.screenshot({ path: info.outputPath('social-feature-menu.png') });
	expect(s.errors).toEqual([]);
	expect(s.external).toEqual([]);
});

test('active round resume presents supplied events without a new wager', async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: 576 });
	const s = await session(page, { book: win, resume: true });
	await textNode(page, 'SPIN');
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});

test('replay uses only replay endpoint', async ({ page }, info) => {
	await page.setViewportSize({ width: 800, height: 450 });
	const s = await session(page, { book: win, replay: true });
	await expect(page.getByRole('button', { name: 'Play again' })).toBeEnabled({ timeout: 15000 });
	await page.getByRole('button', { name: 'Play again' }).click();
	await expect(page.getByRole('button', { name: 'Play again' })).toBeEnabled({ timeout: 15000 });
	expect(s.calls.filter((c) => c.path.startsWith('/wallet/'))).toHaveLength(0);
	expect(s.calls.filter((c) => c.path.startsWith('/bet/replay/'))).toHaveLength(1);
	const replay = await page.getByRole('button', { name: 'Play again' }).boundingBox();
	const amount = await page.locator('.replay-cost').boundingBox();
	await expect(page.locator('.replay-cost')).toContainText('PLAY AMOUNT $0.10');
	expect(replay!.x).toBeGreaterThan(amount!.x + amount!.width);
	await page.screenshot({ path: info.outputPath('replay.png') });
	expect(s.errors).toEqual([]);
});

test('bonus completes with reduced motion and viewport rotation', async ({ page }, info) => {
	await page.setViewportSize({ width: 425, height: 812 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	test.setTimeout(90000);
	const book = bonusBooks[0] as Fixture;
	const s = await session(page, { book, resume: true });
	await textNode(page, 'ECLIPSE CHAMBER');
	await page.screenshot({ path: info.outputPath('feature-intro.png') });
	await page.mouse.click(15, 780);
	await page.setViewportSize({ width: 800, height: 450 });
	// Advance presentation-only prompts until the SDK completes the supplied feature book.
	for (let i = 0; i < 180; i++) {
		const texts = await renderedText(page);
		if (texts.some((n) => n.text.startsWith('TAP'))) await page.mouse.click(15, 425);
		if (s.calls.some((c) => c.path === '/wallet/end-round')) break;
		await page.waitForTimeout(250);
	}
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/end-round').length).toBe(1);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await textNode(page, 'SPIN');
	await page.screenshot({ path: info.outputPath('feature-complete.png') });
	expect(s.errors).toEqual([]);
});

test('feature buy confirms its cost before sending exactly one bonus request', async ({ page }) => {
	const s = await session(page);
	await clickText(page, 'BUY BONUS');
	await page.getByText('CONTINUE', { exact: true }).click();
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await expect(page.locator('.ui-popup-standard-content-wrap')).toContainText('100×');
	await page.locator('[data-test="confirm-button"]').click();
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	expect(s.calls.find((c) => c.path === '/wallet/play')!.body).toMatchObject({
		mode: 'bonus',
		amount: 100000,
	});
	await textNode(page, 'SPIN');
	await clickText(page, 'SPIN');
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(2);
	expect(s.calls.filter((c) => c.path === '/wallet/play')[1].body.mode).toBe('base');
	expect(s.errors).toEqual([]);
});

test('retrigger adds spins without restarting the feature or charging again', async ({
	page,
}, info) => {
	test.setTimeout(90000);
	await page.setViewportSize({ width: 1024, height: 576 });
	const book = books.find((b) => b.id === 3)!;
	const s = await session(page, { book, resume: true });
	await textNode(page, 'ECLIPSE CHAMBER');
	await page.mouse.click(15, 540);
	await textNode(page, 'ORBIT EXTENDED');
	await page.screenshot({ path: info.outputPath('retrigger.png') });
	for (let i = 0; i < 240; i++) {
		if ((await renderedText(page)).some((n) => n.text.startsWith('TAP')))
			await page.mouse.click(15, 540);
		if (s.calls.some((c) => c.path === '/wallet/end-round')) break;
		await page.waitForTimeout(250);
	}
	await textNode(page, 'SPIN');
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});

test('mid-feature resume restores totals without an entry prompt', async ({ page }) => {
	test.setTimeout(90000);
	await page.setViewportSize({ width: 1024, height: 576 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const book = books.find((b) => b.id === 3)!;
	const s = await session(page, { book, resume: true, resumeIndex: 9 });
	// Both retriggers precede event 9; the restored feature total is fourteen.
	await expect
		.poll(async () => (await renderedText(page)).some((n) => /^FREE SPIN \d+ \/ 14$/.test(n.text)))
		.toBe(true);
	expect((await renderedText(page)).some((n) => n.text.startsWith('TAP'))).toBe(false);
	for (let i = 0; i < 200; i++) {
		if ((await renderedText(page)).some((n) => n.text.startsWith('TAP')))
			await page.mouse.click(15, 540);
		if (s.calls.some((c) => c.path === '/wallet/end-round')) break;
		await page.waitForTimeout(250);
	}
	await textNode(page, 'SPIN');
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	expect(s.calls.filter((c) => c.path === '/wallet/end-round')).toHaveLength(1);
	expect(s.errors).toEqual([]);
});

test('wallet play uses integer micro-units for a 2.01 amount', async ({ page }) => {
	const s = await session(page, { defaultBetMicro: 2010000 });
	await clickText(page, 'SPIN');
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	const amount = s.calls.find((c) => c.path === '/wallet/play')!.body.amount;
	expect(amount).toBe(2010000);
	expect(Number.isSafeInteger(amount)).toBe(true);
	expect(s.errors).toEqual([]);
});

for (const [currency, balance, amount] of [
	['USD', '$100.00', '$10.00'],
	['EUR', '€100.00', '€10.00'],
	['CAD', 'CA$100.00', 'CA$10.00'],
	['MXN', 'MX$100.00', 'MX$10.00'],
	['JPY', '¥100', '¥10'],
	['XSC', '100.00 SC', '10.00 SC'],
	['XGC', '100.00 GC', '10.00 GC'],
])
	test(`phone currency ${currency} uses exact server amount and native formatting`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 425, height: 812 });
		const s = await session(page, {
			currency,
			defaultBetMicro: 10000000,
			query: currency.startsWith('X') ? '&social=true' : '',
		});
		await textNode(page, balance);
		await textNode(page, amount);
		await clickText(page, 'SPIN');
		await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
		expect(s.calls.find((c) => c.path === '/wallet/play')!.body.amount).toBe(10000000);
		await textNode(page, 'SPIN');
		expect(s.errors).toEqual([]);
	});

test('explicit HTTPS RGS address works and unknown language falls back to English', async ({
	page,
}) => {
	const s = await session(page, { rgsAddress: 'https://rgs.invalid', query: '&lang=zz' });
	await clickText(page, 'SPIN');
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	expect(s.errors).toEqual([]);
	expect(s.external).toEqual([]);
});

test('zero balance explains disabled spin and sends no play request', async ({ page }) => {
	const s = await session(page, { balanceMicro: 0 });
	await expect(page.getByRole('status')).toContainText('Insufficient balance');
	await page.keyboard.press('Space');
	await clickText(page, 'SPIN');
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	expect(s.errors).toEqual([]);
});

test('social game rules include the operational disclaimer without restricted terms', async ({
	page,
}) => {
	const s = await session(page, { currency: 'XSC', query: '&social=true' });
	await clickText(page, 'MENU');
	await clickText(page, 'INFO');
	const text = await page.locator('.information').innerText();
	expect(text).toContain('physical device');
	expect(text).not.toMatch(
		/\b(bet|bets|buy|bought|cash|credit|currency|fund|gamble|money|paid|pay|pays|purchase|stake|wager|withdraw)\b/i,
	);
	expect(s.errors).toEqual([]);
});

test('an interrupted sprite fetch retries without entering a broken game', async ({ page }) => {
	let attempts = 0;
	await page.route('**/assets/nosyt/sprites/h1.webp', (route) =>
		++attempts === 1 ? route.abort() : route.continue(),
	);
	const s = await session(page);
	expect(attempts).toBe(2);
	expect(s.errors.filter((e) => e.includes('not found in the loadedAssets'))).toEqual([]);
	await textNode(page, 'SPIN');
});

test('active round keeps its non-default amount after recovery and on the next play', async ({
	page,
}) => {
	const s = await session(page, { book: win, resume: true, resumeAmountMicro: 500000 });
	await textNode(page, 'SPIN');
	await textNode(page, '$0.50');
	await clickText(page, 'SPIN');
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	expect(s.calls.find((c) => c.path === '/wallet/play')!.body.amount).toBe(500000);
	expect(s.errors).toEqual([]);
});

test('a sub-cent award stays visible at the correct precision', async ({ page }) => {
	const s = await session(page, { book: win, defaultBetMicro: 10000 });
	await clickText(page, 'SPIN');
	await textNode(page, '$0.002');
	expect(s.errors).toEqual([]);
});

test('small social replay displays the server mode cost and exposes no wagering menu', async ({
	page,
}) => {
	await page.setViewportSize({ width: 400, height: 225 });
	const s = await session(page, {
		replay: true,
		replayMode: 'bonus',
		replayCost: 42,
		currency: 'XSC',
		query: '&social=true',
	});
	await expect(page.locator('.replay-cost')).toContainText('42×');
	await expect(page.locator('.replay-cost')).toContainText('TOTAL PLAY 4.20 SC');
	await expect(page.getByRole('button', { name: 'Play again' })).toBeEnabled();
	expect(s.calls.filter((c) => c.path.startsWith('/wallet/'))).toHaveLength(0);
	expect(s.errors).toEqual([]);
});

test('a permanently missing sprite shows recovery instead of an incomplete game', async ({
	page,
}) => {
	let attempts = 0;
	await page.route('**/assets/nosyt/sprites/h1.webp', (route) => {
		attempts++;
		return route.abort();
	});
	const s = await session(page, { expectAssetFailure: true });
	expect(attempts).toBe(3);
	await expect(page.getByRole('button', { name: 'Reload game' })).toBeVisible();
	expect((await renderedText(page)).some((n) => n.text === 'SPIN')).toBe(false);
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
});

test('per-mode server maximum blocks feature entry while allowing the base amount', async ({
	page,
}) => {
	const s = await session(page, { bonusMaximum: 50000 });
	await clickText(page, 'BUY BONUS');
	await expect(page.locator('.bonus-card-wrap')).toContainText('Choose a lower play amount');
	await expect(page.locator('.bonus-card-wrap button')).toBeDisabled();
	expect(s.calls.filter((c) => c.path === '/wallet/play')).toHaveLength(0);
	await page.keyboard.press('Escape');
	await clickText(page, 'SPIN');
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	expect(s.calls.find((c) => c.path === '/wallet/play')!.body.mode).toBe('base');
	expect(s.errors).toEqual([]);
});

test('an invalid RGS host shows a clear failure without another destination', async ({ page }) => {
	const requests: string[] = [];
	page.on('request', (r) => {
		if (!r.url().startsWith('http://127.0.0.1:4173')) requests.push(r.url());
	});
	await page.route('https://example.com/**', (route) =>
		route.fulfill({ status: 400, json: { error: 'ERR_VAL', message: 'invalid request' } }),
	);
	await page.goto('/?sessionID=invalid&rgs_url=example.com');
	await expect(page.getByRole('alert')).toContainText('valid launch link');
	await expect(page.getByText('Reload game', { exact: true })).toBeVisible();
	expect(requests).toEqual(['https://example.com/wallet/authenticate']);
});

test('master mute remains available on the feature introduction without dismissing it', async ({
	page,
}) => {
	await page.setViewportSize({ width: 425, height: 812 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const s = await session(page, { book: bonusBooks[0] as Fixture, resume: true });
	await textNode(page, 'ECLIPSE CHAMBER');
	const mute = page.getByRole('button', { name: 'Mute all sound', exact: true });
	await expect(mute).toBeVisible();
	await mute.click();
	await expect(page.getByRole('button', { name: 'Enable sound', exact: true })).toBeVisible();
	await textNode(page, 'ECLIPSE CHAMBER');
	expect(
		s.calls.filter((c) => c.path === '/wallet/play' || c.path === '/wallet/end-round'),
	).toHaveLength(0);
	expect(s.errors).toEqual([]);
});
