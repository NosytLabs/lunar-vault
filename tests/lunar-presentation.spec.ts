import { test, expect, type Page } from '@playwright/test';
import fixtures from '../math/lunar-vault/fixtures.json';

// Production presentation checks use complete original publication books.
// A held event acknowledgement freezes an actual recovered feature at a known count.
async function canvasText(page: Page) {
	return page.evaluate(() => {
		const texts: string[] = [];
		const walk = (node: any, visible: boolean) => {
			visible = visible && node.visible !== false && node.alpha > 0.02;
			if (!visible) return;
			if (typeof node.text === 'string') texts.push(node.text);
			node.children?.forEach((child: any) => walk(child, visible));
		};
		const app = (window as any).__presentationPixi;
		if (app?.stage) walk(app.stage, true);
		return texts;
	});
}

async function openFixture(
	page: Page,
	options: { checkpoint?: number; replay?: boolean; disclosure?: boolean; touch?: boolean } = {},
) {
	const feature = fixtures['base:retrigger'];
	const book = options.checkpoint !== undefined || options.replay ? feature : fixtures['base:loss'];
	const calls: string[] = [];
	const errors: string[] = [];
	let release!: () => void;
	const gate = new Promise<void>((resolve) => (release = resolve));
	const round = {
		betID: book.id,
		amount: 100000,
		mode: 'base',
		payout: book.payoutMultiplier * 1000,
		payoutMultiplier: book.payoutMultiplier / 100,
		active: true,
		state: book.events,
		event: String(options.checkpoint ?? 0),
	};
	page.on('pageerror', (error) => errors.push(error.message));
	await page.addInitScript(() => {
		(window as any).__PIXI_APP_INIT__ = (app: any) => ((window as any).__presentationPixi = app);
	});
	await page.route('https://rgs.invalid/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		calls.push(path);
		if (path === '/bet/event' && options.checkpoint !== undefined) await gate;
		const json =
			path === '/wallet/authenticate'
				? {
						balance: { amount: 100000000, currency: 'USD' },
						config: {
							minBet: 10000,
							maxBet: 1000000,
							stepBet: 10000,
							defaultBetLevel: 100000,
							betLevels: [10000, 100000, 1000000],
							gameModes: [
								{ mode: 'base', costMultiplier: 1, maxBet: 1000000 },
								{ mode: 'bonus', costMultiplier: 100, maxBet: 1000000 },
							],
							jurisdiction: options.disclosure
								? { displayRTP: true, displayNetPosition: true, displaySessionTimer: true }
								: {},
						},
						...(options.checkpoint !== undefined ? { round } : {}),
					}
				: path.startsWith('/bet/replay/')
					? { ...round, costMultiplier: 1 }
					: path === '/bet/event'
						? { event: route.request().postDataJSON()?.event }
						: path === '/wallet/end-round'
							? { balance: { amount: 101530000, currency: 'USD' } }
							: { balance: { amount: 99900000, currency: 'USD' }, round };
		await route.fulfill({ json });
	});
	await page.goto(
		options.replay
			? '/?rgs_url=rgs.invalid&replay=true&game=lunar_vault&version=fixture&mode=base&event=1&amount=100000&currency=USD'
			: '/?rgs_url=rgs.invalid&sessionID=presentation-fixture&currency=USD',
	);
	await expect
		.poll(async () => (await canvasText(page)).some((text) => text.startsWith('TAP')), {
			timeout: 25000,
		})
		.toBe(true);
	if (options.touch) await page.touchscreen.tap(20, page.viewportSize()!.height - 25);
	else await page.mouse.click(20, page.viewportSize()!.height - 25);
	return { calls, errors, release };
}

async function expectContainedCounter(page: Page) {
	const counter = page.locator('.feature-progress');
	await expect(counter).toBeVisible();
	await expect(counter).toContainText('ECLIPSE CHAMBER');
	const bounds = await counter.boundingBox();
	const rail = await page.locator('.mini-controls, .replay-bar').boundingBox();
	const text = await counter.locator('strong').boundingBox();
	expect(bounds).toBeTruthy();
	expect(rail).toBeTruthy();
	expect(text).toBeTruthy();
	const viewport = page.viewportSize()!;
	for (const box of [bounds!, text!]) {
		expect(box.x).toBeGreaterThanOrEqual(rail!.x);
		expect(box.y).toBeGreaterThanOrEqual(rail!.y);
		expect(box.x + box.width).toBeLessThanOrEqual(rail!.x + rail!.width + 1);
		expect(box.y + box.height).toBeLessThanOrEqual(rail!.y + rail!.height + 1);
		expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
		expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
	}
	for (const button of await page.locator('.mini-controls button, .replay-bar button').all()) {
		const box = await button.boundingBox();
		if (!box) continue;
		const overlaps =
			text!.x < box.x + box.width &&
			text!.x + text!.width > box.x &&
			text!.y < box.y + box.height &&
			text!.y + text!.height > box.y;
		expect(overlaps).toBe(false);
	}
}

