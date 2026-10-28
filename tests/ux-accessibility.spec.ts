import { test, expect, type Page } from '@playwright/test';
import publication from '../math/lunar-vault/fixtures.json';

async function boot(page: Page, featureLimit: number | null = 1000000) {
	const calls: string[] = [];
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.addInitScript(() => {
		(window as any).__PIXI_APP_INIT__ = (app: any) => ((window as any).__uxPixi = app);
	});
	await page.route('https://rgs.invalid/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		calls.push(path);
		if (path === '/wallet/authenticate') {
			await route.fulfill({
				json: {
					balance: { amount: 100000000, currency: 'USD' },
					config: {
						minBet: 10000,
						maxBet: 1000000,
						stepBet: 10000,
						defaultBetLevel: 100000,
						betLevels: [10000, 50000, 100000, 1000000],
						gameModes: [
							{ mode: 'base', costMultiplier: 1, maxBet: 1000000 },
							...(featureLimit === null
								? []
								: [{ mode: 'bonus', costMultiplier: 100, maxBet: featureLimit }]),
						],
						jurisdiction: { displayRTP: true, displayNetPosition: true, displaySessionTimer: true },
					},
				},
			});
		} else if (path === '/wallet/play') {
			const loss = publication['base:loss'];
			await route.fulfill({
				json: {
					balance: { amount: 99900000, currency: 'USD' },
					round: {
						betID: 1,
						amount: 100000,
						mode: 'base',
						active: false,
						state: loss.events,
						payout: 0,
						payoutMultiplier: loss.payoutMultiplier / 100,
					},
				},
			});
		} else throw new Error(`Unexpected RGS request: ${path}`);
	});
	await page.goto('/?rgs_url=rgs.invalid&sessionID=ux-fixture');
	await expect
		.poll(
			() =>
				page.evaluate(() => {
					let ready = false;
					const walk = (node: any) => {
						if (typeof node.text === 'string' && node.text.startsWith('TAP')) ready = true;
						node.children?.forEach(walk);
					};
					if ((window as any).__uxPixi?.stage) walk((window as any).__uxPixi.stage);
					return ready;
				}),
			{ timeout: 20000 },
		)
		.toBe(true);
	await page.mouse.click(20, page.viewportSize()!.height - 30);
	await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
	return { calls, errors };
}

test('menu keyboard opening focuses its first action and Escape restores its trigger', async ({
	page,
}) => {
	const s = await boot(page);
	const menu = page.getByRole('button', { name: 'Menu', exact: true });
	await menu.focus();
	await page.keyboard.press('Enter');
	await expect(menu).toHaveAttribute('aria-expanded', 'true');
	await expect(page.locator('.mini-menu button').first()).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(page.locator('.mini-menu')).toHaveCount(0);
	await expect(menu).toBeFocused();
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});

