import { test, expect, type Page } from '@playwright/test';
async function boot(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(m.text());
	});
	await page.goto('/');
	await page.evaluate(() => document.fonts.ready);
	return errors;
}
for (const [width, height] of [
	[1280, 720],
	[800, 450],
	[425, 812],
	[400, 225],
]) {
	test(`playfield, text and touch controls fit ${width}x${height}`, async ({ page }, info) => {
		await page.setViewportSize({ width, height });
		const errors = await boot(page);
		for (const selector of ['.board-frame', '.controls', '.river-track', '.concept-note', 'h1']) {
			const box = await page.locator(selector).boundingBox();
			expect(box).not.toBeNull();
			expect(box!.x).toBeGreaterThanOrEqual(0);
			expect(box!.y).toBeGreaterThanOrEqual(0);
			expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
			expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
		}
		for (const selector of ['.menu-button', '.cast-button', '.cast-size', '.run-preview']) {
			const box = await page.locator(selector).boundingBox();
			expect(box!.width).toBeGreaterThanOrEqual(44);
			expect(box!.height).toBeGreaterThanOrEqual(44);
		}
		const images = await page
			.locator('.cell img')
			.evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).naturalWidth > 0));
		expect(images).toBe(true);
		await page.screenshot({ path: info.outputPath(`salmon-${width}x${height}.png`) });
		expect(errors).toEqual([]);
	});
}
test('six-cast preview settles supplied awards once and returns to base demo', async ({
	page,
}, info) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const errors = await boot(page);
	await page.getByRole('button', { name: 'RIVER RUN', exact: false }).click();
	await page.getByRole('button', { name: 'Enter the river' }).click();
	await expect(page.getByTestId('points')).toHaveText('1,000');
	for (let i = 0; i < 6; i++) {
		await page.getByRole('button', { name: 'Cast in river run', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Finish animation' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Finish animation' })).toHaveCount(0);
	}
	await expect(page.getByTestId('run-total')).toContainText('15');
	await expect(page.getByTestId('points')).toHaveText('1,015');
	await page.screenshot({ path: info.outputPath('salmon-run-complete.png') });
	await page.getByRole('button', { name: 'Back to the river' }).click();
	await page.getByRole('button', { name: 'Cast', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Finish animation' })).toHaveCount(0);
	await expect(page.getByTestId('points')).toHaveText('1,014');
	expect(errors).toEqual([]);
});
test('base scripted sequence triggers a run and locks its selected size', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	const errors = await boot(page);
	await page.getByRole('button', { name: 'Cast size 1 points. Change cast size' }).click();
	for (let i = 0; i < 3; i++) {
		await page.getByRole('button', { name: 'Cast', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Finish animation' })).toHaveCount(0);
	}
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.getByTestId('points')).toHaveText('1,018');
	await page.getByRole('button', { name: 'Enter the river' }).click();
	await expect(page.locator('.cast-size')).toBeDisabled();
	await page.getByRole('button', { name: 'Cast in river run', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Finish animation' })).toHaveCount(0);
	await expect(page.getByTestId('points')).toHaveText('1,022');
	expect(errors).toEqual([]);
});
test('field guide blocks keyboard casting and supports keyboard dismissal', async ({ page }) => {
	const errors = await boot(page);
	await page.getByRole('button', { name: 'Open field guide' }).click();
	await page.keyboard.press('Space');
	await expect(page.getByTestId('points')).toHaveText('1,000');
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).not.toBeVisible();
	expect(errors).toEqual([]);
});
test('stop accelerates presentation without duplicate debit or reward', async ({ page }) => {
	const errors = await boot(page);
	await page.getByRole('button', { name: 'Cast', exact: true }).click();
	await page.getByRole('button', { name: 'Finish animation' }).click();
	await expect(page.getByRole('button', { name: 'Finish animation' })).toHaveCount(0);
	await expect(page.getByTestId('points')).toHaveText('999');
	await page.getByRole('button', { name: 'Cast', exact: true }).click();
	await page.getByRole('button', { name: 'Finish animation' }).click();
	await expect(page.getByRole('button', { name: 'Finish animation' })).toHaveCount(0);
	await expect(page.getByTestId('points')).toHaveText('1,010');
	expect(errors).toEqual([]);
});