for (const [width, height] of [
	[1024, 576],
	[800, 450],
	[400, 225],
	[425, 812],
]) {
	test.describe(`feature presentation ${width}x${height}`, () => {
		test.use({ viewport: { width, height }, isMobile: width === 425, hasTouch: width === 425 });
		test('recovered retrigger count is visible inside controls and survives rotation', async ({
			page,
		}, info) => {
			const session = await openFixture(page, { checkpoint: 41, touch: width === 425 });
			await expect(page.locator('.feature-progress')).toContainText('FREE SPIN 9 / 12', {
				timeout: 25000,
			});
			await expectContainedCounter(page);
			await page.screenshot({ path: info.outputPath('running-retrigger.png') });
			if (width === 425) {
				await page.setViewportSize({ width: 812, height: 425 });
				await expectContainedCounter(page);
				await page.setViewportSize({ width, height });
				await expectContainedCounter(page);
			}
			expect(session.calls.filter((path) => path === '/wallet/play')).toHaveLength(0);
			expect(session.errors).toEqual([]);
			session.release();
		});
	});
}

test('rules and confirmation retain reachable master sound without dismissal', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 800, height: 450 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const session = await openFixture(page);
	await page.getByRole('button', { name: 'Menu', exact: true }).click();
	await page.getByRole('button', { name: 'INFO', exact: true }).click();
	const popup = page.locator('.pop-up-wrap');
	await expect(popup).toBeVisible();
	const mute = popup.locator('.modal-mute');
	await expect(mute).toBeVisible();
	await mute.click();
	await expect(mute).toHaveAttribute('aria-label', 'Enable sound');
	await expect(page.getByRole('heading', { name: 'Inside the Lunar Vault' })).toBeVisible();
	await mute.click();
	await expect(mute).toHaveAttribute('aria-label', 'Mute all sound');
	await page.screenshot({ path: info.outputPath('rules-modal-mute.png') });
	await page.keyboard.press('Escape');
	await expect(popup).toHaveCount(0);
	await page.getByRole('button', { name: 'BUY ECLIPSE CHAMBER', exact: true }).click();
	await expect(popup.locator('.modal-mute')).toBeVisible();
	await page.locator('.bonus-card-wrap button').click();
	await expect(page.locator('[data-test="confirm-button"]')).toBeVisible();
	await popup.locator('.modal-mute').click();
	await expect(popup).toBeVisible();
	await expect(popup.locator('.modal-mute')).toHaveAttribute('aria-label', 'Enable sound');
	expect(session.calls.filter((path) => path === '/wallet/play')).toHaveLength(0);
	await page.screenshot({ path: info.outputPath('confirmation-modal-mute.png') });
});

test('requested session disclosures show authenticated values in a compact popout', async ({
	page,
}) => {
	await page.setViewportSize({ width: 400, height: 225 });
	await openFixture(page, { disclosure: true });
	const readouts = page.locator('.readouts');
	await expect(readouts).toContainText('RTP96.50%');
	await expect(readouts).toContainText('SESSION NET$0.00');
	await expect(readouts).toContainText('SESSION TIME');
	await expect(readouts).toContainText(/00:00:0[0-9]/);
	for (const element of await readouts.locator('b').all()) {
		const box = (await element.boundingBox())!;
		expect(box.x).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width).toBeLessThanOrEqual(400);
		expect(box.y + box.height).toBeLessThanOrEqual(225);
	}
});

test('final free spin returns through completion scene to ordinary controls', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 800, height: 450 });
	const session = await openFixture(page, { checkpoint: 54 });
	await expect(page.locator('.feature-progress')).toContainText('FREE SPIN 12 / 12', {
		timeout: 25000,
	});
	await expectContainedCounter(page);
	session.release();
	await expect
		.poll(async () => (await canvasText(page)).some((text) => text === 'FEATURE TOTAL'), {
			timeout: 25000,
		})
		.toBe(true);
	await page.screenshot({ path: info.outputPath('feature-completion.png') });
	await page.mouse.click(400, 225);
	await page.waitForTimeout(150);
	await page.mouse.click(400, 225);
	await expect(page.locator('.feature-progress')).toHaveCount(0);
	await expect(
		page.getByRole('button', { name: 'BUY ECLIPSE CHAMBER', exact: true }),
	).toBeVisible();
	await expect
		.poll(() => session.calls.filter((path) => path === '/wallet/end-round').length)
		.toBe(1);
	expect(session.calls.filter((path) => path === '/wallet/play')).toHaveLength(0);
	expect(session.errors).toEqual([]);
});

test('small feature replay retains progress and full amount information without wallet calls', async ({
	page,
}, info) => {
	test.setTimeout(90000);
	await page.setViewportSize({ width: 400, height: 225 });
	const session = await openFixture(page, { replay: true });
	await expect
		.poll(
			async () => {
				if (await page.locator('.feature-progress').isVisible()) return true;
				const texts = await canvasText(page);
				if (texts.includes('FREE SPINS') && texts.includes('ECLIPSE CHAMBER'))
					await page.mouse.click(200, 112);
				return false;
			},
			{ timeout: 60000 },
		)
		.toBe(true);
	await expectContainedCounter(page);
	await expect(page.locator('.replay-cost')).toContainText('PLAY AMOUNT $0.10');
	await expect(page.locator('.replay-cost')).toContainText('1× · TOTAL PLAY $0.10');
	await page.screenshot({ path: info.outputPath('small-feature-replay.png') });
	expect(session.calls.some((path) => path.startsWith('/wallet/'))).toBe(false);
	expect(session.errors).toEqual([]);
});
