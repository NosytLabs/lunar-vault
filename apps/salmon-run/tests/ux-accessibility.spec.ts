import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const fixtures = JSON.parse(
	fs.readFileSync(new URL('../../../math/salmon-run/fixtures.json', import.meta.url), 'utf8'),
);
async function boot(page: Page, options: { featureLimit?: number; balance?: number } = {}) {
	const calls: string[] = [],
		errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.route('https://rgs.invalid/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		calls.push(path);
		if (path === '/wallet/authenticate')
			await route.fulfill({
				json: {
					balance: { amount: options.balance ?? 100000000, currency: 'USD' },
					config: {
						minBet: 10000,
						maxBet: 1000000,
						stepBet: 10000,
						defaultBetLevel: 100000,
						betLevels: [10000, 50000, 100000, 1000000],
						gameModes: [
							{ mode: 'base', costMultiplier: 1, maxBet: 1000000 },
							{ mode: 'river', costMultiplier: 20, maxBet: options.featureLimit ?? 1000000 },
						],
						jurisdiction: { displayRTP: true, displayNetPosition: true, displaySessionTimer: true },
					},
				},
			});
		else if (path === '/wallet/play')
			await route.fulfill({
				json: {
					balance: { amount: 99900000, currency: 'USD' },
					round: {
						roundID: 1,
						amount: 100000,
						mode: 'base',
						active: false,
						state: fixtures['base:loss'].events,
						payout: 0,
						payoutMultiplier: 0,
					},
				},
			});
		else throw new Error(`Unexpected RGS request: ${path}`);
	});
	await page.goto('/?rgs_url=rgs.invalid&sessionID=ux-fixture');
	await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeVisible({
		timeout: 15000,
	});
	return { calls, errors };
}

test('field guide starts with its named heading, traps focus and restores the menu trigger', async ({
	page,
}, info) => {
	const s = await boot(page);
	const trigger = page.getByRole('button', { name: 'Open field guide' });
	await trigger.click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toHaveAccessibleName('Follow the silver');
	await expect(page.getByRole('heading', { name: 'Follow the silver' })).toBeFocused();
	for (let i = 0; i < 12; i++) {
		await page.keyboard.press(i < 6 ? 'Tab' : 'Shift+Tab');
		expect(
			await dialog.evaluate(
				(el) => document.activeElement === document.body || el.contains(document.activeElement),
			),
		).toBe(true);
	}
	await page.screenshot({ path: info.outputPath('field-guide.png') });
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});

test('River Run confirmation initially focuses its heading and Escape cancels without a play', async ({
	page,
}) => {
	const s = await boot(page);
	await page.locator('.run-preview').click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toHaveAccessibleName('Enter the river');
	await expect(dialog.locator('h2')).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
	await expect(page.locator('.run-preview')).toBeFocused();
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});

for (const [width, height] of [
	[400, 225],
	[425, 812],
]) {
	test(`session information stays readable at ${width}x${height}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height });
		await boot(page);
		await expect(page.locator('.session-status')).toContainText('96.50%');
		const sizes = await page
			.locator('.session-status span,.session-status b')
			.evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)));
		expect(sizes.length).toBeGreaterThanOrEqual(6);
		expect(sizes.every((size) => size >= 10)).toBe(true);
		await page.screenshot({ path: info.outputPath(`session-${width}x${height}.png`) });
	});
}

for (const [reason, options, text] of [
	['limit', { featureLimit: 50000 }, /River Run session limit/],
	['balance', { balance: 1000000 }, /Balance is too low for River Run/],
] as const) {
	test(`unavailable River Run explains its ${reason} and lower amount without a play`, async ({
		page,
	}) => {
		const s = await boot(page, options);
		await expect(page.locator('.run-preview')).toBeDisabled();
		await expect(page.locator('.funds-message[role="status"]')).toContainText(text);
		await expect(page.locator('.funds-message[role="status"]')).toContainText(
			'Choose a lower play amount',
		);
		expect(s.calls).toEqual(['/wallet/authenticate']);
		expect(s.errors).toEqual([]);
	});
}
