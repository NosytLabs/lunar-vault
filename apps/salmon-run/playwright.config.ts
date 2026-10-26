import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: './tests',
	workers: 1,
	timeout: 60000,
	use: {
		baseURL: 'http://127.0.0.1:4174',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'python3 ../../tools/serve-static.py --port 4174 --directory dist',
		url: 'http://127.0.0.1:4174',
		reuseExistingServer: !process.env.CI,
	},
});
