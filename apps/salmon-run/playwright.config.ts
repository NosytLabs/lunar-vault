import { defineConfig } from '@playwright/test';
export default defineConfig({
	testDir: './tests',
	workers: 1,
	timeout: 20000,
	use: {
		baseURL: 'http://127.0.0.1:4174',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	webServer: {
		command: 'python3 -m http.server 4174 --bind 127.0.0.1 --directory dist',
		url: 'http://127.0.0.1:4174',
		reuseExistingServer: !process.env.CI,
	},
});