for (const [action, heading] of [
	['INFO', 'Inside the Lunar Vault'],
	['PAYTABLE', 'Celestial symbols'],
]) {
	test(`${action} dialog names itself, contains keyboard focus and closes on Escape`, async ({
		page,
	}, info) => {
		const s = await boot(page);
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		await page.getByRole('button', { name: action, exact: true }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toHaveCount(1);
		await expect(dialog).toHaveAttribute('aria-modal', 'true');
		await expect(dialog).toHaveAccessibleName(/.+/);
		await expect(page.getByRole('heading', { name: heading })).toBeVisible();
		for (let i = 0; i < 8; i++) {
			expect(
				await dialog.evaluate(
					(el) => document.activeElement === document.body || el.contains(document.activeElement),
				),
			).toBe(true);
			await page.keyboard.press(i < 4 ? 'Tab' : 'Shift+Tab');
		}
		const content = dialog.getByRole('region', { name: 'Dialog content' });
		await content.focus();
		await expect(content).toBeFocused();
		await page.keyboard.press('End');
		await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
		await page.getByRole('heading', { name: heading }).focus();
		await page.keyboard.press('Space');
		expect(s.calls).toEqual(['/wallet/authenticate']);
		await page.keyboard.press('Escape');
		await expect(dialog).toHaveCount(0);
		await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
		expect(s.errors).toEqual([]);
	});
}

for (const [width, height] of [
	[400, 225],
	[425, 812],
]) {
	test(`session disclosures remain readable at ${width}x${height}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height });
		await boot(page);
		await expect(page.locator('.session-readouts')).toContainText('96.50%');
		const sizes = await page
			.locator('.session-readouts span')
			.evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)));
		expect(sizes.length).toBe(3);
		expect(sizes.every((size) => size >= (width === 425 ? 10 : 9))).toBe(true);
		await page.screenshot({ path: info.outputPath(`session-${width}x${height}.png`) });
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		await page.getByRole('button', { name: 'INFO', exact: true }).click();
		await expect(page.getByRole('dialog')).toHaveAccessibleName('Game information');
		await page.keyboard.press('Escape');
		await expect(page.getByRole('dialog')).toHaveCount(0);
	});
}

test('unavailable Eclipse Chamber explains the lower amount needed without submitting a play', async ({
	page,
}) => {
	const s = await boot(page, 50000);
	await expect(page.locator('.feature')).toBeDisabled();
	await expect(page.getByRole('status')).toContainText(
		/Eclipse Chamber.*limit|limit.*Eclipse Chamber/i,
	);
	await expect(page.getByRole('status')).toContainText(/lower/i);
	await page.keyboard.press('Escape');
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});

test('settings volume sliders have distinct names and support keyboard adjustment', async ({
	page,
}) => {
	const s = await boot(page);
	await page.getByRole('button', { name: 'Menu', exact: true }).click();
	await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog.getByRole('slider')).toHaveCount(3);
	for (const slider of await dialog.getByRole('slider').all())
		await expect(slider).toHaveAccessibleName(/.+/);
	const names = await dialog
		.getByRole('slider')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) =>
					node.getAttribute('aria-label') ||
					document.getElementById(node.getAttribute('aria-labelledby') || '')?.textContent,
			),
		);
	expect(new Set(names).size).toBe(3);
	const slider = dialog.getByRole('slider').first();
	await slider.focus();
	await page.keyboard.press('Home');
	await expect(slider).toHaveValue('0');
	await page.keyboard.press('ArrowRight');
	await expect(slider).toHaveValue('1');
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});

test('feature confirmation at 400x225 keeps cost and confirm control reachable', async ({
	page,
}, info) => {
	await page.setViewportSize({ width: 400, height: 225 });
	const s = await boot(page);
	await page.locator('.feature').click();
	await page.getByText('CONTINUE', { exact: true }).click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toContainText('100×');
	const confirm = page.locator('[data-test="confirm-button"]');
	await confirm.scrollIntoViewIfNeeded();
	await expect(confirm).toBeInViewport();
	await page.screenshot({ path: info.outputPath('feature-confirmation-400x225.png') });
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveAccessibleName('Feature selection');
	await page.keyboard.press('Escape');
	await expect(dialog).toHaveCount(0);
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});

test('base-only session explains Eclipse Chamber unavailability without suggesting a false amount fix', async ({
	page,
}) => {
	const s = await boot(page, null);
	await expect(page.locator('.feature')).toBeDisabled();
	await expect(page.getByRole('status')).toHaveText(
		'Eclipse Chamber is unavailable in this session.',
	);
	expect(s.calls).toEqual(['/wallet/authenticate']);
	expect(s.errors).toEqual([]);
});

for (const [width, height] of [
	[400, 225],
	[800, 450],
]) {
	test(`after-play reels remain clear of session and control rails at ${width}x${height}`, async ({
		page,
	}, info) => {
		await page.setViewportSize({ width, height });
		const s = await boot(page, 50000);
		await page.locator('.spin').click();
		await expect.poll(() => s.calls.filter((path) => path === '/wallet/play').length).toBe(1);
		await expect(page.locator('.spin')).toHaveText('SPIN', { timeout: 15000 });
		await expect(page.locator('.spin')).toBeEnabled();
		const board = await page.evaluate(() => {
			let box: { x: number; y: number; width: number; height: number } | null = null;
			const walk = (node: any) => {
				if (node.label === 'lunar-board-frame') {
					const bounds = node.getBounds();
					box = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
				}
				node.children?.forEach(walk);
			};
			walk((window as any).__uxPixi.stage);
			return box;
		});
		expect(board, 'labelled production reel frame is present').not.toBeNull();
		const frame = board! as { x: number; y: number; width: number; height: number };
		expect(frame.width).toBeGreaterThan(150);
		const controls = (await page.locator('.mini-controls').boundingBox())!;
		expect(
			frame.y + frame.height,
			'complete bottom reel row is above controls',
		).toBeLessThanOrEqual(controls.y + 1);
		const session = (await page.locator('.session-readouts').boundingBox())!;
		const intersects =
			frame.x < session.x + session.width &&
			frame.x + frame.width > session.x &&
			frame.y < session.y + session.height &&
			frame.y + frame.height > session.y;
		expect(intersects, 'disclosures do not obscure the reel frame').toBe(false);
		await expect(page.locator('.session-readouts')).toContainText('$-0.10');
		await page.screenshot({
			path: info.outputPath(`clear-reels-after-play-${width}x${height}.png`),
		});
		expect(s.calls).toEqual(['/wallet/authenticate', '/wallet/play']);
		expect(s.errors).toEqual([]);
	});
}
