import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const fixtures = JSON.parse(
	fs.readFileSync(new URL('../../../math/salmon-run/fixtures.json', import.meta.url), 'utf8'),
);
for (const currency of ['constructor', 'toString', '__proto__', 'ZZZ']) {
	test(`invalid optional replay currency ${currency} defaults without a wallet request`, async ({
		page,
	}) => {
		const errors: string[] = [];
		const calls: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const loss = fixtures['base:loss'];
		await page.route('https://rgs.invalid/**', async (route) => {
			const path = new URL(route.request().url()).pathname;
			calls.push(path);
			if (!path.startsWith('/bet/replay/')) throw new Error(`Unexpected wallet request ${path}`);
			await route.fulfill({
				json: {
					state: loss.events,
					payoutMultiplier: loss.payoutMultiplier / 100,
					costMultiplier: 1,
				},
			});
		});
		await page.goto(
			'/?' +
				new URLSearchParams({
					replay: 'true',
					rgs_url: 'rgs.invalid',
					game: 'salmon_run',
					version: 'fixture',
					mode: 'base',
					event: '1',
					currency,
					amount: '5000000',
				}),
		);
		await expect(page.locator('.replay-details')).toContainText('TOTAL PLAY $5.00');
		await page.getByRole('button', { name: 'Play replay' }).click();
		await expect(page.getByRole('button', { name: 'Play replay' })).toBeEnabled({ timeout: 15000 });
		expect(calls).toHaveLength(1);
		expect(calls[0]).toMatch(/^\/bet\/replay\//);
		expect(errors).toEqual([]);
	});
}
