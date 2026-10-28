# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ../../workspace/scratch/87411a2f3bc3/lunar-vault/tests/ux-accessibility.spec.ts >> INFO dialog names itself, contains keyboard focus and closes on Escape
- Location: tests/ux-accessibility.spec.ts:93:6

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('button', { name: 'Menu', exact: true })
Expected: focused
Error: Test timeout of 45000ms exceeded.

Call log:
  - Expect "toBeFocused" getByRole('button', { name: 'Menu', exact: true }) with timeout 10000ms
  - waiting for getByRole('button', { name: 'Menu', exact: true })
  - Test timeout of 45000ms exceeded.

```

# Page snapshot

```yaml
- generic "Game controls" [ref=e5]:
  - button "Menu" [active] [ref=e6] [cursor=pointer]:
    - generic [ref=e9]: MENU
  - button "Mute all sound" [ref=e10] [cursor=pointer]
  - generic [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]: BALANCE
      - generic [ref=e17]: $100.00
    - generic [ref=e18]:
      - generic [ref=e19]: WIN
      - generic [ref=e20]: $0.00
  - generic "Session information" [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e23]: RTP
      - generic [ref=e24]: 96.50%
    - generic [ref=e25]:
      - generic [ref=e26]: SESSION NET
      - generic [ref=e27]: $0.00
    - generic [ref=e28]:
      - generic [ref=e29]: SESSION TIME
      - generic [ref=e30]: 00:00:48
  - generic [ref=e31]:
    - button "Decrease amount" [ref=e32] [cursor=pointer]: −
    - button "Change play amount" [ref=e33] [cursor=pointer]:
      - generic [ref=e34]: BET
      - generic [ref=e35]: $0.10
    - button "Increase amount" [ref=e36] [cursor=pointer]: +
  - button "AUTO SPIN" [ref=e37] [cursor=pointer]
  - button "TURBO" [ref=e38] [cursor=pointer]
  - button "BUY ECLIPSE CHAMBER" [ref=e39] [cursor=pointer]
  - button "SPIN" [ref=e40] [cursor=pointer]
