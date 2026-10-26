import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	timeout: 45_000,
	workers: 1,
	use: {
		channel: process.env.PLAYWRIGHT_CHANNEL,
		baseURL: 'http://127.0.0.1:4173',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
	webServer: {
		command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory apps/lunar-vault/build',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI,
	},
});
