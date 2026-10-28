import { test, expect, type Page } from '@playwright/test';
import fixtures from '../math/lunar-vault/fixtures.json';
const loss = fixtures['base:loss'];
const replay = {
	payoutMultiplier: loss.payoutMultiplier / 100,
	costMultiplier: 1,
	state: loss.events,
};
async function connect(
	page: Page,
	options: { amount?: string; currency?: string; payload?: unknown; authError?: unknown } = {},
) {
	const calls: string[] = [];
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.addInitScript(() => {
		(window as any).__PIXI_APP_INIT__ = (app: any) => ((window as any).__recheckPixi = app);
	});
	await page.route('https://rgs.invalid/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		calls.push(path);
		if (options.authError !== undefined && path === '/wallet/authenticate')
			await route.fulfill({ status: 400, json: options.authError });
		else if (path.startsWith('/bet/replay/'))
			await route.fulfill({ json: options.payload ?? replay });
		else throw new Error(`Unexpected wallet request: ${path}`);
	});
	const p = new URLSearchParams({
		rgs_url: 'rgs.invalid',
		...(options.authError === undefined
			? { replay: 'true', game: 'lunar_vault', version: 'fixture', mode: 'base', event: '1' }
			: { sessionID: 'error-fixture' }),
	});
	if (options.amount !== undefined) p.set('amount', options.amount);
	if (options.currency !== undefined) p.set('currency', options.currency);
	await page.goto('/?' + p);
	return { calls, errors };
}
async function enterReplay(page: Page) {
	await expect
		.poll(
			() =>
				page.evaluate(() => {
					let ready = false;
					const walk = (n: any) => {
						if (typeof n.text === 'string' && n.text.startsWith('TAP')) ready = true;
						n.children?.forEach(walk);
					};
					const app = (window as any).__recheckPixi;
					if (app?.stage) walk(app.stage);
					return ready;
				}),
			{ timeout: 20000 },
		)
		.toBe(true);
	await page.mouse.click(20, page.viewportSize()!.height - 25);
	await expect(page.locator('.replay-cost')).toBeVisible();
}
for (const amount of ['abc', '0', '-1', 'NaN', 'Infinity', '1.5', '9007199254740992', ''])
	test(`invalid optional replay amount ${JSON.stringify(amount)} falls back without blocking replay`, async ({
		page,
	}) => {
		const s = await connect(page, { amount });
		await expect.poll(() => s.calls.filter((p) => p.startsWith('/bet/replay/')).length).toBe(1);
		await enterReplay(page);
		await expect(page.locator('.replay-cost')).toContainText('PLAY AMOUNT $1.00');
		await expect(page.locator('.replay-cost')).toContainText('TOTAL PLAY $1.00');
		expect(s.calls.some((p) => p.startsWith('/wallet/'))).toBe(false);
		expect(s.errors).toEqual([]);
	});
for (const currency of ['constructor', 'toString', '__proto__', 'ZZZ'])
	test(`invalid optional replay currency ${currency} falls back safely`, async ({ page }) => {
		const s = await connect(page, { currency, amount: '5000000' });
		await enterReplay(page);
		await expect(page.locator('.replay-cost')).toContainText('PLAY AMOUNT $5.00');
		expect(s.calls.some((p) => p.startsWith('/wallet/'))).toBe(false);
		expect(s.errors).toEqual([]);
	});
test('missing replay cost is a readable failure with no invented price or wallet escape', async ({
	page,
}) => {
	const s = await connect(page, { payload: { payoutMultiplier: 0, state: loss.events } });
	await expect(page.getByRole('alert')).toContainText('This replay is unavailable');
	await page.keyboard.press('Escape');
	await page.keyboard.press('Space');
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page.locator('.replay-cost')).toHaveCount(0);
	expect(s.calls.some((p) => p.startsWith('/wallet/'))).toBe(false);
	expect(s.errors).toEqual([]);
});
for (const code of ['constructor', 'toString', '__proto__'])
	test(`prototype error code ${code} uses generic guidance without raw server text`, async ({
		page,
	}) => {
		const s = await connect(page, {
			authError: { error: code, message: 'UNSAFE RAW SERVER DETAIL' },
		});
		await expect(page.getByRole('alert')).toContainText(
			'Connection interrupted. Reload to recover any unfinished round.',
		);
		await expect(page.getByRole('alert')).not.toContainText('UNSAFE RAW SERVER DETAIL');
		expect(s.calls).toEqual(['/wallet/authenticate']);
		expect(s.errors).toEqual([]);
	});
test('known error code keeps actionable guidance and ignores server detail', async ({ page }) => {
	const s = await connect(page, {
		authError: { error: 'ERR_VAL', message: 'UNSAFE RAW SERVER DETAIL' },
	});
	await expect(page.getByRole('alert')).toContainText('Open a valid launch link');
	await expect(page.getByRole('alert')).not.toContainText('UNSAFE RAW SERVER DETAIL');
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});