```

# Test source

```ts
  22  | 						defaultBetLevel: 100000,
  23  | 						betLevels: [10000, 50000, 100000, 1000000],
  24  | 						gameModes: [
  25  | 							{ mode: 'base', costMultiplier: 1, maxBet: 1000000 },
  26  | 							...(featureLimit === null
  27  | 								? []
  28  | 								: [{ mode: 'bonus', costMultiplier: 100, maxBet: featureLimit }]),
  29  | 						],
  30  | 						jurisdiction: { displayRTP: true, displayNetPosition: true, displaySessionTimer: true },
  31  | 					},
  32  | 				},
  33  | 			});
  34  | 		} else if (path === '/wallet/play') {
  35  | 			const loss = publication['base:loss'];
  36  | 			await route.fulfill({
  37  | 				json: {
  38  | 					balance: { amount: 99900000, currency: 'USD' },
  39  | 					round: {
  40  | 						betID: 1,
  41  | 						amount: 100000,
  42  | 						mode: 'base',
  43  | 						active: false,
  44  | 						state: loss.events,
  45  | 						payout: 0,
  46  | 						payoutMultiplier: loss.payoutMultiplier / 100,
  47  | 					},
  48  | 				},
  49  | 			});
  50  | 		} else throw new Error(`Unexpected RGS request: ${path}`);
  51  | 	});
  52  | 	await page.goto('/?rgs_url=rgs.invalid&sessionID=ux-fixture');
  53  | 	await expect
  54  | 		.poll(
  55  | 			() =>
  56  | 				page.evaluate(() => {
  57  | 					let ready = false;
  58  | 					const walk = (node: any) => {
  59  | 						if (typeof node.text === 'string' && node.text.startsWith('TAP')) ready = true;
  60  | 						node.children?.forEach(walk);
  61  | 					};
  62  | 					if ((window as any).__uxPixi?.stage) walk((window as any).__uxPixi.stage);
  63  | 					return ready;
  64  | 				}),
  65  | 			{ timeout: 20000 },
  66  | 		)
  67  | 		.toBe(true);
  68  | 	await page.mouse.click(20, page.viewportSize()!.height - 30);
  69  | 	await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
  70  | 	return { calls, errors };
  71  | }
  72  | 
  73  | test('menu keyboard opening focuses its first action and Escape restores its trigger', async ({
  74  | 	page,
  75  | }) => {
  76  | 	const s = await boot(page);
  77  | 	const menu = page.getByRole('button', { name: 'Menu', exact: true });
  78  | 	await menu.focus();
  79  | 	await page.keyboard.press('Enter');
  80  | 	await expect(menu).toHaveAttribute('aria-expanded', 'true');
  81  | 	await expect(page.locator('.mini-menu button').first()).toBeFocused();
  82  | 	await page.keyboard.press('Escape');
  83  | 	await expect(page.locator('.mini-menu')).toHaveCount(0);
  84  | 	await expect(menu).toBeFocused();
  85  | 	expect(s.calls).toEqual(['/wallet/authenticate']);
  86  | 	expect(s.errors).toEqual([]);
  87  | });
  88  | 
  89  | for (const [action, heading] of [
  90  | 	['INFO', 'Inside the Lunar Vault'],
  91  | 	['PAYTABLE', 'Celestial symbols'],
  92  | ]) {
  93  | 	test(`${action} dialog names itself, contains keyboard focus and closes on Escape`, async ({
  94  | 		page,
  95  | 	}, info) => {
  96  | 		const s = await boot(page);
  97  | 		await page.getByRole('button', { name: 'Menu', exact: true }).click();
  98  | 		await page.getByRole('button', { name: action, exact: true }).click();
  99  | 		const dialog = page.getByRole('dialog');
  100 | 		await expect(dialog).toHaveCount(1);
  101 | 		await expect(dialog).toHaveAttribute('aria-modal', 'true');
  102 | 		await expect(dialog).toHaveAccessibleName(/.+/);
  103 | 		await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  104 | 		for (let i = 0; i < 8; i++) {
  105 | 			expect(
  106 | 				await dialog.evaluate(
  107 | 					(el) => document.activeElement === document.body || el.contains(document.activeElement),
  108 | 				),
  109 | 			).toBe(true);
  110 | 			await page.keyboard.press(i < 4 ? 'Tab' : 'Shift+Tab');
  111 | 		}
  112 | 		const content = dialog.getByRole('region', { name: 'Dialog content' });
  113 | 		await content.focus();
  114 | 		await expect(content).toBeFocused();
  115 | 		await page.keyboard.press('End');
  116 | 		await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  117 | 		await page.getByRole('heading', { name: heading }).focus();
  118 | 		await page.keyboard.press('Space');
  119 | 		expect(s.calls).toEqual(['/wallet/authenticate']);
  120 | 		await page.keyboard.press('Escape');
  121 | 		await expect(dialog).toHaveCount(0);
> 122 | 		await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeFocused();
      |                                                                         ^ Error: expect(locator).toBeFocused() failed
  123 | 		expect(s.errors).toEqual([]);
  124 | 	});
  125 | }
  126 | 
  127 | for (const [width, height] of [
  128 | 	[400, 225],
  129 | 	[425, 812],
  130 | ]) {
  131 | 	test(`session disclosures remain readable at ${width}x${height}`, async ({ page }, info) => {
  132 | 		await page.setViewportSize({ width, height });
  133 | 		await boot(page);
  134 | 		await expect(page.locator('.session-readouts')).toContainText('96.50%');
  135 | 		const sizes = await page
  136 | 			.locator('.session-readouts span')
  137 | 			.evaluateAll((nodes) => nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)));
  138 | 		expect(sizes.length).toBe(3);
  139 | 		expect(sizes.every((size) => size >= (width === 425 ? 10 : 9))).toBe(true);
  140 | 		await page.screenshot({ path: info.outputPath(`session-${width}x${height}.png`) });
  141 | 		await page.getByRole('button', { name: 'Menu', exact: true }).click();
  142 | 		await page.getByRole('button', { name: 'INFO', exact: true }).click();
  143 | 		await expect(page.getByRole('dialog')).toHaveAccessibleName('Game information');
  144 | 		await page.keyboard.press('Escape');
  145 | 		await expect(page.getByRole('dialog')).toHaveCount(0);
  146 | 	});
  147 | }
  148 | 
  149 | test('unavailable Eclipse Chamber explains the lower amount needed without submitting a play', async ({
  150 | 	page,
  151 | }) => {
  152 | 	const s = await boot(page, 50000);
  153 | 	await expect(page.locator('.feature')).toBeDisabled();
  154 | 	await expect(page.getByRole('status')).toContainText(
  155 | 		/Eclipse Chamber.*limit|limit.*Eclipse Chamber/i,
  156 | 	);
  157 | 	await expect(page.getByRole('status')).toContainText(/lower/i);
  158 | 	await page.keyboard.press('Escape');
  159 | 	expect(s.calls).toEqual(['/wallet/authenticate']);
  160 | 	expect(s.errors).toEqual([]);
  161 | });
  162 | 
  163 | test('settings volume sliders have distinct names and support keyboard adjustment', async ({
  164 | 	page,
  165 | }) => {
  166 | 	const s = await boot(page);
  167 | 	await page.getByRole('button', { name: 'Menu', exact: true }).click();
  168 | 	await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  169 | 	const dialog = page.getByRole('dialog');
  170 | 	await expect(dialog.getByRole('slider')).toHaveCount(3);
  171 | 	for (const slider of await dialog.getByRole('slider').all())
  172 | 		await expect(slider).toHaveAccessibleName(/.+/);
  173 | 	const names = await dialog
  174 | 		.getByRole('slider')
  175 | 		.evaluateAll((nodes) =>
  176 | 			nodes.map(
  177 | 				(node) =>
  178 | 					node.getAttribute('aria-label') ||
  179 | 					document.getElementById(node.getAttribute('aria-labelledby') || '')?.textContent,
  180 | 			),
  181 | 		);
  182 | 	expect(new Set(names).size).toBe(3);
  183 | 	const slider = dialog.getByRole('slider').first();
  184 | 	await slider.focus();
  185 | 	await page.keyboard.press('Home');
  186 | 	await expect(slider).toHaveValue('0');
  187 | 	await page.keyboard.press('ArrowRight');
  188 | 	await expect(slider).toHaveValue('1');
  189 | 	await page.keyboard.press('Escape');
  190 | 	await expect(dialog).toHaveCount(0);
  191 | 	expect(s.calls).toEqual(['/wallet/authenticate']);
  192 | 	expect(s.errors).toEqual([]);
  193 | });
  194 | 
  195 | test('feature confirmation at 400x225 keeps cost and confirm control reachable', async ({
  196 | 	page,
  197 | }, info) => {
  198 | 	await page.setViewportSize({ width: 400, height: 225 });
  199 | 	const s = await boot(page);
  200 | 	await page.locator('.feature').click();
  201 | 	await page.getByText('CONTINUE', { exact: true }).click();
  202 | 	const dialog = page.getByRole('dialog');
  203 | 	await expect(dialog).toContainText('100×');
  204 | 	const confirm = page.locator('[data-test="confirm-button"]');
  205 | 	await confirm.scrollIntoViewIfNeeded();
  206 | 	await expect(confirm).toBeInViewport();
  207 | 	await page.screenshot({ path: info.outputPath('feature-confirmation-400x225.png') });
  208 | 	await page.keyboard.press('Escape');
  209 | 	await expect(dialog).toHaveAccessibleName('Feature selection');
  210 | 	await page.keyboard.press('Escape');
  211 | 	await expect(dialog).toHaveCount(0);
  212 | 	expect(s.calls).toEqual(['/wallet/authenticate']);
  213 | 	expect(s.errors).toEqual([]);
  214 | });
  215 | 
  216 | test('base-only session explains Eclipse Chamber unavailability without suggesting a false amount fix', async ({
  217 | 	page,
  218 | }) => {
  219 | 	const s = await boot(page, null);
  220 | 	await expect(page.locator('.feature')).toBeDisabled();
  221 | 	await expect(page.getByRole('status')).toHaveText(
  222 | 		'Eclipse Chamber is unavailable in this session.',
```