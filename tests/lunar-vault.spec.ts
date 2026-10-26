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
	} = {},
) {
	const calls: { path: string; body: any }[] = [];
	const errors: string[] = [];
	const external: string[] = [];
	const book = options.book ?? loss;
	const round = {
		betID: 1,
		amount: 100000,
		mode: 'base',
		payout: book.payoutMultiplier * 100000,
		payoutMultiplier: book.payoutMultiplier,
		active: book.payoutMultiplier > 0,
		state: book.events,
		event: '0',
	};
	page.on('pageerror', (e) => errors.push(e.stack ?? e.message));
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
				balance: { amount: 100000000, currency: options.currency ?? 'USD' },
				config: {
					minBet: 10000,
					maxBet: 1000000,
					stepBet: 10000,
					defaultBetLevel: 100000,
					betLevels: [10000, 100000, 1000000],
					jurisdiction: options.jurisdiction ?? {},
				},
				...(options.resume ? { round: { ...round, active: true } } : {}),
			};
		else if (path === '/wallet/play')
			data = { balance: { amount: 99900000, currency: options.currency ?? 'USD' }, round };
		else if (path === '/wallet/end-round')
			data = { balance: { amount: 99900000 + round.payout, currency: options.currency ?? 'USD' } };
		else if (path.startsWith('/bet/replay/')) data = round;
		else if (path === '/bet/event') data = { event: '0' };
		else throw new Error(`Unexpected RGS fixture route: ${path}`);
		await route.fulfill({ json: data });
	});
	const query = options.replay
		? 'replay=true&game=lunar_vault&version=fixture&mode=base&event=1&amount=100000'
		: 'sessionID=local-fixture';
	await page.goto(`/?rgs_url=rgs.invalid&${query}${options.query ?? ''}`);
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
	const s = await session(page, { jurisdiction: { disabledSlamstop: true } });
	await clickText(page, 'AUTO SPIN');
	await page.getByText('START AUTOPLAY', { exact: true }).click();
	await expect.poll(() => s.calls.filter((c) => c.path === '/wallet/play').length).toBe(1);
	const stop = await textNode(page, 'STOP');
	expect(stop.disabled).toBe(false);
	await clickText(page, 'STOP');
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
	const bet = await textNode(page, 'BET');
	expect(replay!.x).toBeGreaterThan(bet.x + bet.width);
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
